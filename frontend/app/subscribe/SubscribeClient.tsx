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

  useEffect(() => {
    if (!txMined) return;
    void refetchAllowance();
    void refetchActive();
    if (step === 'approving') setStep('idle');
    if (step === 'subscribing') {
      setStep('provisioning');
      void provisionKey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txMined]);

  async function provisionKey() {
    try {
      const res = await fetch(`${API_URL}/api/v1/subscription/${address}`);
      const j = await res.json();
      setApiKey(j?.active ? 'rid_provisioned_check_keys_info' : null);
    } catch {
      setApiKey(null);
    }
    setStep('done');
  }

  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 880 }}>
        <div className="sec-tag"><span className="num">§ Subscribe</span> Get an API key</div>
        <h1 className="sec-h" style={{ fontSize: 'clamp(30px,4vw,44px)' }}>Subscribe in USDC.</h1>
        <p className="sec-lede">
          Connect a wallet, approve USDC, and call <code className="mono">subscribe(tier)</code>. On
          confirmation, your API key and <span className="mono">mfr.robot-id.eth</span> namespace are
          auto-provisioned by the on-chain <span className="mono">Subscribed</span> event.
        </p>

        <div className="connect-row">
          <ConnectButton />
          {active && (
            <span className="connect-note" style={{ color: 'var(--ok)' }}>✓ this wallet has an active subscription</span>
          )}
        </div>

        {!subConfigured && (
          <p className="mono" style={{ color: 'var(--signal-deep)', fontSize: 13 }}>
            ⚠ Subscription contract address not configured (NEXT_PUBLIC_SUBSCRIPTION_ADDRESS).
          </p>
        )}

        <div className="pricing">
          {TIERS.map((t) => (
            <button
              key={t.idx}
              onClick={() => setTier(t.idx)}
              className={`tier${tier === t.idx ? ' featured' : ''}`}
              style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
            >
              {tier === t.idx && <span className="badge">Selected</span>}
              <div className="tn">{t.name}</div>
              <div className="price">${t.priceUsd.toLocaleString()}<span> / mo</span></div>
              <div className="meta">{t.requests} · {t.rate}</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 28, display: 'grid', gap: 12, maxWidth: 460 }}>
          {isConnected && needsApproval && (
            <button className="btn btn-ink" onClick={handleApprove} disabled={step === 'approving'}>
              {step === 'approving' ? 'Approving USDC…' : `1 · Approve ${selected.priceUsd.toLocaleString()} USDC`}
            </button>
          )}
          {isConnected && !needsApproval && (
            <button
              className="btn btn-primary"
              onClick={handleSubscribe}
              disabled={step === 'subscribing' || step === 'provisioning'}
            >
              {step === 'subscribing'
                ? 'Subscribing…'
                : step === 'provisioning'
                  ? 'Provisioning key + namespace…'
                  : `2 · Subscribe (${selected.name})`}
            </button>
          )}
          {!isConnected && (
            <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Connect a wallet to continue.</p>
          )}

          {step === 'done' && (
            <div className="tree-card" style={{ padding: '20px 22px' }}>
              <div className="tnode"><span className="dat" style={{ color: 'var(--ok)' }}>✓ Subscription active</span><span className="note">tier {selected.name}</span></div>
              <div className="tnode"><span className="dat">API key</span><span className="note">{apiKey ?? 'retrieve via GET /auth/keys/info (SIWE)'}</span></div>
              <div className="tnode"><span className="dat">Namespace</span><span className="note"><span className="sig">your-oem</span>.robot-id.eth</span></div>
            </div>
          )}
        </div>

        <p style={{ marginTop: 28, fontSize: 13, color: 'var(--ink-soft)' }}>
          Renewal extends from <code className="mono">max(now, currentExpiry)</code>. Each
          authenticated request re-checks <code className="mono">isActive</code>; an expired
          subscription returns <code className="mono">402</code>.
        </p>
      </div>
    </section>
  );
}
