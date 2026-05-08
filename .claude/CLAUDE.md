# CLAUDE.md

**Version:** 3.0
**Last Updated:** 2026-05-08
**Project:** GitLab Sprint Metrics Tracker - Clean Architecture Edition
**Development Approach:** Vertical Slices (delivering complete user value per story)
**Branch Strategy:** Trunk-based development (direct commits to main)

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
| **Production Readiness** | Security, observability, resilience, system design gaps | Before declaring the app production-ready, evaluating deployment fitness |

**Agent files:** `.claude/agents/*.md`

### Vertical Slice Workflow

Each story delivers a complete feature touching all layers:

```
1. 📋 Create GitHub Issue for vertical slice story (using gh CLI)
2. 🤖 Product Owner Agent - Validate requirements against prototype
3. 🤖 Launch other agents as needed (GitLab, UX/UI, etc.)

FOR EACH LOGICAL UNIT (Component/Layer/Feature):
4. 🔴 Test Coverage Agent - Plan TDD for this unit
5. 🔴 RED: Write failing tests
6. 🟢 GREEN: Minimal implementation to pass
7. 🔄 REFACTOR: Clean up code
8. ✅ Run tests and verify coverage ≥85%
9. 📝 UPDATE BACKLOG - Document completed work (includes backlog changes)
10. ✅ Atomic commit directly to main:
    git checkout main && git pull --rebase origin main
    npm test && npm run lint
    git add <specific files>
    git commit -m "feat: description (#ISSUE)"
    git push origin main
11. 🐳 Rebuild Docker and restart container:
    docker compose up --build -d
12. 🔄 Return to step 4 for next unit

AFTER ALL UNITS COMPLETE:
13. 🤖 Clean Architecture Agent - Validate layer separation
14. 🤖 Code Review Agent - Final review
15. 🧪 MANUAL VERIFICATION - User tests complete feature end-to-end
16. 📝 FINAL BACKLOG UPDATE - Move story to completed.md with full summary
17. ✅ Close GitHub issue
```

**TRUNK-BASED DEVELOPMENT**
- ✅ Commit directly to `main` — no feature branches, no PRs
- ✅ Each commit = one logical change (small and atomic)
- ✅ `git pull --rebase origin main` before every commit
- ✅ All tests + lint must pass before every `git push`
- ❌ NEVER commit if `npm test` fails
- ❌ NEVER `git push --force` to main

**Why Trunk-Based?**
- Atomic commits are independently revertible via `git revert`
- No branch/PR overhead — changes land in seconds
- Concurrent agents work on disjoint files — no merge conflicts
- `git log` is the audit trail

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
4. **🚀 Trunk-Based Commits** - Commit directly to `main`; no feature branches, no PRs
5. **🔴 TDD MANDATORY** - Write tests FIRST (RED-GREEN-REFACTOR)
6. **✅ All Tests Must Pass** - Run `npm test` + `npm run lint` before EVERY `git push`
7. **📊 Coverage ≥85%** - Verify with `npm run test:coverage` when changing source
8. **🏗️ Clean Architecture** - Core → Infrastructure → Presentation
9. **📝 JSDoc Everything** - Type annotations for all functions, classes, parameters
10. **⚛️ Atomic Commits** - One commit = one logical change; keep diffs small and focused
11. **🚀 Defer Decisions** - Make architecture decisions when circumstances require it
12. **📝 MANDATORY: Update Backlog BEFORE Committing** - Update `_context/stories/` BEFORE every commit to keep backlog in sync

---

## 📝 Backlog Updates (MANDATORY)

**CRITICAL: Update backlog BEFORE committing/pushing so backlog changes are included in the PR.**

### When to Update Backlog

**For Small PRs (bug fixes, improvements, refactors):**
- Add entry to `_context/stories/completed.md` under "Bug Fixes & Improvements" section
- Include: Date, PR #, Title, Brief description

**For Story PRs (vertical slices, features):**
- Update `_context/stories/in-progress.md` during work
- Move to `_context/stories/completed.md` when story is complete
- Include: Full story summary, what was delivered, key decisions

