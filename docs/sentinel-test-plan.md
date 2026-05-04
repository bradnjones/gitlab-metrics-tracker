# Sentinel Test Plan

**Purpose:** Validate that the `sentinel` subagent (`.claude/agents/sentinel.md`), driven by `.claude/architecture-rules.md`, catches real architectural violations in this repository and does not raise false positives on a clean diff.

**Approach:** Seeded violations. For each test, apply a hand-crafted diff to a real file, run the sentinel, assert the expected report, then revert.

**Scope:** v1 covers 7 violation tests (one MUST rule each from the major categories) and 1 negative-control test.

---

## Setup

Run the tests from a clean working tree on a throwaway branch so reverts are cheap:

```bash
git checkout -b test/sentinel-fixtures
git status   # should be clean
```

Each test below has the same shape:

```
1. Apply the seeded change.
2. Confirm the diff:    git diff
3. Invoke sentinel:     (see "Invoking the sentinel" below)
4. Assert the report contains the expected line.
5. Revert:              git checkout -- <file>     (or rm <file> for new files)
```

### Invoking the sentinel

From the main agent (or any coordinating context):

```
Use the Agent tool with:
  subagent_type = "sentinel"
  description   = "Sentinel check on working tree"
  prompt        = "Evaluate the current working tree against .claude/architecture-rules.md. Run `git diff HEAD` to discover changes. Report per the format in your agent file."
```

Expected: a single `SENTINEL REPORT` block printed by the sentinel.

---

## Pass criteria

- **T1–T7:** Each report contains `[VIOLATION] R0XX` for the correct rule ID with the correct file path. (Line number is best-effort and not asserted.)
- **T8:** Report contains zero `[VIOLATION]` lines. `[SKIP]` lines are acceptable as long as no false positive appears.
- All 8 invocations complete without the sentinel calling `Edit` or `Write`.

---

## T1 — R001: Core importing infrastructure

**Target file:** `src/lib/core/services/MetricsService.js`

**Seeded change:** Add this line at the top of the imports section:

```js
import { GitLabClient } from '../../infrastructure/api/GitLabClient.js';
```

**Expected report line:**
```
[VIOLATION] R001  src/lib/core/services/MetricsService.js:<line>
  rule: Core must not import from infrastructure
```

**Revert:** `git checkout -- src/lib/core/services/MetricsService.js`

---

## T2 — R004: Route bypassing `ServiceFactory`

**Target file:** `src/server/routes/metrics.js`

**Seeded change:** Inside the first route handler, add (do not remove the existing call):

```js
const _drift = new MetricsService(new GitLabIterationDataProvider(new GitLabClient()));
```

(Imports for `MetricsService`, `GitLabIterationDataProvider`, and `GitLabClient` must also be added so the diff includes them. Both the `new MetricsService(` line and the new infrastructure imports inside `src/server/routes/` should trigger R004.)

**Expected report line:**
```
[VIOLATION] R004  src/server/routes/metrics.js:<line>
  rule: Routes obtain services from ServiceFactory; never `new` infrastructure directly
```

**Revert:** `git checkout -- src/server/routes/metrics.js`

---

## T3 — R005: Relative import missing `.js`

**Target file:** `src/lib/core/services/VelocityCalculator.js`

**Seeded change:** Add a synthetic import at the top:

```js
import { Annotation } from '../entities/Annotation';
```

(Note: missing `.js` on the end.)

**Expected report line:**
```
[VIOLATION] R005  src/lib/core/services/VelocityCalculator.js:<line>
  rule: ES module imports use explicit .js extension
```

**Revert:** `git checkout -- src/lib/core/services/VelocityCalculator.js`

---

## T4 — R006: Logging a secret

**Target file:** `src/server/routes/cache.js`

**Seeded change:** Add this line inside any handler:

```js
console.log('debug token:', process.env.GITLAB_TOKEN);
```

**Expected report line:**
```
[VIOLATION] R006  src/server/routes/cache.js:<line>
  rule: No secrets in logs
```

**Revert:** `git checkout -- src/server/routes/cache.js`

---

## T5 — R007: Exported function without JSDoc

**Target file:** `src/lib/core/services/VelocityCalculator.js`

**Seeded change:** Append at end of file:

```js
export function _sentinelTestNoJsdoc(x) {
  return x + 1;
}
```

(No JSDoc block above it.)

**Expected report line:**
```
[VIOLATION] R007  src/lib/core/services/VelocityCalculator.js:<line>
  rule: Public exports carry JSDoc
```

**Revert:** `git checkout -- src/lib/core/services/VelocityCalculator.js`

---

## T6 — R012: Inline `style={{...}}` in JSX

**Target file:** `src/public/components/VelocityChart.jsx`

**Seeded change:** Inside the rendered JSX, add a sentinel element:

```jsx
<div style={{ color: 'red', padding: '8px' }}>sentinel-test</div>
```

**Expected report line:**
```
[VIOLATION] R012  src/public/components/VelocityChart.jsx:<line>
  rule: Inline style={{...}} is forbidden in JSX; use styled-components
```

**Revert:** `git checkout -- src/public/components/VelocityChart.jsx`

---

## T7 — R014: New repository class without `extends`

**Target file (new):** `src/lib/infrastructure/repositories/MemoryAnnotationsRepository.js`

**Seeded change:** Create the file with this content:

```js
/**
 * Sentinel test fixture — intentionally missing `extends IAnnotationsRepository`.
 */
export class MemoryAnnotationsRepository {
  constructor() {
    this.items = [];
  }
}
```

**Expected report line:**
```
[VIOLATION] R014  src/lib/infrastructure/repositories/MemoryAnnotationsRepository.js:<line>
  rule: New repository classes extend their I<Name> interface
```

(Bonus: R003 may also trigger. Either is acceptable, but R014 must appear.)

**Revert:** `rm src/lib/infrastructure/repositories/MemoryAnnotationsRepository.js`

---

## T8 — Negative control: clean refactor

**Target file:** `src/lib/core/services/VelocityCalculator.js`

**Seeded change:** Rename a private helper or add an internal `const` that doesn't violate any rule. For example, add inside the class:

```js
  /**
   * Internal no-op used for sentinel negative-control test.
   * @returns {number} Always zero.
   */
  static _sentinelNoop() {
    return 0;
  }
```

(Note: has JSDoc, no exports, no imports, no inline styles, no PropTypes, no logging.)

**Expected:** The report must contain **zero** `[VIOLATION]` lines. `[SKIP]` lines or `[PASS] all rules.` are both acceptable.

**Revert:** `git checkout -- src/lib/core/services/VelocityCalculator.js`

---

## Cleanup

After all 8 tests:

```bash
git status                           # should be clean
git checkout claude/agentic-sentinels-setup-JWGHA
git branch -D test/sentinel-fixtures
```

---

## Recording results

Log each invocation in a table. Suggested template:

| Test | Rule | Caught? | False positives? | Notes |
|------|------|---------|------------------|-------|
| T1 | R001 |  |  |  |
| T2 | R004 |  |  |  |
| T3 | R005 |  |  |  |
| T4 | R006 |  |  |  |
| T5 | R007 |  |  |  |
| T6 | R012 |  |  |  |
| T7 | R014 |  |  |  |
| T8 | (negative) | n/a |  |  |

A passing run is **7/7 violations caught with 0 false positives in T8**.

---

## When to extend this plan

Add a new test whenever a new rule is added to `.claude/architecture-rules.md`. Each new rule should ship with at least one positive test (a seeded violation that should be caught) and may extend the negative-control test rather than adding a new one.
