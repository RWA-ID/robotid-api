/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // static-friendly per §1 (Vercel static / IPFS)
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: true,
  webpack: (config) => {
    // Reown/wagmi ship optional wallet connectors (Porto, Base, the new
    // MetaMask SDK, Tempo) loaded via `import(...).catch()` — they handle the
    // dep being absent at runtime, but webpack fails to statically resolve them
    // at build time. We never configure these connectors, so alias each to an
    // empty module so the static export compiles.
    config.resolve.alias = {
      ...config.resolve.alias,
      porto: false,
      'porto/internal': false,
      '@metamask/connect-evm': false,
      '@base-org/account': false,
      accounts: false,
    };
    // node-only deps pulled by WalletConnect that have no browser equivalent
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    return config;
  },
};

module.exports = nextConfig;
