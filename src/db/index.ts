import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

function pool(): Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({ connectionString: env().DATABASE_URL, max: 5 });
  }
  return globalForDb.pool;
}

export const db = drizzle({ client: pool(), schema });
export type Db = typeof db;
