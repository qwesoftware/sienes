// Creates the first administrator. Idempotent: does nothing if the email exists.
// Usage: ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... pnpm db:seed
import { config } from "dotenv";

config({ path: process.env.ENV_FILE ?? ".env.dev" });

async function main() {
  const { createUserDirect } = await import("@/lib/users");
  const { db } = await import("@/db");
  const { user } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const name = process.env.ADMIN_NAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !name || !password) throw new Error("ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD are required");
  if (password.length < 10) throw new Error("ADMIN_PASSWORD must have at least 10 characters");

  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existing.length > 0) {
    console.log(`admin ${email} already exists`);
    return;
  }
  await createUserDirect({ name, email, password, role: "admin", mustChangePassword: true });
  console.log(`admin ${email} created; the password must be changed at first sign-in`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
