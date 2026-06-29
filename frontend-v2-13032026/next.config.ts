import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Required for the Docker multi-stage build (copies only what's needed to run)
  output: 'standalone',
};

export default nextConfig;
