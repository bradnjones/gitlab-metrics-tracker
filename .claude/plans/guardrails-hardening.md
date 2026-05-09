# Plan: Harden AI/Claude Guardrails & Project Quality Gates

**Status:** Approved, ready for implementation
**Author:** Planned via Claude Code plan mode
**Date:** 2026-05-09
**Working file path:** `.claude/plans/guardrails-hardening.md`

## Context

The project has the right *tools* installed (ESLint, Prettier, Jest with 85% coverage threshold) but most are **unconfigured shells**: ESLint has no rules, Prettier has no config, there are no git hooks, no `.editorconfig`/`.nvmrc`, no CI, and no Claude `hooks` block. The "agents-first, TDD-first, trunk-based" discipline in `.claude/CLAUDE.md` is enforced by convention only — there's nothing stopping a bad commit from landing on `main`.

This plan adds enforceable guardrails at three layers:

1. **Static config** — actually configure ESLint, Prettier, EditorConfig, Node version pinning so `npm run lint`/`format` produce real signal.
2. **Git hooks** — `husky` + `lint-staged` so the gate runs automatically on commit/push.
3. **Claude hooks** — `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SessionStart` hooks for AI-specific safety: enforce the rules in `CLAUDE.md`/global prefs, scan for secrets, auto-format, automate the post-push Docker rebuild, inject context.

**Outcome:** Claude (and humans) can't push lint-broken or test-broken code to `main`, every file Claude edits gets auto-formatted, the manual "rebuild Docker" step is automated, branch/PR creation is blocked by default (this project is trunk-based), and `--no-verify` is blocked unless explicitly requested.

---

## Final hook set (11 total)

| # | Hook event | Matcher | What it does |
|---|---|---|---|
| H1 | PreToolUse | Edit/Write `**/.env*` | Hard-deny |
| H2 | PreToolUse | Bash matching `git push*` | Run `npm test && npm run lint`; block on failure |
| H3 | PreToolUse | Bash matching `*--no-verify*` | Hard-deny (per global prefs) |
| H4 | PreToolUse | Bash matching `git checkout -b*`, `git switch -c*`, `gh pr create*` | Hard-deny (project is trunk-based) |
| H5 | PreToolUse | Bash matching `git commit -m*` | Validate `^(feat\|fix\|refactor\|test\|docs\|chore): .+ \(#\d+\)$` |
| H6 | PreToolUse | Edit/Write outside project root | Hard-deny (paths under `/tmp/` allowed) |
| H7 | PostToolUse | Edit/Write matching `src/**/*.{js,jsx,css}` | `prettier --write "$file"` |
| H8 | PostToolUse | Bash matching `git push origin main*` | `docker compose up --build -d` (background, logs to `.claude/hooks/docker-rebuild.log`) |
| H9 | PostToolUse | Bash (any) | Secret-scan stdout for `glpat-`, `ghp_`, `ghs_`, `xox[baprs]-`, AWS access keys, JWT-shaped strings |
| H10 | UserPromptSubmit | always | Inject `[branch=X, ahead=N, dirty=M, last=<subject>]` situational state |
| H11 | SessionStart | always | Warn if `package.json` newer than `node_modules/.package-lock.json` (npm install needed); warn if `docker compose ps` shows app not running |

---

## Files to create / modify

### Create

- `eslint.config.js` — flat config, ESLint 8 compatible (project pins 8.54). Enable `eslint:recommended`, `plugin:react/recommended`, `plugin:react-hooks/recommended` if installed; treat `no-unused-vars` and `no-undef` as `error`. Globals for Node + browser + jest.
- `.prettierrc` — 2-space, single quotes, trailing commas (`es5`), semicolons, 100-char line.
- `.prettierignore` — `dist/`, `coverage/`, `node_modules/`, `src/data/`, `**/*.json`, `package-lock.json`.
- `.editorconfig` — utf-8, lf, 2-space, trim trailing whitespace, final newline. Override Markdown to preserve trailing whitespace.
- `.nvmrc` — `20`
- `.husky/pre-commit` — runs `npx lint-staged`
- `.husky/pre-push` — runs `npm test`
- `.claude/hooks/guard-pretool.sh` — combined PreToolUse gate (H1, H3, H4, H5, H6)
- `.claude/hooks/pre-push-gate.sh` — runs `npm test && npm run lint` (H2)
- `.claude/hooks/post-edit-format.sh` — `prettier --write` on edited file (H7)
- `.claude/hooks/post-push-docker.sh` — rebuilds container in background (H8)
- `.claude/hooks/secret-scan.sh` — scans Bash stdout (H9)
- `.claude/hooks/inject-git-state.sh` — UserPromptSubmit context (H10)
- `.claude/hooks/session-start-checks.sh` — staleness checks (H11)
- `.claude/hooks/.gitignore` — ignore `*.log` files dropped by hooks
- `.github/workflows/ci.yml` — `npm ci && npm run lint && npm test` on push to main and PRs

### Modify

