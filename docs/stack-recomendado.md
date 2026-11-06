# Recommended Stack for the RHC Assistant

Status: stack and AI layer decided on November 6, 2026 ([ADR-0001](adr/0001-ai-layer-agent-loop.md), [ADR-0002](adr/0002-application-stack.md)); operational limits are recommendations; AI provider and model pending validation. Audience: developers.

## Recommendation

A Next.js application with TypeScript, React, Tailwind CSS, and shadcn/ui. Frontend and API in the same project, deployed on Vercel. PostgreSQL on Neon for users, sessions, technical auditing, and feedback without patient data. Drizzle for schema and migrations. Neon Auth with Managed Better Auth for authentication; the application limits administrative operations to creating and disabling users. It must prevent public signup on the server and revoke sessions when an account is disabled. Hiding the signup form is insufficient. Verify the configuration for closed signup and permissions in the integration before finalizing this choice.

This choice avoids a separate Python backend for a workflow of approximately 800 cases per month and keeps shared data contracts across the interface, parser, and server. Compatible stable versions and a lockfile will be pinned when implementation begins, without relying on the latest tag in production.

| Layer | Proposed technology | Responsibility |
| --- | --- | --- |
| Application and API | Next.js App Router, TypeScript, Node.js runtime | Screens, authentication, authorization, generation, and feedback. |
| Interface | React, Tailwind CSS, shadcn/ui | Import, source review, section editing, and user administration. |
| PDF reading | PDF.js, distributed as pdfjs-dist, in a browser worker | Extract text and positions, reconstruct headers and notes, and maintain page references. |
| Validation | Zod | Source and result schemas; mandatory validation on the server as well. |
| AI | Vercel AI SDK agent loop (`ToolLoopAgent`) with provider packages, decided in [ADR-0001](adr/0001-ai-layer-agent-loop.md); OpenAI API as preferred candidate subject to validation; GPT-6 Luna as the first model candidate | Structured synthesis with in-process, read-only tools and app-selected prompt modules; no external tools, no gateway, no sessions. The concrete model is selected through evaluation and is not fixed by this proposal. |
| Permitted persistence | PostgreSQL on Neon and Drizzle | Users/profiles, technical events, categorized feedback, and versions. No patient, document, or summary tables. |
| Authentication | Neon Auth, Next.js integration | Identity and sessions, with application authorization at every endpoint. |
| Downloads | docx and JSZip in the browser | Word per patient and batch ZIP, without saving files on the server. |
| Testing | Vitest and Playwright | Parser, rules, contracts, authorization, review, downloads, batches, and non-persistence controls. |
| Hosting | Vercel, function region `gru1` (São Paulo) | Web and endpoints; explicit no-cache configuration and logs without clinical bodies. |

## Data flow

1. The browser reads the local PDF. The original file is not uploaded to storage or the AI provider.
2. PDF.js extracts blocks and positions in a worker. The application identifies the patient from the header and separates the notes. The user confirms identity and coverage.
3. Administrative fields are separated from clinical content, and the cutoff date is applied. A first structured call classifies notes and their clinical areas; the application applies temporal selection and allows ambiguities to be reviewed. Length or latest date alone does not determine whether a note is a complete report.
4. A second call generates the RHC from selected sources and relevant clinical context. At each endpoint, the API authenticates, verifies that the user is enabled, checks contracts and limits, processes in memory, and calls the provider. The key is never exposed to the browser. There is no call per specialty.
5. Schema, reference existence, and numerical consistency are validated; these checks do not certify semantic fidelity. The interface displays the draft and alerts; identifying data is added in the browser. Human review remains necessary.
6. Editing, review confirmation, and downloads run in the tab. Documents and drafts are not saved in PostgreSQL, localStorage, sessionStorage, IndexedDB, or a service worker.
7. Edit and error events use separate contracts accepting only predefined metadata; they do not receive the full clinical object or free-text fields.

Separating administrative data reduces the data sent but does not automatically anonymize clinical text. Incidental identifiers and unnecessary content must be removed, without promising infallible anonymization. The AI provider will still process clinical content on the application's behalf.

This does not mean PDF.js can never run on the server in tests, but the recommended production path performs extraction in the browser. The parser uses positions to avoid depending on linear extraction order. It must treat documents and text as untrusted data.

## Batches and non-persistence

The case queue lives in tab memory. Each request processes one patient. The recommended initial concurrency is two cases per tab, configurable and subject to provider limits and testing. The server also applies per-user and global limits because browser controls can be bypassed.

There are no durable queues, object stores, vector databases, file search, or background AI jobs that retain content. Closing or reloading loses the work. Cancellation uses AbortController and cancellation signals, without promising an immediate stop at the provider or avoiding costs for requests already sent.

Local PDF size and the payload sent to the server are separate limits. Vercel documents a 4.5 MB maximum for Functions request/response bodies. A lower maximum will be set for the structured payload, together with token limits; the entire batch will not be sent in one request. Oversized documents are rejected with a clear message, without silently trimming the history. Local extraction avoids uploading the binary but does not remove the need to limit text and duration.

