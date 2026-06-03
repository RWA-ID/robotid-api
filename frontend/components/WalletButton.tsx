'use client';

// Amber wallet button for the subscribe flow. Uses Reown AppKit's open() to
// pop the connect modal, and shows the connected address + disconnect.
// Imported only by the client-only /subscribe route, so Reown never runs during
// static generation.
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';
import { REOWN_PROJECT_ID } from '@/lib/config';

export function WalletButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (!REOWN_PROJECT_ID) {
    return (
      <button className="btn btn-primary" disabled title="Set NEXT_PUBLIC_REOWN_PROJECT_ID in the Vercel project env">
        Connect wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button className="btn btn-ghost" onClick={() => open({ view: 'Account' })}>
        <span className="led led-ok" /> {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  return (
    <button className="btn btn-primary" onClick={() => open()}>
      Connect wallet
    </button>
  );
}
