import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@me2/types', '@me2/ai-prompts', '@me2/db'],
  serverExternalPackages: ['@sentry/nextjs'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