Analysis and generation run as separate requests. The browser coordinates the single permitted transient-error retry per call, with SDK automatic retries disabled. The 120 seconds apply per attempt at each stage; the complete case may take longer. A response must match the case's current attempt and revision before it can be applied. The master document defines states and their invalidation after edits, cancellation, or expiration.

## Authorization and persistence

Standard users and the administrator share the clinical workflow. The administrator's only additional capabilities are creating and disabling users. The UI does not expose other identity-provider capabilities. The first administrator is provisioned outside public signup, through a documented deployment procedure. Protect the last administrator from accidental disabling and verify active status on every sensitive request.

Proposed permitted entities: user profile (role and status), user audit records, technical events, edit events, categorized feedback, and evaluation version. The identity provider manages credentials and sessions. None of these tables receives patient fields or clinical text. The developer must specify the schema and authorization policies before running migrations. The master document specifies configurable initial limits, simple section editing, and clinical-session expiration.

Prompts and schemas are versioned in the repository. Events record that version and the model identifier used. Reviewing metrics supports proposed changes and fixture-based verification; each edit does not automatically retrain the model or modify the prompt.

## AI provider retention

A direct API is recommended, without Managed Agents. OpenAI is the preferred candidate provider for generation through a stateless API with structured output. GPT-6 Luna (gpt-6-luna) is the first model to evaluate; its quality is not yet approved and it is not fixed for production. Use with real patient data is not yet approved. The concrete model, endpoint, and configuration must be checked against the project's retention requirement.

OpenAI documentation distinguishes response storage, abuse-monitoring logs, and caching. store:false alone does not guarantee zero retention. Zero Data Retention controls require eligibility/approval and have capability-specific exceptions. This must be resolved using the actual account and contract before production. If a compatible configuration cannot be obtained, another provider must be evaluated or a different policy explicitly agreed; the design cannot promise zero retention merely because it does not write to PostgreSQL.

No AI gateway is added by default: it would introduce another service whose retention conditions would need verification. The provider adapter allows changing APIs without changing the interface or RHC contract.

## Validation and costs

Reuse the supplied TXT files and screenshots to develop normalized fixtures and authorized local tests. Version only synthetic variants. Create synthetic PDFs for integration tests without treating them as evidence of Medexis compatibility. Maintain parser tests on representative real native PDFs in a restricted environment, outside public CI and without retained clinical artifacts.

Select the model and adjust limits after measuring fidelity, specialty coverage, corrections, latency, and cost per case. Evaluate the parser, classification, temporal selection, and generation separately. Successful synthesis from a TXT file does not prove the parser works.

This recommendation does not validate the service budget. Measure input/output tokens and retries across both stages, project 800 monthly cases, and add hosting, identity, and database costs. Earlier cost examples assuming a single call per case are not a budget for this architecture. The Sienes pilot will measure quality and actual usage without capturing clinical histories in telemetry.

## Verified technical sources

- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- PDF.js API and text extraction: https://mozilla.github.io/pdf.js/api/draft/api.js.html
- Neon Auth Admin: https://neon.com/docs/auth/guides/plugins/admin
- Vercel Functions and limits: https://vercel.com/docs/functions/limitations
- Word generation with JavaScript: https://docx.js.org/
- OpenAI data controls: https://developers.openai.com/api/docs/guides/your-data

## Anthropic Managed Agents evaluation

Evaluated at the team's request after the application-stack recommendation. The recommendation is not to use Managed Agents for RHC under the current clinical non-persistence policy. The service targets extended autonomous tasks with managed sessions and tools. Its documentation states that history persists until the session is deleted and that Managed Agents is not eligible for Zero Data Retention, even with a self-hosted sandbox. Deleting at the end is not equivalent to avoiding persistence.

The RHC workflow needs controlled source selection, structured synthesis, and human review; it does not require an agent that executes commands, browses, or maintains durable sessions. Claude through the Messages API is a candidate for the direct AI adapter. The effective retention conditions of the selected account, model, and features must be checked; endpoint eligibility does not guarantee zero retention for every model or configuration. Neither Anthropic nor a specific Anthropic model has been selected.

Verified sources: https://platform.claude.com/docs/en/managed-agents/overview , https://platform.claude.com/docs/en/managed-agents/secure-deployment-monitoring and https://platform.claude.com/docs/en/manage-claude/api-and-data-retention .

## Recommended operational configuration

Only one native Medexis PDF per patient. Configurable initial limits: 10 MB, 300 pages per PDF, 20 patients per batch, and 2 concurrent cases per tab. A 120-second timeout per attempt at each stage and one additional transient-error retry per call. No automatic model fallback. A clinical session with a 30-minute inactivity timeout and advance warning. Details and criteria for review, ease of use, telemetry, and the two-week pilot are defined in master-doc.md, which is the implementation reference.
