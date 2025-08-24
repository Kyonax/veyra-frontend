import type { NextConfig } from "next";

const withTM = require('next-transpile-modules')([
  '@heygen/streaming-avatar',
]);

const nextConfig: NextConfig = {
  reactStrictMode: true,

};

module.exports = withTM(nextConfig);
