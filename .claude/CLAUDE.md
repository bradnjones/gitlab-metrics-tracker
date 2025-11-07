# CLAUDE.md

**Version:** 1.0
**Last Updated:** 2025-01-06
**Project:** GitLab Sprint Metrics Tracker - Clean Architecture Edition

---

## 📍 Project Overview

A robust, local-first tool for tracking and analyzing GitLab sprint metrics with Clean Architecture, SOLID principles, and TDD. Built on lessons learned from the lightweight prototype, this version emphasizes maintainability, testability, and architectural integrity.

**Key Principles:**
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

### Typical Workflow

```
1. 📋 Create GitHub Issue for story (using gh CLI)
2. 🌿 Create feature branch (feat/issue-number-description)
3. 🤖 Product Owner Agent - Validate story requirements
4. 🤖 GitLab Integration Agent (if working with API)
5. 🤖 UX/UI Design Agent (if building UI)
6. 🔴 Test Coverage Agent - Plan TDD approach
7. 🔴 RED: Write failing tests
8. 🟢 GREEN: Minimal implementation to pass
9. 🔄 REFACTOR: Clean up code
10. 🤖 Clean Architecture Agent - Validate architecture
11. 🤖 Code Review Agent - Final review
12. 🧪 MANUAL VERIFICATION - User tests functionality
13. ✅ Commit and push to feature branch
14. 🔀 Create Pull Request (using gh CLI)
15. ✅ Merge PR and close issue
```

**IMPORTANT: Manual Verification Phase (Step 12)**
- Claude MUST prepare the application for user testing
- Claude stops background processes and starts app in correct mode
- Claude provides clear verification checklist with URLs and test data
- User manually tests all functionality
- NO code is committed until user approves implementation

---

## 🎯 Core Rules

1. **🔒 Security First** - NEVER access .env files, credentials, or secrets
2. **🤖 Agents First** - Launch agents BEFORE proposing work
3. **📋 GitHub Issues First** - Create issue BEFORE starting work (using `gh`)
4. **🌿 Feature Branches** - Always work on feature branches (feat/issue-number-description)
5. **🔴 TDD MANDATORY** - Write tests FIRST (RED-GREEN-REFACTOR)
6. **✅ All Tests Must Pass** - Run all tests before EVERY commit
7. **📊 Coverage ≥85%** - Verify with `npm run test:coverage`
8. **🏗️ Clean Architecture** - Core → Infrastructure → Presentation
9. **📝 JSDoc Everything** - Type annotations for all functions, classes, parameters
10. **🔀 Pull Requests** - Create PR with `gh` when feature is complete
11. **🚀 Defer Decisions** - Make architecture decisions when circumstances require it

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

#### 2. Create Feature Branch
```bash
# Naming convention: feat/ISSUE-short-description
git checkout -b feat/1-project-foundation
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

#### 6. Merge PR and Close Issue
```bash
# Merge PR (squash commits)
gh pr merge --squash --delete-branch

# Issue closes automatically via "Closes #1" in PR body
```

### Branch Naming Convention

- **Feature:** `feat/123-short-description`
- **Bugfix:** `fix/123-short-description`
- **Refactor:** `refactor/123-short-description`
- **Docs:** `docs/123-short-description`

Always include issue number for traceability.

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

Use these labels for issues/PRs:
- `story` - User story
- `bug` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation
- `phase-0`, `phase-1`, etc. - Story phases
- `blocked` - Blocked by another issue
- `help-wanted` - Needs discussion

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
- `backlog.md` - Planned stories
- `in-progress.md` - Current story (ONLY ONE at a time)
- `completed.md` - Finished stories

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
2. `_context/stories/in-progress.md` - Current work
3. `_context/reference/prototype-lessons.md` - What we learned
4. `_context/domain/metrics-formulas.md` - Metric calculations

---

## 🎯 Current Focus

**Phase:** Initial Setup & Architecture
**Next Steps:** See `_context/stories/backlog.md`

---

## ❓ Questions?

- **How do I use agents?** → `_context/workflow/agent-usage.md`
- **What's the workflow?** → `_context/workflow/story-management.md`
- **How do metrics work?** → `_context/domain/metrics-formulas.md`
- **How do I write JSDoc?** → `_context/coding/jsdoc-guide.md`
- **Where's the prototype code?** → `/Users/brad/dev/smi/gitlab-sprint-metrics/`

---

**Remember:** This is agent-driven, TDD-first, Clean Architecture development. Launch agents BEFORE proposing work. Write tests FIRST. Defer decisions until needed. Build incrementally with discipline. 🚀
