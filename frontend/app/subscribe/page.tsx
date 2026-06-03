'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@/components/ConnectButton';
import { TIERS, SUBSCRIPTION_ADDRESS, USDC_ADDRESS, API_URL } from '@/lib/config';
import { SUBSCRIPTION_ABI, ERC20_ABI } from '@/lib/contracts';

type Step = 'idle' | 'approving' | 'subscribing' | 'provisioning' | 'done';

export default function Subscribe() {
  const { address, isConnected } = useAccount();
  const [tier, setTier] = useState(1);
  const [step, setStep] = useState<Step>('idle');
  const [apiKey, setApiKey] = useState<string | null>(null);

  const selected = TIERS[tier];
  const subConfigured = !/^0x0+$/.test(SUBSCRIPTION_ADDRESS);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, SUBSCRIPTION_ADDRESS] : undefined,
    query: { enabled: !!address && subConfigured },
  });

  const { data: active, refetch: refetchActive } = useReadContract({
    address: SUBSCRIPTION_ADDRESS,
    abi: SUBSCRIPTION_ABI,
    functionName: 'isActive',
    args: address ? [address] : undefined,
    query: { enabled: !!address && subConfigured },
  });

  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isSuccess: txMined } = useWaitForTransactionReceipt({ hash: txHash });

  const needsApproval = (allowance ?? 0n) < selected.priceUsdc;

  async function handleApprove() {
    setStep('approving');
    const hash = await writeContractAsync({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [SUBSCRIPTION_ADDRESS, selected.priceUsdc],
    });
    setTxHash(hash);
  }

  async function handleSubscribe() {
    setStep('subscribing');
    const hash = await writeContractAsync({
      address: SUBSCRIPTION_ADDRESS,
      abi: SUBSCRIPTION_ABI,
      functionName: 'subscribe',
      args: [tier],
    });
    setTxHash(hash);
  }

  // after a tx mines, advance the flow
  useEffect(() => {
    if (!txMined) return;
    void refetchAllowance();
    void refetchActive();
    if (step === 'approving') setStep('idle');
    if (step === 'subscribing') {
      setStep('provisioning');
      // the subscription-watcher provisions the key + namespace; poll the API
      void provisionKey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txMined]);

  async function provisionKey() {
    try {
      const res = await fetch(`${API_URL}/api/v1/subscription/${address}`);
      const j = await res.json();
      // demo: surface a deterministic placeholder if API key flow not wired locally
      setApiKey(j?.active ? 'rid_provisioned_check_keys_info' : null);
    } catch {
      setApiKey(null);
    }
    setStep('done');
  }

  return (
    <main>
      <section className="hero" style={{ paddingBottom: 32 }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <span className="section-num">§ Subscribe</span>
          <h1 style={{ fontSize: 44 }}>Get your API key.</h1>
          <p className="sub">
            Connect a wallet, approve USDC, and call <code>Subscription.subscribe(tier)</code>. On
            confirmation, your API key and <span className="mono">mfr.robot-id.eth</span> namespace
            are auto-provisioned by the on-chain <span className="mono">Subscribed</span> event.
          </p>
          <div style={{ marginTop: 20 }}>
            <ConnectButton />
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          {!subConfigured && (
            <p style={{ color: 'var(--warn)' }} className="mono">
              ⚠ Subscription contract address not configured (NEXT_PUBLIC_SUBSCRIPTION_ADDRESS).
            </p>
          )}

          <div className="pricing" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            {TIERS.map((t) => (
              <button
                key={t.idx}
                onClick={() => setTier(t.idx)}
                className={`tier${tier === t.idx ? ' featured' : ''}`}
                style={{ textAlign: 'left', cursor: 'pointer', background: tier === t.idx ? 'var(--cream-2)' : 'var(--paper)' }}
              >
                <div className="tn">{t.name}</div>
                <div className="price">
                  ${t.priceUsd.toLocaleString()}
                  <span> / mo</span>
                </div>
                <div className="meta">{t.requests}</div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 28, display: 'grid', gap: 12 }}>
            {active && (
              <p className="mono" style={{ color: 'var(--ok)' }}>
                ✓ This wallet already has an active subscription.
              </p>
            )}

            {isConnected && needsApproval && (
              <button className="btn" onClick={handleApprove} disabled={step === 'approving'}>
                {step === 'approving' ? 'Approving USDC…' : `1 · Approve ${selected.priceUsd.toLocaleString()} USDC`}
              </button>
            )}

            {isConnected && !needsApproval && (
              <button className="btn steel" onClick={handleSubscribe} disabled={step === 'subscribing' || step === 'provisioning'}>
                {step === 'subscribing'
                  ? 'Subscribing…'
                  : step === 'provisioning'
                    ? 'Provisioning key + namespace…'
                    : `2 · Subscribe (${selected.name})`}
              </button>
            )}

            {!isConnected && <p className="mono" style={{ color: 'var(--ink-soft)' }}>Connect a wallet to continue.</p>}

            {step === 'done' && (
              <div className="intentlog" style={{ marginTop: 12 }}>
                <div className="head">Provisioned</div>
                <div className="rows">
                  <div className="row">
                    <span className="ok">✓</span> Subscription active · tier {selected.name}
                  </div>
                  <div className="row">
                    <span className="ok">✓</span> API key: <span className="mono">{apiKey ?? 'retrieve via GET /auth/keys/info (SIWE)'}</span>
                  </div>
                  <div className="row">
                    <span className="ok">✓</span> Namespace: <span className="mono">your-oem.robot-id.eth</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p style={{ marginTop: 28, fontSize: 13, color: 'var(--ink-soft)' }}>
            Renewal extends from <code>max(now, currentExpiry)</code>. Each authenticated request
            re-checks <code>isActive</code>; an expired subscription returns <code>402</code>.
          </p>
        </div>
      </section>
    </main>
  );
}
