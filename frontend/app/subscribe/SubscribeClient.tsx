'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignMessage } from 'wagmi';
import { WalletButton } from '@/components/WalletButton';
import { TIERS, SUBSCRIPTION_ADDRESS, USDC_ADDRESS, API_URL, REOWN_PROJECT_ID } from '@/lib/config';
import { SUBSCRIPTION_ABI, ERC20_ABI } from '@/lib/contracts';

type Step = 'idle' | 'approving' | 'subscribing' | 'provisioning' | 'done';

export default function Subscribe() {
  const { address, isConnected } = useAccount();
  const [tier, setTier] = useState(1);
  const [step, setStep] = useState<Step>('idle');
  const [apiKey, setApiKey] = useState<string | null>(null);

  // OEM namespace selection (reserved at checkout, consumed by Subscribed watcher)
  const [slug, setSlug] = useState('');
  const [slugCheck, setSlugCheck] = useState<
    { valid: boolean; available: boolean; name?: string; reason?: string; slug: string } | null
  >(null);
  const [checking, setChecking] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [reserved, setReserved] = useState<string | null>(null); // full reserved name, once confirmed
  const { signMessageAsync } = useSignMessage();

  const selected = TIERS[tier];
  const subConfigured = !/^0x0+$/.test(SUBSCRIPTION_ADDRESS);

  // Debounced availability check as the OEM types.
  useEffect(() => {
    const s = slug.trim();
    setReserved(null); // editing invalidates a prior reservation in the UI
    if (s.length < 3) {
      setSlugCheck(null);
      return;
    }
    setChecking(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/auth/namespace/${encodeURIComponent(s)}`);
        setSlugCheck(await res.json());
      } catch {
        setSlugCheck(null);
      }
      setChecking(false);
    }, 350);
    return () => clearTimeout(id);
  }, [slug]);

  async function handleReserve() {
    if (!address || !slugCheck?.valid || !slugCheck.available) return;
    setReserving(true);
    try {
      const message = `Reserve ${slugCheck.name} for ${address} on robot-id.eth`;
      const signature = await signMessageAsync({ message });
      const res = await fetch(`${API_URL}/auth/namespace/reserve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, message, signature, slug: slugCheck.slug }),
      });
      const j = await res.json();
      if (res.ok && j.reserved) setReserved(j.name);
      else setSlugCheck((p) => (p ? { ...p, available: false, reason: j.error ?? 'unavailable' } : p));
    } catch {
      /* user rejected signature or network error — leave unreserved */
    }
    setReserving(false);
  }

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
          Connect a wallet, reserve your namespace, approve USDC, and call{' '}
          <code className="mono">subscribe(tier)</code>. On confirmation, your API key is issued and the{' '}
          <span className="mono">&lt;oem&gt;.robot-id.eth</span> namespace you reserved is provisioned by
          the on-chain <span className="mono">Subscribed</span> event.
        </p>

        <div className="connect-row">
          <WalletButton />
          {!isConnected && REOWN_PROJECT_ID && (
            <span className="connect-note">↳ opens the Reown wallet modal</span>
          )}
          {!REOWN_PROJECT_ID && (
            <span className="connect-note" style={{ color: 'var(--signal-deep)' }}>
              ↳ set NEXT_PUBLIC_REOWN_PROJECT_ID (Vercel env) to enable
            </span>
          )}
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
              <dl className="specs">
                {t.specs.map((s) => (
                  <div className="spec" key={s.k}>
                    <dt>{s.k}</dt>
                    <dd>{s.v}</dd>
                  </div>
                ))}
              </dl>
            </button>
          ))}
        </div>

        {isConnected && (
          <div className="tree-card" style={{ marginTop: 24, padding: '20px 22px', maxWidth: 560 }}>
            <div className="tnode" style={{ marginBottom: 12 }}>
              <span className="dat">Choose your namespace</span>
              <span className="note">first-come, first-served</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="mono"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="boston-dynamics"
                disabled={!!reserved}
                spellCheck={false}
                autoCapitalize="none"
                style={{
                  flex: 1, minWidth: 0, padding: '10px 12px', font: 'inherit', fontSize: 14,
                  border: '1px solid var(--rule)', borderRadius: 8, background: 'var(--paper)', color: 'var(--ink)',
                }}
              />
              <span className="mono" style={{ color: 'var(--ink-soft)', fontSize: 14, whiteSpace: 'nowrap' }}>
                .robot-id.eth
              </span>
            </div>

            <div className="mono" style={{ fontSize: 13, marginTop: 10, minHeight: 18 }}>
              {reserved ? (
                <span style={{ color: 'var(--ok)' }}>✓ reserved {reserved} — provisioned to your wallet on payment</span>
              ) : checking ? (
                <span style={{ color: 'var(--ink-faint)' }}>checking availability…</span>
              ) : slug.trim().length > 0 && slug.trim().length < 3 ? (
                <span style={{ color: 'var(--ink-faint)' }}>at least 3 characters</span>
              ) : slugCheck && !slugCheck.valid ? (
                <span style={{ color: 'var(--signal-deep)' }}>✗ {slugCheck.reason}</span>
              ) : slugCheck && !slugCheck.available ? (
                <span style={{ color: 'var(--signal-deep)' }}>✗ {slugCheck.slug} is taken</span>
              ) : slugCheck && slugCheck.available ? (
                <span style={{ color: 'var(--ok)' }}>✓ {slugCheck.name} is available</span>
              ) : (
                <span style={{ color: 'var(--ink-faint)' }}>
                  optional — skip and a default <span className="sig">oem-…</span>.robot-id.eth is assigned
                </span>
              )}
            </div>

            {!reserved && (
              <button
                className="btn btn-ink"
                onClick={handleReserve}
                disabled={!slugCheck?.valid || !slugCheck?.available || reserving}
                style={{ marginTop: 12 }}
              >
                {reserving ? 'Sign in wallet to reserve…' : 'Reserve namespace (free, signature only)'}
              </button>
            )}
          </div>
        )}

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
              <div className="tnode"><span className="dat">Namespace</span><span className="note">{reserved ? <span className="sig">{reserved}</span> : <><span className="sig">oem-…</span>.robot-id.eth (default)</>}</span></div>
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
