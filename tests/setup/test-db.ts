import { Client } from "pg";

// The integration suite runs against its own database on the same Docker
// Postgres so developer data in `sienes` is never touched.
export function testDatabaseUrl(devUrl: string): string {
  const url = new URL(devUrl);
  url.pathname = "/sienes_test";
  return url.toString();
}

export async function ensureDatabase(testUrl: string): Promise<void> {
  const url = new URL(testUrl);
  const name = url.pathname.slice(1);
  url.pathname = "/postgres";
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const exists = await client.query("select 1 from pg_database where datname = $1", [name]);
    if (exists.rowCount === 0) await client.query(`create database "${name}"`);
  } finally {
    await client.end();
  }
}
