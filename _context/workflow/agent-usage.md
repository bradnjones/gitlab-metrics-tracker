# Agent Usage Guide

**Version:** 1.0
**Last Updated:** 2025-01-06

---

## Overview

This project uses **specialized AI agents** to guide development decisions. Each agent has deep knowledge of specific domains and should be consulted BEFORE implementing related features.

**Key Principle:** Agents are advisors, not implementers. They provide guidance, validate decisions, and catch issues early.

---

## 🤖 Available Agents

### 1. Product Owner Agent
**File:** `.claude/agents/product-owner.md`
**Color:** Yellow
**Model:** Sonnet

#### Purpose
Validates story requirements against the working prototype, ensures feature alignment, prevents scope creep.

#### When to Use
- **Step 3** in typical workflow (after creating issue/branch, BEFORE other agents)
- Starting any new story
- Clarifying what needs to be built
- Evaluating if a feature belongs in MVP
- Verifying metric formulas or annotation system features
- Confirming UX patterns match prototype

#### What It Does
- References prototype at `/Users/brad/dev/smi/gitlab-sprint-metrics/`
- Validates requirements against proven features
- Refines acceptance criteria based on prototype behavior
- Flags deviations from MVP scope
- Documents expected behavior with examples

#### Example Usage
```
Launch Product Owner Agent

Story: Add deployment frequency chart to dashboard

Context:
- Prototype has working deployment frequency visualization
- Need to migrate Alpine.js → React
- Preserve exact Chart.js configuration

Task:
Review this story and validate:
1. Does it align with prototype features?
2. Are acceptance criteria complete?
3. Any scope creep concerns?
4. What prototype files should I reference?

Provide refined acceptance criteria based on prototype behavior.
```

#### Output
- Alignment assessment (✅ Aligned | ⚠️ Deviation | ❌ Out of Scope)
- Prototype file references
- Refined acceptance criteria
- UX/UI expectations
- Scope recommendations
- Questions for clarification

---

### 2. GitLab Integration Agent
**File:** `.claude/agents/gitlab-graphql-integration.md`
**Color:** Purple
**Model:** Sonnet

#### Purpose
Expert on GitLab GraphQL API patterns from the prototype. Provides proven query structures, pagination strategies, and rate limiting approaches.

#### When to Use
- **Step 4** in typical workflow (after Product Owner, before writing tests)
- Working with GitLab API
- Designing GraphQL queries
- Implementing pagination
- Setting up rate limiting
- Troubleshooting API issues
- Story 1.x or higher (GitLab data fetching stories)

#### What It Does
- References proven patterns from `gitlab-sprint-metrics/src/lib/gitlab-client.js`
- Consults official GitLab GraphQL docs (via WebFetch)
- Tests queries with curl when needed
- Documents query structures, pagination, caching
- Explains rate limiting strategies
- Shows error handling patterns

#### Example Usage
```
Launch GitLab Integration Agent

Task: Fetch all issues for a specific iteration

Requirements:
- Need issues from group + all subgroups
- Filter by iteration ID
- Include: id, iid, title, state, createdAt, closedAt, weight, labels

Questions:
1. What's the proven query pattern from prototype?
2. How should pagination work?
3. What rate limiting should I use?
4. Group-level or project-level query?

Provide GraphQL query, pagination strategy, and code example.
```

#### Output
- GraphQL query structure with variables
- Pagination strategy (cursor-based)
- Rate limiting recommendations
- Error handling patterns
- Performance notes
- Testing recommendations
- Prototype reference (file + line numbers)

---

### 3. UX/UI Design Agent
**File:** `.claude/agents/ux-ui-design-agent.md`
**Color:** Pink
**Model:** Sonnet

#### Purpose
Preserves prototype's proven UI/UX. Generates styled-components that match prototype visually, translates Alpine.js → React.

#### When to Use
- **Step 5** in typical workflow (after GitLab agent if needed, BEFORE Test Coverage agent)
- Building any UI component
- Designing React components
- Converting prototype UI to React
- Extracting design tokens
- Ensuring visual fidelity (95%+ match required)
- Validating accessibility (WCAG AA)

#### What It Does
- Analyzes prototype UI (`index.html`, `styles.css`)
- Extracts design tokens (colors, spacing, typography)
- Documents interaction patterns (hover, focus, keyboard shortcuts)
- Generates styled-components code
- Preserves Chart.js patterns
- Validates accessibility

#### Example Usage
```
Launch UX/UI Design Agent

Component: Iteration Selector (multi-select dropdown)

Prototype Reference:
- File: gitlab-sprint-metrics/src/public/index.html (lines ~50-120)

Requirements:
1. Multi-select capability
2. Search/filter iterations
3. Show date ranges
4. Preserve visual design exactly

Task:
Provide:
- Design tokens used (colors, spacing, typography)
- Styled-components code
- Interaction states (hover, focus, active)
- Accessibility checklist
- Chart.js configuration if applicable
```

#### Output
- Visual design specification (colors, spacing, typography, borders, shadows)
- Styled-components code (copy-paste ready)
- Interaction states (default, hover, focus, active, disabled)
- Accessibility checklist (WCAG AA compliance)
- Prototype alignment notes
- Implementation notes for React

