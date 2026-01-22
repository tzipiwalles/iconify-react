/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'potrace'],
  },
  
  // Disable image optimization 
  images: {
    unoptimized: true,
  },
  
  // Webpack config for native modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'sharp': 'commonjs sharp',
        'potrace': 'commonjs potrace',
      })
    }
    return config
  },
};

export default nextConfig;
