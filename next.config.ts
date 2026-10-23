import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Two root layouts (the site, the Studio): unknown addresses get src/app/global-not-found.tsx.
    globalNotFound: true,
    agentUpgrade: "security",
  },
  // Dev only: lets devices on the local network (e.g. a phone) load the dev server.
  allowedDevOrigins: ["192.168.178.*"],
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
