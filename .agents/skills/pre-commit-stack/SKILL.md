---
name: pre-commit-stack
description: Sets up, audits, or extends a repository's pre-commit hook stack (.pre-commit-config.yaml) so it runs from a clean clone. Use when the user wants to add, fix or review pre-commit, prek or git hooks, harden a repo's quality gates, or decide which checks run at commit, push or CI.
license: MIT
metadata:
  author: ivandda
  version: "2.3"
---

# Pre-commit Stack

Build a hook stack that is strict, fast on every commit, and runnable from a clean clone. One tool per concern; anything slow moves out of the commit path.

## 1. Inspect the repo

Read before proposing anything:

- `.pre-commit-config.yaml` / `.yml`, if present
- Manifests: `pyproject.toml`, `package.json`, `go.mod`, `Cargo.toml`
- Existing tool config: `ruff.toml`, `.eslintrc*`, `biome.json`, `mypy.ini`, `.yamllint`, `bandit.yaml`, `.gitleaks.toml`
- CI workflows (`.github/workflows/`), so local hooks and CI agree
- `CONTRIBUTING.md`, ADRs, or docs explaining why hooks were added or excluded

List the surfaces that exist (Python, JS/TS, shell, Dockerfile, Terraform, GitHub Actions, Markdown, YAML) and add hooks only for those.

Detect the runner: if the repo uses `prek` (a drop-in, faster pre-commit), keep it. The config format is the same; swap `pre-commit` for `prek` in the commands below.

## 2. Choose mode

- **Audit**: an existing config. Report problems (unpinned revs, duplicate tools, slow hooks in the commit stage, hooks that can't run from a clean clone, missing `commit-msg` install) before changing anything. The "start green" checks below apply here too: a Commitizen hook on a history that isn't Conventional Commits is a finding.
- **Create**: no config. Start from the matching template in `assets/` and trim it to the surfaces found in step 1.
- **Extend**: keep the existing stack and its documented exclusions; add only what step 1 justifies.

Ask the user only when the answer changes the result and isn't discoverable:

1. Is a slower commit acceptable, or should heavy checks run on `pre-push` / CI only? (Default: fast commit, heavy checks in pre-push or CI.)
2. Enforce Conventional Commits? (Default: yes, if the repo history already follows them.)
3. Paths to exclude (generated code, vendored code, data, migrations)?

## 3. Write the config

Templates (copy, then trim):

- Python: [assets/python.pre-commit-config.yaml](assets/python.pre-commit-config.yaml)
- JS/TS: [assets/node.pre-commit-config.yaml](assets/node.pre-commit-config.yaml)
- Any other surface: pick hooks from [references/hooks-catalog.md](references/hooks-catalog.md)

Rules:

- Set `default_install_hook_types: [pre-commit, commit-msg]` (add `pre-push` if any hook uses it), so a single `pre-commit install` wires everything.
- Set `default_stages: [pre-commit]`. Set `stages:` only on expensive hooks that must stay out of the commit path.
- Pin every `rev` to a tag. After writing, run `pre-commit autoupdate` to move pins to the latest releases; template revs are only a starting point.
- One tool per concern and one formatter per file type. Ruff replaces isort, pyupgrade, flake8, black, and most Bandit rules (`S`). Biome replaces ESLint + Prettier for JS/TS when the repo doesn't already use them.
- Prefer upstream hook repos. Use `repo: local` with `language: system` only when the hook must use the project's own environment (type checkers needing installed deps, test runners), and set `pass_filenames: false` for whole-project tools.
- Stage placement: formatters, syntax checks, and secret scanning in `pre-commit`; type checks and fast tests in `pre-push`; network or slow scanners (`pip-audit`, `trivy`, full test suites) in `manual` or CI.
- One global `exclude:` for generated, vendored, and lock files.

### Existing codebase: start green

On a repo with existing code, the first config must pass on the current tree without rewriting it:

1. Run each candidate hook once on all files in a temporary copy (`git worktree add`, or a copy of the repo) and count findings. Auto-fixing hooks run in place only after the user has approved the rewrites.
2. For hooks with findings, pick one per hook: fix them if they're few and mechanical; exclude legacy paths; or narrow the rules (e.g. Ruff `select` only the rules that pass today) and note the stricter target as a follow-up.
3. Auto-fixers that would rewrite many files (formatters, whitespace, end-of-file) go in as a separate "format the repo" commit, with the user's consent.
4. Enable Commitizen only if `git log --oneline -30` already follows Conventional Commits, or the user wants to start now.

## 4. Wire supporting config and dependencies

A hook that can't run from a clean clone is a bug. For each hook:

- Put tool config where the tool reads it (e.g. `[tool.ruff]` in `pyproject.toml`). Ruff baseline: `select = ["E", "F", "I", "UP", "B", "S", "RUF"]`, with `S101` ignored under `tests/`.
- Add `pre-commit` (or `prek`) as a dev dependency, e.g. `uv add --dev pre-commit`. If the lock file changes beyond that one package, say so in the report.
- Write comments in the config in the language of the repo's existing docs.
- For `repo: local` hooks, make sure the entry command exists after the standard setup (`uv sync`, `npm ci`).
- For Commitizen, add `[tool.commitizen]` only if the user wants version bumping too; the `commit-msg` hook works without it.

## 5. Install and verify

```bash
uv run pre-commit install           # installs every type in default_install_hook_types
uv run pre-commit run --all-files
```

If you can't write or run the config in place (permissions, a dirty tree), run it in a temporary copy before proposing it. Hand over only a config you have run; if running was impossible, say it's untested.

If any hook fails:

1. If the hook auto-fixed files (formatters, end-of-file), re-run; a second clean run is expected.
2. If it's a real finding, fix the code, or scope the hook with `exclude:` when the files are generated or vendored.
3. If it's a config error, fix the config and re-run.
4. Repeat until `run --all-files` passes twice in a row with no changes.

Then test the commit-msg hook without committing:

```bash
printf 'bad message\n' > .git/TEST_MSG
uv run pre-commit run commitizen --hook-stage commit-msg --commit-msg-filename .git/TEST_MSG   # must fail
printf 'feat: add x\n' > .git/TEST_MSG
uv run pre-commit run commitizen --hook-stage commit-msg --commit-msg-filename .git/TEST_MSG   # must pass
rm .git/TEST_MSG
```

Without uv, drop the `uv run` prefix.

If CI exists, make it run `pre-commit run --all-files` (or use `pre-commit/action`), so skipped local hooks (`--no-verify`) are still caught.

## 6. Report

Summarize: hooks added, removed, or kept, with a one-line reason each; which stage each runs in; anything intentionally excluded. If the repo has a CONTRIBUTING or README dev-setup section, add the install command there.

## Gotchas

- `pre-commit install` without `default_install_hook_types` installs only the `pre-commit` hook type, so commit-msg checks silently never run.
- `check-added-large-files` defaults to 500 KB; raise it with `--maxkb` only with a reason.
- Gitleaks scans staged changes; on a first adoption or an audit, run `gitleaks git` once over history yourself and report findings separately. Confirm a false positive by reading the line (e.g. `"tokenizer": config.model_name`), then silence that one line with a `# gitleaks:allow` comment or its fingerprint in `.gitleaksignore`. The rule itself stays on.
- Ruff's `--fix` in `pre-commit` must run before `ruff-format`.
- `language: system` hooks are not isolated: they break if the developer hasn't run the project's setup command. Document that command.
