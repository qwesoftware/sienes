import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// End-to-end suite against the real model (AI_PROVIDER=openai). Costs money
// and takes minutes; run through the /verify skill or `pnpm e2e:real`, never
// in the automated loop. Mock-specific specs are left out.
config({ path: ".env.dev" });

const port = 3101;

export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/home.spec.ts", "e2e/auth.spec.ts", "e2e-real/**/*.spec.ts"],
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 420_000,
  expect: { timeout: 180_000 },
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
    env: { AI_PROVIDER: "openai", BETTER_AUTH_URL: `http://localhost:${port}` },
  },
});
