// Prepares the development database for the Playwright suite: migrations,
// one known administrator, and removal of users left by previous runs.
import { config } from "dotenv";

config({ path: ".env.dev" });

export const e2eAdmin = {
  name: "Admin E2E",
  email: "admin@e2e.test",
  password: "e2e-admin-password",
};

async function main() {
  const { runMigrations } = await import("@/db/migrate");
  await runMigrations();
  const { db } = await import("@/db");
  const { user } = await import("@/db/schema");
  const { createUserDirect } = await import("@/lib/users");
  const { and, eq, like, ne } = await import("drizzle-orm");

  await db.delete(user).where(and(like(user.email, "%@e2e.test"), ne(user.email, e2eAdmin.email)));
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, e2eAdmin.email));
  if (existing.length === 0) {
    await createUserDirect({ ...e2eAdmin, role: "admin", mustChangePassword: false });
  } else {
    await db.update(user).set({ banned: false, mustChangePassword: false }).where(eq(user.email, e2eAdmin.email));
  }
}

if (process.argv[1]?.endsWith("e2e-seed.ts")) {
  main().then(
    () => process.exit(0),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
