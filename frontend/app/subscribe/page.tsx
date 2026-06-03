'use client';

import dynamic from 'next/dynamic';

// Client-only: the subscribe flow uses wagmi hooks, which must not run during
// static generation (no WagmiProvider in the SSG tree). ssr:false defers it to
// the browser, where Providers has mounted the wallet context.
const SubscribeClient = dynamic(() => import('./SubscribeClient'), {
  ssr: false,
  loading: () => (
    <main className="wrap">
      <p className="mono" style={{ padding: '120px 0', color: 'var(--ink-soft)' }}>
        Loading subscribe…
      </p>
    </main>
  ),
});

export default function SubscribePage() {
  return <SubscribeClient />;
}
