import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Canonical API is sharework-backend (NEXT_PUBLIC_API_BASE_URL). src/app/api is frozen. */
  reactCompiler: true,
  allowedDevOrigins: ['192.168.0.109', 'localhost:3000', '127.0.0.1:3000'],
};

export default nextConfig;
