---
name: feature-spec
description: Turns the design agreed in this conversation into a one-page spec at docs/specs/<feature>.md, or changes an existing spec's status.
disable-model-invocation: true
license: MIT
metadata:
  author: ivandda
  version: "1.3"
---

# Feature Spec

Turn an agreed design into a spec short enough to be read, kept as a record for future agents. Synthesize what was already discussed; this is not an interview.

## 1. Gather context

- **Docs**: read `GLOSSARY.md`, `docs/ARCHITECTURE.md` and the existing specs and decision records. If a spec for this feature exists, update it.
- **Conventions**: use the repo's existing location and naming for specs and decisions (e.g. `docs/decisions/YYYY-MM-DD_*.md`, `adr/`, kebab vs snake case). `docs/specs/` and `docs/adr/` are for repos that have none yet.
- **Language**: English unless the user or the project's `AGENTS.md` / `CLAUDE.md` asks for another; existing docs in another language don't change that.
- **Code**: check what already exists for this feature. The spec covers the delta and says briefly what it builds on.

## 2. Close open decisions

List the decisions the spec needs. Ask about the ones still open, in one round, each with your recommended answer (multiple-choice question tool when available).

Agreed decisions are the user's. If the code or a repo convention conflicts with one, keep the decision in the spec and raise the conflict under Open questions.

## 3. Write the spec

Path: the repo's spec location from step 1, else `docs/specs/<feature-slug>.md`. Omit any section that would be empty:

````markdown
# <Feature name>

Status: draft · Updated: <YYYY-MM-DD>

## Problem
<2–4 sentences, from the user's point of view.>

## Solution
<2–5 sentences: what changes for the user and, briefly, how.>

## Decisions
- <Decision>: <why>. <(ADR-NNNN) if recorded>

## Rejected
- <Option>: <one-line reason>

## Diagram
```mermaid
<one flowchart, sequenceDiagram, or erDiagram showing the core of the change>
```

## Slices
1. [ ] <Vertical slice with a user-visible outcome>. Verify: <test or check>

## Rollout
- <Only when the change spans repos or needs an order: migrations, images, config, and how to roll back.>

## Out of scope
- <What this deliberately does not do>

## Open questions
- <Undecided item>: <assumption used, if any, and what would settle it>
````

## 4. Record ADRs

For each decision that might deserve a record, call the Skill tool with "domain-modeling": it decides whether the decision qualifies and writes the ADR in the repo's format. Link each record from the spec's Decisions list. Without that skill installed, write `docs/adr/NNNN-<slug>.md` as a title plus 1–3 sentences (context, decision, why).

## 5. Check against the rules

- The spec fits on one screen (target ≤ 60 lines, hard limit 100).
- Terms match `GLOSSARY.md` when it exists.
- Every agreed decision appears unchanged; every undecided item is under Open questions.
- Location, file name and language follow step 1.
- The spec names concepts and decisions; code or a schema appears only when it *is* the decision.
- Every slice is vertical (end-to-end and demoable) and has a concrete "Verify:" check.
- The diagram has ≤ ~15 nodes and shows one idea. Mermaid syntax: quote labels that contain punctuation (`A["POST /orders"]`) and write a comma or "and" where you would write `;` or `#`, which Mermaid reads as syntax.

Then give the user the path and a 2-line summary.

## Lifecycle

Specs are records, not deleted: they are context for future agents. Fix factual errors in place.

- Work starts: `Status: building`. Tick slices as they land.
- Shipped: `Status: shipped`, update `Updated:`, and update the living docs the change affects (`ARCHITECTURE.md`, README, runbooks) in the same PR. If what shipped differs from the spec, fix the spec so it describes reality.
- Replaced: `Status: superseded by [<new spec>](<new-spec>.md)`, and leave the body as is.
- Dropped without a replacement: `Status: abandoned` with a one-line reason.
