# Sienes RHC assistant

Draft clinical history summaries (RHC) from Medexis PDF exports, reviewed by Sienes staff. Build plan in `docs/specs/app-v1-build.md`; the app lives at the repository root.

## Read first

- `docs/master-doc.md`: the implementation reference. Its confirmed functional decisions win over any other document.
- `docs/stack-recomendado.md`: architecture and data flow. Decisions in `docs/adr/`, specs in `docs/specs/`, terms in `GLOSSARY.md`.
- Use the glossary's terms in code, docs and chat: report vs progress note, source, reference, alert, revision, attempt.

## Patient data

- `documentos-cliente/`, `exports-medexis/`, `formularios-obras-sociales/` and `propuesta/` hold real patient and client material. They are git-ignored; keep them that way. Never copy their content into fixtures, tests, logs, prompts, issues, commits or chat.
- Fixtures are synthetic. A real export may be read locally to shape a fixture; the fixture itself contains invented people.
- No source material or identifier is persisted: no PDF, notes, header fields or file names in the database, logs, telemetry, caches or error messages. Drafts, corrected text and ratings are stored only pseudonymously (ADR-0003).
- Real exports may be run through the app locally with the key in `.env.dev` within the agreed budget. Their text and the drafts made from them never enter commits, fixtures, logs or issues; during the build phase the owner allowed reading generated drafts in chat to debug prompts.

## Run and verify

- `pnpm db:up` starts Postgres in Docker; `pnpm db:migrate` applies `drizzle/`; `pnpm db:seed` creates the first admin from `ADMIN_*` env vars; `pnpm dev` serves on port 3000 reading `.env.dev`.
- Vitest integration tests use the `sienes_test` database (created and migrated by the global setup); Playwright seeds `admin@e2e.test` into the dev database.
- Contracts are Zod schemas in `src/contracts/` (case, draft, ai, telemetry). The Medexis parser is pure (`src/parser/medexis.ts`, positioned lines in, `ParsedExport` out); PDF.js extraction is `src/parser/pdf.ts` with Node and browser entry points. Specialty labels resolve through `src/parser/specialties.ts`.
- Fixtures: `fixtures/cases.ts` + `pnpm fixtures` render `fixtures/exports/*.pdf`; `pnpm parse:real` prints structure counts for the local real exports (never content).
- Auth: Better Auth in `src/lib/auth.ts`; route handlers get the session through `requireUser`/`requireAdmin` (`src/lib/session.ts`) and wrap with `handle` (`src/lib/http.ts`). Admin operations live in `src/lib/users.ts`.
- `pnpm verify` is the definition of done for a slice: typecheck, lint, Vitest (unit and integration against Docker Postgres) and Playwright (`tests/e2e`, mock model, port 3100).
- Hooks: `pre-commit install` once; commit runs eslint and tsc, push runs Vitest. Commits follow Conventional Commits.
- UI is shadcn/ui on Base UI (`src/components/ui`, generated, not hand-edited); theme tokens live in `src/app/globals.css`.

## Accounts

Vercel and Neon resources belong only to the info@qwesoftware.com accounts (ADR-0002).

## Language

English for code, comments, docs and commits. User-facing strings are Spanish (Argentina); keep the staff's own terms (Revisé el contenido, informe, nota de evolución).

## Docs

- Living docs (`docs/ARCHITECTURE.md`, `GLOSSARY.md`, README) describe the present: rewrite or remove what is stale. ADRs and specs are records: mark them `superseded by <link>` or `abandoned`, fix facts in place, never delete.
- A behaviour change updates the living docs it affects in the same PR. Each fact has one home; everything else links to it.
- Decisions go in `docs/adr/NNNN-slug.md` (a few sentences), features in `docs/specs/<feature>.md` (one page), investigations in `docs/investigations/<YYYY-MM-DD>-<slug>.md`.
- Diagrams are Mermaid.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
