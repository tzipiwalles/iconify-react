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

  // CORS headers for external iframe embedding (Claude Artifacts, Cursor Preview, etc.)
  async headers() {
    return [
      {
        // Apply to all API routes and assets
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Authorization' },
        ],
      },
      {
        // Specific headers for SVG assets to allow iframe embedding
        source: '/api/assets/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Authorization' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
    ]
  },
};

export default nextConfig;
