# Git/GitHub Workflow

**Repository:** https://github.com/bradnjones/gitlab-metrics-tracker  
**Access:** SSH via `git@github.com:bradnjones/gitlab-metrics-tracker.git`

---

## Overview

This project uses GitHub Issues for story tracking and Pull Requests for code review. All work is done on feature branches, never directly on `main`.

---

## Complete Workflow Example

### Step 1: Create GitHub Issue

```bash
# View story in backlog
cat _context/stories/backlog.md

# Create issue for Story 0.1
gh issue create \
  --title "Story 0.1: Project Foundation - Clean Architecture Setup" \
  --body "**Goal:** Set up Clean Architecture structure with core entities and TDD infrastructure

**Priority:** HIGHEST (Foundation)
**Estimate:** 2-3 hours

**Acceptance Criteria:**
- [ ] Core entities created (Metric, Annotation, AnalysisResult)
- [ ] Repository interfaces defined
- [ ] File system repository implemented
- [ ] Tests written FIRST (TDD) with ≥85% coverage
- [ ] Clean Architecture agent validates structure

**Technical Tasks:**
1. Create core entities in src/lib/core/entities/
2. Define repository interface in src/lib/core/repositories/
3. Implement file system repositories in src/lib/infrastructure/repositories/
4. Write comprehensive tests (TDD approach)

**Agents to Use:**
- Clean Architecture Agent
- Test Coverage Agent
- Code Review Agent" \
  --label "story,phase-0,priority-high"

# Output: Created issue #1: Story 0.1: Project Foundation...
```

### Step 2: Create Feature Branch

```bash
# Create and checkout feature branch
git checkout -b feat/1-project-foundation

# Verify you're on the new branch
git branch
```

### Step 3: Launch Agents

```bash
# Launch appropriate agents before coding
# (Use Claude Code's Task tool to launch agents)

# Example agent sequence for Story 0.1:
# 1. Product Owner Agent - Validate requirements
# 2. Clean Architecture Agent - Plan structure
# 3. Test Coverage Agent - Plan TDD approach
```

### Step 4: TDD Cycle

#### 🔴 RED - Write Failing Tests
```bash
# Create test file
touch src/lib/core/entities/Metric.test.js

# Write failing tests (following Test Coverage Agent recommendations)
# Tests should fail with assertion errors (not import errors)

# Run tests to verify they fail
npm test

# Commit test
git add src/lib/core/entities/Metric.test.js
git commit -m "test: add Metric entity tests (#1)

- Test constructor with valid data
- Test validation rules
- Test toJSON serialization"
```

#### 🟢 GREEN - Minimal Implementation
```bash
# Create implementation file
touch src/lib/core/entities/Metric.js

# Write minimal code to pass tests

# Run tests to verify they pass
npm test

# Commit implementation
git add src/lib/core/entities/Metric.js
git commit -m "feat: implement Metric entity (#1)

- Add constructor with validation
- Add toJSON method
- Core entity with no external dependencies"
```

#### 🔄 REFACTOR - Clean Up
```bash
# Refactor code (tests stay green)
# Simplify logic, improve naming, add JSDoc

# Run tests to ensure they still pass
npm test

# Commit refactor
git add src/lib/core/entities/Metric.js
git commit -m "refactor: simplify Metric validation and add JSDoc (#1)

- Extract validation to separate method
- Add comprehensive JSDoc annotations
- Improve error messages"
```

### Step 5: Validate with Agents

```bash
# Launch validation agents
# 1. Clean Architecture Agent - Validate structure
# 2. Code Review Agent - Final review

# Fix any issues found
# Commit fixes with appropriate messages
```

### Step 6: Verify Coverage

```bash
# Run coverage report
npm run test:coverage

# Verify ≥85% coverage
# If below 85%, add more tests

# Example output:
# Statements   : 87.5% ( 14/16 )
# Branches     : 85.7% ( 6/7 )
# Functions    : 90.0% ( 9/10 )
# Lines        : 87.5% ( 14/16 )
```

