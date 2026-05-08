# In Progress

## P90 Toggle on Cycle Time & Lead Time Charts

**Started:** 2026-05-08
**Status:** Plan approved, implementation pending
**Type:** Small enhancement (not a vertical slice story)

### Problem
P90 values can dwarf Avg/P50 (see Cycle Time chart with peaks at ~130 days vs Avg/P50 in single digits), flattening the rest of the lines and hiding their fluctuations. User wants to toggle P90 off so the y-axis rescales to show Avg/P50 detail.

### Scope
- `src/public/components/CycleTimeChart.jsx`
- `src/public/components/LeadTimeChart.jsx`

(Velocity / Throughput charts have no P90 — out of scope.)

### Implementation Plan
1. Add a "Hide P90" / "Show P90" toggle button in the chart toolbar next to "Export PNG" on both charts.
2. Persist toggle per-chart in `localStorage`:
   - `chart-show-p90-cycle-time`
   - `chart-show-p90-lead-time`
3. When P90 is hidden, filter the P90 dataset out of `chartData.datasets` via `useMemo`. Chart.js auto-rescales the y-axis when datasets shrink — that's what gives the zoom-in on Avg/P50.
4. Tests on both `CycleTimeChart.test.jsx` and `LeadTimeChart.test.jsx`:
   - Toggle hides P90 dataset from chart data
   - Preference persists in localStorage
   - Default = show P90 (preserves current behavior)

### Key Decisions
- **Filter dataset out** (don't use Chart.js `hidden: true`) → P90 disappears from the legend entirely, so the explicit button is the single control surface (no redundancy with Chart.js's clickable legend).
- **Per-chart toggle state** (independent) → Cycle Time and Lead Time have different data shapes; user may want one hidden but not the other.
- **Hardcode target on dataset label `'P90'`** → only 2 charts, only 1 outlier line; a generalized "toggle any dataset" abstraction would be premature.

### Out of Scope
- Refactoring the duplicated logic between `CycleTimeChart` and `LeadTimeChart` into a shared hook. That's pre-existing tech debt; bundling a refactor here would bloat the PR.
- Toggle for other dataset types (Avg, P50) — no demonstrated need.

---

## No Story Currently In Progress

The project has been restructured from horizontal architectural layers to vertical slices. See `backlog.md` for the new vertical slice stories (V1-V7).

**Previous Approach (Archived 2025-11-07):**
- Horizontal layers: Foundation → Infrastructure → Core → API → UI
- Delayed user value until all layers complete
- See `archived-horizontal-backlog.md` for historical context

**New Approach (Vertical Slices):**
- Each story delivers complete feature (GitLab → Core → API → UI)
- User value at each story
- MVP after Story V3
- See `backlog.md` for details

**Next Story:** V1 - Velocity Tracking (Complete Feature)
**MVP:** V1 + V2 + V3 (15-20 hours total)

---

## How to Start Next Story

1. **Create GitHub issue:**
   ```bash
   gh issue create --title "Story V1: Velocity Tracking" \
     --body "[Acceptance criteria from backlog.md]" \
     --label "story,vertical-slice,mvp"
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feat/v1-velocity-tracking
   ```

3. **Launch agents:**
   - Product Owner Agent
   - GitLab Integration Agent
   - UX/UI Design Agent
   - Test Coverage Agent

4. **Follow vertical slice workflow:**
   - See `_context/workflow/vertical-slices.md` for detailed guide
   - Implement layer by layer (Infrastructure → Core → API → UI)
   - TDD at each layer (RED-GREEN-REFACTOR)
   - Manual validation before commit

---

## Template for In-Progress Story

Once you start a story, update this file with:

```markdown
## Story VN: [Title]

**Started:** [Date]
**Status:** In Progress
**GitHub Issue:** #N
**Branch:** feat/vN-description

**Goal:** [Brief description]

**Progress:**
- [x] GitHub issue created (#N)
- [x] Feature branch created
- [x] Product Owner Agent consulted - requirements validated ✅
- [x] [Other agents as needed]
- [ ] Infrastructure layer complete
  - [ ] GitLabClient methods implemented (TDD)
  - [ ] Tests passing
- [ ] Core layer complete
  - [ ] Calculators/services implemented (TDD)
  - [ ] Tests passing
- [ ] Presentation/API layer complete
  - [ ] Express routes implemented (TDD)
  - [ ] Tests passing
- [ ] Presentation/UI layer complete
  - [ ] React components implemented (TDD)
  - [ ] Charts working
  - [ ] Tests passing
- [ ] Test coverage verified (≥85%)
- [ ] Clean Architecture Agent validation
- [ ] Code Review Agent validation
- [ ] Manual validation complete
- [ ] PR created and merged

**Key Decisions:**
- [Decision 1]
- [Decision 2]

**Notes:**
[Any important notes, blockers, or learnings]
```

---

## Completed Vertical Slices

Completed stories are moved to `completed.md`.

**Already Completed (From Horizontal Approach):**
- ✅ Story 0.1: Project Foundation (entities, repositories)
- ✅ Story 1.1: Metrics Calculation Engine (all 6 calculators)
- ✅ Story 1.2: MetricsService (orchestration layer)

These completed stories provide a strong foundation for Story V1 and beyond.
