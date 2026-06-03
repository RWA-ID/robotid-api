'use client';

// Reown AppKit registers the <appkit-button> web component when initialized.
// Falls back to a disabled stub if no project id is configured.
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
      <button className="btn secondary" disabled title="Set NEXT_PUBLIC_REOWN_PROJECT_ID">
        Connect (configure Reown)
      </button>
    );
  }
  return <appkit-button />;
}
