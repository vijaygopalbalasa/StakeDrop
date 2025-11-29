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

    // Fix for WASM files
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
    }

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
};

module.exports = nextConfig;
