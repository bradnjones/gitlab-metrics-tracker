# Plan: Lint + Prettier Setup (Parallel Execution)

**Status:** Planned
**Branch:** `claude/review-app-recommendations-D0VYh`
**Type:** chore (toolchain/quality)
**Parallelism:** 4 disjoint tracks in Wave 1; 1 verification track in Wave 2

---

## Context

`CLAUDE.md` requires `npm test && npm run lint` to pass before every push, but **lint is currently broken**:

- `npm run lint` exits with `ESLint couldn't find eslint.config.(js|mjs|cjs)`.
- Declared `eslint@^8.54.0` in `package.json` mismatches the v10 runtime actually installed.
- No ESLint config file exists (`.eslintrc.*` or `eslint.config.js`).
- No Prettier config (defaults only); 113 files happen to comply.
- No `.editorconfig`, `.prettierignore`, `.eslintignore`.
- No husky / lint-staged pre-commit hook.
- No CI lint enforcement (`.github/workflows/` is empty).

**Outcome of this work:** working ESLint v9 flat config, explicit Prettier rules, EditorConfig, husky pre-commit, and a GitHub Actions workflow that runs `npm run lint` + `npm run format:check` on push and PR. Existing violations get `eslint --fix` first; whatever remains is downgraded to `warn` (annotated `// TODO: tighten`) so the suite exits 0 in this pass.

---

## Confirmed Decisions

| Decision | Choice |
|---|---|
| ESLint version | v9.x (flat config) — aligns with installed v10 runtime |
| Config style | `eslint.config.js` (flat, ESM) |
| Prettier-vs-ESLint conflicts | `eslint-config-prettier` last in extends chain |
| Plugin set | `react`, `react-hooks`, `jsx-a11y`, `jest` (skip `import` — flat-config support is awkward; revisit later) |
| Pre-commit | `husky` + `lint-staged` |
| CI | `.github/workflows/lint.yml` on push + PR |
| Existing violations | `eslint --fix` first; remaining errors → `warn` with TODO |
| Branch | `claude/review-app-recommendations-D0VYh` (per session policy) — **do not push to main** |
| Commit style | Conventional Commits, atomic per CLAUDE.md |

---

## Parallel Execution Architecture

### Why this is parallelizable

Each Wave 1 track touches a **disjoint set of files**. No two agents write to the same file. `git pull --rebase` before each push handles interleaved commits cleanly.

```
                       ┌──────────────────────────────────┐
                       │ Wave 1 — 4 agents in parallel    │
                       │ (each commits + pushes own files)│
                       └──────────────────────────────────┘
                                     │
                ┌──────────┬─────────┼──────────┬───────────┐
                ▼          ▼         ▼          ▼           
            ┌───────┐  ┌───────┐ ┌───────┐  ┌──────────────┐
            │ A     │  │ B     │ │ C     │  │ D            │
            │Prettier│ │Editor │ │  CI   │  │ Toolchain    │
            │       │  │Config │ │workflow│ │ (deps+ESLint+│
            │       │  │       │ │       │  │  husky+fixes)│
            └───────┘  └───────┘ └───────┘  └──────────────┘
                                     │
                                     ▼
                       ┌──────────────────────────────────┐
                       │ Wave 2 — single agent            │
                       │ Verification + backlog + final   │
                       └──────────────────────────────────┘
```

### File-disjointness matrix

| Track | Files written | Reads (no writes) |
|---|---|---|
| **A** Prettier | `.prettierrc.json`, `.prettierignore` | — |
| **B** EditorConfig | `.editorconfig` | — |
| **C** CI workflow | `.github/workflows/lint.yml` | `package.json` (script names) |
| **D** Toolchain | `package.json`, `package-lock.json`, `eslint.config.js`, `.husky/pre-commit`, possibly `src/**` (via `eslint --fix`), possibly `test/**` (via `eslint --fix`) | — |
| **Wave 2** Verify | `_context/stories/completed.md` | everything above |

No file appears in two write-sets → safe to parallelize.

### Acceptable race / temporary state

