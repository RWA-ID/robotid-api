'use client';

// Reown AppKit registers the <appkit-button> web component when initialized.
// Falls back to a styled stub (matching the industrial design) if no project id.
import { REOWN_PROJECT_ID } from '@/lib/config';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export function ConnectButton() {
  if (!REOWN_PROJECT_ID) {
    return (
      <span className="appkit-stub" data-hook="ConnectButton" title="Set NEXT_PUBLIC_REOWN_PROJECT_ID">
        <span className="led led-sig" /> Connect wallet · Reown AppKit
      </span>
    );
  }
  return <appkit-button />;
}
