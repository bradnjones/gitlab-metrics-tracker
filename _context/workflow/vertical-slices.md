# Vertical Slice Development

**Created:** 2025-11-07
**Purpose:** Guide for implementing vertical slice stories that deliver complete user value

---

## What is a Vertical Slice?

A vertical slice is a complete feature that touches all layers of the architecture:

```
GitLab API (Infrastructure)
    ↓
Calculators/Services (Core Business Logic)
    ↓
REST API Endpoints (Presentation/Server)
    ↓
React Components + Charts (Presentation/UI)
```

**User can see it, interact with it, and validate it works.**

---

## Why Vertical Slices?

### vs. Horizontal Layers (Old Approach)

| Horizontal (Layered) | Vertical (Sliced) |
|---------------------|-------------------|
| Complete all Infrastructure | Complete one feature end-to-end |
| Then complete all Core | See working UI after each story |
| Then complete all API | Get user feedback early |
| Then complete all UI | Discover integration issues early |
| **User value at end** | **User value at each story** |

### Benefits

1. **Faster Time to Value** - Working feature in 1 story vs. 15 stories
2. **Early Integration Testing** - Find API/UI issues in Story V1, not Story 15
3. **User Feedback Loop** - Users can request priority changes based on real features
4. **Clear MVP Boundary** - "MVP = V1 + V2 + V3" is obvious
5. **Demo-able Progress** - Every story can be shown to stakeholders

---

## Vertical Slice Story Structure

### Story Template

```markdown
## Story VN: [Feature Name]

**User Story:** As a [role], I want to [action] so that [benefit]

**Acceptance Criteria:**
1. ✅ GitLab Integration: [What data to fetch]
2. ✅ Metric Calculation: [What to calculate]
3. ✅ API Endpoint: [What endpoints to create]
4. ✅ React UI: [What components to build]
5. ✅ Chart Visualization: [What charts to display]
6. ✅ Manual Validation: [How user tests it]

**Technical Scope:**
- Infrastructure Layer: [GitLabClient methods]
- Core Layer: [Calculators, services]
- Presentation/API: [Express routes, controllers]
- Presentation/UI: [React components, charts]

**Validation Checklist:**
- [ ] Start app, see [something]
- [ ] Do [action], see [result]
- [ ] Verify [data] matches GitLab
```

### Example: Story V1 (Velocity Tracking)

**User Story:** As a team lead, I want to see my team's velocity over multiple sprints so that I can track delivery capacity trends.

**What Gets Built:**
1. **Infrastructure**: GitLabClient.fetchIterations(), GitLabClient.fetchIterationDetails()
2. **Core**: VelocityCalculator.calculate() (already exists ✅)
3. **API**: GET /api/iterations, GET /api/metrics/velocity
4. **UI**: IterationSelector component, VelocityChart component

**User Can:**
- Open app
- Select 2-3 sprints from dropdown
- See velocity chart with story points and issue counts
- Verify numbers match GitLab

**Complete feature in one story!**

---

## Implementation Process

### 1. Before Starting

```bash
# Create GitHub issue for story
gh issue create --title "Story V1: Velocity Tracking" \
  --body "[Full acceptance criteria from backlog.md]" \
  --label "story,vertical-slice,mvp"

# Create feature branch
git checkout -b feat/v1-velocity-tracking
```

**Launch Agents:**
- Product Owner Agent - Validate requirements
- GitLab Integration Agent (if GitLab work)
- UX/UI Design Agent (if UI work)

### 2. Implement Layer by Layer (TDD)

**For Each Layer:**

#### Infrastructure Layer
```bash
# Test Coverage Agent - Plan tests
# Write tests for GitLabClient methods
# RED: Tests fail
# GREEN: Implement methods
# REFACTOR: Clean up

npm test -- GitLabClient.test.js
```

#### Core Layer
```bash
# Test Coverage Agent - Plan tests
# Write tests for calculators/services
# RED: Tests fail
# GREEN: Implement business logic
# REFACTOR: Clean up

npm test -- VelocityCalculator.test.js
```

#### Presentation Layer (API)
```bash
# Test Coverage Agent - Plan tests
# Write tests for API endpoints
# RED: Tests fail
# GREEN: Implement routes/controllers
# REFACTOR: Clean up

npm test -- velocity.routes.test.js
```

#### Presentation Layer (UI)
```bash
# Test Coverage Agent - Plan tests
# Write tests for React components
# RED: Tests fail
# GREEN: Implement components
# REFACTOR: Clean up

npm test -- VelocityChart.test.js
```

### 3. After Implementation