### Step 7: Push Feature Branch

```bash
# Push to remote (first time)
git push -u origin feat/1-project-foundation

# Subsequent pushes (after more commits)
git push
```

### Step 8: Create Pull Request

```bash
gh pr create \
  --title "Story 0.1: Project Foundation - Clean Architecture Setup" \
  --body "Closes #1

## Summary
Implemented Clean Architecture foundation with core entities and repository pattern.

**Changes:**
- ✅ Core entities: Metric, Annotation, AnalysisResult (src/lib/core/entities/)
- ✅ Repository interfaces: IMetricsRepository, IAnnotationsRepository (src/lib/core/repositories/)
- ✅ File system repositories: FileMetricsRepository, FileAnnotationsRepository (src/lib/infrastructure/repositories/)
- ✅ Comprehensive test suite with ≥85% coverage

**Technical Details:**
- Pure business logic in Core layer (no external dependencies)
- Dependency Inversion: Core defines interfaces, Infrastructure implements
- JSDoc annotations for all public APIs
- TDD approach: tests written first, implementation minimal

## Testing
- ✅ All tests pass: 15/15 passing
- ✅ Coverage: 87% (statements), 86% (branches), 90% (functions), 87% (lines)
- ✅ TDD approach followed (tests committed before implementation)

## Agent Reviews
- ✅ **Clean Architecture Agent** - Approved
  - Core layer has no external dependencies ✅
  - Dependency rules followed (Core ← Infrastructure) ✅
  - SOLID principles adhered to ✅
- ✅ **Test Coverage Agent** - Validated
  - 3-10 strategic tests per module ✅
  - Coverage ≥85% achieved ✅
  - No false positives detected ✅
- ✅ **Code Review Agent** - Approved
  - Clean code principles followed ✅
  - JSDoc annotations complete ✅
  - No security issues ✅

## Checklist
- [x] Tests written FIRST (TDD)
- [x] All tests pass
- [x] Coverage ≥85%
- [x] JSDoc annotations complete
- [x] Clean Architecture validated
- [x] Code review passed
- [x] No secrets committed
- [x] .env not accessed

## Files Changed
- src/lib/core/entities/Metric.js
- src/lib/core/entities/Metric.test.js
- src/lib/core/entities/Annotation.js
- src/lib/core/entities/Annotation.test.js
- src/lib/core/entities/AnalysisResult.js
- src/lib/core/entities/AnalysisResult.test.js
- src/lib/core/repositories/IMetricsRepository.js
- src/lib/core/repositories/IAnnotationsRepository.js
- src/lib/infrastructure/repositories/FileMetricsRepository.js
- src/lib/infrastructure/repositories/FileMetricsRepository.test.js
- src/lib/infrastructure/repositories/FileAnnotationsRepository.js
- src/lib/infrastructure/repositories/FileAnnotationsRepository.test.js" \
  --label "story,phase-0,priority-high"

# Output: Created PR #2: Story 0.1: Project Foundation...
```

### Step 9: Merge Pull Request

```bash
# Review PR on GitHub (or via gh pr view)
gh pr view 2

# Merge PR (squash commits for clean history)
gh pr merge 2 --squash --delete-branch

# Issue #1 closes automatically via "Closes #1" in PR body
```

### Step 10: Cleanup and Continue

```bash
# Switch back to main
git checkout main

# Pull latest changes
git pull origin main

# Delete local feature branch (remote already deleted)
git branch -d feat/1-project-foundation

# Ready for next story!
```

---

## Commit Message Conventions

### Format
```
<type>: <subject> (#issue-number)

[optional body]
```

### Types
- `feat:` - New feature
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring (no behavior change)
- `docs:` - Documentation changes
- `fix:` - Bug fixes
- `style:` - Code style changes (formatting, whitespace)
- `chore:` - Build process, dependencies

### Examples

**Good:**
```
test: add Metric entity validation tests (#1)

- Test required fields validation
- Test data type validation
- Test edge cases (empty, null, undefined)
```

