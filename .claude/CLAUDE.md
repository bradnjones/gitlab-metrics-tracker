# CLAUDE.md

**Version:** 2.1
**Last Updated:** 2025-11-08
**Project:** GitLab Sprint Metrics Tracker - Clean Architecture Edition
**Development Approach:** Vertical Slices (delivering complete user value per story)
**Branch Strategy:** Short-lived branches (one branch per PR, delete after merge)

---

## 📍 Project Overview

A robust, local-first tool for tracking and analyzing GitLab sprint metrics with Clean Architecture, SOLID principles, and TDD. Built on lessons learned from the lightweight prototype, this version emphasizes maintainability, testability, and architectural integrity.

**Key Principles:**
- **Vertical Slices** - Each story delivers complete feature (GitLab → Core → API → UI)
- **Clean Architecture + SOLID** - Well-structured, maintainable code
- **TDD First** - Write tests before implementation
- **Agent-Driven Development** - Use specialized agents for guidance
- **Defer Decisions** - Make architectural decisions when circumstances require it
- **JSDoc Over TypeScript** - Document types without compilation overhead
- **Local-First** - File system storage, no external databases

---

## 🤖 AGENT-FIRST WORKFLOW (MANDATORY)

Before ANY task, **launch appropriate agents**. This is NOT optional.

### Available Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **Product Owner** | Validates requirements against prototype features | Starting stories, clarifying requirements |
| **GitLab Integration** | Expert on GitLab GraphQL API patterns | Working with GitLab API, queries, data fetching |
| **UX/UI Design** | Preserves prototype UI/UX, generates styled-components | Building UI components, styling screens |
| **Clean Architecture** | Enforces Clean Architecture + SOLID principles | Architecture decisions, refactoring, code structure |
| **Test Coverage** | Plans TDD strategy, validates test quality | Before writing tests, validating coverage |
| **Code Review** | Reviews code for quality, security, patterns | After implementation, before commits |

**Agent files:** `.claude/agents/*.md`

### Vertical Slice Workflow

Each story delivers a complete feature touching all layers:

```
1. 📋 Create GitHub Issue for vertical slice story (using gh CLI)
2. 🤖 Product Owner Agent - Validate requirements against prototype
3. 🤖 Launch other agents as needed (GitLab, UX/UI, etc.)

FOR EACH LOGICAL UNIT (Component/Layer/Feature):
4. 🌿 Create SHORT-LIVED feature branch from main (feat/ISSUE-description)
   git checkout main && git pull origin main
   git checkout -b feat/14-new-feature
5. 🔴 Test Coverage Agent - Plan TDD for this unit
6. 🔴 RED: Write failing tests
7. 🟢 GREEN: Minimal implementation to pass
8. 🔄 REFACTOR: Clean up code
9. ✅ Run tests and verify coverage ≥85%
10. ✅ Commit and push to feature branch
11. 🔀 Create Small PR (< 200 lines preferred)
12. ✅ Merge PR with --squash --delete-branch
13. 🔄 Return to step 4 for next unit (new branch from main)

AFTER ALL UNITS COMPLETE:
14. 🤖 Clean Architecture Agent - Validate layer separation
15. 🤖 Code Review Agent - Final review
16. 🧪 MANUAL VERIFICATION - User tests complete feature end-to-end
17. ✅ Close GitHub issue
```

**CRITICAL: Short-Lived Branches**
- ✅ Create NEW branch from `main` for EACH PR
- ✅ Delete branch after PR merge (use --delete-branch)
- ✅ Pull latest `main` before creating next branch
- ❌ NEVER reuse branches across multiple PRs
- ❌ NEVER merge `main` into feature branches
- ❌ NEVER use long-lived feature branches

**Why Short-Lived Branches?**
- Prevents merge conflicts between your own PRs
- Clean, linear git history
- Each PR is independent and easy to review
- Matches "small, frequent PRs" philosophy
- Avoids complex merge scenarios

**IMPORTANT: Vertical Slice Characteristics**
- Each story delivers COMPLETE user value (not just a layer)
- User can see, interact with, and validate the feature
- All layers implemented (Infrastructure → Core → API → UI)
- Feature is independently deployable and testable
- Clean Architecture principles maintained within each slice

