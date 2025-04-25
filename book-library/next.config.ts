import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  // Configure routes and error handling
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  // Custom 404 handling
  async rewrites() {
    return {
      afterFiles: [
        // If a request doesn't match any files or routes, try these
        { source: '/:path*', destination: '/404' },
      ],
      fallback: [
        // If nothing else matches, use the default 404 page
        { source: '/:path*', destination: '/_error' },
      ],
    };
  },
};

export default nextConfig;
