import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow CI or a second local process to build without colliding with an active dev server.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