**IMPORTANT: Manual Verification Phase (Step 11)**
- Claude MUST prepare the application for user testing
- Claude stops background processes and starts app in correct mode
- Claude provides clear verification checklist with URLs and test data
- User manually tests COMPLETE FEATURE end-to-end
- NO code is committed until user approves implementation

---

## 🎯 Core Rules

1. **🔒 Security First** - NEVER access .env files, credentials, or secrets
2. **🤖 Agents First** - Launch agents BEFORE proposing work
3. **📋 GitHub Issues First** - Create issue BEFORE starting work (using `gh`)
4. **🌿 Short-Lived Branches** - Create NEW branch from `main` for EACH PR, delete after merge
5. **🔴 TDD MANDATORY** - Write tests FIRST (RED-GREEN-REFACTOR)
6. **✅ All Tests Must Pass** - Run all tests before EVERY commit
7. **📊 Coverage ≥85%** - Verify with `npm run test:coverage`
8. **🏗️ Clean Architecture** - Core → Infrastructure → Presentation
9. **📝 JSDoc Everything** - Type annotations for all functions, classes, parameters
10. **🔀 Small, Frequent PRs** - < 200 lines preferred, one branch per PR
11. **🚀 Defer Decisions** - Make architecture decisions when circumstances require it
12. **❌ NO Long-Lived Branches** - Never reuse branches, never merge main into feature branches
13. **⏸️ WAIT After PR Creation** - STOP and ask user if PR is merged before creating new branches/PRs

---

## 📂 Project Structure

```
gitlab-metrics-tracker/
├── .claude/                    # Claude Code agents
│   ├── CLAUDE.md              # This file
│   └── agents/                # Specialized agents
│       ├── product-owner.md
│       ├── gitlab-graphql-integration.md
│       ├── ux-ui-design-agent.md
│       ├── clean-architecture-agent.md
│       ├── test-coverage-agent.md
│       └── code-review-agent.md
├── _context/                   # Context documentation
│   ├── architecture/          # ADRs, patterns
│   ├── coding/                # Conventions, JSDoc guide
│   ├── testing/               # Test strategy, examples
│   ├── workflow/              # Development workflow
│   ├── domain/                # Business domain knowledge
│   ├── reference/             # Prototype learnings
│   └── stories/               # Story backlog, completed
├── src/
│   ├── server/
│   │   ├── app.js             # Express server
│   │   ├── routes/            # API routes
│   │   └── middleware/        # Express middleware
│   ├── lib/                   # Core business logic
│   │   ├── gitlab-client.js   # GitLab API client
│   │   ├── metrics.js         # Metrics calculations
│   │   └── correlations.js    # Analysis algorithms
│   ├── public/
│   │   ├── index.html         # Main HTML
│   │   ├── js/                # React components
│   │   ├── css/               # Global styles
│   │   └── components/        # React components (JSDoc)
│   └── data/                  # JSON file storage
│       ├── metrics.json
│       └── annotations.json
├── docs/                      # Additional documentation
├── package.json
├── .env                       # Environment config (gitignored)
├── .env.example
└── README.md
```

---

## 💻 Tech Stack

### Backend
- **Runtime:** Node.js 18+ (ES Modules)
- **Framework:** Express.js
- **API Client:** graphql-request (GitLab GraphQL)
- **Statistics:** simple-statistics
- **Storage:** File system (JSON files)
- **Testing:** Jest

### Frontend
- **Framework:** React 18 (Vite)
- **Styling:** styled-components
- **Charts:** Chart.js (from prototype)
- **Type System:** JSDoc (NO TypeScript)
- **Testing:** Jest + React Testing Library

---

## 🔑 Key Commands

```bash
# Development
npm run dev              # Start server with hot reload

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report (verify ≥85%)

# Production
npm start                # Start server

# Code Quality
npm run lint             # Lint code
npm run format           # Format code

# Git/GitHub (using gh CLI)
gh issue create          # Create new issue for story
gh issue list            # View open issues
git checkout -b feat/123-description  # Create feature branch
git add . && git commit  # Commit changes
git push -u origin feat/123-description  # Push feature branch
gh pr create             # Create pull request
gh pr merge              # Merge PR and close issue
```

