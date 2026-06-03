/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // static-friendly per §1 (Vercel static)
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: true,
};

module.exports = nextConfig;
