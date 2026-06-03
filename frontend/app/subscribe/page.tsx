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
          <div className="foot-right">
            <a className="x-link" href="https://x.com/robotidtech" target="_blank" rel="noreferrer" aria-label="robot-id.eth on X (@robotidtech)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              @robotidtech
            </a>
            <span className="brand-f">Robot&nbsp;<b>ID</b></span>
          </div>
        </div>
      </footer>
    </main>
  );
}
