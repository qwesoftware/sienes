# Sienes · Clinical History Summary Assistant

A project for generating draft clinical history summaries (RHC, from the Spanish resumen de historia clínica) from Medexis exports. Sienes staff review and correct the results before copying fields into health insurer portals or downloading a Word document.

Sienes web: https://www.sienes.com.ar/

## Current status

The project is in the specification stage. The functional scope is approved and the application stack and AI layer are decided ([ADR-0001](docs/adr/0001-ai-layer-agent-loop.md), [ADR-0002](docs/adr/0002-application-stack.md)); operational limits remain recommendations. Authentication runs inside the app with Better Auth ([ADR-0004](docs/adr/0004-self-hosted-better-auth.md)). The build is planned in [Application v1 build](docs/specs/app-v1-build.md); development runs against Postgres in Docker, and deployment waits for the owner's go.

The AI layer is a Vercel AI SDK agent loop calling the provider directly, with OpenAI as the preferred candidate subject to retention and quality validation. The production model will be selected through evaluation.

## Run locally

Requirements: Node 22+, pnpm 10, Docker Desktop, Python `pre-commit`.

```bash
pnpm install
cp .env.example .env.dev      # then set OPENAI_API_KEY if AI_PROVIDER=openai
pnpm db:up                    # Postgres 17 in Docker
pnpm db:migrate
pnpm dev                      # http://localhost:3000
pre-commit install            # once per clone
```

`pnpm verify` runs typecheck, lint, Vitest and Playwright; it must be green before a slice is committed. Test commands: `pnpm test`, `pnpm e2e`.

## Documentation

| Document | Contents |
| --- | --- |
| [Master document](docs/master-doc.md) | Primary implementation reference: scope, clinical rules, workflows, privacy, contracts, configuration, and acceptance. |
| [Stack and architecture](docs/stack-recomendado.md) | Decided technologies, responsibilities, data flow, and infrastructure and provider validation. |
| [Administrative data export](docs/exportacion-datos-administrativos.md) | Medexis research record. The XLSX export investigated is not a production input. |
| [RHC generation agent](docs/specs/rhc-generation-agent.md) | Agent design: Select, Generate, prompt modules, `check_references`. |
| [Application v1 build](docs/specs/app-v1-build.md) | Ordered build slices, verify loop, versions. |

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

Versions and concrete configuration will be pinned when implementation begins. File, batch, timeout, and retry limits are defined in the master document and must be easy to change through configuration.

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

First implement contracts, the parser, and the complete workflow with mocked AI and synthetic data. Then integrate and evaluate source selection and generation with the selected provider. Before the pilot, verify restricted access, storage rules, external retention, quality, and operational limits. The planned Sienes pilot lasts two weeks; its contact person and dates will be coordinated before it starts.
