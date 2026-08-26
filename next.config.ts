import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the filesystem root to this project. Without it Turbopack walks up
    // looking for a lockfile and finds a stray one in the home directory,
    // which would widen the module-resolution and watch scope.
    root: path.join(import.meta.dirname, "."),
  },
};

export default nextConfig;
