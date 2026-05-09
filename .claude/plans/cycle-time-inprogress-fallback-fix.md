# Cycle Time — Remove Silent `createdAt` Fallback

**Type:** Bug fix
**Scope:** Small, surgical
**Strategy:** 3 parallel tracks on disjoint files, then a sequential integration/verification step
**Branching:** Trunk-based — direct commits to `main` per project CLAUDE.md

---

## Context

The application's stated contract for cycle time is *"measured from when the story was pulled into the In Progress state to when it closed"* (see `CycleTimeCalculator.js:17-19`).

In practice the contract is broken. Three sites in `src/lib/infrastructure/api/clients/IssueClient.js` (lines **264, 296, 315**) silently substitute `issue.createdAt` for `inProgressAt` whenever a closed issue's first 20 system notes do not contain a `set status to **In progress**` event (or the paginated note fetch fails/exhausts without finding one). The calculator filters on truthiness of `inProgressAt`, which passes for these fallback values, so contaminated issues are included with `cycleTime = closedAt − createdAt` — easily inflating cycle time by months.

Concrete symptom: the sprint ending **2026-02-22** (iteration `gid://gitlab/Iteration/2786378`) reports avg **28.6 days** and **P90 127 days**, producing a Nelson Rule 1 violation in the analysis report. This is almost certainly an artifact of the fallback, not real flow degradation.

The codebase already tracks `inProgressAtSource: 'created' | 'status_change'` for exactly this distinction — but `CycleTimeCalculator` never reads it.

---

## Goal

Make the cycle-time calculation honor its documented contract:

1. Closed issues without a recognized in-progress status transition are **excluded** (not silently re-anchored to `createdAt`).
2. The number of excluded issues is **surfaced** in the metrics response so users can see the correction and its impact.
3. Behavior is locked in by tests so this regression cannot reappear.

---

## Workflow Constraints (from project CLAUDE.md)

- **TDD mandatory** — write failing tests first (RED → GREEN → REFACTOR).
- **Coverage ≥85%** — verify with `npm run test:coverage`.
- **Atomic commits to `main`** — one logical change per commit, no feature branches, no PRs.
- **Test gate before push** — `npm test` and `npm run lint` must pass.
- **GitHub issue first** — `gh issue create` before any work.
- **Backlog update before commit** — append to `_context/stories/completed.md` under "Bug Fixes & Improvements".
- **Docker rebuild after push** — `docker compose up --build -d`.

---

## Pre-flight (sequential, do once before launching parallel work)

These steps establish shared state. Do not parallelize them.

1. **Sync trunk:** `git checkout main && git pull --rebase origin main`
2. **Create GitHub issue:**
   ```
   gh issue create \
     --title "fix: remove silent createdAt fallback in cycle time calculation" \
     --label "bug,layer:infrastructure,layer:core" \
     --body "Cycle time silently substitutes createdAt when no In Progress status note is found, inflating the metric by months for old/never-started issues. Sprint ending 2026-02-22 shows avg 28.6 days / P90 127 days — likely an artifact, not real flow. Fix: stop the substitution, exclude these issues, surface excludedCount."
   ```
   Capture the issue number — it goes in every commit message as `(#NN)`.
3. **Confirm baseline tests pass:** `npm test`

---

## Parallel Work — Three Tracks on Disjoint Files

**Run these three tracks in parallel.** Each track owns its own files; no file is touched by more than one track. Tracks coordinate only via the shared "contract" defined below.

### Shared contract (read this before splitting)

After Track A lands, an issue object emitted by `IssueClient` will have:

| Condition | `inProgressAt` | `inProgressAtSource` |
|---|---|---|
| Closed, recognized "In Progress" status note found | ISO timestamp | `'status_change'` |
| Closed, no matching status note in any fetched batch | `null` | `'unknown'` |
| Closed, paginated note fetch errored before resolution | `null` | `'unknown'` |
| Open issue | `null` | `null` |

Tracks B and C consume this contract. Track A produces it.

---

### Track A — `IssueClient.js` (Infrastructure)

**Owner:** Senior engineer subagent #1
**Files (exclusive ownership):**
- `src/lib/infrastructure/api/clients/IssueClient.js`
- `tests/lib/infrastructure/api/clients/IssueClient.test.js` (or wherever the existing test lives — locate before starting)

