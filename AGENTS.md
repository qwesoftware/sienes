# Sienes RHC assistant

Draft clinical history summaries (RHC) from Medexis PDF exports, reviewed by Sienes staff. The app lives at the repository root; the code map is `docs/ARCHITECTURE.md`, the build record is `docs/specs/app-v1-build.md`. Deployment is prepared (`vercel.json`, README runbook) but must not be executed without the owner's go.

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
- AI: prompt modules in `prompts/` (`core.md`, `select.md`, `generate.md`, `insurer/<name>.md`; PAMI is the general module, each file carries a `version:` front matter line) composed by `src/ai/modules.ts`; the model comes from `src/ai/model.ts` (`AI_PROVIDER=mock` uses `src/ai/mock.ts`, a deterministic stand-in that reads the notes from the prompt); runs live in `src/ai/select.ts` and `src/ai/generate.ts` (the `check_references` tool and the app-side validation that turns dangling references and unsupported quantities into alerts) and are exposed by `src/app/api/select/route.ts` and `src/app/api/generate/route.ts`. The Word document is built in `src/word/rhc-docx.ts`. Clinical bodies go through `readClinicalBody` (`src/lib/clinical-request.ts`) and failures through `toHttpError` (`src/ai/errors.ts`), which never forwards a provider message.
- Tab state: `src/case/` (reducer, types, idle timer, `WorkspaceProvider`); `src/case/runner.ts` is the case runner (ADR-0005): `createRunner({ transport, emit, retries })` owns the attempt lifecycle of analyze and generate, the source projection (`sourcesOf`), the batch step (`runPending`) and `syncFeedback`; the store drives it with the HTTP transport and `src/ai/run-case.ts` with an in-process one. Feedback is sent by a store effect whenever a reviewed case has `feedbackStatus: "stale"` (set by the reducer on confirmation, rating, edit reason or retry); UI components only dispatch. Pure helpers: `src/case/insurer.ts` (insurer proposed from the coverage text), `src/case/pending.ts` (alerts split into gaps and checks; only checks ask before confirmation), `src/case/summary.ts` (`zipPartition`, `clearSummary`, `nextPendingId`). The idle timeout locks the tab (`locked` in the state; `lock`/`unlock` actions; unlock verifies the password with a Better Auth sign-in) instead of clearing it. The workspace UI is `src/components/workspace/`: a queue of cases at the left and one stage per case at the right (Datos, Fuentes, Revisar, Copiar; `src/case/stage.ts`, ADR-0006), with `confirmCase` in the store starting what comes next (`afterConfirm`); copy and download check `reviewedRevision === revision`; `downloadedRevision` records downloads; `discard-draft` is dispatched by "Cambiar fuentes". The account menu is `src/components/layout/account-menu.tsx` (Usuarios and Cambiar contraseña are full navigations, so the warning before unload protects the cases); the logo is `public/logo-blue.png` (`src/components/brand/wordmark.tsx`, and the Word header through `src/word/logo.ts`). The PDF.js worker is copied to `public/` on install.
- Real model: `pnpm ai:smoke [fixture] [insurer]` runs both stages in process with the configured provider on a synthetic fixture and prints the result, tokens and cost; `pnpm ai:real [--drafts] [--limit=n] [--budget=usd]` does the same over the local real exports (PDF through the parser; Medexis JSON note exports saved as `.txt` through `scripts/medexis-json.ts`, a local-only adapter with no header) and prints counts only unless `--drafts` is given. Both go through `src/ai/run-case.ts`. Structured-output schemas must not use `.default()` or optional keys: the OpenAI strict JSON schema rejects them.
- Batch: `runQueue` (`src/case/queue.ts`) runs the confirmed cases with `BATCH_CONCURRENCY` in flight; each job is the runner's `runPending` (analyze if the case has no selection, then generate), so cases in error or canceled are retried from the stage they lack; `cancelBatch` aborts what is in flight. `src/word/rhc-zip.ts` packs reviewed cases only (partition in `src/case/summary.ts`), with `excluidos.txt` naming the rest. The Word and ZIP builders are imported lazily from the components.
- Feedback (ADR-0003): tables in `src/db/feedback-schema.ts` (`rhc_case`, `rating`, `edit_event`, `technical_event`); `POST /api/feedback` validates the strict `feedbackSchema` (`src/contracts/feedback.ts`) and `storeFeedback` upserts by case token; the select and generate routes record technical events through `recordEvent`, whose failure is logged by kind only. A feedback failure shows a notice and never blocks copy or download.
- Auth: Better Auth in `src/lib/auth.ts`; its HTTP route answers only sign-in, sign-out and get-session (everything else is reached server-side through `auth.api`). Route handlers get the session through `requireUser`/`requireAdmin` (`src/lib/session.ts`) and wrap with `handle` (`src/lib/http.ts`); a 401 carries `code: "expired" | "disabled"` and the store's `leave` clears the tab and goes to sign-in with the reason. Admin operations live in `src/lib/users.ts`; `pnpm user:reset-password --email=…` resets a password without an admin session.
- `/verify` (`.claude/skills/verify/SKILL.md`) is the full proof including the real model: `pnpm verify`, then `pnpm e2e:real` (`playwright.real.config.ts`, `tests/e2e-real/`, port 3101, `AI_PROVIDER=openai`) and `pnpm ai:smoke` per fixture, with a cost gate.
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
