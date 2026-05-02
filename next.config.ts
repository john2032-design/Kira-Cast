import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['anime.riko.my'],
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      { protocol: 'https', hostname: '**.gogoanime.**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/stream/:path*',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=300, stale-while-revalidate=60' },
        ],
      },
    ];
  },
};

export default nextConfig;