---

## 🐙 Git/GitHub Workflow

**Repository:** https://github.com/bradnjones/gitlab-metrics-tracker
**Access:** SSH via `git@github.com:bradnjones/gitlab-metrics-tracker.git`

### Story Lifecycle with GitHub

#### 1. Create GitHub Issue
```bash
# Create issue for story
gh issue create --title "Story 0.1: Project Foundation" \
  --body "$(cat _context/stories/backlog.md | grep -A 50 'Story 0.1')" \
  --label "story,phase-0"

# This returns an issue number (e.g., #1)
```

#### 2. Create Feature Branch (Short-Lived!)
```bash
# ALWAYS start from latest main
git checkout main
git pull origin main

# Create new branch for THIS PR only
git checkout -b feat/14-alignment-fixes

# Naming convention: feat/ISSUE-short-description
# Each PR gets its own branch - no reusing branches!
```

#### 3. Work on Feature (TDD Cycle)
```bash
# Write tests FIRST, commit incrementally
git add .
git commit -m "test: add Metric entity tests (#1)"

git add .
git commit -m "feat: implement Metric entity (#1)"

git add .
git commit -m "refactor: simplify Metric validation (#1)"
```

**Commit Message Format:**
- `feat:` - New feature
- `test:` - Adding/updating tests
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `fix:` - Bug fixes
- Always include issue number: `(#123)`

#### 4. Push Feature Branch
```bash
# First push (set upstream)
git push -u origin feat/1-project-foundation

# Subsequent pushes
git push
```

#### 5. Create Pull Request
```bash
# Create PR when feature is complete
gh pr create --title "Story 0.1: Project Foundation" \
  --body "Closes #1

## Summary
- Implemented core entities (Metric, Annotation, AnalysisResult)
- Created repository interfaces
- Implemented file system repositories
- All tests passing (≥85% coverage)

## Testing
- ✅ All tests pass
- ✅ Coverage: 87% (exceeds 85% target)
- ✅ TDD approach followed (tests first)

## Agent Reviews
- ✅ Clean Architecture Agent - Approved
- ✅ Test Coverage Agent - Validated
- ✅ Code Review Agent - Approved

## Checklist
- [x] Tests written FIRST (TDD)
- [x] All tests pass
- [x] Coverage ≥85%
- [x] JSDoc annotations complete
- [x] Clean Architecture validated
- [x] Code review passed" \
  --label "story,phase-0"
```

**⚠️ IMPORTANT: After Creating PR**
- **STOP and wait for user confirmation that PR is merged**
- **DO NOT** create new branches or PRs until user confirms merge
- Ask: "Have you merged PR #X yet?"
- Only proceed with next work after user confirms merge

#### 6. Merge PR and Close Issue
```bash
# Merge PR (squash commits and DELETE branch)
gh pr merge --squash --delete-branch

# Issue closes automatically via "Closes #1" in PR body
```

#### 7. Start Next PR (Clean Slate)
```bash
# Pull latest main (includes your merged PR)
git checkout main
git pull origin main

# Create NEW branch for next PR
git checkout -b feat/14-next-feature

# Repeat cycle - NEVER reuse old branch!
```

### Branch Naming Convention

**SHORT-LIVED BRANCHES ONLY:**
- **Feature/Story:** `feat/ISSUE-short-description` (e.g., feat/14-alignment-fixes)
- **Bugfix:** `fix/ISSUE-short-description`
- **Refactor:** `refactor/ISSUE-short-description`
- **Docs:** `docs/ISSUE-short-description`

**Rules:**
- ✅ Always include issue number for traceability
- ✅ One branch per PR (create new branch for each PR)
- ✅ Delete branch after merge (--delete-branch)
- ❌ NO long-lived branches (like feat/v1-velocity-tracking)
- ❌ NO reusing branches across PRs

### Commit Guidelines

**DO:**
- ✅ Commit incrementally (test, implementation, refactor)
- ✅ Use conventional commit format
- ✅ Include issue number in every commit
- ✅ Write clear, concise commit messages
- ✅ Run tests before committing

**DON'T:**
- ❌ Commit directly to `main` branch
- ❌ Push without running tests
- ❌ Squash locally (squash happens during PR merge)
- ❌ Commit secrets or .env files

