# Story Management with GitHub Issues

**This project uses GitHub Issues for story tracking.**

---

## Overview

Stories are managed as GitHub Issues in the repository. The files in this directory serve as a **reference/planning backlog** but the **source of truth is GitHub Issues**.

---

## Workflow

### 1. Plan Stories (Local Files)
- **backlog.md** - Planning document with all stories
- Stories are organized by phase (0-4)
- Includes acceptance criteria, estimates, technical tasks

### 2. Create GitHub Issue
When ready to start a story:
```bash
# Create issue from story in backlog.md
gh issue create \
  --title "Story 0.1: Project Foundation" \
  --body "$(cat backlog.md | grep -A 50 'Story 0.1')" \
  --label "story,phase-0,priority-high"
```

### 3. Track Progress (GitHub)
- **Open Issues** - Stories not yet started
- **In Progress** - Currently being worked on (add `in-progress` label)
- **Closed Issues** - Completed stories (closed via PR)

### 4. View Stories
```bash
# View all open stories
gh issue list --label story

# View stories by phase
gh issue list --label phase-0
gh issue list --label phase-1

# View in-progress stories
gh issue list --label in-progress

# View closed stories
gh issue list --state closed --label story
```

---

## File Structure

### backlog.md
**Purpose:** Planning and reference
**Contents:**
- All planned stories (Phase 0-4)
- Acceptance criteria
- Technical tasks
- Time estimates
- Agent recommendations

**Note:** This is NOT the source of truth. Create GitHub Issues from this.

### in-progress.md (Optional Reference)
**Purpose:** Quick reference for current work
**Usage:** Update manually to track which issue you're working on

**Example:**
```markdown
# In Progress

**Current Story:** #5 - Story 1.1: Metrics Calculation Engine
**Branch:** feat/5-metrics-calculator
**Started:** 2025-01-06
```

### completed.md (Deprecated)
**Purpose:** Historical reference (optional)
**Note:** GitHub Issues (closed) is the official record

---

## GitHub Labels

### Required Labels
Create these labels in GitHub repository:

**Phases:**
- `phase-0` - Foundation
- `phase-1` - Core Metrics
- `phase-2` - Annotation System
- `phase-3` - React Frontend
- `phase-4` - Polish & Optimization

**Types:**
- `story` - User story
- `bug` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation

**Priority:**
- `priority-high` - High priority
- `priority-medium` - Medium priority
- `priority-low` - Low priority

**Status:**
- `in-progress` - Currently being worked on
- `blocked` - Blocked by another issue
- `help-wanted` - Needs discussion

---

## Creating Labels in GitHub

```bash
# Create phase labels
gh label create "phase-0" --color "0E8A16" --description "Foundation phase"
gh label create "phase-1" --color "1D76DB" --description "Core Metrics phase"
gh label create "phase-2" --color "5319E7" --description "Annotation System phase"
gh label create "phase-3" --color "E99695" --description "React Frontend phase"
gh label create "phase-4" --color "FBCA04" --description "Polish & Optimization phase"

# Create type labels
gh label create "story" --color "0075CA" --description "User story"
gh label create "bug" --color "D73A4A" --description "Bug fix"
gh label create "refactor" --color "FEF2C0" --description "Code refactoring"
gh label create "docs" --color "0075CA" --description "Documentation"

# Create priority labels
gh label create "priority-high" --color "B60205" --description "High priority"
gh label create "priority-medium" --color "FBCA04" --description "Medium priority"
gh label create "priority-low" --color "0E8A16" --description "Low priority"

# Create status labels
gh label create "in-progress" --color "1D76DB" --description "Currently being worked on"
gh label create "blocked" --color "D93F0B" --description "Blocked by another issue"
gh label create "help-wanted" --color "008672" --description "Needs discussion"
```

---

## Example: Creating Story 0.1 as GitHub Issue

```bash
# Read story from backlog
cat backlog.md | grep -A 60 "Story 0.1"

# Create GitHub Issue
gh issue create \
  --title "Story 0.1: Project Foundation - Clean Architecture Setup" \
  --body "**Goal:** Set up Clean Architecture structure with core entities and TDD infrastructure

**Priority:** HIGHEST (Foundation)
**Estimate:** 2-3 hours
**Prerequisites:** None

## Acceptance Criteria
- [ ] Core entities created (Metric, Annotation, AnalysisResult)
- [ ] Repository interfaces defined (abstraction for storage)
- [ ] File system repository implemented (JSON storage)
- [ ] Tests written FIRST (TDD) with ≥85% coverage
- [ ] Clean Architecture agent validates structure

## Technical Tasks
1. Create core entities in \`src/lib/core/entities/\`
   - \`Metric.js\` with JSDoc
   - \`Annotation.js\` with JSDoc
   - \`AnalysisResult.js\` with JSDoc
2. Define repository interface in \`src/lib/core/repositories/\`
   - \`IMetricsRepository.js\`
   - \`IAnnotationsRepository.js\`
3. Implement file system repositories in \`src/lib/infrastructure/repositories/\`
   - \`FileMetricsRepository.js\`
   - \`FileAnnotationsRepository.js\`
4. Write comprehensive tests (TDD approach)

## Agents to Use
- 🤖 Clean Architecture Agent (validate structure)
- 🤖 Test Coverage Agent (plan TDD approach)
- 🤖 Code Review Agent (final review)

## References
- Prototype: \`/Users/brad/dev/smi/gitlab-sprint-metrics/\`
- Context: \`_context/architecture/clean-architecture.md\`" \
  --label "story,phase-0,priority-high"
```

---

## Benefits of GitHub Issues

### ✅ Advantages
- **Single Source of Truth** - No need to sync local files
- **Traceability** - Issues linked to PRs and commits
- **Discussion** - Comments on issues for clarification
- **Notifications** - Get notified of updates
- **Project Boards** - Visualize progress (optional)
- **Search** - Powerful search and filtering
- **History** - Complete audit trail

### ⚠️ Keep Local Files For
- Planning and brainstorming
- Quick reference
- Detailed technical notes
- Story templates

---

## Quick Reference Commands

```bash
# Create story issue
gh issue create --title "Story X.X: Title" --body "..." --label "story,phase-X,priority-high"

# List stories
gh issue list --label story

# View story
gh issue view 5

# Update story status
gh issue edit 5 --add-label "in-progress"

# Close story (via PR)
gh pr create --body "Closes #5 ..."
gh pr merge --squash --delete-branch
```

---

**See Also:**
- `_context/workflow/git-github-workflow.md` - Complete Git/GitHub workflow
- `.claude/CLAUDE.md` - Project overview
- `backlog.md` - Planning backlog (reference)