```bash
# Run all tests
npm test

# Verify coverage
npm run test:coverage
# Must be ≥85%

# Launch Clean Architecture Agent
# Validates layer separation, dependency flow

# Launch Code Review Agent
# Validates code quality, security, patterns
```

### 4. Manual Verification Phase

**CRITICAL: User must test before commit**

```bash
# Stop any background processes
# Start app in correct mode
npm run dev

# Open browser to http://localhost:5173
# Follow validation checklist from story
# User manually tests complete feature
```

**Validation Checklist Example (V1):**
- [ ] Start app, see iteration selector populated
- [ ] Select 2-3 iterations
- [ ] Click "Analyze" or auto-trigger
- [ ] See velocity chart appear
- [ ] Hover over points, see tooltips
- [ ] Verify numbers match GitLab
- [ ] No console errors

**User approval required before commit!**

### 5. Completion

```bash
# Commit changes
git add .
git commit -m "feat: complete Story V1 - Velocity Tracking (#N)

- GitLab integration for iterations and issues
- Velocity calculation with VelocityCalculator
- API endpoints for iterations and velocity
- React UI with IterationSelector and VelocityChart
- Chart.js line chart visualization
- All tests passing (coverage: 87%)

Manual validation completed:
✅ Iteration selector loads from GitLab
✅ Velocity chart displays correctly
✅ Data matches GitLab numbers
✅ No console errors

Agent validations:
✅ Product Owner - Requirements met
✅ UX/UI Design - Matches prototype
✅ Test Coverage - 87% coverage
✅ Clean Architecture - Layer separation validated
✅ Code Review - Approved"

# Push to remote
git push -u origin feat/v1-velocity-tracking

# Create PR
gh pr create --title "Story V1: Velocity Tracking - Complete Feature" \
  --body "Closes #N

## Summary
Complete velocity tracking feature from GitLab → Core → API → UI

**Infrastructure:**
- GitLabClient methods for iterations and issues
- Pagination, caching, rate limiting

**Core:**
- VelocityCalculator (reused from Story 1.1)

**API:**
- GET /api/iterations
- GET /api/metrics/velocity

**UI:**
- IterationSelector component (multi-select dropdown)
- VelocityChart component (Chart.js line chart)

## Manual Validation ✅
- [x] Iteration selector loads from GitLab
- [x] Can select multiple iterations
- [x] Velocity chart displays with correct data
- [x] Numbers match GitLab
- [x] No errors in console

## Testing
- ✅ All tests pass (npm test)
- ✅ Coverage: 87% (exceeds 85% target)
- ✅ TDD approach followed

## Agent Reviews
- ✅ Product Owner - Validated against prototype
- ✅ UX/UI Design - Styling matches prototype
- ✅ Test Coverage - Coverage validated
- ✅ Clean Architecture - Layer separation approved
- ✅ Code Review - Code quality approved

## Screenshots
[Attach screenshots of working feature]
" \
  --label "story,vertical-slice,mvp"

# Merge PR (after approval)
gh pr merge --squash --delete-branch
```

---

## Clean Architecture in Vertical Slices

### Still Applies!

Each vertical slice MUST maintain Clean Architecture principles:

#### Core Layer (Innermost)
- **Pure business logic**
- **No external dependencies**
- **Depends on interfaces, not implementations**
- Example: `VelocityCalculator.calculate(issues)` - pure function

#### Infrastructure Layer (Middle)
- **Implements Core interfaces**
- **Handles external systems** (GitLab API, file system)
- **Adapts data** from external format to Core types
- Example: `GitLabClient.fetchIterations()` returns data, `GitLabIterationDataProvider` adapts it

#### Presentation Layer (Outermost)
- **Depends on Core interfaces**
- **Orchestrates use cases**
- **No business logic** (just coordination)
- Example: API routes call `MetricsService`, React components call API

#### Dependency Flow

```
Presentation (API + UI)
    ↓ depends on
Infrastructure (GitLab, FileSystem)
    ↓ depends on
Core (Entities, Calculators, Interfaces)
```

**Core NEVER depends on outer layers!**

### Validation

After each vertical slice, run Clean Architecture Agent:
```
"Validate that Infrastructure implements Core interfaces,
Presentation depends on Core (not Infrastructure directly),
and Core has zero dependencies on outer layers."
```

---

## Common Pitfalls

### ❌ Anti-Pattern: Skipping Layers

**Wrong:**
```javascript
// React component directly calling GitLabClient
import { GitLabClient } from '../../lib/infrastructure/api/GitLabClient.js'

function VelocityChart() {
  const client = new GitLabClient()
  const iterations = await client.fetchIterations() // ❌ Presentation → Infrastructure
}
```

