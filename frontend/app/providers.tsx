'use client';

import { ReactNode, useState } from 'react';
import { WagmiProvider, type Config } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { REOWN_PROJECT_ID } from '@/lib/config';

// Reown AppKit (successor to WalletConnect Web3Modal) wired to wagmi.
const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet],
  projectId: REOWN_PROJECT_ID || 'PLACEHOLDER_PROJECT_ID',
  ssr: true,
});

if (typeof window !== 'undefined' && REOWN_PROJECT_ID) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks: [mainnet],
    projectId: REOWN_PROJECT_ID,
    metadata: {
      name: 'robot-id.eth',
      description: 'The neutral ENS protocol layer for robots & autonomous machines',
      url: 'https://robot-id.eth',
      icons: ['https://robot-id.eth/icon.png'],
    },
    themeMode: 'light',
    features: { analytics: false },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
