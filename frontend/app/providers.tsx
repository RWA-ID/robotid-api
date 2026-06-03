'use client';

import { ReactNode, useEffect, useState } from 'react';
import { WagmiProvider, type Config } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { REOWN_PROJECT_ID } from '@/lib/config';

/**
 * Reown AppKit + wagmi providers — initialized CLIENT-ONLY.
 *
 * The wallet stack (Reown adapter / WalletConnect) does blocking I/O in Node,
 * which hangs Next's static-generation workers (`output: 'export'`). We avoid
 * that by constructing the adapter inside useEffect (browser only). During
 * static generation and first paint we render children un-wrapped; once the
 * adapter is ready on the client we mount WagmiProvider around them.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ WagmiAdapter }, { createAppKit }] = await Promise.all([
        import('@reown/appkit-adapter-wagmi'),
        import('@reown/appkit/react'),
      ]);

      const adapter = new WagmiAdapter({
        networks: [mainnet],
        projectId: REOWN_PROJECT_ID || 'PLACEHOLDER_PROJECT_ID',
        ssr: true,
      });

      if (REOWN_PROJECT_ID) {
        createAppKit({
          adapters: [adapter],
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

      if (active) setConfig(adapter.wagmiConfig as Config);
    })();
    return () => {
      active = false;
    };
  }, []);

  // SSG + pre-hydration: render children without the wallet context.
  if (!config) return <>{children}</>;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
