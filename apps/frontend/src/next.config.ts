import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// This app's package.json and lockfile live here, in apps/frontend/src, while
// the repo root has a lockfile of its own for the shared Biome tooling. Turbopack
// walks upward looking for a lockfile, finds the root one first and warns that it
// guessed. Pinning the root removes the guess — and, with output: "standalone",
// keeps file tracing scoped to this app instead of the whole monorepo.
const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: appDir,
  },
  outputFileTracingRoot: appDir,
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
