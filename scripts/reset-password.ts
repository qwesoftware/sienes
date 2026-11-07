// Resets a user's password from the command line, for when no enabled
// administrator can do it from the app. Prints the temporary password once;
// the user must change it at the next sign-in.
// Usage: pnpm user:reset-password --email=someone@example.com
import { config } from "dotenv";

config({ path: process.env.ENV_FILE ?? ".env.dev" });

async function main() {
  const email = process.argv.find((a) => a.startsWith("--email="))?.slice("--email=".length);
  if (!email) throw new Error("Usage: pnpm user:reset-password --email=<email>");
  const { resetPasswordDirect } = await import("@/lib/users");
  const password = await resetPasswordDirect(email);
  console.log(`temporary password for ${email.toLowerCase()}: ${password}`);
  console.log("every session of the user was closed; the password must be changed at the next sign-in");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