- `package.json` — add `husky`, `lint-staged` devDeps; `prepare: "husky install"`; `lint-staged` block:
  ```json
  "lint-staged": {
    "src/**/*.{js,jsx}": ["eslint --fix", "prettier --write"],
    "src/**/*.{css,md,json}": ["prettier --write"]
  }
  ```
- `.claude/settings.json` — add `hooks` block referencing scripts above
- `.claude/settings.local.json` — drop broad `Bash(git *)`, `Bash(node:*)`, `Bash(python3 *)`, `Bash(curl:*)`; replace with narrower observed-usage patterns (e.g., `Bash(git status)`, `Bash(git log:*)`, `Bash(git diff:*)`, `Bash(node --version)`)
- `.claude/CLAUDE.md` — add a "Guardrails" section documenting hooks and bypass procedure

---

## Parallel execution plan (multi-subagent)

Files are partitioned per track so subagents never edit overlapping files. Use `senior-engineer-agent` for each track — they commit directly to `main` per the project's trunk-based workflow.

### Wave 1 — runs in parallel (4 subagents, no inter-dependencies)

#### Track A — Static configs
- **Owns:** `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.editorconfig`, `.nvmrc`
- **Must NOT touch:** `package.json` (except optionally adding the `prettier` field as a sibling — prefer `.prettierrc` only), `.husky/`, `.claude/`, `src/**`, `.github/`
- **Verification:** `npx eslint --print-config src/server/app.js > /dev/null`, `npx prettier --check src/server/app.js`, `test "$(cat .nvmrc)" = "20"`. Run `npm run lint` once and **report** the violation count; do **not** auto-fix (Wave 2 owns that).
- **Commit:** `chore: add eslint, prettier, editorconfig, nvmrc configs (#ISSUE)`

#### Track C — Claude hook scripts
- **Owns:** all files in `.claude/hooks/` (eight shell scripts + a `.gitignore`)
- **Must NOT touch:** `.claude/settings.json`, `.claude/settings.local.json`, anything else
- **Hook script contracts:**
  - POSIX bash: `#!/usr/bin/env bash`, `set -euo pipefail`
  - Executable (`chmod +x`)
  - Read JSON from stdin; tolerate missing `jq` by using `python3 -c` or shell parsing
  - Self-document inputs/exit-codes in a header comment
  - Logs to `.claude/hooks/*.log` (gitignored)
  - **PreToolUse:** exit 0 to allow, exit 2 to deny with stderr message
  - **PostToolUse:** exit 0 always; side-effects only; failures swallowed/logged
  - **UserPromptSubmit:** stdout is prepended to the prompt
  - **SessionStart:** stdout written to session preamble
- **Verification:** Each script runs cleanly with a sample stdin payload (provide test stubs in the commit body or `.claude/hooks/test-fixtures/` if useful — keep it minimal).
- **Commit:** `chore: add Claude hook scripts under .claude/hooks/ (#ISSUE)`

#### Track E — CI workflow
- **Owns:** `.github/workflows/ci.yml`
- **Must NOT touch:** anything else
- **Workflow shape:** triggers on `push: { branches: [main] }` and `pull_request`. Single `lint-and-test` job: `actions/checkout@v4` → `actions/setup-node@v4` with `node-version-file: .nvmrc` and `cache: npm` → `npm ci` → `npm run lint` → `npm test`.
- **Commit:** `ci: add lint+test workflow (#ISSUE)`

#### Track F — Documentation prep
- **Owns:** `.claude/plans/guardrails-doc-draft.md` (scratch file, not committed to source paths)
- **Must NOT touch:** `.claude/CLAUDE.md` (Wave 4 merges)
- **Output:** A drafted "Guardrails" section ready to paste into CLAUDE.md, covering: what each hook does, where logs land, how to bypass intentionally (`HOOKS_OFF=1` env var convention if implemented), how to add a new hook.
- **Commit:** none (draft is an artifact for Wave 4)

### Wave 2 — sequential (depends on Wave 1 Track A on main)

#### Track A2 — Repo normalization
- **Run from the main session, not a subagent** (file blast radius is the entire repo; no parallelism gain, high collision risk)
- **Steps:** `npm run lint -- --fix`, then `npm run format` (or `npx prettier --write "src/**/*.{js,jsx,css}"`)
- **Commit:** `chore: normalize codebase to new lint/format rules (#ISSUE)`
- **Why a separate commit:** lets Wave 3 hook installation see a clean baseline; reverts cleanly if rules turn out wrong

### Wave 3 — runs in parallel (2 subagents, depend on Track A + A2 + Track C on main)

#### Track B — Husky + lint-staged
- **Owns:** `package.json` (devDeps + `prepare` script + `lint-staged` block), `.husky/pre-commit`, `.husky/pre-push`
- **Must NOT touch:** `.claude/`, `.github/`, `src/**`
- **Steps:** `npm i -D husky lint-staged`, `npm pkg set scripts.prepare="husky install"`, `npm run prepare`, `npx husky add .husky/pre-commit "npx lint-staged"`, `npx husky add .husky/pre-push "npm test"`
- **Verification:** `test "$(git config core.hooksPath)" = ".husky"`, `test -x .husky/pre-commit`, `test -x .husky/pre-push`. Then dry-run: stage a deliberate violation and confirm the commit is rejected.
- **Commit:** `chore: add husky + lint-staged pre-commit and pre-push hooks (#ISSUE)`

