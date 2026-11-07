---
name: verify
description: Run the full verification of the app, including real gpt-6-luna runs, and report what passed, what failed and what it cost.
disable-model-invocation: true
---

# Verify

Prove the whole app works: the automated loop on the mock model, then every clinical functionality against the real model. Report faithfully: a failure is reported with its output, never retried into green by weakening a check.

Preconditions (stop and say which one is missing): Docker Postgres up (`pnpm db:up`), `.env.dev` with `OPENAI_API_KEY`, no `next dev` running on ports 3100 or 3101.

## Steps

1. **Mock loop.** Run `pnpm verify`. Done when typecheck, lint, Vitest and the mock Playwright suite are all green.
2. **Real end to end.** Run `pnpm e2e:real` (Playwright with `AI_PROVIDER=openai`, port 3101; see `playwright.real.config.ts` and `tests/e2e-real/`). It covers sign-in, forced password change, user administration, a single case through real selection, generation, review, feedback storage and Word, and a two-case batch with ZIP. Done when every test passes; on a failure, read the trace in `test-results/` and classify it: app bug, model variance, or test assumption. A model-variance failure is a finding, not a flake to re-run.
3. **Smoke on every fixture.** Run `AI_PROVIDER=openai pnpm ai:smoke <fixture> <insurer>` for the three fixtures in `fixtures/exports/` (A with `osde`, B with `pami`, C with `swiss-medical`). Done when each prints a draft that passes the schema and its token, latency and cost line.
4. **Cost gate.** Sum the cost lines from steps 2 and 3 (step 2's cost is in the `technical_event` table: `select sum(input_tokens), sum(output_tokens) from technical_event where created_at > now() - interval '1 hour'`, priced with `costUsd` in `src/ai/run-case.ts`). Stop and say so if the total goes past `AI_BUDGET_USD` (default 0.50).

## Report

One table: step, result, duration, cost. Then findings, each with the file or trace that shows it, and whether it is a bug, model variance or a test assumption. Finish with the total cost.