---

### 4. Test Coverage Agent
**File:** `.claude/agents/test-coverage-agent.md`
**Color:** Orange
**Model:** Sonnet

#### Purpose
Enforces TRUE TDD. Plans test strategy (3-5 tests), validates each test cycle, analyzes coverage gaps.

#### When to Use
- **Step 6** in typical workflow (BEFORE writing first test)
- Planning test strategy (Phase 1)
- After each RED-GREEN-REFACTOR cycle (Phase 2)
- When 5 tests don't reach 85% coverage (Phase 3)

#### Three Phases

**Phase 1: Planning (Before ANY tests)**
- Analyze feature requirements
- Recommend 3-5 highest-value tests
- Specify TDD order (which test first, second, etc.)
- Predict coverage for each test
- Ensure 80-90% unit tests

**Phase 2: Validation (After EACH test cycle)**
- Verify test written FIRST (before implementation)
- Detect false positives (over-mocking, weak assertions)
- Validate test quality
- Confirm minimal implementation
- Approve next test OR require fixes

**Phase 3: Coverage Gap Analysis (If <85% after 5 tests)**
- Identify untested code paths
- Prioritize critical gaps
- Recommend additional tests (6-8 max)
- Provide risk assessment
- Request user approval

#### Example Usage (Phase 1)
```
Launch Test Coverage Agent

Feature: MetricsCalculator.calculateVelocity()

Requirements:
- Calculate sum of story points (issue weights) for closed issues
- Handle empty array
- Handle issues without weights (treat as 0)
- Handle mix of weighted and unweighted issues

Task: Plan TDD approach
Recommend 3-5 tests in TDD order to reach 85-90% coverage.
For each test specify:
- Test description
- Why this order
- Expected coverage gain
- What to implement for THIS test only
```

#### Output
**Phase 1:** TDD plan with 3-5 tests, order, coverage predictions
**Phase 2:** Quality check, false positive detection, approval/blocking
**Phase 3:** Gap analysis, additional test recommendations, risk assessment

---

### 5. Clean Architecture Agent
**File:** `.claude/agents/clean-architecture-agent.md`
**Color:** Cyan
**Model:** Sonnet

#### Purpose
Enforces Clean Architecture layer separation and SOLID principles. Validates code structure.

#### When to Use
- **Step 10** in typical workflow (after implementation/refactor, BEFORE Code Review)
- Making architectural decisions
- Validating code structure
- Refactoring existing code
- Reviewing dependency directions
- Defining new entities or use cases
- Crossing layer boundaries

#### What It Does
- Validates layer separation (Core → Infrastructure → Presentation)
- Enforces dependency rules (dependencies point inward only)
- Checks SOLID compliance
- Identifies code smells
- Recommends refactoring
- Assesses testability

#### Example Usage
```
Launch Clean Architecture Agent

Files to review:
- src/lib/core/MetricsCalculator.js
- src/lib/infrastructure/FileMetricsRepository.js
- src/server/routes/metrics.js

Task:
Validate Clean Architecture compliance:
1. Are layers properly separated?
2. Do dependencies flow inward only?
3. Any SOLID violations?
4. Code smells detected?
5. Testability assessment

Provide specific refactoring recommendations if issues found.
```

#### Output
- Layer separation analysis (✅/❌)
- SOLID compliance check (all 5 principles)
- Code smells detected (with severity)
- Architectural recommendations (immediate, short-term, long-term, defer)
- Testability assessment
- Approval status (✅ Approved | ⚠️ Needs Changes | ❌ Blocked)

---

### 6. Code Review Agent
**File:** `.claude/agents/code-review-agent.md`
**Color:** Red
**Model:** Sonnet

#### Purpose
Final quality gate before committing. Reviews code for quality, security, patterns, conventions.

#### When to Use
- **Step 11** in typical workflow (after Clean Architecture agent, BEFORE commit)
- After implementation is complete
- Before every commit
- After refactor phase of TDD
- Before creating pull request
- When reviewing security concerns

#### What It Does
- Reviews code quality (readability, maintainability, duplication)
- Checks security (no secrets, proper logging)
- Validates SOLID principles
- Assesses performance
- Validates accessibility (for UI)
- Provides tradeoff analysis (critical vs warning vs info)
- **Presents findings for user decision** (does NOT edit automatically)

#### Example Usage
```
Launch Code Review Agent

Files to review:
- src/lib/core/MetricsCalculator.js
- src/lib/core/MetricsCalculator.test.js
- src/lib/infrastructure/FileMetricsRepository.js

Context:
- Phase: Story 0.1 (Initial implementation)
- Time budget: 1 hour for fixes
- Goal: Production-ready code

Task:
Perform comprehensive code review:
- Security issues
- Code quality
- SOLID compliance
- Performance concerns
- Present tradeoffs for each issue (critical/warning/info)
- Recommend fixes with time estimates
```

