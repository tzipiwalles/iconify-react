/** @type {import('next').NextConfig} */
const nextConfig = {
  // External packages for server-side
  serverExternalPackages: ['sharp', 'potrace'],
  
  // Output standalone for better Vercel compatibility
  output: 'standalone',
  
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
