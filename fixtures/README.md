# Fixtures

Synthetic Medexis-like exports for tests and local development. Every person, clinician, number and clinical fact is invented; the layout copies the real print so the parser is exercised the same way.

- `cases.ts` describes each case and what the parser must find in it.
- `scripts/make-fixtures.ts` renders `exports/*.pdf` from it: `pnpm fixtures`.
- `exports/sin-texto.pdf` has no text layer and must be rejected.

Real exports stay outside the repository (see `AGENTS.md`).
