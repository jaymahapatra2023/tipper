import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@tipper/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
