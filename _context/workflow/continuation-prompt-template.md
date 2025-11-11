# Continuation Prompt Template

**Purpose:** Use this template when starting a new conversation or clearing context to ensure Claude follows all documented procedures.

**When to Use:**
- Starting a new conversation session
- After clearing context window
- When resuming work after a break
- When you want to ensure proper workflow adherence

---

## Standard Continuation Prompt

```
I'm continuing work on the GitLab Metrics Tracker project. Please review the current state and help me proceed following all documented procedures.

**Current Status:**
- Last completed: [e.g., "Story V2: Cycle Time Metrics - PR #37 merged"]
- Next to work on: [e.g., "Story V3: Metrics Dashboard Polish"]

**Important Context to Review:**
1. Read `_context/stories/backlog.md` - current story details
2. Read `_context/workflow/vertical-slices.md` - workflow procedures
3. Read `.claude/CLAUDE.md` - project guidelines
4. Check `git status` and current branch
5. Check open GitHub issues with `gh issue list`

**Workflow Requirements (MANDATORY):**

1. **Before Starting Any Work:**
   - [ ] Create GitHub issue using `gh issue create`
   - [ ] Launch Product Owner agent to validate requirements
   - [ ] Launch other relevant agents (UX/UI, GitLab, etc.) as needed
   - [ ] Create SHORT-LIVED feature branch: `git checkout -b feat/ISSUE-description`

2. **Development Process:**
   - [ ] Follow TDD: Write tests FIRST (RED-GREEN-REFACTOR)
   - [ ] Maintain ≥85% test coverage
   - [ ] Run `npm test` before every commit
   - [ ] Follow vertical slice approach (GitLab → Core → API → UI)

3. **Agent Usage (Required):**
   - [ ] Product Owner - Validate requirements (ALWAYS first)
   - [ ] UX/UI Design - Before building UI components
   - [ ] Test Coverage - Before writing tests (plan TDD strategy)
   - [ ] Clean Architecture - After implementation (validate structure)
   - [ ] Code Review - Before committing (final quality check)

4. **PR Workflow (SHORT-LIVED BRANCHES):**
   - [ ] Keep PRs small (< 200 lines preferred)
   - [ ] ONE branch per PR (never reuse branches)
   - [ ] After creating PR: STOP and ASK "Have you merged PR #X?"
   - [ ] Wait for user confirmation before continuing
   - [ ] After merge: Pull main, delete old branch, create NEW branch for next work

5. **Commit Standards:**
   - [ ] Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`
   - [ ] Include issue number: `feat: description (#123)`
   - [ ] All tests passing before commit
   - [ ] Add co-author footer to commits

**Next Steps:**
Please confirm current project state and guide me through the next story following all procedures above.
```

---

## Quick Reference Checklist

Use this abbreviated version for quick status checks:

```
Continue GitLab Metrics Tracker - Story [VX].

Status check:
- Current branch: [run git status]
- Open issues: [run gh issue list]
- Last work: [describe]
- Next: [story name]

Follow workflow:
1. Issue → 2. Agents → 3. Branch → 4. TDD → 5. Review → 6. PR → 7. ASK user about merge
```

---

## Workflow Quick Reference

### Story Lifecycle (Short-lived Branches)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE ISSUE (gh issue create)                          │
├─────────────────────────────────────────────────────────────┤
│ 2. LAUNCH AGENTS                                            │
│    - Product Owner (ALWAYS first)                           │
│    - UX/UI Design (for UI work)                             │
│    - Test Coverage (before tests)                           │
├─────────────────────────────────────────────────────────────┤
│ 3. CREATE BRANCH (from latest main)                         │
│    git checkout main && git pull origin main                │
│    git checkout -b feat/ISSUE-description                   │
├─────────────────────────────────────────────────────────────┤
│ 4. TDD CYCLE (for each unit)                                │
│    ┌─────────────────────────────────────────┐             │
│    │ RED: Write failing test                 │             │
│    │ GREEN: Minimal code to pass             │             │
│    │ REFACTOR: Clean up                      │             │
│    │ VERIFY: npm test (must pass)            │             │
│    └─────────────────────────────────────────┘             │
├─────────────────────────────────────────────────────────────┤
│ 5. VALIDATION                                               │
│    - Clean Architecture Agent                               │
│    - Code Review Agent                                      │
│    - All tests passing (npm test)                           │
│    - Coverage ≥85% (npm run test:coverage)                  │
├─────────────────────────────────────────────────────────────┤
│ 6. COMMIT & PUSH                                            │
│    git add -A                                               │
│    git commit -m "feat: description (#ISSUE)"               │
│    git push -u origin feat/ISSUE-description                │
├─────────────────────────────────────────────────────────────┤
│ 7. CREATE PR                                                │
│    gh pr create --title "..." --body "..."                  │
├─────────────────────────────────────────────────────────────┤
│ 8. ⚠️  STOP AND ASK USER ⚠️                                 │
│    "Have you merged PR #X?"                                 │
│    WAIT for confirmation - DO NOT continue!                 │
├─────────────────────────────────────────────────────────────┤
│ 9. AFTER MERGE CONFIRMATION                                 │
│    git checkout main && git pull origin main                │
│    git branch -d feat/ISSUE-description                     │
│    (Ready for next feature with NEW branch)                 │
└─────────────────────────────────────────────────────────────┘

⚠️  CRITICAL: Never reuse branches! One branch = One PR = One feature
⚠️  CRITICAL: Always ask user about merge before continuing
```

