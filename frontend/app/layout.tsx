import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

// Google Search Console verification token (google-site-verification meta).
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '5eat5gyOcLjDgjQuWQNl2UVRSPpWg-OTtjdwv9LXhQI';

export const metadata: Metadata = {
  title: 'robot-id.eth — One API for every robot on Earth',
  description:
    'The neutral ENS protocol layer for robots & autonomous machines. Identity, AI/voice intent, autonomous payments, capability attestation, and firmware verification — integrate once via a single API key.',
  metadataBase: new URL('https://robotid.tech'),
  openGraph: {
    title: 'robot-id.eth — One API for every robot on Earth',
    description: 'The neutral ENS protocol layer for robots & autonomous machines.',
    url: 'https://robotid.tech',
    siteName: 'Robot ID',
  },
  ...(GOOGLE_SITE_VERIFICATION ? { verification: { google: GOOGLE_SITE_VERIFICATION } } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@400;500;560;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
