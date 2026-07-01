import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Required for the Docker multi-stage build (copies only what's needed to run)
  output: 'standalone',
  // Allow HMR connections from 127.0.0.1 (Windows/WSL dev environment)
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;