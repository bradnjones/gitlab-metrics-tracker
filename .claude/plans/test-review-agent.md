# Plan: Test Review Agent

**Status:** Proposed (awaiting implementation)
**Created:** 2026-05-08
**Owner:** Brad

---

## Goal

Create a specialized, **read-only** Claude Code agent that audits the existing
test suite and produces an interactive report. The agent never modifies tests;
it surfaces problems so we can discuss findings and refine a testing strategy
together.

## Why a New Agent (vs. extending `test-coverage-agent`)

The existing `test-coverage-agent` plans and validates **new** tests during the
TDD RED-GREEN-REFACTOR cycle. This new agent audits the **existing** suite
holistically — a different job, different mental mode, different output.

## Agent: `test-review-agent`

### Tools

| Tool | Purpose |
|------|---------|
| `Glob`, `Grep`, `Read` | Inspect source and test files |
| `Bash` | Run `npm run test:coverage` to ground analysis in real numbers |
| `WebFetch`, `WebSearch` | Look up E2E tooling docs / current best practices |
| `TodoWrite` | Track multi-pass review progress |
| `Write` | **Only** for writing the final report file |

**Explicit prohibition:** never edits test files, source files, or config.
The only file it writes is the report.

### Output Location

`_context/testing/review-report-YYYY-MM-DD.md`

One report per run, dated. Old reports kept for trend comparison.

---

## Review Dimensions

### 1. Useless / Weak Tests

Flag tests that don't actually prove anything:

- **Tautological tests** — assertion just restates the input
- **Mocking the SUT** — the function under test is itself mocked
- **Always-pass assertions** — `toBeTruthy()`, `toBeDefined()` on values
  that are guaranteed by the type system or prior line
- **Tests that re-implement the code** — assertion logic mirrors
  implementation logic; they pass/fail together by construction
- **Snapshot-only tests** with no behavioral assertion
- **Setup-heavy tests with trivial assertions** — 30 lines of arrange,
  one weak assert

### 2. Missing Edge Cases

Per-module checklist of likely gaps:

- Boundary values (0, 1, max, max+1, negative)
- Empty / null / undefined inputs
- Error paths and thrown exceptions
- Async failure modes (rejected promises, timeouts)
- Off-by-one in date ranges, pagination, slicing
- Timezone / locale (relevant for sprint date math)
- Large inputs (performance + correctness)
- Concurrent / interleaved operations where applicable

### 3. Integration Test Candidates

Identify over-mocked unit tests where mocks may have drifted from
real behavior. Specific seams to evaluate:

- GitLab GraphQL client ↔ repositories (real GraphQL responses)
- Express routes ↔ use cases (HTTP layer wiring)
- File-system repositories ↔ actual filesystem
- Annotation flows that span multiple layers

For each candidate, note: what the unit tests currently mock, what
could break in reality, and what kind of integration test would
catch it.

### 4. End-to-End Strategy

Recommend a tool and seed scenarios.

**Default recommendation: Playwright**
- Best fit for React + Vite frontend over Express backend
- Parallel execution, trace viewer, time-travel debugging
- First-class auto-waiting (less flake than Cypress)
- Good CI story

**Alternative considered: Cypress** — call out tradeoffs.

Propose:
- 5–8 critical user journeys to seed the suite
- Folder structure (`e2e/` at repo root)
- CI hook (when to run — PR vs. nightly)
- Test data strategy (real GitLab fixtures vs. mocks)

---

## Report Format

```markdown
# Test Suite Review — YYYY-MM-DD

## Executive Summary
- Total tests: N
- Coverage: X% (statements / branches / functions / lines)
- Useless tests flagged: N
- Missing edge cases: N
- Integration candidates: N
- E2E recommendation: Playwright

## 1. Useless / Weak Tests
### [HIGH] #1 — `path/to/test.js:42`
**Test:** "should return data"
**Issue:** Mocks the function under test...
**Recommendation:** Replace with...

[numbered findings, severity-tagged]

## 2. Missing Edge Cases
[per-module checklist]

## 3. Integration Test Candidates
[seam-by-seam analysis]

## 4. E2E Strategy
[tool choice + seed scenarios + setup]

## Prioritized Action Plan
1. [HIGH] Remove/fix N useless tests
2. [HIGH] Add N edge-case tests for X
3. [MED] Add integration coverage for Y
4. [MED] Stand up Playwright with 5 smoke tests
...
```

Each finding is **numbered** so the user can reference them in
follow-up: "tell me more about #7", "skip #12".

---

## Out of Scope (for now)

- Performance / load testing
- Accessibility testing (separate concern, separate agent if needed)
- Mutation testing (could be a future enhancement)
- Visual regression testing

If we want any of these later, extend the agent or add a sibling.

---

## Workflow

1. User invokes the agent: "review our tests"
2. Agent runs `npm run test:coverage` to get baseline numbers
3. Agent reads test files + corresponding source files in passes
4. Agent writes report to `_context/testing/review-report-YYYY-MM-DD.md`
5. Agent returns a short summary + path to the full report
6. User reads report, asks targeted follow-ups by finding number
7. Separate follow-up sessions implement the recommended changes
   (using the regular TDD workflow + `test-coverage-agent`)

---

## Open Questions

- Should the agent be invokable via a slash command (`/review-tests`)
  in addition to direct agent invocation? *Defer until we feel friction.*
- Should reports be committed to the repo or gitignored?
  *Lean: commit them — useful history of test-debt evolution.*
