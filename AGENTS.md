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
- Real exports may be run through the app locally with the key in `.env.dev` within the agreed budget; their text and the drafts made from them never appear in chat, commits or fixtures.

## Accounts

Vercel and Neon resources belong only to the info@qwesoftware.com accounts (ADR-0002).

## Language

English for code, comments, docs and commits. User-facing strings are Spanish (Argentina); keep the staff's own terms (Revisé el contenido, informe, nota de evolución).

## Docs

- Living docs (`docs/ARCHITECTURE.md`, `GLOSSARY.md`, README) describe the present: rewrite or remove what is stale. ADRs and specs are records: mark them `superseded by <link>` or `abandoned`, fix facts in place, never delete.
- A behaviour change updates the living docs it affects in the same PR. Each fact has one home; everything else links to it.
- Decisions go in `docs/adr/NNNN-slug.md` (a few sentences), features in `docs/specs/<feature>.md` (one page), investigations in `docs/investigations/<YYYY-MM-DD>-<slug>.md`.
- Diagrams are Mermaid.
