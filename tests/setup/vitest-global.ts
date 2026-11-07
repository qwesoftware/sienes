import { config } from "dotenv";
import { runMigrations } from "../../src/db/migrate";
import { ensureDatabase, testDatabaseUrl } from "./test-db";

config({ path: ".env.dev" });

export default async function setup() {
  const url = testDatabaseUrl(process.env.DATABASE_URL!);
  await ensureDatabase(url);
  await runMigrations(url);
}