**Right:**
```javascript
// React component calls API endpoint
function VelocityChart() {
  const iterations = await fetch('/api/iterations') // ✅ Presentation → API
}

// API route uses service
app.get('/api/iterations', (req, res) => {
  const data = await metricsService.getIterations() // ✅ API → Core
})

// Service uses data provider
class MetricsService {
  async getIterations() {
    return this.dataProvider.fetchIterations() // ✅ Core → Interface
  }
}

// Infrastructure implements interface
class GitLabIterationDataProvider {
  async fetchIterations() {
    return this.client.fetchIterations() // ✅ Infrastructure → GitLab
  }
}
```

### ❌ Anti-Pattern: Business Logic in Presentation

**Wrong:**
```javascript
// API route calculating velocity
app.get('/api/metrics/velocity', (req, res) => {
  const storyPoints = issues.reduce((sum, i) => sum + i.weight, 0) // ❌ Business logic in API
  res.json({ velocity: storyPoints })
})
```

**Right:**
```javascript
// API route delegates to service
app.get('/api/metrics/velocity', (req, res) => {
  const result = await metricsService.calculateVelocity(iterations) // ✅ Delegates to Core
  res.json(result)
})

// Service uses calculator
class MetricsService {
  calculateVelocity(iterations) {
    return this.velocityCalculator.calculate(issues) // ✅ Business logic in Core
  }
}
```

### ❌ Anti-Pattern: Mixing Concerns

**Wrong:**
```javascript
// Calculator fetching from GitLab
class VelocityCalculator {
  async calculate(iterationIds) {
    const issues = await fetch(`${GITLAB_URL}/issues`) // ❌ Core depends on Infrastructure
    return issues.reduce(...)
  }
}
```

**Right:**
```javascript
// Calculator receives data
class VelocityCalculator {
  calculate(issues) { // ✅ Pure function, receives data
    return issues.reduce(...)
  }
}

// Data provider fetches
class GitLabIterationDataProvider {
  async fetchIterationData(iterationIds) { // ✅ Infrastructure handles fetching
    const issues = await this.client.fetchIterationDetails(iterationIds)
    return issues
  }
}
```

---

## Story Dependencies

Stories can be worked in order:

```
V1 (Velocity)
└─ Establishes all patterns
   └─ V2 (Throughput + Cycle Time)
      └─ Reuses V1 patterns
         └─ V3 (Dashboard Polish)
            └─ MVP COMPLETE ✅
               ├─ V4 (Deployment Metrics) - Independent
               ├─ V5 (Incident Metrics) - Independent
               └─ V6 (Annotations) - Independent
                  └─ V7 (Insights) - Depends on V6
```

**Parallel Work:**
After V3, V4/V5/V6 can be done in any order (all independent).

---

## Success Criteria

A vertical slice is complete when:

1. ✅ **All layers implemented** (Infrastructure → Core → API → UI)
2. ✅ **Tests passing** (≥85% coverage)
3. ✅ **Agents validated** (Clean Architecture, Code Review)
4. ✅ **User manually tested** (validation checklist completed)
5. ✅ **User approved** (feature works as expected)
6. ✅ **PR merged** (code in main branch)

**User can open app, use feature, see value!**

---

## FAQ

### Q: Do I still write tests first (TDD)?
**A:** YES! TDD applies at each layer within the slice. Write tests first for Infrastructure, then Core, then API, then UI.

### Q: Can I skip a layer?
**A:** NO! Every vertical slice must touch all relevant layers. If no new Core logic needed (reusing calculator), that's fine, but you still call through Core interfaces.

### Q: How do I know if my slice is vertical?
**A:** Ask: "Can a user open the app and see/use this feature?" If yes, it's vertical. If no (e.g., "just the GitLab client"), it's horizontal.

### Q: What if a slice is too big?
**A:** Break it into sub-stories: V1a (Backend), V1b (Frontend). But prefer full slices when possible (better integration testing).

### Q: Do slices violate Clean Architecture?
**A:** NO! Slices are orthogonal to architecture. You still maintain layer separation WITHIN each slice. Slice = feature delivery. Architecture = code organization.

---

## Summary

**Vertical Slices:**
- Deliver complete features (GitLab → Core → API → UI)
- Provide user value at each story
- Enable early feedback and integration testing
- Maintain Clean Architecture principles
- Follow TDD at each layer
- Require user validation before commit

**Result:** Faster time to MVP, better quality, happier users! 🚀