- If Track C (CI) lands before Track D (toolchain), CI on intermediate commits will FAIL because `eslint.config.js` doesn't exist yet. **This is expected.** The branch is a feature branch (not `main`); CI status only matters at the end of Wave 2. Do not roll back.
- Track D's `eslint --fix` may modify many `src/**` files. Those edits stay inside Track D's commit; A/B/C don't touch `src/**`.

---

## Track Definitions

Each track is a self-contained brief for a `senior-engineer-agent`. Copy the **brief block** verbatim into the agent prompt.

### Track A — Prettier Project Config

**Brief block:**

> Add explicit Prettier configuration to the GitLab Sprint Metrics Tracker.
>
> **Branch:** `claude/review-app-recommendations-D0VYh` (do NOT push to main)
> **Files to create:**
> 1. `.prettierrc.json`:
>    ```json
>    {
>      "semi": true,
>      "singleQuote": true,
>      "trailingComma": "es5",
>      "printWidth": 100,
>      "tabWidth": 2,
>      "arrowParens": "always",
>      "endOfLine": "lf"
>    }
>    ```
> 2. `.prettierignore`:
>    ```
>    node_modules/
>    dist/
>    coverage/
>    src/data/
>    package-lock.json
>    *.min.js
>    .husky/
>    ```
>
> **Do NOT modify:** `package.json`, any `src/**`, any `test/**`. Do not run `npm install`. Do not run prettier across the codebase (Track D handles that).
>
> **Commit:** `chore: add Prettier project config and ignore file`
> **Push:** `git pull --rebase origin claude/review-app-recommendations-D0VYh && git push -u origin claude/review-app-recommendations-D0VYh`

### Track B — EditorConfig

**Brief block:**

> Add `.editorconfig` to enforce cross-IDE formatting basics.
>
> **Branch:** `claude/review-app-recommendations-D0VYh`
> **File to create:** `.editorconfig`:
> ```ini
> root = true
>
> [*]
> indent_style = space
> indent_size = 2
> end_of_line = lf
> charset = utf-8
> insert_final_newline = true
> trim_trailing_whitespace = true
>
> [*.md]
> trim_trailing_whitespace = false
> ```
>
> **Do NOT modify any other files.**
>
> **Commit:** `chore: add .editorconfig`
> **Push:** `git pull --rebase origin claude/review-app-recommendations-D0VYh && git push -u origin claude/review-app-recommendations-D0VYh`

### Track C — CI Lint Workflow

**Brief block:**

> Add a GitHub Actions workflow that runs lint + Prettier check on push and PR.
>
> **Branch:** `claude/review-app-recommendations-D0VYh`
> **File to create:** `.github/workflows/lint.yml`:
> ```yaml
> name: Lint
>
> on:
>   push:
>     branches: [main, "claude/**"]
>   pull_request:
>     branches: [main]
>
> jobs:
>   lint:
>     runs-on: ubuntu-latest
>     steps:
>       - uses: actions/checkout@v4
>       - uses: actions/setup-node@v4
>         with:
>           node-version: "18"
>           cache: "npm"
>       - run: npm ci
>       - run: npm run lint
>       - run: npm run format:check
> ```
>
> **Note:** Until Track D lands, CI runs of this workflow will fail (no `eslint.config.js`, no `format:check` script). That is expected and acceptable on this feature branch. Do not gate or skip.
>
> **Do NOT modify any other files.**
>
> **Commit:** `ci: add lint and format:check workflow`
> **Push:** `git pull --rebase origin claude/review-app-recommendations-D0VYh && git push -u origin claude/review-app-recommendations-D0VYh`

### Track D — Toolchain Bootstrap (largest track)

**Brief block:**

