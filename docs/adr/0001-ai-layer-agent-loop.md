---
status: accepted
---

# AI layer: Vercel AI SDK agent loop with in-process, read-only tools

Each case needs two schema-validated AI calls (select sources, generate the RHC), clinical text must reach only the chosen provider, the provider must be swappable (OpenAI preferred, Claude a candidate), and the team wants an agent loop from the start so rules can grow as small prompt modules instead of one large prompt. We will use the Vercel AI SDK (`ai`, `ToolLoopAgent`) with provider packages (`@ai-sdk/openai`, `@ai-sdk/anthropic`), Zod structured output, SDK retries off and `abortSignal` cancellation; tools are in-process and read-only only (in version one a single `check_references` tool that verifies citations against the provided sources), the model selects the sources by content because note labels are unreliable, and the app selects the prompt modules from the insurer. No bare-string model ids (they route through Vercel's AI Gateway), no sessions or memory, and no platform Agent Skills (they require hosted containers).

## Considered options

- Official vendor SDKs behind a thin adapter: fewest dependencies and full control of retention flags, but no agent loop and two SDKs to keep aligned.
- OpenAI Agents SDK: guardrails and handoffs built in, but OpenAI-first, tracing exported to OpenAI by default, still 0.x.
- Separate Python service (FastAPI): second deploy, duplicated Zod/Pydantic contracts, another retention surface; rejected for ~800 cases/month.

## Consequences

- A lint rule or review check forbids string model ids; provider instances only.
- Vendor retention flags (for example OpenAI `store: false`) pass through `providerOptions` and are verified on the wire before real data.
- The master document's "no tools" rule becomes "no external tools": tools never call the network, write, or persist.
