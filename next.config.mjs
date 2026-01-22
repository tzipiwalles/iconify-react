/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'potrace'],
  },
  // Disable image optimization if you're not using Next.js Image component
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
