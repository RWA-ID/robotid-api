import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'robot-id.eth — One API for every robot on Earth',
  description:
    'The neutral ENS protocol layer for robots & autonomous machines. Identity, AI/voice intent, autonomous payments, capability attestation, and firmware verification — integrate once via a single API key.',
  metadataBase: new URL('https://robot-id.eth'),
  openGraph: {
    title: 'robot-id.eth',
    description: 'The neutral ENS protocol layer for robots & autonomous machines.',
    url: 'https://robot-id.eth',
  },
};

function Nav() {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a href="/" className="brand">
          robot-<b>id</b>.eth
        </a>
        <div className="nav-links">
          <a href="/#protocol">Protocol</a>
          <a href="/#modules">Modules</a>
          <a href="/docs">Docs</a>
          <a href="/#pricing">Pricing</a>
          <a href="https://github.com/RWA-ID/robot-id-api" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <a href="/subscribe" className="btn steel" style={{ padding: '8px 14px' }}>
            Get a key
          </a>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@400;500;560;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