#### Track D — Wire Claude hooks into settings
- **Owns:** `.claude/settings.json`, `.claude/settings.local.json`
- **Must NOT touch:** `.claude/hooks/` (Track C owns; just references), `.claude/CLAUDE.md`, `package.json`
- **Steps:**
  1. Add `hooks` block to `.claude/settings.json` referencing the eight scripts from Track C
  2. Tighten `.claude/settings.local.json` allow-list — drop catch-alls, replace with narrower patterns
- **Verification:** `python3 -m json.tool .claude/settings.json > /dev/null` and same for `.local.json`. Then start a new Claude session and confirm hooks fire (manual smoke test).
- **Commits (two):**
  - `chore: wire Claude hooks into settings.json (#ISSUE)`
  - `chore: tighten .claude/settings.local.json allowlist (#ISSUE)`

### Wave 4 — final (1 subagent or main session)

#### Track G — Docs + verification
- **Owns:** `.claude/CLAUDE.md` (merge Track F draft)
- **Steps:** Insert "Guardrails" section, run the full Verification section below, fix any drift.
- **Commit:** `docs: document new guardrails in CLAUDE.md (#ISSUE)`

### Dependency diagram

```
Wave 1:  [A configs]   [C hook scripts]   [E CI]   [F docs draft]
              │              │
              ▼              │
Wave 2:  [A2 normalize]      │
              │              │
              ▼              ▼
Wave 3:  [B husky]      [D settings]
              │              │
              └──────┬───────┘
                     ▼
Wave 4:           [G docs+verify]
```

### Subagent dispatch rules

- Each Wave-1 subagent gets a self-contained brief: scope, files it owns, files it must NOT touch, the commit message, the verification command.
- Subagents in the same wave **never** edit overlapping files. The dispatcher (main session) holds the truth about ownership.
- Each subagent runs `git pull --rebase origin main` before its commit and pushes immediately on success.
- If a subagent fails its gate (`npm test` / `npm run lint`), it reports back; main session decides whether to retry or unblock. Subagents do not skip the gate or use `--no-verify`.
- Wave 2 (`A2 normalize`) is sequential because it touches most files in `src/**`.
- Wave 3 Track D depends on Track C scripts existing on main (settings.json references them) — dispatcher must wait for Track C's commit SHA before launching Track D.
- Each track creates its own GitHub issue with `gh issue create` before starting work, and closes it on commit.

---

## Decisions (confirmed)

1. **Pre-push gate:** full `npm test` — blocks any push with failing tests.
2. **Docker rebuild:** Claude PostToolUse on `git push origin main*`, background, logged to `.claude/hooks/docker-rebuild.log`.
3. **Tighten `.claude/settings.local.json`:** yes — drop catch-all globs, replace with narrower patterns matching observed usage.
4. **CI workflow:** yes — minimal lint+test on push to main and on PRs.
5. **Hook count:** 11 (4 originally proposed + 7 added per follow-up).

---

## Verification

```bash
# 1. Configs valid
npx eslint --print-config src/server/app.js > /dev/null
npx prettier --check "src/**/*.{js,jsx}"
test "$(cat .nvmrc)" = "20"

# 2. Git hooks wired
test -x .husky/pre-commit && test -x .husky/pre-push
test "$(git config core.hooksPath)" = ".husky"

# 3. Pre-commit gate blocks bad code (intentional violation)
echo "var x=1;var x=2" > src/lib/_lint_test.js
git add src/lib/_lint_test.js
git commit -m "test: should fail (#0)" && echo "FAIL: gate did not block" || echo "OK: gate blocked"
git restore --staged src/lib/_lint_test.js && rm src/lib/_lint_test.js

# 4. Claude hooks fire — manual checks next session:
#    a. Edit a src/**/*.js → file is auto-prettiered
#    b. `git push origin main` → docker rebuild log appears at .claude/hooks/docker-rebuild.log
#    c. Try Edit on .env → denied
#    d. Try Bash `git checkout -b foo` → denied
#    e. Try Bash `git commit -m "fix stuff"` (no issue#) → denied
#    f. UserPromptSubmit prepends git state on next prompt
#    g. SessionStart prints stale-deps warning if package.json newer than lockfile

# 5. Full gate green
npm test && npm run lint && npm run test:coverage

# 6. CI green on next push
gh run list --limit 1 --branch main
```

---

## Out of scope

- ESLint 9 migration (project pins 8.54; flat config works on 8.x via `eslint.config.js`)
- TypeScript migration (project explicitly prefers JSDoc — see CLAUDE.md)
- Replacing Jest with Vitest
- Adding `commitlint` package (H5 enforces commit format adequately for now)
- MCP permission hardening (separate hardening pass)
