---
name: architecture-map
description: Explains a codebase concepts-first and creates or updates docs/ARCHITECTURE.md. Use when onboarding to an unfamiliar repo, when the user asks how something works or where it is handled, asks to explain, visualize, map or document the architecture, a flow or the data model, or after changes to module boundaries, data flow or external integrations.
license: MIT
metadata:
  author: ivandda
  version: "1.2"
---

# Architecture Map

Give the user and future agents an accurate mental model of the codebase. **Concepts first, code second**: name the parts the way a person would explain the system ("Data pipeline", "Game server"), explain them in plain words, then say where the code lives. Every part corresponds to code you read.

## Choose the mode

- **Explain**: a question about one part ("how does X work?"). Answer in chat: one plain paragraph, 3–7 numbered steps naming parts, then the `path:line` references. Add a small diagram only if the flow branches or has many actors. Write files only if the user asks; when the answer would help future sessions, say where it belongs: existing behaviour in `docs/ARCHITECTURE.md` or the area's page, a decision in `docs/adr/`, an incident in `docs/investigations/`.
- **Map**: no `docs/ARCHITECTURE.md` yet. Explore, then write it from [references/template.md](references/template.md).
- **Update**: the doc exists. Find what changed since its `Updated:` commit (`git log --oneline <commit>..HEAD --stat`), then update the affected sections and the `Updated:` line.

## Explore

Read in this order and stop as soon as you have enough:

1. `README`, `docs/ARCHITECTURE.md`, `GLOSSARY.md`, `docs/adr/`, `docs/specs/`
2. Manifests and config: `package.json`, `pyproject.toml`, `docker-compose*`, `vercel.json`, `.env.example` (variable names reveal external services)
3. Entry points: app/router files, `main.py`, API routes, CLI entry points, workers and cron jobs
4. Data: ORM models, migrations, SQL schemas
5. Integrations: SDK imports and HTTP clients for third-party services
6. Hot spots: `git log --format= --name-only -n 200 | sort | uniq -c | sort -rn | head -20`

If steps 1–5 leave real gaps, delegate to a single subagent started with a fresh context window, and ask for conclusions with file paths.

## Follow the repo's conventions

- **Language**: English unless the user or the project's `AGENTS.md` / `CLAUDE.md` asks for another; existing docs in another language don't change that.
- **Location**: if an architecture or overview doc already exists under another name, update that one.
- **Link, don't repeat**: point to existing per-area docs and to `AGENTS.md` / `CLAUDE.md` for commands and rules.

## Naming and diagram rules

- **Human names**: call each part what it is for the reader ("Training", "Recipe models"), taking terms from `GLOSSARY.md` and the README when they exist. Use the same names in the overview, the diagram, the parts table and the flows; map each name to code only in the table's Code column, the flows' `Code:` line and the sharp edges.
- **Prose before pictures**: flows are numbered plain steps. A diagram earns its place by showing what steps can't: branching, many actors or a cycle.
- **Diagram budget**: one big-picture `flowchart` of ≤ 8 boxes, always; at most two more in the whole doc, each ≤ 8 nodes, messages or entities. If it doesn't fit, zoom out.
- Diagram labels are the human names; code lives in the tables and `Code:` lines.
- Mermaid syntax: quote labels that contain punctuation (`api["POST /orders"]`) and write a comma or "and" where you would write `;` or `#`, which Mermaid reads as syntax.
- If the user shares an Excalidraw file or wants to edit visually, see [references/excalidraw.md](references/excalidraw.md).

## Verify before finishing

- Every file path in the doc or answer exists (`ls` them).
- Every part, step and arrow traces to code you read: an import, a call, a foreign key. Mark anything unconfirmed `(unverified)` or remove it.
- Every Mermaid block renders: with `npx` available, run `npx -y @mermaid-js/mermaid-cli -i block.mmd -o /tmp/block.svg` per block; otherwise re-read each block against the rules above.
- With the `docs-maintenance` skill installed, its `scripts/check-docs.sh docs/ARCHITECTURE.md` runs the path, link and Mermaid checks above.
- The doc is ≤ ~120 lines, within the diagram budget, and links to other docs instead of copying them.
- The `Updated:` line holds today's date and `git rev-parse --short HEAD`.

Then tell the user what you mapped and list the `(unverified)` items and sharp edges worth their attention.
