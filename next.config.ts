import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
      // r3f-perf (dev only) ships a source map for its font module that
      // references a binary file, which crashes Turbopack. Strip it.
      "roboto.woff.{js,mjs}": {
        condition: { path: /node_modules\/r3f-perf\// },
        loaders: ["./loaders/strip-source-map-url.cjs"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
