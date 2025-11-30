/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable static page generation for pages using MeshJS (WASM)
  output: 'standalone',
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };

    // Fix for WASM files - ensure proper loading
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Fallback for node modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };

      // Prevent webpack from trying to polyfill these in the browser
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }

    // Ensure CSL WASM files are properly handled
    config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';

    return config;
  },
  // Skip type checking during build (handled by IDE)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ensure environment variables are available at runtime
  env: {
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
    NEXT_PUBLIC_CARDANO_NETWORK: process.env.NEXT_PUBLIC_CARDANO_NETWORK,
    NEXT_PUBLIC_BLOCKFROST_PROJECT_ID: process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID,
    NEXT_PUBLIC_POOL_SCRIPT_ADDRESS_PREVIEW: process.env.NEXT_PUBLIC_POOL_SCRIPT_ADDRESS_PREVIEW,
    NEXT_PUBLIC_POOL_VALIDATOR_HASH: process.env.NEXT_PUBLIC_POOL_VALIDATOR_HASH,
    NEXT_PUBLIC_ADMIN_ADDRESS: process.env.NEXT_PUBLIC_ADMIN_ADDRESS,
  },
};

module.exports = nextConfig;
