/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  agentRules: false,
  devIndicators: false,
};

export default nextConfig;
