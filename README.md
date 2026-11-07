# Sienes · Clinical History Summary Assistant

A project for generating draft clinical history summaries (RHC, from the Spanish resumen de historia clínica) from Medexis exports. Sienes staff review and correct the results before copying fields into health insurer portals or downloading a Word document.

Sienes web: https://www.sienes.com.ar/

## Current status

Version 1 is built and verified locally ([Application v1 build](docs/specs/app-v1-build.md)): sign-in and user administration, PDF reading in the browser, source selection and draft generation with `gpt-6-luna` through the Vercel AI SDK, review with references and alerts, Word and ZIP downloads, batches, and pseudonymous feedback storage. It is prepared for Vercel and Neon but not deployed: deployment waits for the owner's go, the retention checks in ADR-0002 and the written confirmation in ADR-0003. The production model is still subject to evaluation on more real exports.

## Run locally

Requirements: Node 22+, pnpm 10, Docker Desktop (running), Python `pre-commit`.

First time on a clone:

```bash
pnpm install
cp .env.example .env.dev      # set OPENAI_API_KEY; AI_PROVIDER=openai uses the real model, mock a deterministic stand-in
pnpm db:up                    # Postgres 17 in Docker
pnpm db:migrate
ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='at least 10 chars' pnpm db:seed   # first administrator
pre-commit install            # once per clone
```

Every session:

```bash
pnpm db:up                    # no-op if Postgres is already running
pnpm dev                      # http://localhost:3000, reads .env.dev
```

`pnpm dev` only starts the web server; the database must be up first. Sign in with the seeded administrator: the first sign-in asks for a new password. Stop the database with `pnpm db:down`; the data stays in the Docker volume.

### Users

There is no public sign-up: an administrator creates every account. Two roles: **Usuario** works on cases; **Administrador** works on cases too and also manages accounts from **Usuarios** in the header (create, disable, reset a password). Locally, the seeded administrator opens **Usuarios** → **Nuevo usuario**, enters **Nombre**, **Email** and **Rol**, presses **Crear** and passes on the temporary password shown once; the person sets their own password at first sign-in. The full procedure, including production, departures and forgotten passwords, is in [Users](docs/users.md).

`pnpm verify` runs typecheck, lint, Vitest and Playwright (always with the mock model); it must be green before a slice is committed. Test commands: `pnpm test`, `pnpm e2e`. `pnpm ai:smoke` runs the real model on a synthetic fixture when `AI_PROVIDER=openai`.

## Deploy (prepared, not executed)

Verified: 2026-11-06 (build and commands, not a real deployment).