### How to Update

**Example for Bug Fix:**
```markdown
## Bug Fixes & Improvements

### 2025-11-18 - PR #118 - Fix incident fetching and classification
- Fixed incidents created before iteration not being fetched (60-day lookback)
- Added includeSubgroups to fetch incidents from all subprojects
- Excluded incidents from velocity calculations
- Added deduplication in Data Explorer
- Result: 4 incidents now fetched correctly vs 0 before
```

**Example for Story:**
```markdown
## Story V1: Velocity Tracking (COMPLETED)

**Completed:** 2025-11-20
**GitHub Issue:** #25
**PR:** #30

**Delivered:**
- Complete velocity tracking feature (GitLab → Core → API → UI)
- Users can view velocity trends across iterations
- All 6 vertical slice layers implemented

**Key Decisions:**
- Used Chart.js for visualization (preserves prototype design)
- Implemented local filtering for flexibility
```

### Backlog File Structure

- `backlog.md` - Future stories (V1-V7)
- `in-progress.md` - Currently active story
- `completed.md` - All completed work (stories, bugs, improvements)

**Remember:** Backlog updates are part of the deliverable — include them in the same commit as the code change!

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

# Docker (run after every commit to verify no functional breaks)
docker compose up --build -d   # Rebuild image and restart container

# Code Quality
npm run lint             # Lint code
npm run format           # Format code

# Git/GitHub (trunk-based)
gh issue create          # Create new issue for story
gh issue list            # View open issues
gh issue close 25        # Close when work is done
git pull --rebase origin main               # Sync before committing
git add <specific files>                    # Always specific files, never -A
git commit -m "type: description (#N)"     # Atomic commit
git push origin main                        # Push to trunk
```

---

## 🐙 Git Workflow (Trunk-Based)

**Repository:** https://github.com/bradnjones/gitlab-metrics-tracker
**Access:** SSH via `git@github.com:bradnjones/gitlab-metrics-tracker.git`

### Commit Loop (every change)

```bash
# 1. Sync
git checkout main && git pull --rebase origin main

# 2. Make ONE atomic change

# 3. Gate (non-negotiable — all must pass)
npm test
npm run lint
npm run test:coverage    # only when source files changed

# 4. Commit
git add <specific files>      # never git add -A or git add .
git commit -m "feat: description (#ISSUE)"

# 5. Push
git push origin main
# If rejected: git pull --rebase origin main && npm test && git push origin main

# 6. Rebuild Docker
docker compose up --build -d
```

### Commit Message Format

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `test:` - Adding/updating tests
- `docs:` - Documentation
- `chore:` - Maintenance (cleanup, deps, config)
- Always include issue number: `(#123)`

### Hard Rules

- One commit = one logical change. Don't bundle.
- Never push if `npm test` fails.
- Never `git push --force` to main.
- Always `git add <specific files>` — never `-A` or `.`
- No feature branches. No PRs.

### GitHub Issues (still used for traceability)

```bash
gh issue create --title "Story V2: Throughput" --label "story,phase-1"
gh issue list
gh issue close 25   # close when all related commits are on main
```

### GitHub Labels

**Type:** `story`, `bug`, `enhancement`, `refactor`, `docs`, `test`
**Phase:** `phase-0` through `phase-4`
**Layer:** `layer:core`, `layer:infrastructure`, `layer:presentation`
**Feature:** `feature:metrics`, `feature:annotations`, `feature:visualization`, `feature:gitlab-integration`
**Quality:** `tdd-approved`, `coverage-85+`, `needs-tests`
**Priority:** `priority-high`, `priority-medium`, `priority-low`

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

**Remember:** Trunk-based, vertical slice, agent-driven, TDD-first, Clean Architecture development. Commit small and often directly to `main` — sync, one change, full test gate, push. Each story delivers complete user value (GitLab → Core → API → UI). Launch agents BEFORE proposing work. Write tests FIRST. Maintain Clean Architecture within slices. Defer decisions until needed. 🚀