### Agent Usage Matrix

| Agent | When to Use | Required? |
|-------|-------------|-----------|
| **Product Owner** | Starting ANY story | ✅ MANDATORY |
| **GitLab Integration** | Working with GitLab GraphQL API | When needed |
| **UX/UI Design** | Building UI components | ✅ For UI work |
| **Test Coverage** | Before writing tests | ✅ MANDATORY |
| **Clean Architecture** | After implementation | ✅ MANDATORY |
| **Code Review** | Before committing | ✅ MANDATORY |

### Common Commands

```bash
# Start new work (ALWAYS from latest main)
git checkout main && git pull origin main
git checkout -b feat/ISSUE-description

# Create issue
gh issue create --title "Story VX: Title" --body "..." --label "story,mvp"

# Testing
npm test                    # Run all tests
npm run test:coverage       # Check coverage
npm run test:watch          # Watch mode

# Commit
git add -A
git commit -m "feat: description (#ISSUE)"
git push -u origin feat/ISSUE-description

# Create PR
gh pr create --title "..." --body "..." --label "story,mvp"

# After PR merged
git checkout main && git pull origin main
git branch -d feat/ISSUE-description
```

---

## Example Continuation Prompt

Here's a filled-in example for Story V3:

```
I'm continuing work on the GitLab Metrics Tracker project. Please review the current state and help me proceed following all documented procedures.

**Current Status:**
- Last completed: Story V2: Cycle Time Metrics - PR #37 merged
- Next to work on: Story V3: Metrics Dashboard Polish (final MVP story)

**Important Context to Review:**
1. Read `_context/stories/backlog.md` - Story V3 details
2. Read `_context/workflow/vertical-slices.md` - workflow procedures
3. Read `.claude/CLAUDE.md` - project guidelines
4. Check `git status` and current branch
5. Check open GitHub issues with `gh issue list`

**Workflow Requirements (MANDATORY):**

1. **Before Starting Any Work:**
   - [ ] Create GitHub issue for Story V3 using `gh issue create`
   - [ ] Launch Product Owner agent to validate MVP completeness
   - [ ] Launch UX/UI Design agent to extract dashboard layout from prototype
   - [ ] Create feature branch: `git checkout -b feat/ISSUE-dashboard-polish`

2. **Development Process:**
   - [ ] Follow TDD: Write tests FIRST for each component
   - [ ] Maintain ≥85% test coverage
   - [ ] Run `npm test` before every commit
   - [ ] Implement: Dashboard layout → Loading states → Error handling → Empty states → Polish

3. **Agent Usage:**
   - [ ] Product Owner - Validate MVP completeness
   - [ ] UX/UI Design - Extract loading states, error messages, layout from prototype
   - [ ] Test Coverage - Plan TDD for new components
   - [ ] Clean Architecture - Validate after implementation
   - [ ] Code Review - Before final commit

4. **PR Workflow:**
   - [ ] Keep PR focused on dashboard polish only
   - [ ] After creating PR: ASK "Have you merged PR #X?" and WAIT
   - [ ] After merge: This completes MVP! 🎉

**Next Steps:**
Please confirm current project state and guide me through Story V3 following all procedures above.
```

---

## Template Variables

When using this template, replace these placeholders:

- `[VX]` - Story version number (e.g., V3)
- `[ISSUE]` - GitHub issue number
- `[description]` - Short description for branch name
- `[Story Title]` - Full story title
- `[Last completed]` - Previous completed work
- `[Next to work on]` - Current story name

---

## Notes

- **Always read the context files** listed in the prompt before starting
- **Always check git status** to ensure clean state
- **Always create NEW branch** from main (never reuse old branches)
- **Always ask about PR merge** before continuing
- **Never skip agents** - they catch issues early
- **Never commit without tests passing** - no exceptions

---

**Last Updated:** 2025-11-11
**Version:** 1.0
