import { execFileSync } from "node:child_process";

export { e2eAdmin } from "../../scripts/e2e-seed";

export default async function globalSetup() {
  execFileSync("pnpm", ["exec", "tsx", "--tsconfig", "tsconfig.json", "scripts/e2e-seed.ts"], { stdio: "inherit" });
}
