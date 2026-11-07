import { config } from "dotenv";
import path from "node:path";
import { defineConfig } from "vitest/config";

config({ path: ".env.dev" });

export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
  },
});
