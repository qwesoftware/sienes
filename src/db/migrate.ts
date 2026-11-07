import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

config({ path: process.env.ENV_FILE ?? ".env.dev" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString: url });
await migrate(drizzle({ client: pool }), { migrationsFolder: "./drizzle" });
await pool.end();
console.log("migrations applied");
