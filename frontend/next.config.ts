import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.europarl.europa.eu',
        pathname: '/mepphoto/**',
      },
    ],
  },
};

export default nextConfig;
