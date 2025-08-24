import type { NextConfig } from "next";

const withTM = require('next-transpile-modules')([
  '@heygen/streaming-avatar',
]);

const nextConfig: NextConfig = {
  optimizeFonts: false,
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = withTM(nextConfig);
