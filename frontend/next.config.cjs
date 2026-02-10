// File: frontend/next.config.js

/**
 * NEXT.JS CONFIG
 * --------------
 * Production configuration.
 *
 * Goals:
 * - Strict mode enabled
 * - App Router enabled
 * - No experimental flags unless required
 * - Safe defaults for Web3 + AI usage
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    appDir: true,
  },

  images: {
    domains: [
      "ipfs.io",
      "gateway.pinata.cloud",
    ],
  },

  webpack: (config) => {
    // Avoid bundling Node-only modules into client
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
