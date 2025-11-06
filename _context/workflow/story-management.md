# Story Management

**Version:** 1.0
**Last Updated:** 2025-11-06

## Overview

Story management provides structure for planning, tracking, and completing work in the gitlab-metrics-tracker project. This document outlines the story format, lifecycle, and best practices.

## Story Format and Structure

### Story Template

```markdown
## Story: [Brief Title]

**ID:** STORY-XXX
**Priority:** High/Medium/Low
**Estimate:** [Story Points or Hours]
**Status:** Backlog/In Progress/Completed

### User Story
As a [user type],
I want to [action/feature],
So that [benefit/value].

### Context
[Background information, why this story is needed, related decisions]

### Acceptance Criteria
- [ ] Criterion 1: Specific, testable requirement
- [ ] Criterion 2: Another specific requirement
- [ ] Criterion 3: Edge case or validation

### Technical Notes
- Implementation approach
- Dependencies or related stories
- Potential challenges
- Architecture layer affected (Core/Infrastructure/Presentation)

### Testing Strategy
- [ ] Unit tests for [specific components]
- [ ] Integration tests for [specific interactions]
- [ ] Manual testing steps

### Definition of Done
- [ ] Code written and follows conventions
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code reviewed (if applicable)
- [ ] Story deployed/integrated
```

### Example Story

```markdown
## Story: Display Sprint Velocity Metric

**ID:** STORY-001
**Priority:** High
**Estimate:** 3 story points
**Status:** In Progress

### User Story
As a product manager,
I want to see the velocity metric for a sprint,
So that I can track team productivity over time.

### Context
Velocity is a core metric showing the sum of story points completed during a sprint. This is the first metric we'll display in the dashboard and will serve as a foundation for other metrics.

### Acceptance Criteria
- [ ] Velocity is calculated as sum of completed issue points
- [ ] Velocity displays prominently in the metrics dashboard
- [ ] Velocity shows "0" when no issues are completed
- [ ] Velocity ignores issues without point estimates
- [ ] Velocity rounds to nearest integer

### Technical Notes
- **Core Layer:** `calculate-velocity.js` use case
- **Presentation Layer:** `MetricsDisplay.jsx` component
- Dependencies: Sprint data structure, Issue entity
- References prototype: `/Users/brad/dev/smi/gitlab-sprint-metrics/src/components/MetricsDisplay.js`

### Testing Strategy
- [ ] Unit tests for velocity calculation logic
- [ ] Unit tests for MetricsDisplay component rendering
- [ ] Test edge cases: empty sprint, null points, in-progress issues
- [ ] Visual regression test for metrics card

### Definition of Done
- [ ] `calculate-velocity.js` implemented with tests
- [ ] `MetricsDisplay.jsx` renders velocity correctly
- [ ] All tests passing
- [ ] Code follows file naming conventions
- [ ] JSDoc comments added
- [ ] Story marked as completed
```

## Story Lifecycle

### 1. Backlog
Stories waiting to be worked on.

**Status:** Backlog
**Actions:**
- Refine story details
- Add acceptance criteria
- Estimate effort
- Prioritize relative to other stories

### 2. In Progress
Currently being worked on.

**Status:** In Progress
**Actions:**
- Follow TDD workflow (Red-Green-Refactor)
- Update acceptance criteria as completed
- Commit code incrementally
- Update story with progress notes

**Rule:** Only ONE story should be "In Progress" at a time. Finish what you start before moving to the next story.

### 3. Completed
Story is finished and meets all acceptance criteria.

**Status:** Completed
**Actions:**
- Verify all acceptance criteria are met
- Ensure all tests pass
- Update documentation
- Archive story (keep for reference)

## Acceptance Criteria Guidelines

### Good Acceptance Criteria (SMART)

**Specific:** Clear, unambiguous requirements
```
- [ ] Velocity is calculated as sum of completed issue points
```

**Measurable:** Can be verified objectively
```
- [ ] Display shows "0 points" when sprint has no completed issues
```

**Achievable:** Realistic within the story scope
```
- [ ] Velocity updates when sprint selection changes
```

**Relevant:** Directly related to the user story
```
- [ ] Velocity metric appears in the metrics dashboard
```

**Testable:** Can be verified through testing
```
- [ ] Velocity calculation passes all unit tests
```

### Bad Acceptance Criteria

```
- [ ] Code looks good (not measurable)
- [ ] Velocity works correctly (not specific)
- [ ] Implement all metrics (not achievable in one story)
- [ ] Make it fast (not testable without benchmarks)
```

## GitHub Issue Integration

### Creating Issues from Stories

Each story can optionally be tracked as a GitHub issue:

```bash
# Create issue from story
gh issue create --title "Display Sprint Velocity Metric" \
  --body-file ./_context/stories/STORY-001.md \
  --label "story,in-progress"

# Link story to issue
# Add issue number to story file:
# **GitHub Issue:** #123
```

### Syncing Status