#### Output
- Executive summary (overall assessment, strengths, issues count, fix time)
- Critical issues (must fix - no tradeoff)
- Warnings (tradeoff analysis with options A/B/C)
- Info items (optional improvements)
- SOLID analysis (score per principle)
- Architecture compliance check
- Security review
- Accessibility review (if UI)
- Fix priority recommendations
- Tradeoff summary with user decision points

---

## 🔄 Typical Workflow with Agents

```
Story Lifecycle (with agent touchpoints):

1. 📋 Create GitHub Issue (gh CLI)
2. 🌿 Create feature branch (feat/issue-number-description)

3. 🤖 PRODUCT OWNER AGENT
   ↓ Validates requirements, refines ACs

4. 🤖 GITLAB INTEGRATION AGENT (if API work)
   ↓ Provides query patterns, pagination

5. 🤖 UX/UI DESIGN AGENT (if UI work)
   ↓ Generates styled-components, design specs

6. 🤖 TEST COVERAGE AGENT (Phase 1: Planning)
   ↓ Plans 3-5 tests in TDD order

7. 🔴 RED: Write failing test FIRST
   ↓
8. 🟢 GREEN: Minimal code to pass test
   ↓
9. 🔄 REFACTOR: Clean up code
   ↓
   🤖 TEST COVERAGE AGENT (Phase 2: Validation)
   ↓ Validates test quality, approves next test
   ↓
   [Repeat 7-9 for each test]
   ↓
   🤖 TEST COVERAGE AGENT (Phase 3: Gap Analysis if <85%)
   ↓ Recommends additional tests if needed

10. 🤖 CLEAN ARCHITECTURE AGENT
    ↓ Validates structure, SOLID compliance

11. 🤖 CODE REVIEW AGENT
    ↓ Final quality gate, tradeoff analysis

12. ✅ Commit and push (after approval)
13. 🔀 Create Pull Request (gh CLI)
14. ✅ Merge PR and close issue
```

---

## 📝 Best Practices

### 1. Use Agents Proactively
**❌ Don't:** Skip agents to save time
**✅ Do:** Launch appropriate agents BEFORE proposing work

### 2. One Agent at a Time
**❌ Don't:** Launch all agents simultaneously
**✅ Do:** Follow the workflow order (Product Owner → GitLab → UX → Test → Architecture → Code Review)

### 3. Provide Context
**❌ Don't:** "Review my code"
**✅ Do:** "Review MetricsCalculator.js for Story 0.1, spike context, 1 hour available for fixes"

### 4. Read Agent Output Carefully
**❌ Don't:** Skip to "approved/blocked" status
**✅ Do:** Read reasoning, understand tradeoffs, learn from feedback

### 5. Ask Follow-Up Questions
**❌ Don't:** Implement agent suggestions blindly
**✅ Do:** Ask clarifying questions if recommendations are unclear

### 6. Respect Agent Boundaries
- **Product Owner:** Requirements validation, NOT implementation
- **GitLab Integration:** Query patterns, NOT full client implementation
- **UX/UI Design:** Design specs + styled-components, NOT full component implementation
- **Test Coverage:** Test strategy, NOT writing tests for you
- **Clean Architecture:** Architecture guidance, NOT code refactoring
- **Code Review:** Issue identification + tradeoffs, NOT automatic fixes

---

## 🎯 Agent Selection Guide

**If you're unsure which agent to use, ask yourself:**

| Question | Agent |
|----------|-------|
| What should this feature do? | Product Owner |
| How do I fetch data from GitLab? | GitLab Integration |
| How should this UI component look/behave? | UX/UI Design |
| What tests should I write? | Test Coverage |
| Is my code structure correct? | Clean Architecture |
| Is my code ready to commit? | Code Review |

---

## 🚨 Common Mistakes

### Mistake 1: Skipping Product Owner Agent
**Problem:** Start implementing without validating requirements
**Result:** Build wrong feature or add scope creep
**Fix:** ALWAYS start with Product Owner agent

### Mistake 2: Using Test Coverage Agent Only at End
**Problem:** Write all tests, then ask for validation
**Result:** Miss TDD workflow, weak tests approved too late
**Fix:** Use agent in 3 phases (Plan → Validate each cycle → Gap analysis)

### Mistake 3: Treating Code Review as Auto-Fixer
**Problem:** Expect agent to fix all issues automatically
**Result:** Miss tradeoff decisions, lose context
**Fix:** Review tradeoffs, make informed decisions, then apply fixes

### Mistake 4: Not Providing Context
**Problem:** "Review my code" with no context
**Result:** Agent can't assess severity or recommend priorities
**Fix:** Always provide: phase, time budget, goal, constraints

---

## 📚 Related Documentation

- `.claude/CLAUDE.md` - Main project context
- `.claude/agents/*.md` - Individual agent definitions
- `_context/architecture/clean-architecture.md` - Architecture principles
- `_context/testing/tdd-strategy.md` - TDD approach
- `_context/workflow/git-github-workflow.md` - Git workflow

---

**Remember:** Agents are your specialized advisors. Use them early, use them often, and respect their domain expertise. They catch issues early when fixes are cheap, not late when they're expensive. 🚀