**Changes:**
- **Line ~263–265** (post-pagination exhaustion): Replace `inProgressAt = issue.createdAt` with `inProgressAt = null`. Update the trailing object literal so `inProgressAtSource: 'unknown'` instead of the current ternary.
- **Line ~289–302** (paginated fetch error): Same — `inProgressAt = null`, `inProgressAtSource: 'unknown'`.
- **Line ~307–316** (first batch had no in-progress event and no more notes to fetch): Same.
- **Line ~328–332** (final return for closed issue with `inProgressAt` set in first batch): Keep `'status_change'` for real values. For `null` values that fall through here, return `'unknown'`. Audit the ternary on line 331 carefully — it currently conflates "no value" with "from createdAt".
- Update the JSDoc on `fetchIterationDetails` to document the new contract.

**Tests (RED → GREEN):**
1. Closed issue with `set status to **In progress**` in first batch → `inProgressAt = note timestamp`, source `'status_change'`.
2. Closed issue with `In progress` note past first 20 (paginated fetch returns it) → `inProgressAt = note timestamp`, source `'status_change'`.
3. Closed issue with NO `In progress` note in any batch → `inProgressAt === null`, source `'unknown'`. **MUST NOT be `createdAt`.**
4. Closed issue, paginated fetch throws → `inProgressAt === null`, source `'unknown'`.
5. Open issue → `inProgressAt === null`, source `null` (unchanged).

**Out of scope:**
- Do not expand `isInProgressStatus` regex.
- Do not change pagination batch size.
- Do not modify `extractInProgressTimestamp` or `parseStatusChanges`.

**Commit (after tests pass + lint clean):**
```
fix: stop substituting createdAt for missing In Progress timestamp (#NN)
```

---

### Track B — `CycleTimeCalculator.js` (Core)

**Owner:** Senior engineer subagent #2
**Files (exclusive ownership):**
- `src/lib/core/services/CycleTimeCalculator.js`
- `tests/lib/core/services/CycleTimeCalculator.test.js` (locate exact path)

**Changes:**
- Tighten the filter on line 34–39 to require `issue.inProgressAtSource === 'status_change'` in addition to existing checks. Belt-and-suspenders: even if a future bug reintroduces a non-null fallback, the calculator stays correct.
- Add `excludedCount` to the return shape. Definition: count of `state === 'closed' && closedAt` issues whose `inProgressAtSource !== 'status_change'`.
- New return shape:
  ```js
  { avg, p50, p90, includedCount, excludedCount }
  ```
- Update JSDoc to reflect new return shape and the explicit source check. Update the misleading `// MUST have inProgressAt - no fallback` comment.

**Tests (RED → GREEN):**
1. Mix of `'status_change'` and `'unknown'` issues → only `'status_change'` issues counted in avg/p50/p90, `excludedCount` reflects the rest.
2. All issues `'unknown'` → `{ avg: 0, p50: 0, p90: 0, includedCount: 0, excludedCount: N }`.
3. Empty input → `{ avg: 0, p50: 0, p90: 0, includedCount: 0, excludedCount: 0 }`.
4. Backwards-compat sanity: existing tests still pass (closed issues with `'status_change'` source produce same numbers as before).

**Coordination note with Track A:**
Track B's strict filter is only meaningful once Track A actually emits `'unknown'` for the broken cases. The two changes are safe to commit independently in any order:
- If B lands first and A hasn't: nothing changes, because IssueClient still emits `'created'` source values that already get filtered out by `=== 'status_change'`. Existing data with `'created'` source disappears from the calc — this is the *intended* behavior and is the same outcome A will produce. So B can land safely on its own.
- If A lands first and B hasn't: nothing changes, because the existing truthiness filter on `inProgressAt` correctly excludes the now-null values.

In short: **either order is safe**. No commit ordering required.

**Commit:**
```
fix: cycle time calculator filters on inProgressAtSource and reports excludedCount (#NN)
```

---

### Track C — Metrics response surface (Presentation/API)

