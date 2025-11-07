# In Progress

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
