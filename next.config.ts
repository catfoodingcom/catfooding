import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app lives nested inside the bkk-poster repo, which has its own
  // package-lock.json at the repo root — pin the workspace root explicitly
  // so Turbopack doesn't guess (and warn) about which lockfile applies.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
