import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// The shared Design Lab (dev only) is synced into .design-lab/lab from
// ../DesignLab by `npm run lab:sync` / predev. When it's absent (CI, deploys,
// fresh clones) "design-lab" resolves to the committed no-op stub instead.
const lab = "./.design-lab/lab/index.ts";

const nextConfig: NextConfig = {
  // Check builds use their own folder (NEXT_DIST_DIR) so they never disturb a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    resolveAlias: {
      "design-lab": existsSync(join(process.cwd(), lab)) ? lab : "./.design-lab/stub.tsx",
    },
  },
};

export default nextConfig;
