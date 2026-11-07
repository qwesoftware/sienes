import { config } from "dotenv";
import type { NextConfig } from "next";

// Local development reads .env.dev (git-ignored). Vercel injects its own
// environment, where this file does not exist and the call is a no-op.
config({ path: ".env.dev" });

const nextConfig: NextConfig = {
  // Prompt modules are read from disk at runtime; keep them in the function bundle.
  outputFileTracingIncludes: { "/api/**": ["./prompts/**/*"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
