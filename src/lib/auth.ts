import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { db } from "@/db";
import * as schema from "@/db/schema";

// Identity for Sienes staff: email and password only, no public sign-up,
// administrators create and disable users (ADR-0004). Sessions live in
// Postgres and are checked on every request so a disabled account is
// rejected on its next call; the cookie cache stays off for that reason.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 10,
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    additionalFields: {
      mustChangePassword: { type: "boolean", input: false, defaultValue: true },
    },
  },
  session: {
    cookieCache: { enabled: false },
  },
  rateLimit: {
    storage: "database",
  },
  plugins: [admin()],
});

export type Session = typeof auth.$Infer.Session;
