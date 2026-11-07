import { config } from "dotenv";
import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./tests/setup/test-db";

config({ path: ".env.dev" });

export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
    globalSetup: ["tests/setup/vitest-global.ts"],
    env: {
      DATABASE_URL: testDatabaseUrl(process.env.DATABASE_URL!),
      AI_PROVIDER: "mock",
    },
    // One worker: the integration tests share the database.
    fileParallelism: false,
  },
});
