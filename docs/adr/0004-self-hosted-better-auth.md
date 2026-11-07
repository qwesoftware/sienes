---
status: accepted
---

# Run Better Auth inside the app instead of Neon Auth

ADR-0002 chose Neon Auth (Managed Better Auth) and named self-hosted Better Auth as the fallback. On November 6, 2026 we decided to develop against a local Postgres in Docker, where a managed identity service cannot run, so we run Better Auth inside the Next.js app: email and password only, public sign-up disabled on the server, the Admin plugin for creating and disabling users, sessions stored in our Postgres through Drizzle, and the first administrator created by a seed script. There is no email provider in version one: the administrator sets a temporary password when creating or resetting a user, and the user must change it at first sign-in.

## Consequences

- The auth choice in ADR-0002 is superseded by this record; Neon Postgres, Drizzle, Next.js on Vercel `gru1` and the account rule stay as decided.
- Disabling a user revokes every session and is re-checked on each sensitive request; the last enabled administrator cannot be disabled.
- The "verify closed sign-up in a test Neon project" item of ADR-0002 is replaced by an integration test against the Docker database.
- Password reset by email is deferred; adding it later needs an email vendor and its own retention check.