```bash
# Update issue when story progresses
gh issue edit 123 --add-label "completed"
gh issue close 123 --comment "Story completed. All acceptance criteria met."
```

### Using Issue Templates

Create `.github/ISSUE_TEMPLATE/story.md`:

```markdown
---
name: Story
about: Create a user story
title: 'Story: [Brief Title]'
labels: story, backlog
---

## User Story
As a [user type],
I want to [action],
So that [benefit].

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Notes
[Implementation details]
```

## One Story at a Time Rule

**Why:** Focus, quality, and completion over starting multiple stories.

### Benefits:
1. **Better focus** - Deep work on one problem
2. **Higher quality** - More thorough testing and documentation
3. **Faster completion** - Avoid context switching
4. **Clearer progress** - Easy to see what's done
5. **Less WIP** - Reduced cognitive load

### Exceptions:
- Story blocked by external dependency
- Urgent bug fix needed
- Pairing on a story (one story, multiple people)

### Process:
1. Select highest priority backlog story
2. Move to "In Progress"
3. Work until all acceptance criteria met
4. Move to "Completed"
5. Select next story

## Story Estimation

### Story Points (Recommended)

**Fibonacci Scale:** 1, 2, 3, 5, 8, 13

- **1 point:** Trivial change (< 1 hour)
- **2 points:** Simple feature (1-2 hours)
- **3 points:** Standard feature (2-4 hours)
- **5 points:** Complex feature (4-8 hours)
- **8 points:** Very complex feature (1-2 days)
- **13 points:** Epic - break into smaller stories

### Time-Based (Alternative)

- **XS:** < 1 hour
- **S:** 1-2 hours
- **M:** 2-4 hours
- **L:** 4-8 hours
- **XL:** 1-2 days (break down)

### Estimation Guidelines

- Estimate relative to other stories
- Include time for testing and documentation
- Break down stories > 8 points
- Re-estimate if complexity changes

## Story Completion Checklist

Before marking a story as "Completed":

- [ ] All acceptance criteria met
- [ ] All tests written and passing
- [ ] Code follows naming conventions
- [ ] JSDoc comments added
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Related stories linked
- [ ] Code committed (if applicable)
- [ ] Story file updated with completion notes

## Story Organization

### Directory Structure

```
_context/
└── stories/
    ├── backlog/
    │   ├── STORY-001.md
    │   ├── STORY-002.md
    │   └── STORY-003.md
    ├── in-progress/
    │   └── STORY-004.md
    └── completed/
        ├── STORY-005.md
        └── STORY-006.md
```

### Moving Stories

```bash
# Move story from backlog to in-progress
mv _context/stories/backlog/STORY-001.md _context/stories/in-progress/

# Move story from in-progress to completed
mv _context/stories/in-progress/STORY-001.md _context/stories/completed/
```

## Story Templates

### Feature Story Template

Use for new features or enhancements.

```markdown
## Story: [Feature Name]

### User Story
As a [role], I want to [action], so that [benefit].

### Acceptance Criteria
- [ ] [Criterion]

### Technical Notes
- Layer: Core/Infrastructure/Presentation
- Files affected: [list]
```

### Bug Fix Story Template

Use for fixing defects.

```markdown
## Story: Fix [Bug Description]

### Problem
[Description of the bug]

### Expected Behavior
[What should happen]

### Actual Behavior
[What currently happens]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]

### Acceptance Criteria
- [ ] Bug is fixed
- [ ] Regression tests added
```

### Technical Debt Story Template

Use for refactoring or architectural improvements.

```markdown
## Story: Refactor [Component Name]

### Current State
[What exists now and why it needs improvement]

### Desired State
[What the improved version looks like]

### Benefits
- [Benefit 1]
- [Benefit 2]

### Acceptance Criteria
- [ ] Refactoring complete
- [ ] All tests still pass
- [ ] No functionality changes
```

## Best Practices

1. **Write stories from user perspective** - Focus on value, not tasks
2. **Keep stories small** - Should complete in < 2 days
3. **Make acceptance criteria testable** - Can verify objectively
4. **One story at a time** - Finish before starting next
5. **Update status promptly** - Keep lifecycle accurate
6. **Link related stories** - Show dependencies
7. **Archive completed stories** - Keep for reference
8. **Review and refine backlog regularly** - Keep priorities current

## Related Documentation

- **TDD Workflow:** `_context/testing/tdd-workflow.md`
- **File Naming:** `_context/coding/file-naming.md`
- **Clean Architecture:** `_context/architecture/clean-architecture.md`
- **Coding Standards:** `_context/coding/standards.md`

## Quick Reference Commands

```bash
# Create new story from template
cp _context/stories/templates/feature.md _context/stories/backlog/STORY-XXX.md

# Move story to in-progress
mv _context/stories/backlog/STORY-XXX.md _context/stories/in-progress/

# Move story to completed
mv _context/stories/in-progress/STORY-XXX.md _context/stories/completed/

# Create GitHub issue from story
gh issue create --title "Story Title" --body-file _context/stories/in-progress/STORY-XXX.md
```
