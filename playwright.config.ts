import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

config({ path: ".env.dev" });

const port = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    locale: "es-AR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { AI_PROVIDER: "mock" },
  },
});