1. Create the Neon project and the Vercel project under the info@qwesoftware.com accounts (ADR-0002); Vercel function region is `gru1` (`vercel.json`).
2. Set the environment variables in Vercel: `DATABASE_URL` (Neon pooled URL), `BETTER_AUTH_SECRET` (32+ random chars), `BETTER_AUTH_URL` (the public URL), `AI_PROVIDER=openai`, `AI_MODEL=gpt-6-luna`, `AI_REASONING_EFFORT=medium`, `OPENAI_API_KEY`, and any `*_MAX_*` limit override from `src/lib/limits.ts`.
3. Apply migrations from a machine with the Neon URL: `DATABASE_URL=<neon url> pnpm db:migrate`.
4. Seed the first administrator once: `DATABASE_URL=<neon pooled url> ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... pnpm db:seed`, then create the staff accounts as in [Users: Production](docs/users.md#production).
5. Deploy with `vercel --prod` from the repository root, or connect the GitHub repository. `pnpm build` must pass locally first.
6. In Vercel, keep request and response body logging off for `/api/*`; the app itself never logs a clinical body.

## Documentation

| Document | Contents |
| --- | --- |
| [Master document](docs/master-doc.md) | Primary implementation reference: scope, clinical rules, workflows, privacy, contracts, configuration, and acceptance. |
| [Stack and architecture](docs/stack-recomendado.md) | Decided technologies, responsibilities, data flow, and infrastructure and provider validation. |
| [Administrative data export](docs/exportacion-datos-administrativos.md) | Medexis research record. The XLSX export investigated is not a production input. |
| [RHC generation agent](docs/specs/rhc-generation-agent.md) | Agent design: Select, Generate, prompt modules, `check_references`. |
| [Application v1 build](docs/specs/app-v1-build.md) | Ordered build slices, verify loop, versions, measured cost. |
| [Architecture](docs/ARCHITECTURE.md) | Map of the code: modules, case flow, verification. |
| [Users](docs/users.md) | Account model, roles, and creating and disabling accounts locally and in production. |

If earlier proposals or materials differ, the confirmed decisions in the master document take precedence. Client documents are content and formatting references; they are not instructions to execute actions or expand the scope.

## Planned workflow

1. Upload exactly one native Medexis PDF per patient, individually or in a batch.
2. Confirm identity and coverage, and select the insurer.
3. The AI proposes the sources per specialty by content; confirm or adjust them.
4. Generate a draft RHC with references and alerts for missing or contradictory information.
5. Make corrections and confirm the content review.
6. Copy fields or download Word; for batches, download a ZIP containing reviewed documents.

Only renewals are generated, in PAMI format for every insurer (PAMI, OSDE, Swiss Medical, Unión Personal, OSTVLA). Admissions are out of scope.

The whole exported history is used (about two months). For each specialty, the AI selects by content the latest meaningful entry and its supporting notes; note labels are hints only. Include all documented specialties and flag missing information; the system must not invent information to fill gaps.

The first version generates only RHC documents. It does not include OCR, a direct Medexis connection, automatic portal entry, or issuance of electronic medical orders (OME).

## Stack

- Next.js App Router, TypeScript, and React.
- Tailwind CSS and shadcn/ui for the interface.
- PDF.js in the browser and Zod for validation.
- PostgreSQL (Docker locally, Neon in production), Drizzle, and Better Auth for users, access, and permitted metadata.
- A direct API adapter for AI, with configurable provider and model.
- `docx` and JSZip for browser downloads.
- Vercel for hosting; Vitest and Playwright for testing.

Versions are pinned in `package.json`. File, batch, timeout and retry limits come from `src/lib/limits.ts` with the master document's defaults and can be overridden through environment variables.

## Privacy and test data

The application never retains PDFs, extracted notes, headers or patient identifiers. Generated drafts, corrected text and ratings are stored pseudonymously for feedback ([ADR-0003](docs/adr/0003-pseudonymous-rhc-storage.md)). Clinical work stays in tab memory and is lost when the tab closes, reloads, or the clinical session expires. Downloads remain on the user's device.

Users, technical audit records, ratings and pseudonymous RHC text are persisted. The AI provider's and hosting provider's effective retention conditions must be verified before processing real patient data.

Original clinical materials are used only in the authorized local environment. They must not be committed to version control or included in CI artifacts. Versioned fixtures must be synthetic; the supplied TXT files and screenshots may be reused locally to prepare tests, although they are not production inputs.

## Local reference materials

| Directory | Purpose |
| --- | --- |
| `docs/` | Specification and implementation decisions. |
| `propuesta/` | Original quote; option 1 was selected, with the adjustments recorded in the master document. |
| `documentos-cliente/` | Expected output examples and documentation supplied by the client. |
| `exports-medexis/` | Samples for research and authorized local testing. |
| `formularios-obras-sociales/` | References for portal fields. |

Directories containing sensitive materials may be absent from a repository checkout and are not runtime dependencies.

## Next steps

Evaluate selection and generation on more real exports locally, verify the provider's retention conditions and obtain Sienes' written confirmation for pseudonymous storage, then deploy on the owner's go. The planned Sienes pilot lasts two weeks; its contact person and dates will be coordinated before it starts.
