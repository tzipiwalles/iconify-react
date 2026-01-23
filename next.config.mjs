/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'potrace', 'svgo'],
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
        'svgo': 'commonjs svgo',
      })
    }
    return config
  },
};

export default nextConfig;
