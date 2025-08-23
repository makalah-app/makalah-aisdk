const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@ai-sdk/openai', '@openrouter/ai-sdk-provider'],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // 🛠️ WEBPACK CACHE OPTIMIZATION: Next.js 15 compatible configuration
  // Uses memory cache as required by Next.js 15.5.0
  webpack: (config, { dev, isServer, webpack }) => {
    // Next.js 15 requires memory cache - filesystem cache causes validation errors
    config.cache = {
      type: 'memory',
      // Increased memory allocation to prevent cache eviction
      maxGenerations: dev ? 5 : Infinity,
    }

    // 🚀 AI SDK OPTIMIZATION: External packages handling
    if (isServer) {
      // Ensure AI SDK packages are handled correctly
      config.externals = config.externals || []
      config.externals.push({
        '@ai-sdk/openai': 'commonjs @ai-sdk/openai',
        '@openrouter/ai-sdk-provider': 'commonjs @openrouter/ai-sdk-provider',
        'ai': 'commonjs ai'
      })
    }

    // 🛡️ MEMORY OPTIMIZATION: Prevent memory pressure cache corruption
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          aiSdk: {
            test: /[\\/]node_modules[\\/](@ai-sdk|ai)[\\/]/,
            name: 'ai-sdk',
            chunks: 'all',
            priority: 30,
          },
          openrouter: {
            test: /[\\/]node_modules[\\/]@openrouter[\\/]/,
            name: 'openrouter',
            chunks: 'all',
            priority: 25,
          },
        },
      },
    }

    // 🔍 CACHE MONITORING: Development environment monitoring
    if (dev) {
      // Add cache monitoring in development
      const originalRun = config.plugins.find(
        plugin => plugin.constructor.name === 'DefinePlugin'
      )
      
      if (!originalRun) {
        config.plugins.push(
          new webpack.DefinePlugin({
            'process.env.WEBPACK_CACHE_MONITORING': JSON.stringify('true')
          })
        )
      }
    }

    return config
  },
  // 🛡️ SECURITY: Remove all sensitive environment variables from client-side
  // Only safe public values are exposed to client
  env: {
    // These are the ONLY values that should be exposed to client-side
    // NO API KEYS should ever be here
    // NODE_ENV is automatically handled by Next.js
    VERCEL_ENV: process.env.VERCEL_ENV,
    // Note: Supabase URL and anon key are designed to be public
    // They are safe for client-side usage by design
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // 🛡️ SECURITY: Enhanced security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options', 
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://api.openai.com https://openrouter.ai wss:",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
};

module.exports = nextConfig;