# Product

<!-- impeccable:product-schema 1 -->

Written from `docs/master-doc.md` and the ADRs on 2026-11-07 without an interview; every fact below is confirmed there unless marked *inferred*.

## Platform

web

## Users

Sienes administrative and clinical staff in Argentina who prepare clinical history summaries (RHC) for insurer portals. They work from a desktop browser, several cases a day, often in batches, and copy fields by hand into PAMI, OSDE, Swiss Medical, Unión Personal or OSTVLA portals. One administrator creates and disables accounts; nobody else has extra privileges. *Inferred:* they are category-fluent in Medexis and the portals and value speed and trust over expression.

## Product Purpose

Turn a Medexis PDF export into a reviewed RHC renewal draft in PAMI format, with every sentence traceable to a dated note and every gap flagged, so staff review instead of writing. Success is a draft that needs few corrections and a review that takes minutes, at about 800 cases a month.

## Positioning

Drafts carry references to the exact source notes and alerts for missing or contradictory information; the system never fills gaps with invented text. Review is mandatory before copy or download.

## Operating Context

Sign in, upload one native Medexis PDF per patient (individually or up to 20 in a batch), confirm the header (patient, DNI, member number, insurer, CUD), let the AI propose the sources per specialty, confirm or adjust them, generate, correct, confirm the review, then copy fields or download Word (ZIP for batches). The session lives only in the browser tab: there is no case history. Staff terms: Revisé el contenido, informe, nota de evolución, Indicaciones.

## Capabilities and Constraints

- Renewals only, PAMI format for every insurer; admissions out of scope.
- PDF only, no OCR, no Medexis connection, no portal pre-filling, no electronic orders.
- No source material or identifier is persisted; drafts and corrections are stored pseudonymously (ADR-0003).
- Limits: 10 MB and 300 pages per PDF, 20 patients per batch, 2 concurrent generations.
- UI language: Spanish (Argentina). Code and docs in English.
- Stack: Next.js App Router, React, Tailwind 4, shadcn/ui on Base UI, PDF.js in the browser.

## Brand Commitments

Name: Sienes. Logo in `public/logo-blue.png` (lettering in the brand blue) and `public/logo.png` (white lettering, for dark surfaces). Theme tokens in `src/app/globals.css`. No other binding identity constraints recorded.

## Evidence on Hand

Synthetic fixture exports in `fixtures/exports/` (invented people). Real exports and staff-written RHCs exist only locally in git-ignored folders and must never appear in fixtures, screenshots, docs or prompts.

## Product Principles

- The reviewer stays in control: nothing is copied or downloaded before "Revisé el contenido".
- Every claim shows its source; every gap shows an alert.
- Familiar over expressive: the tool should disappear into the task.
- One case, one PDF, one explicit identity; never infer who a file belongs to.
- Fail loudly: an unreadable PDF or a failed generation says so and how to recover.

## Accessibility & Inclusion

Keyboard-driven review for repeated daily use; status changes announced; no product-specific standard beyond WCAG AA recorded.