> Wire up ESLint v9 flat config, husky + lint-staged, and run auto-fixes.
>
> **Branch:** `claude/review-app-recommendations-D0VYh` (do NOT push to main)
>
> **Step 1 — `package.json` updates:**
> - Bump `eslint` from `^8.54.0` → `^9.13.0` in `devDependencies`.
> - Add to `devDependencies` (use latest stable patch of each):
>   - `@eslint/js@^9.13.0`
>   - `eslint-plugin-react-hooks@^5.0.0`
>   - `eslint-plugin-jsx-a11y@^6.10.0`
>   - `eslint-plugin-jest@^28.8.0`
>   - `eslint-config-prettier@^9.1.0`
>   - `globals@^15.11.0`
>   - `husky@^9.1.0`
>   - `lint-staged@^15.2.0`
> - Replace/add scripts:
>   - `"lint": "eslint ."`
>   - `"lint:fix": "eslint . --fix"`
>   - `"format": "prettier --write ."`
>   - `"format:check": "prettier --check ."`
>   - `"prepare": "husky"`
> - Add top-level `"lint-staged"` block:
>   ```json
>   "lint-staged": {
>     "*.{js,jsx}": ["eslint --fix", "prettier --write"],
>     "*.{css,json,md,yml}": ["prettier --write"]
>   }
>   ```
>
> **Step 2 — Install:** Run `npm install` (this updates `package-lock.json` and triggers `prepare` → `husky` initializes `.husky/`).
>
> **Step 3 — Create `eslint.config.js` (flat config, ESM):**
> - Import `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-jest`, `eslint-config-prettier`, `globals`.
> - Three configuration objects:
>   1. **Server/lib** (files: `src/server/**/*.js`, `src/lib/**/*.js`): `js.configs.recommended` + `prettier`. Globals: `node`. Parser opts: `ecmaVersion: 2023`, `sourceType: 'module'`.
>   2. **Browser/React** (files: `src/public/**/*.{js,jsx}`): `js.configs.recommended` + `react.configs.recommended` + `react-hooks.configs.recommended` + `jsx-a11y.configs.recommended` + `prettier`. Globals: `browser`. JSX enabled. Settings: `react.version: 'detect'`. Disable `react/react-in-jsx-scope` (Vite handles).
>   3. **Tests** (files: `test/**/*.{js,jsx}`): `js.configs.recommended` + `jest.configs.recommended` + `prettier`. Globals: `node`, `jest`.
> - Top-level `ignores`: `dist/**`, `coverage/**`, `node_modules/**`, `src/data/**`, `*.min.js`, `.husky/**`.
>
> **Step 4 — Create `.husky/pre-commit`:**
> ```sh
> #!/usr/bin/env sh
> npx lint-staged
> ```
> Make it executable: `chmod +x .husky/pre-commit`.
>
> **Step 5 — Run formatters/linters:**
> 1. `npm run format` — should be a no-op or near-no-op per audit.
> 2. `npm run lint:fix` — capture stdout/stderr; review the auto-fixed diff.
> 3. If `npm run lint` still reports errors after `--fix`: in `eslint.config.js`, downgrade ONLY the offending rule(s) to `'warn'` with a `// TODO: tighten to 'error'` comment. **Do NOT do manual code rewrites in this pass.** Repeat until `npm run lint` exits 0 with warnings only.
> 4. `npm test` — must pass.
>
> **Step 6 — Verify pre-commit hook works:** Stage a deliberately-broken file (e.g., add `var x = 1` to a sandbox file), `git commit` (expect block), revert the file, ensure clean.
>
> **Step 7 — Commit and push (single atomic commit):**
> - `git add package.json package-lock.json eslint.config.js .husky/pre-commit <any src/test files modified by --fix>`
> - Commit: `chore: configure ESLint v9 flat config, husky lint-staged, and auto-fix`
> - `git pull --rebase origin claude/review-app-recommendations-D0VYh && git push -u origin claude/review-app-recommendations-D0VYh`
>
> **Hard rules:**
> - Do NOT modify `.prettierrc.json`, `.prettierignore`, `.editorconfig`, `.github/workflows/lint.yml` (other tracks own those).
> - Do NOT push to `main`.
> - Do NOT use `git add -A` or `git add .`. List files explicitly. The `--fix` step may modify many `src/**`/`test/**` files; list them via `git status` and add explicitly.
> - If `eslint --fix` produces an unreasonable diff (>50 files changed) or a diff that touches behavior code (not just spacing/quotes/etc.), STOP and report before committing.

---

## Wave 2 — Verification & Backlog (sequential, single agent)

