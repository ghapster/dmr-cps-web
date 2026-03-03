/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.BASE_PATH || '/dmr-cps-web',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
