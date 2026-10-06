import type { NextConfig } from 'next';

/**
 * Static export so the app can be served from GitHub Pages (or any CDN).
 * `NEXT_PUBLIC_BASE_PATH` is set by `npm run predeploy` to the repository
 * sub-path; leave it empty for local dev and root-domain hosts like Vercel.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
