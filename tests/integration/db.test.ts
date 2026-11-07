import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";

describe("database", () => {
  it("answers on the configured DATABASE_URL", async () => {
    const result = await db.execute(sql`select 1 as one`);
    expect(result.rows[0]).toEqual({ one: 1 });
  });
});