### GitHub Labels

**Type labels** (what kind of work):
- `story` - User story
- `bug` - Bug fix
- `enhancement` - New feature or improvement
- `refactor` - Code refactoring
- `docs` - Documentation
- `test` - Test-related changes

**Phase labels** (which phase):
- `phase-0`, `phase-1`, `phase-2`, `phase-3`, `phase-4` - Story phases

**Layer labels** (Clean Architecture):
- `layer:core` - Core business logic (domain/use cases)
- `layer:infrastructure` - Infrastructure (GitLab API, storage)
- `layer:presentation` - Presentation (UI/API endpoints)

**Component labels** (what part changed):
- `component:ui` - React component or UI-related
- `component:api` - API endpoint or route
- `component:service` - Service/business logic

**Feature labels** (which feature):
- `feature:metrics` - Metrics calculation
- `feature:annotations` - Annotation system
- `feature:visualization` - Charts/visualization
- `feature:gitlab-integration` - GitLab API integration

**Quality labels** (TDD/testing):
- `tdd-approved` - TDD approach validated by agent
- `coverage-85+` - Test coverage ≥85%
- `needs-tests` - Missing tests or low coverage

**Agent review labels** (which agents approved):
- `agent:product-owner` - Reviewed by Product Owner agent
- `agent:clean-arch` - Reviewed by Clean Architecture agent
- `agent:code-review` - Reviewed by Code Review agent
- `agent:test-coverage` - Reviewed by Test Coverage agent
- `agent:ux-ui` - Reviewed by UX/UI Design agent
- `agent:gitlab` - Reviewed by GitLab Integration agent

**Size labels** (PR size):
- `size:xs` - < 50 lines changed
- `size:s` - 50-200 lines changed (preferred!)
- `size:m` - 200-500 lines changed
- `size:l` - 500-1000 lines changed
- `size:xl` - > 1000 lines changed (avoid!)

**Workflow labels** (status):
- `work-in-progress` - Still being worked on
- `ready-for-review` - Ready for manual review
- `ready-to-merge` - Approved and ready to merge
- `blocked` - Blocked by another issue
- `needs-rebase` - Needs rebase with main

**Priority labels**:
- `priority-high` - High priority
- `priority-medium` - Medium priority
- `priority-low` - Low priority

---

## 🧪 Testing Requirements

### TDD Cycle (MANDATORY)

1. **🔴 RED** - Write failing test FIRST
2. **🟢 GREEN** - Minimal code to pass test
3. **🔄 REFACTOR** - Clean up (tests stay green)

### Coverage Requirements

- **Target:** ≥85% coverage (statements, branches, functions, lines)
- **Test Count:** 3-10 strategic tests per module
- **Test Types:** 80-90% unit tests, 10-20% integration tests

### Before Every Commit

```bash
npm test                 # All tests must pass ✅
npm run test:coverage    # Verify ≥85% coverage ✅
```

**If ANY test fails:** ❌ DO NOT commit

---

## 📖 Context Documentation

All detailed guidance lives in `_context/`:

### 🏗️ architecture/
- `clean-architecture.md` - Layer separation, dependency rules
- `solid-principles.md` - SOLID explained with examples
- `decisions/` - ADRs (Architecture Decision Records)

### 💻 coding/
- `jsdoc-guide.md` - JSDoc conventions and examples
- `react-conventions.md` - React component patterns
- `styled-components.md` - Styling patterns from prototype
- `file-naming.md` - File and function naming conventions

### 🧪 testing/
- `tdd-strategy.md` - TDD approach with Jest
- `test-examples.md` - Sample test suites
- `mocking-patterns.md` - How to mock dependencies

### 🔄 workflow/
- `agent-usage.md` - How to use each agent
- `story-management.md` - Story format and lifecycle
- `git-workflow.md` - Branching and commit strategy

### 🎯 domain/
- `metrics-formulas.md` - Detailed metric calculations from prototype
- `annotation-system.md` - Event annotation and correlation analysis
- `gitlab-api-patterns.md` - GraphQL query patterns

### 📋 reference/
- `prototype-lessons.md` - What we learned from the prototype
- `ui-design-system.md` - Colors, spacing, typography from prototype

