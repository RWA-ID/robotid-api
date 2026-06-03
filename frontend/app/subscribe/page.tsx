'use client';

import dynamic from 'next/dynamic';
import { SiteNav } from '@/components/SiteNav';

// Client-only: the subscribe flow uses wagmi hooks, which must not run during
// static generation (no WagmiProvider in the SSG tree). ssr:false defers it to
// the browser, where Providers has mounted the wallet context.
const SubscribeClient = dynamic(() => import('./SubscribeClient'), {
  ssr: false,
  loading: () => (
    <div className="wrap">
      <p className="mono" style={{ padding: '120px 0', color: 'var(--ink-faint)' }}>
        Loading subscribe…
      </p>
    </div>
  ),
});

export default function SubscribePage() {
  return (
    <main>
      <SiteNav />
      <SubscribeClient />
      <footer className="footer">
        <div className="wrap row">
          <div className="meta">
            <span>Built on Ethereum</span><span className="sep">·</span>
            <span>Powered by ENS</span><span className="sep">·</span>
            <span>MIT Licensed</span>
          </div>
          <div className="brand-f">Robot&nbsp;<b>ID</b></div>
        </div>
      </footer>
    </main>
  );
}
