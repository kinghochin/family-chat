import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Authenticated server-rendered routes use cookies at request time. */
  cacheComponents: false,
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
