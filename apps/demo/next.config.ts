import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  transpilePackages: ['@cinacoin/core-sdk', '@cinacoin/core-ui', '@cinacoin/react'],
};

export default nextConfig;
