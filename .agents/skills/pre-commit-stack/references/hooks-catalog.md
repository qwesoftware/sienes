# Hooks Catalog

Pick hooks only for surfaces the repo actually has. Revs are omitted on purpose: add the repo, then run `pre-commit autoupdate`.

## Contents
- Universal
- Python
- JS/TS
- Shell
- Docker
- Terraform / IaC
- GitHub Actions
- Docs and prose
- Security and supply chain
- Stage cheat sheet

## Universal

| Hook | Repo | Stage | Notes |
|---|---|---|---|
| `trailing-whitespace`, `end-of-file-fixer`, `mixed-line-ending` | `pre-commit/pre-commit-hooks` | pre-commit | Auto-fix |
| `check-yaml`, `check-toml`, `check-json` | `pre-commit/pre-commit-hooks` | pre-commit | Exclude JSONC (`tsconfig*.json`, `.vscode/`) from `check-json` |
| `check-merge-conflict`, `check-case-conflict`, `check-symlinks` | `pre-commit/pre-commit-hooks` | pre-commit | |
| `check-added-large-files` | `pre-commit/pre-commit-hooks` | pre-commit | `--maxkb=500` default |
| `detect-private-key` | `pre-commit/pre-commit-hooks` | pre-commit | Cheap; complements gitleaks |
| `gitleaks` | `gitleaks/gitleaks` | pre-commit | Default secret scanner. Add `detect-secrets` only if a second scanner is explicitly wanted |
| `commitizen` | `commitizen-tools/commitizen` | commit-msg | Conventional Commits. Skip `commitizen-branch` when branch protection + PRs already enforce it |

## Python

| Hook | Repo | Stage | Notes |
|---|---|---|---|
| `ruff-check --fix`, `ruff-format` | `astral-sh/ruff-pre-commit` | pre-commit | Replaces black, isort, flake8, pyupgrade, and most of Bandit (`S` rules) |
| `check-ast` | `pre-commit/pre-commit-hooks` | pre-commit | |
| `uv-lock` | `astral-sh/uv-pre-commit` | pre-commit | Keeps `uv.lock` in sync with `pyproject.toml` |
| `ty` or `mypy` (local, `uv run`) | `repo: local` | pre-push | Needs project deps, so use `language: system`, `pass_filenames: false` |
| `pytest` (local, `uv run`) | `repo: local` | pre-push | Only if the suite runs in under ~30 s; otherwise CI only |
| `bandit` | `PyCQA/bandit` | pre-commit | Only when Bandit reports are required; otherwise Ruff `S` covers it. Use `args: [-c, pyproject.toml]`, `additional_dependencies: ["bandit[toml]"]` |
| `deptry` | `fpgmaas/deptry` | pre-push | Unused or missing deps; for mature services |
| `pyproject-fmt` | `tox-dev/pyproject-fmt` | pre-commit | Optional TOML normalization |

## JS/TS

| Hook | Repo | Stage | Notes |
|---|---|---|---|
| `biome-check` | `biomejs/pre-commit` | pre-commit | Format + lint + import sort. Default for new repos |
| ESLint / Prettier (local, `npx`) | `repo: local` | pre-commit | Only if the repo already uses them. Run via the project's installed versions so config plugins resolve |
| `tsc --noEmit` (local) | `repo: local` | pre-push | Whole project, `pass_filenames: false` |

Never run Biome and Prettier on the same file types.

## Shell

| Hook | Repo | Stage |
|---|---|---|
| `shellcheck` | `shellcheck-py/shellcheck-py` | pre-commit |
| `shfmt` | `scop/pre-commit-shfmt` | pre-commit |

## Docker

| Hook | Repo | Stage |
|---|---|---|
| `hadolint-docker` or `hadolint` | `hadolint/hadolint` | pre-commit |

## Terraform / IaC

| Hook | Repo | Stage | Notes |
|---|---|---|---|
| `terraform_fmt`, `terraform_tflint` | `antonbabenko/pre-commit-terraform` | pre-commit | |
| `terraform_validate` | `antonbabenko/pre-commit-terraform` | pre-push | Needs `terraform init`; slow |
| `trivy config` | local / CI | manual or CI | Network and slow |

## GitHub Actions

| Hook | Repo | Stage | Notes |
|---|---|---|---|
| `actionlint` | `rhysd/actionlint` | pre-commit | Workflow syntax + shellcheck inside `run:` |
| `zizmor` | `zizmorcore/zizmor-pre-commit` | pre-commit | Workflow security (injection, excessive permissions) |
| `check-github-workflows` | `python-jsonschema/check-jsonschema` | pre-commit | Schema validation; skip if actionlint is present |

## Docs and prose

| Hook | Repo | Stage | Notes |
|---|---|---|---|
| `codespell` | `codespell-project/codespell` | pre-commit | Add `--ignore-words-list` for domain terms |
| `markdownlint-cli2` | `DavidAnson/markdownlint-cli2` | pre-commit | Docs-heavy repos only |
| `markdown-link-check` | `tcort/markdown-link-check` | pre-commit | Catches broken relative links. Keep it offline with a config whose `ignorePatterns` skips `^https?://`; check external links in CI |

Docs that name paths, link to files or carry status lines go stale silently. The `docs-maintenance` skill ships `check-docs.sh` (paths in backticks exist, relative links resolve, specs carry `Status:`, runbooks carry `Verified:`, Mermaid renders). As a hook, without the slow Mermaid step:

```yaml
- repo: local
  hooks:
    - id: check-docs
      name: docs paths, links and status lines
      entry: .agents/skills/docs-maintenance/scripts/check-docs.sh --no-mermaid
      language: system
      files: \.md$
```

Copy the script into the repo's `scripts/` folder when `.agents/skills/` isn't committed, and run it with Mermaid in CI.

## Security and supply chain

Keep out of the commit path; these are network-bound or slow.

| Tool | Where |
|---|---|
| `pip-audit` / `npm audit --omit=dev` | CI, or `manual` stage |
| `trivy fs` | CI |
| `gitleaks git` (full history) | Once at adoption, then CI |

## Stage cheat sheet

| Cost | Stage |
|---|---|
| < 1 s, per-file, deterministic | `pre-commit` |
| Whole-project but < ~30 s (type check, fast tests) | `pre-push` |
| Network, slow, or noisy | `manual` (`pre-commit run --hook-stage manual <id>`) or CI |
