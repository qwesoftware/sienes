---
status: accepted
---

# Case runner: one attempt lifecycle behind a transport seam

On November 6, 2026 the browser store carried two copies of the attempt lifecycle (analyze and generate), the batch loop decided the next step by reading state strings through a synchronous mirror of the reducer, the scripts kept their own copy of the source projection, and the UI decided when feedback was sent; the duplication had already shipped two bugs (failed generations never retried by the batch, edit reasons chosen after review never stored). We decided to move the lifecycle into a framework-free case runner (`src/case/runner.ts`) that reads a case record, calls a transport (`select`, `generate`, `feedback`) and emits reducer actions. The browser store drives it with the HTTP transport; `src/ai/run-case.ts` drives it with an in-process transport for `ai:smoke` and `ai:real`, so both paths share one projection and one lifecycle. Feedback sync is a reducer fact (`feedbackStatus: "stale"`) acted on by one store effect, never by UI components.

## Consequences

- The reducer is applied once per action again; the store has no state mirror. The batch cap is enforced by the reducer.
- The runner is unit-tested with a fake transport (retry, cancel, late responses, batch step, feedback sync); Playwright covers the HTTP adapter.
- A new clinical step is one transport method and one runner function, not a copy of the store code.
