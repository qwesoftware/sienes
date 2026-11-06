---
name: compare-options
description: Compares 2–3 proven options for one technical decision on a visual page, with sources and a recommendation, then asks you to decide.
disable-model-invocation: true
license: MIT
metadata:
  author: ivandda
  version: "1.2"
---

# Compare Options

Help the user make one decision well: research proven options, compare them on what matters here, explain everything named, recommend, then let the user decide. The output is the page and the decision; code and specs come later.

## 1. Frame the decision

State the decision in one sentence ("How should dp-api-ai run its availability fan-out?"). One decision per run; if several are tangled, compare the one the others depend on first. Read what bears on it: the relevant code, `docs/ARCHITECTURE.md`, ADRs, specs, `GLOSSARY.md`. Facts come from the code and docs. The current approach is usually one of the options.

## 2. Pin the constraints

List the constraints that decide this choice, with values: load and growth, latency, cost, team skills, runtime and versions in use, operational burden, deadline, reversibility. Take values from the conversation and the code. If an unknown value would change the answer, ask for it in one round with the multiple-choice question tool (recommended answer first); otherwise state your assumption.

## 3. Research the options

- Pick 2–3 **proven** options: widely adopted, documented, stable releases. Include the current approach or the smallest change when it is viable. Alpha, beta or niche tech goes under "Also considered" with why it isn't an option yet, unless the user asks for it.
- Research each against primary sources: official docs (Context7 when available), vendor pages, release notes. Check it works with the project's versions (e.g. a Java feature vs the `pom.xml` release level).
- Every claim that drives the comparison (limits, pricing, version support, failure modes) gets a source link, or the mark `(unverified)`.

## 4. Build the page

Build from [references/page-template.html](references/page-template.html), omitting sections that would be empty:

- **In short** (first): 2–3 short paragraphs a developer new to this codebase can read alone: the problem and why it matters, each direction in one sentence, the recommendation in one sentence. Concepts only; class, file and function names live in Code evidence.
- **Code evidence** (collapsed): where the current behaviour lives (`path:line`), what it does, why it matters.
- **Constraints**: the table from step 2.
- **Options**: per option, **The idea** in one plain sentence, **How it would work here** in 2–3 sentences, a Mermaid diagram (≤ 10 nodes), pros, cons, effort, reversibility.
- **Comparison**: rows are the constraints from step 2. Each cell: a few words plus good / ok / poor.
- **What these are**: every technology, service, pattern or protocol named on the page, in 1–2 plain sentences for a capable developer who hasn't used it.
- **Recommendation**: the option, why it wins on the constraints, what would change the answer.
- **Sources**: the links from step 3.

Mermaid syntax: quote labels that contain punctuation (`a["POST /orders"]`) and write a comma or "and" where you would write `;` or `#`, which Mermaid reads as syntax. Write in English unless the user or the project's `AGENTS.md` / `CLAUDE.md` asks for another language.

Present it the best way available: an artifact or page-publishing tool when the agent has one (private by default); otherwise a self-contained `options-<slug>.html` in the OS temp dir, opened with `open` or `xdg-open`, giving its absolute path; plain chat (a table plus one line per option) only for a two-option decision with nothing worth drawing. The page is a working view and stays out of git; the decision lives in the spec and ADR.

## 5. Recommend and ask

In chat, give the page's **In short** text as it is on the page, then its path or link. Then ask with the multiple-choice question tool: one option per choice, recommended first, each with a one-line consequence. Wait for the answer.

## 6. Hand off the decision

- Give the chosen option and the rejected ones with a one-line reason each, in the shape of a spec's **Decisions** and **Rejected** lists. `/feature-spec` writes the spec; if one already exists, add them there.
- Call the Skill tool with "domain-modeling": it decides whether the decision deserves an ADR and writes it. Without that skill installed, write `docs/adr/NNNN-<slug>.md` as a title plus 1–3 sentences.
- If the user asked only for the comparison, stop here.