Run **after all four Wave 1 tracks have pushed to the branch**.

**Brief block:**

> Verify the lint/Prettier setup is coherent end-to-end and update the backlog.
>
> **Branch:** `claude/review-app-recommendations-D0VYh`
> **Steps:**
> 1. `git pull --rebase origin claude/review-app-recommendations-D0VYh` — ensure all four Wave 1 commits are present.
> 2. `rm -rf node_modules && npm install` — clean install (confirms `prepare` hook runs and husky initializes).
> 3. `npm run lint` — must exit 0 (warnings allowed, no errors).
> 4. `npm run format:check` — must exit 0.
> 5. `npm test` — must pass.
> 6. Confirm `.husky/pre-commit` is executable and contains `npx lint-staged`.
> 7. Confirm CI workflow on the latest pushed commit is green (check Actions tab via `gh run list --branch claude/review-app-recommendations-D0VYh --limit 5`).
> 8. Append to `_context/stories/completed.md` under "Bug Fixes & Improvements":
>    ```markdown
>    ### 2026-05-09 - Lint + Prettier toolchain setup
>    - Migrated to ESLint v9 flat config (`eslint.config.js`); fixed broken `npm run lint`.
>    - Added explicit Prettier project config (`.prettierrc.json` + `.prettierignore`).
>    - Added `.editorconfig` for cross-IDE consistency.
>    - Added husky + lint-staged pre-commit hook (auto-fixes staged files).
>    - Added GitHub Actions lint workflow (push + PR).
>    - Auto-fixed N files via `eslint --fix`; downgraded M rules to `warn` with TODOs (track in follow-up issue).
>    ```
> 9. Commit: `docs: log lint+prettier setup in completed.md`
> 10. `git push origin claude/review-app-recommendations-D0VYh`.
>
> **If any step 3-7 fails:** stop, report the failure with logs, do NOT commit fixes silently. The user wants to see what broke before remediation.

---

## Sequencing Rules

1. **Wave 1 launch:** kick off all 4 senior-engineer-agents in parallel (single message, 4 tool calls).
2. **Track ordering inside Wave 1 doesn't matter** — they're independent.
3. **Wait for all 4 to report success before Wave 2.** If any fails, fix that track before proceeding.
4. **Wave 2 is single-agent and sequential.**
5. **No track may push to `main`.**
6. **No track may use `git add -A` or `git add .`.**
7. If a track encounters merge conflict on rebase, it should investigate (not force-push). Conflicts should not occur given file-disjointness; if they do, that's a sign the plan was misread — surface to the user.

---

## Critical Files

**Created:**
- `.prettierrc.json` (Track A)
- `.prettierignore` (Track A)
- `.editorconfig` (Track B)
- `.github/workflows/lint.yml` (Track C)
- `eslint.config.js` (Track D)
- `.husky/pre-commit` (Track D)

**Modified:**
- `package.json` (Track D — deps, scripts, lint-staged, prepare)
- `package-lock.json` (Track D — `npm install` byproduct)
- `_context/stories/completed.md` (Wave 2)
- 0–N files under `src/**`/`test/**` (Track D — `eslint --fix` byproduct)

---

## Verification (Acceptance Criteria)

- [ ] `npm run lint` exits 0 (warnings allowed, no errors).
- [ ] `npm run format:check` exits 0.
- [ ] `npm test` passes.
- [ ] `npm install` from a clean checkout sets up husky automatically.
- [ ] Committing a deliberately-broken file is blocked by the pre-commit hook.
- [ ] GitHub Actions `Lint` workflow runs green on the final commit of the branch.
- [ ] `_context/stories/completed.md` contains the new entry.
- [ ] Five commits land on `claude/review-app-recommendations-D0VYh` (one per track + Wave 2).

---

## Out of Scope (Defer)

- `eslint-plugin-import` (flat-config support requires `FlatCompat` boilerplate; defer to a follow-up issue).
- Manual cleanup of any rules downgraded to `warn` (separate issue, tracked via in-file TODOs).
- Tightening Prettier rules beyond the audit-derived defaults.
- Adding lint to the existing `npm test` flow or to Docker build.
