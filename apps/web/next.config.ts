import type { NextConfig } from 'next';

import { resolveApiBaseUrl } from './api-config.ts';

const apiBaseUrl = resolveApiBaseUrl();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  ...(process.env.NODE_ENV === 'production' ? ["upgrade-insecure-requests"] : [])
].join('; ');

const nextConfig: NextConfig = {
  transpilePackages: ['@piggybanq/stellar-core', '@piggybanq/types'],
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/backend/:path*', destination: `${apiBaseUrl}/:path*` }];
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }
      ]
    }];
  }
};

export default nextConfig;
