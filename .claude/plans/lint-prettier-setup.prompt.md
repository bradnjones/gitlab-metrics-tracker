# Implementation Prompt — Lint + Prettier Setup (Parallel)

Paste the block below into a new Claude Code session at the repo root (`/home/user/gitlab-metrics-tracker`).

---

I want to implement the lint + Prettier toolchain setup, executed with parallel agents.

**Read the plan first:** `.claude/plans/lint-prettier-setup.md` — it has the context, locked decisions, file-disjointness matrix, per-track briefs, sequencing rules, and acceptance criteria. Treat it as the source of truth; if you find a reason to deviate, surface it before doing so.

**Execution model:**

1. **Wave 1 — launch 4 `senior-engineer-agent` instances IN PARALLEL** (single message, 4 Agent tool calls). Each gets one of the four "Track" brief blocks from the plan, copied verbatim:
   - Track A — Prettier project config (`.prettierrc.json` + `.prettierignore`)
   - Track B — EditorConfig (`.editorconfig`)
   - Track C — CI lint workflow (`.github/workflows/lint.yml`)
   - Track D — Toolchain bootstrap (`package.json`, `eslint.config.js`, `.husky/pre-commit`, `npm install`, `eslint --fix`, downgrade-to-warn pass, `npm test`)

   Each Track D ≠ Tracks A/B/C — they touch disjoint files (see plan's file-disjointness matrix). All four commit + push to `claude/review-app-recommendations-D0VYh`.

2. **Wait for all four Wave 1 agents to report success** before starting Wave 2. If any track fails, stop and surface the failure — do not blindly proceed.

3. **Wave 2 — launch ONE `senior-engineer-agent`** with the Wave 2 brief block from the plan. It does the clean-install verification, confirms CI is green, updates `_context/stories/completed.md`, and pushes a final commit.

**Hard constraints from the plan (don't drift):**

- All commits go to branch `claude/review-app-recommendations-D0VYh`. **Do NOT push to `main`.** Override the `senior-engineer-agent`'s default behavior — its agent description says it commits to main; the session's branch policy supersedes that.
- ESLint v9 flat config (`eslint.config.js`), not legacy `.eslintrc.*`.
- Prettier-vs-ESLint: `eslint-config-prettier` last in the chain; rely on Prettier for stylistic rules.
- Plugin set: `react`, `react-hooks`, `jsx-a11y`, `jest`. Skip `eslint-plugin-import` (flat-config friction; defer).
- Existing violations: `eslint --fix` first, then downgrade remaining rules to `'warn'` with `// TODO: tighten to 'error'` annotation. **No manual code rewrites in this pass.**
- `.husky/pre-commit` runs `npx lint-staged`. `lint-staged` config lives in `package.json`.
- CI workflow (`.github/workflows/lint.yml`) runs `npm ci && npm run lint && npm run format:check` on push (`main`, `claude/**`) and PR.
- Track D MUST NOT use `git add -A` or `git add .` — list files explicitly via `git status`. If `eslint --fix` produces a diff >50 files OR touches behavior code (not just style), STOP and report.
- Each track is one atomic commit using Conventional Commits format.

**Before kicking off Wave 1:**

- Post a short readback: which 4 tracks you're launching, the exact files each will write, and confirmation that you'll commit to `claude/review-app-recommendations-D0VYh` (not `main`). Wait for me to say "go" before launching the agents.

**After Wave 1:**

- Show me the 4 commit URLs (or hashes + messages). Wait for "go" before Wave 2.

**After Wave 2:**

- Show the final commit URL, the `gh run list` output for the lint workflow, and the diff for `_context/stories/completed.md`.

Start by reading `.claude/plans/lint-prettier-setup.md` end-to-end, then post the Wave 1 readback.