### 📝 stories/
- `backlog.md` - Vertical slice stories (V1-V7)
- `in-progress.md` - Current story (ONLY ONE at a time)
- `completed.md` - Finished stories
- `archived-horizontal-backlog.md` - Previous horizontal approach (archived 2025-11-07)

---

## 🎨 UI/UX Preservation

The prototype has a **polished, working UI**. We're preserving it, not reinventing it.

### Design System (From Prototype)
- **Colors:** Blue primary, clean grays, semantic colors
- **Typography:** System fonts, clear hierarchy
- **Spacing:** Consistent padding/margins
- **Layout:** Card-based, responsive grid
- **Charts:** Chart.js with annotations

**Reference:** See `_context/reference/ui-design-system.md`

### React Migration Strategy
- Convert Alpine.js reactive state → React hooks
- Convert inline styles → styled-components
- Preserve exact visual design
- Keep Chart.js visualizations
- Maintain keyboard shortcuts (Ctrl+N)

---

## 🗄️ Data Storage Strategy

### Current: File System (JSON)
- **Metrics:** `src/data/metrics.json`
- **Annotations:** `src/data/annotations.json`
- **Analysis Runs:** `src/data/analysis-runs.json`

### Why Not SQLite/MongoDB Yet?
**Defer decision until circumstances require it:**
- File system is simple and works locally
- No external dependencies to manage
- Easy to inspect and debug
- Can migrate later if needed (Clean Architecture makes this easy)

**When to reconsider:**
- Performance issues with large datasets (>1000 sprints)
- Need for complex queries
- Multi-user requirements
- Concurrent access needs

---

## 🔐 Security Guidelines

### CRITICAL Rules
- ❌ NEVER read .env files in conversations
- ❌ NEVER log sensitive data (tokens, credentials)
- ❌ NEVER commit secrets to git
- ✅ Use environment variables for config
- ✅ Validate all user input
- ✅ Sanitize data before storage

---

## 📊 Metrics Reference (From Prototype)

### Core Metrics
1. **Velocity** - Story points completed per sprint
2. **Throughput** - Issues closed per sprint
3. **Cycle Time** - Time from issue start to close (Avg, P50, P90)
4. **Deployment Frequency** - Deployments per day
5. **Lead Time** - Commit to production (Avg, P50, P90)
6. **MTTR** - Mean time to recovery from incidents

**Detailed formulas:** `_context/domain/metrics-formulas.md`

### Annotation System
- **Event Types:** Process, Team, Tooling, External, Incident
- **Impact:** Positive, Negative, Neutral
- **Correlation Analysis:** Before/after comparison, pattern detection
- **Recommendations:** Generated from historical patterns

**Details:** `_context/domain/annotation-system.md`

---

## 🚀 Getting Started This Session

**Read these in order:**
1. `_context/workflow/agent-usage.md` - How to use agents
2. `_context/stories/backlog.md` - Vertical slice stories (V1-V7)
3. `_context/stories/in-progress.md` - Current work
4. `_context/reference/prototype-lessons.md` - What we learned
5. `_context/domain/metrics-formulas.md` - Metric calculations

---

## 🎯 Current Focus

**Approach:** Vertical Slices - Delivering complete user value per story
**MVP:** Stories V1-V3 (Velocity, Throughput, Cycle Time with full UI)
**Next Story:** V1 - Velocity Tracking (Complete Feature)
**See:** `_context/stories/backlog.md` for all stories

---

## ❓ Questions?

- **How do I use agents?** → `_context/workflow/agent-usage.md`
- **What's the workflow?** → `_context/workflow/story-management.md`
- **How do metrics work?** → `_context/domain/metrics-formulas.md`
- **How do I write JSDoc?** → `_context/coding/jsdoc-guide.md`
- **Where's the prototype code?** → `/Users/brad/dev/smi/gitlab-sprint-metrics/`

---

**Remember:** This is vertical slice, agent-driven, TDD-first, Clean Architecture development. Each story delivers complete user value (GitLab → Core → API → UI). Launch agents BEFORE proposing work. Write tests FIRST at each layer. Maintain Clean Architecture within slices. Defer decisions until needed. Build incrementally with discipline. 🚀