**Owner:** Senior engineer subagent #3
**Files (exclusive ownership):**
- `src/lib/core/services/MetricsService.js` (or whichever orchestrates the cycle-time call — locate before starting; do NOT touch `CycleTimeCalculator.js`, that's Track B's)
- The route handler that returns metrics to the UI (likely `src/server/routes/metrics.js` — locate)
- Any DTO / response-shape test for that route
- Frontend display of cycle time card (likely a styled-component in `src/public/components/` — locate; show `excludedCount` as small subtext under the cycle time value, e.g. *"3 issues excluded — no In Progress transition recorded"*)

**Changes:**
- Pass `excludedCount` from `CycleTimeCalculator` through `MetricsService` to the API response without dropping it.
- Update the API response shape JSDoc.
- Render `excludedCount` in the cycle time card when > 0. Hide when 0 to avoid noise.

**Tests (RED → GREEN):**
1. MetricsService aggregates a fake calculator result with `excludedCount: 3` → response payload contains `cycleTime.excludedCount === 3`.
2. Route integration test: GET cycle-time endpoint returns the new field.
3. UI component test: renders subtext when `excludedCount > 0`, hides when `0`.

**Coordination note with Track B:**
Track C's tests should mock `CycleTimeCalculator.calculate()` to return the new shape (including `excludedCount`). This decouples Track C's test suite from Track B's implementation timing. **Do not depend on Track B's commit landing first** — the contract is what matters, not the commit order.

**Commit:**
```
feat: surface cycle time excludedCount in metrics response and UI (#NN)
```

---

## Sequential Steps After All Three Tracks Complete

These steps require all parallel work to be merged.

### 1. Integration verification (manual)
```bash
# Pull latest
git pull --rebase origin main

# Full test suite
npm test
npm run lint
npm run test:coverage   # confirm ≥85%

# Clear stale iteration cache so the fix actually takes effect
rm -rf src/data/cache/iterations/

# Restart container
docker compose up --build -d

# Regenerate the analysis report (use the same flow that produced the original report)
# Confirm:
#   - Sprint ending 2026-02-22 cycle time avg drops substantially (<15 days expected)
#   - P90 drops well below 127 days
#   - cycleTime.excludedCount is non-zero for that sprint
#   - Nelson Rule 1 violation on cycle time disappears or attenuates
#   - Nearby flagged sprint (2026-02-15, was 20.27 days) also moves in expected direction
```

### 2. Backlog update (BEFORE final commit)
Append to `_context/stories/completed.md` under "Bug Fixes & Improvements":
```markdown
### 2026-05-09 - Issue #NN - Fix cycle time silent createdAt fallback
- Removed three sites in IssueClient that silently substituted createdAt for missing In Progress timestamps
- CycleTimeCalculator now strictly filters on inProgressAtSource === 'status_change'
- Metrics response surfaces excludedCount so users see the correction
- Result: sprint ending 2026-02-22 cycle time corrected from 28.6d avg / 127d P90 to <real value>; Nelson Rule 1 violation resolved
```

Commit:
```
docs: log cycle time fallback fix in completed backlog (#NN)
```

### 3. Close the issue
```
gh issue close NN
```

---

## Out of Scope

- Expanding `isInProgressStatus` regex to recognize additional status names ("Doing", "Started", "Active", etc.). Track separately if `excludedCount` turns out to be high after the fix — that signals a status-vocabulary mismatch worth a separate ticket.
- Recomputing or pruning historical cached iteration data beyond the manual `rm -rf` above.
- Reworking `extractInProgressTimestamp` to use the *latest* (vs. earliest) in-progress transition for reopened tickets.
- Refactoring the `inProgressAt` enrichment loop in `IssueClient` (it's gnarly but works; a refactor is a separate task).

---

## File Ownership Map (no overlap)

| Track | Owns these files exclusively |
|---|---|
| A | `src/lib/infrastructure/api/clients/IssueClient.js` + its test |
| B | `src/lib/core/services/CycleTimeCalculator.js` + its test |
| C | `src/lib/core/services/MetricsService.js`, the metrics route, the cycle time UI component + their tests |
| Sequential post-step | `_context/stories/completed.md` |

If a subagent discovers it needs to touch a file outside its track, **stop and coordinate** — that's a sign the contract above is incomplete.
