# Implementation Prompt — AI Metric Review

Paste the block below into a new Claude Code session at the repo root.

---

I want to implement the AI Metric Review feature.

**Read the plan first:** `.claude/plans/ai-metric-review.md` — it has full context, locked decisions, file list, signal package shape, system prompt, persistence shape, build order, and verification steps. Treat it as the source of truth; if you find a reason to deviate, surface it before doing so.

**How to work:**

1. Follow the project's standard agent-driven, TDD, trunk-based workflow per `.claude/CLAUDE.md`. Specifically:
   - Create one GitHub issue for the whole feature (`gh issue create`) before starting.
   - Each numbered step in the plan's "Build Order" is its own atomic commit to `main`. Sync (`git pull --rebase`), make the change, run `npm test` + `npm run lint` + `npm run test:coverage` (≥85% on changed files), commit, push, then `docker compose up --build -d`.
   - Conventional Commits format with the issue number, e.g. `feat: add SignalPackageBuilder (#NN)`.
   - TDD strictly: RED test first, then GREEN minimal impl, then REFACTOR.
   - Update `_context/stories/` (in-progress.md → completed.md) as part of the relevant commits.

2. Launch the appropriate agents per the workflow:
   - **Product Owner** at the start to validate scope (the plan covers it but confirm).
   - **Test Coverage Agent** before writing tests for each step.
   - **Clean Architecture Agent** after the Core/Infrastructure layer is done.
   - **Code Review Agent** before each push.

3. Stop after each commit and show me the GitHub commit URL. Wait for my approval before moving to the next build-order step. Do not bundle multiple build-order steps into one commit.

4. Before any commit that touches `package.json`, list the new dependencies and their versions and wait for confirmation.

5. Before the first commit, do not write any code yet — instead, post a short readback: which step you're starting with, the test names you plan to write (RED), and the file paths you'll create. Wait for me to say "go".

**Hard constraints from the plan (don't drift):**

- Server-side stats are deterministic via existing `src/lib/analysis/trendCalculator.js` and `src/lib/analysis/nelsonRules.js`. The LLM does interpretation only.
- The only file that imports `@anthropic-ai/sdk` is `src/lib/infrastructure/llm/AnthropicLLMClient.js`. Core stays pure behind `ILLMClient`.
- Two-flag feature gating: `ANTHROPIC_API_KEY` **and** `AI_REVIEW_ENABLED=true`. Missing either → button visible but disabled with tooltip; route returns 503.
- Rate limit POST /api/analysis/review at 10/hour. Cap iterationIds at 100 (validate, 400 if exceeded).
- Use `displayedIterations` (post-filter) for the request payload, not `selectedIterations`.
- Persist failed analyses too (`status: "failed"`, `errorMessage` populated).
- System prompt uses `cache_control: { type: "ephemeral" }` for prompt-cache discounts.
- Markdown rendering via `react-markdown` + `remark-gfm`.
- Defer the history-view UI (the `GET /api/analysis` endpoint is in scope for the route step, but the UI listing past analyses is a follow-up).

Start by reading `.claude/plans/ai-metric-review.md` end-to-end, then post the readback for step 1.
