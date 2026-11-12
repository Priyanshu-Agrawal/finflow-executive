import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Test builds go to their own folder so the live server's .next is never overwritten.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