```
feat: implement Metric entity (#1)

Core entity for storing sprint metrics.
No external dependencies (Clean Architecture).
```

```
refactor: extract validation logic to helper (#1)

Simplifies Metric constructor and improves testability.
```

**Bad:**
```
Updated files  ❌ (vague)
```

```
feat: add stuff  ❌ (no issue number, vague)
```

```
Fixed it  ❌ (no type, no issue number, vague)
```

---

## Branch Naming Conventions

### Format
```
<type>/<issue-number>-<short-description>
```

### Types
- `feat/` - Feature branch
- `fix/` - Bug fix branch
- `refactor/` - Refactoring branch
- `docs/` - Documentation branch

### Examples

**Good:**
- `feat/1-project-foundation`
- `feat/5-metrics-calculator`
- `fix/12-cycle-time-calculation`
- `refactor/8-repository-abstraction`
- `docs/15-jsdoc-annotations`

**Bad:**
- `my-feature` ❌ (no issue number)
- `feat/project` ❌ (no issue number, vague)
- `1-foundation` ❌ (no type prefix)

---

## GitHub Issue Labels

### Story Phases
- `phase-0` - Foundation
- `phase-1` - Core Metrics
- `phase-2` - Annotation System
- `phase-3` - React Frontend
- `phase-4` - Polish & Optimization

### Story Types
- `story` - User story
- `bug` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation
- `spike` - Research/investigation

### Priority
- `priority-high` - High priority
- `priority-medium` - Medium priority
- `priority-low` - Low priority

### Status
- `blocked` - Blocked by another issue
- `in-progress` - Currently being worked on
- `help-wanted` - Needs discussion or assistance

---

## Common Tasks

### View Open Issues
```bash
gh issue list
```

### View Issue Details
```bash
gh issue view 1
```

### View Pull Requests
```bash
gh pr list
```

### View PR Details
```bash
gh pr view 2
```

### Check PR Status
```bash
gh pr checks 2
```

### Update Issue Labels
```bash
gh issue edit 1 --add-label "in-progress"
gh issue edit 1 --remove-label "blocked"
```

### Close Issue
```bash
gh issue close 1 --comment "Completed via PR #2"
```

---

## Troubleshooting

### Issue: Push rejected (branch protection)
**Solution:** You're trying to push to `main` directly. Create a feature branch:
```bash
git checkout -b feat/123-description
git push -u origin feat/123-description
```

### Issue: gh command not found
**Solution:** Install GitHub CLI:
```bash
# macOS
brew install gh

# Login
gh auth login
```

### Issue: Can't find issue number
**Solution:** List issues:
```bash
gh issue list
```

### Issue: Merge conflicts
**Solution:** Resolve conflicts locally:
```bash
git checkout main
git pull origin main
git checkout feat/123-description
git merge main
# Resolve conflicts
git add .
git commit -m "fix: resolve merge conflicts (#123)"
git push
```

---

## Best Practices

### ✅ DO
- Create GitHub Issue BEFORE starting work
- Work on feature branches (never on `main`)
- Commit incrementally (test, implementation, refactor)
- Include issue number in every commit
- Run tests before committing
- Use conventional commit format
- Write clear PR descriptions
- Squash merge PRs for clean history
- Delete feature branches after merge

### ❌ DON'T
- Push directly to `main`
- Create PRs without running tests
- Commit secrets or .env files
- Squash commits locally (let GitHub do it on merge)
- Work on multiple stories simultaneously
- Skip agent reviews
- Forget to link issues in PR body

---

## Quick Reference

```bash
# Start new story
gh issue create --title "Story X.X: Title" --body "..." --label "story,phase-X"
git checkout -b feat/X-description

# During development
git add .
git commit -m "type: message (#X)"
npm test
git push

# Complete story
gh pr create --title "Story X.X: Title" --body "Closes #X..." --label "story"
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

**See Also:**
- `.claude/CLAUDE.md` - Main project context
- `_context/workflow/agent-usage.md` - Agent workflow
- `_context/stories/backlog.md` - Story backlog
