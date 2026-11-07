---
status: accepted (authentication superseded by [ADR-0004](0004-self-hosted-better-auth.md))
---

# Application stack: Next.js on Vercel, Neon Postgres with Drizzle, Neon Auth

The app is a single TypeScript codebase so the Zod contracts are shared by the parser, the UI and the server, and the AI layer is TypeScript (ADR-0001). We run Next.js (App Router) on Vercel with the function region in São Paulo (`gru1`), store users, audit events, feedback and versions in Neon Postgres managed with Drizzle, and use Neon Auth (Managed Better Auth) with its Admin plugin for closed signup, user creation and disabling. PDF parsing and Word generation stay in the browser; no patient data reaches the database or the host logs.

## Considered options

- Separate Python service for the AI calls: second deploy, duplicated Zod/Pydantic contracts, another retention surface; nothing in the workflow needs Python.
- Supabase: mature auth with a signup switch, but JWT sessions stay valid until expiry after a ban, which weakens immediate lock-out; paid tier needed to avoid project pausing.
- Self-hosted Better Auth in the app: full control, same client API as Neon Auth; kept as the fallback if closed signup cannot be enforced in the managed service.
- Cloudflare Workers via OpenNext or vinext: cheapest, but an adapter layer and a 128 MB memory ceiling add risk for a pilot in weeks.
- Node container (Fly.io, Railway): no function limits and flat cost, but the team would own the runtime and previews; fallback if Vercel's per-seat pricing or 4.5 MB body limit becomes a problem.

## Consequences

- Verify in a test Neon project, before any real data, that public sign-up is disabled while `admin.createUser` works and that `banUser` invalidates an open session on the next request.
- Clinical payloads are capped below Vercel's 4.5 MB function body limit; function duration stays at the 300 s default.
- Vercel logging and observability are configured to exclude request and response bodies.
- Only the Vercel and Neon accounts of info@qwesoftware.com are used for this project, in every environment; no personal or client accounts.
