import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@piggybanq/stellar-core', '@piggybanq/types']
};

export default nextConfig;

