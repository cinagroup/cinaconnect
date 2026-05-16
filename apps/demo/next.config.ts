import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@onchainux/core-sdk', '@onchainux/core-ui', '@onchainux/react'],
};

export default nextConfig;
