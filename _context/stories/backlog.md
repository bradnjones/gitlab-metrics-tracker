# Story Backlog - Vertical Slices

**Approach:** Vertical slices delivering complete user value (GitLab → Core → API → UI)
**Last Updated:** 2025-11-07
**Previous Approach:** Horizontal architectural layers (archived in `archived-horizontal-backlog.md`)

---

## 🎯 NEXT STORY TO START

**Story V2: Cycle Time Metrics**

See below for full details.

**Completed Stories:**
- ✅ V1: Velocity Tracking (Issue #11, merged)
- ✅ V1.1: IterationSelector UX/UI Improvements (Issue #14, merged)
- ✅ Removed redundant ThroughputCalculator (PR #31, merged)

---

## 📊 MVP Boundary

**MVP = Stories V1 + V2 + V3** (12-16 hours total)

After V3, users can:
- ✅ Select iterations from their GitLab project
- ✅ View 2 core metrics with visualizations (Velocity, Cycle Time)
- ✅ Track trends over time
- ✅ Understand team performance and bottlenecks

**Note:** Throughput was removed (PR #31) as it was redundant with Velocity's issue count.

**Post-MVP** = Stories V4-V7 (optional enhancements)

---

## Vertical Slice Stories

### Story V1: Velocity Tracking - Complete Feature

**User Story:** As a team lead, I want to see my team's velocity (story points + issue count) over multiple sprints so that I can track our delivery capacity trends.

**Priority:** HIGHEST (MVP Foundation)
**Complexity:** LARGE (First vertical slice establishes all patterns)
**Estimate:** 6-8 hours
**Prerequisites:** None (leverages completed Stories 0.1, 1.1, 1.2)

#### Acceptance Criteria
1. ✅ **GitLab Integration**: Fetch iterations and issues with story points from configured GitLab project
2. ✅ **Metric Calculation**: Calculate velocity (story points completed + issues closed) per iteration
3. ✅ **API Endpoint**: GET /api/metrics/velocity?iterations=X,Y,Z returns calculated data
4. ✅ **React UI**: Display iteration selector (multi-select dropdown matching prototype)
5. ✅ **Chart Visualization**: Line chart showing velocity trends (Chart.js, matches prototype exactly)
6. ✅ **Manual Validation**: User can select 2-3 iterations, see chart update, verify numbers match GitLab

#### Technical Scope

**Infrastructure Layer:**
- GitLabClient.fetchProject() - Get project metadata
- GitLabClient.fetchIterations() - Get iteration list
- GitLabClient.fetchIterationDetails() - Get issues with story points
- Pagination, rate limiting, project caching (10-min TTL)

**Core Layer:**
- VelocityCalculator.calculate() - Already implemented ✅
- IIterationDataProvider interface - Already defined ✅
- GitLabIterationDataProvider adapter - Extend for velocity data

**Presentation Layer (API):**
- GET /api/iterations - List available iterations
- GET /api/metrics/velocity?iterations=X,Y,Z - Calculate and return velocity data
- Request validation middleware

**Presentation Layer (UI):**
- React + Vite setup (if not already done)
- styled-components configuration
- IterationSelector component (multi-select dropdown)
- VelocityChart component (Chart.js line chart)
- API integration with fetch/axios
- Loading states, error handling

#### Validation Checklist (Manual Testing)
- [ ] Start app, see iteration selector populated from GitLab
- [ ] Select 2-3 iterations from dropdown
- [ ] Click "Analyze" or trigger calculation
- [ ] See velocity chart appear with correct data points
- [ ] Hover over chart points, see tooltips
- [ ] Verify story points match GitLab totals
- [ ] Verify issue counts match GitLab totals
- [ ] Check console for errors (should be none)

#### Agents to Use
- 🤖 Product Owner Agent - Validate velocity formula and UI behavior match prototype
- 🤖 GitLab Integration Agent - Validate GraphQL queries and pagination patterns
- 🤖 UX/UI Design Agent - Extract iteration selector and chart styling from prototype
- 🤖 Test Coverage Agent - Plan TDD approach for all layers
- 🤖 Clean Architecture Agent - Validate layer separation and dependency flow
- 🤖 Code Review Agent - Final review before commit

#### Key Decisions
- **GitLabClient scope**: Only implement methods needed for velocity (fetchProject, fetchIterations, fetchIterationDetails)
- **Chart library**: Chart.js (matches prototype, don't change)
- **State management**: useState/useEffect (defer Redux/Context until needed)
- **Styling**: styled-components (migrate from prototype's inline styles)
- **Error handling**: Display user-friendly messages in UI (no silent failures)

---

### Story V1.1: IterationSelector UX/UI Improvements

**User Story:** As a team lead, I want an improved iteration selector with filtering and search capabilities so I can quickly find and select the iterations I need to analyze.

**Priority:** HIGH (Quality of Life for MVP)
**Complexity:** SMALL (UI Enhancement)
**Estimate:** 3-5 hours
**Prerequisites:** V1 complete ✅

#### Context
Story V1 delivered basic velocity tracking functionality, but the iteration selector has UX issues that make it difficult to use with many iterations:

**Current Issues (from user feedback):**
1. **Poor alignment**: Checkbox is far left, text is right-aligned - awkward spacing
2. **No state filtering**: Can't filter by closed/current/upcoming iterations
3. **No search**: Hard to find specific iterations in long lists
4. **No cadence filtering**: Can't filter to show only "Devs Sprint" or other specific cadences
5. **Visual hierarchy unclear**: Iteration names, dates, and states have poor visual hierarchy

#### Acceptance Criteria

**1. Fix Layout and Alignment**
- [ ] Checkbox and iteration details are left-aligned together (no gap)
- [ ] Iteration title uses `<strong>` for proper hierarchy
- [ ] Dates are secondary text (smaller, gray)
- [ ] State badge is visually distinct (colored pill/badge)
- [ ] Better spacing between iteration items (8-12px)
- [ ] Hover states provide visual feedback (background color change)

**2. Add State Filter**
- [ ] Dropdown or button group UI to filter by state
- [ ] Options: "All", "Closed", "Current", "Upcoming"
- [ ] Default to "All" (preserve current behavior)
- [ ] Selection persists during session (useState)
- [ ] Combines with other filters (AND logic)

**3. Add Search Functionality**
- [ ] Search input field above iteration list
- [ ] Placeholder: "Search iterations..."
- [ ] Real-time filtering as user types (debounced 300ms)
- [ ] Searches iteration title AND cadence name
- [ ] Clear button (X icon) to reset search
- [ ] Case-insensitive matching

**4. Add Cadence Filter**
- [ ] Dropdown showing all unique cadences from iterations
- [ ] First option: "All Cadences" (default)
- [ ] Extract unique cadences: `[...new Set(iterations.map(i => i.iterationCadence?.title))]`
- [ ] Only show iterations from selected cadence
- [ ] Combine with state filter and search (AND logic)

**5. Maintain Existing Functionality**
- [ ] Multi-select still works (checkboxes)
- [ ] Selected iterations tracked correctly in state
- [ ] Velocity chart updates automatically on selection change
- [ ] All existing tests pass
- [ ] New tests for filters and search (8-10 tests total)

#### Technical Implementation

**State Management:**
```jsx
const [searchTerm, setSearchTerm] = useState('');
const [selectedState, setSelectedState] = useState('all');
const [selectedCadence, setSelectedCadence] = useState('');
const [selectedIds, setSelectedIds] = useState([]);
```

**Filtering Logic:**
```jsx
const filteredIterations = iterations.filter(iteration => {
  // Search filter (title or cadence)
  const matchesSearch = !searchTerm ||
    iteration.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    iteration.iterationCadence?.title?.toLowerCase().includes(searchTerm.toLowerCase());

  // State filter
  const matchesState = selectedState === 'all' ||
    iteration.state === selectedState;

  // Cadence filter
  const matchesCadence = !selectedCadence ||
    iteration.iterationCadence?.title === selectedCadence;

  return matchesSearch && matchesState && matchesCadence;
});

// Extract unique cadences for dropdown
const uniqueCadences = [...new Set(
  iterations
    .map(i => i.iterationCadence?.title)
    .filter(Boolean)
)].sort();
```

**UI Components to Add:**
- SearchInput (styled input with clear button)
- StateFilter (dropdown or button group)
- CadenceFilter (dropdown)
- Improved IterationItem styling

#### Testing Strategy

**New Tests (8-10 total):**
1. Search filters iterations by title
2. Search filters iterations by cadence name
3. Search is case-insensitive
4. Clear button resets search
5. State filter shows only matching iterations
6. Cadence filter shows only matching iterations
7. All filters combine with AND logic
8. Clearing all filters shows all iterations
9. UI layout snapshot test (proper alignment)
10. Hover states apply correctly

**Existing Tests:**
- All 212 existing tests must pass
- Coverage stays ≥85%

#### UI Reference
Check prototype: `/Users/brad/dev/smi/gitlab-sprint-metrics/src/public/index.html`
- Lines 58-90: Iteration selector with filters
- Lines 64-72: Filter controls layout
- Lines 76-88: Iteration item structure

#### Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests written first (TDD where possible)
- [ ] All tests passing (≥85% coverage)
- [ ] Clean Architecture Agent approved (if architecture changes)
- [ ] Code Review Agent approved
- [ ] Manual testing completed by user
- [ ] Commit and push

**Note:** This is a UI-only enhancement - no backend changes needed.

---

### Story V2: Cycle Time Metrics

**User Story:** As a team lead, I want to see cycle time (Avg/P50/P90) so that I can understand how long it takes to complete issues and identify bottlenecks.

**Priority:** HIGH (MVP Core)
**Complexity:** MEDIUM (Patterns established in V1)
**Estimate:** 3-4 hours
**Prerequisites:** V1 complete

**Note:** Throughput was removed in PR #31 as it was redundant with Velocity's issue count tracking. This story now focuses solely on Cycle Time.

#### Acceptance Criteria
1. ✅ **GitLab Integration**: Reuse fetchIterationDetails() from V1 (no new queries needed)
2. ✅ **Metric Calculation**: Calculate cycle time (calculator already exists ✅)
3. ✅ **API Endpoint**: GET /api/metrics/cycle-time?iterations=X,Y,Z
4. ✅ **React UI**: Add cycle time chart card to dashboard
5. ✅ **Chart**: Cycle Time combo chart (line for average + markers/bands for P50/P90)
6. ✅ **Manual Validation**: Verify calculations match prototype formulas

#### Technical Scope

**Infrastructure Layer:**
- No new GitLabClient methods needed (reuse V1)

**Core Layer:**
- CycleTimeCalculator.calculate() - Already implemented ✅

**Presentation Layer (API):**
- GET /api/metrics/cycle-time

**Presentation Layer (UI):**
- CycleTimeChart component (Chart.js line chart with P50/P90 annotations)
- Dashboard layout with 2 metric cards (Velocity + Cycle Time)

#### Validation Checklist
- [ ] Select same iterations as V1
- [ ] See 2 charts: Velocity and Cycle Time
- [ ] Verify cycle time averages look reasonable
- [ ] Check P50 and P90 lines/bands render on cycle time chart
- [ ] Hover tooltips show all three values (Avg, P50, P90)

#### Agents to Use
- 🤖 Product Owner Agent - Validate cycle time formula matches prototype
- 🤖 UX/UI Design Agent - Extract cycle time chart styles from prototype
- 🤖 Test Coverage Agent - Plan tests for new endpoint and component
- 🤖 Code Review Agent - Final review

---

### Story V3: Metrics Dashboard - Polish MVP

**User Story:** As a team lead, I want a polished dashboard with both metrics (Velocity + Cycle Time), proper layout, and loading states so that I have a professional tool I can show to stakeholders.

**Priority:** MEDIUM (MVP Polish)
**Complexity:** SMALL (Refinement)
**Estimate:** 3-4 hours
**Prerequisites:** V2 complete

#### Acceptance Criteria
1. ✅ **Dashboard Layout**: Card-based responsive grid matching prototype exactly
2. ✅ **Loading States**: Skeleton loaders while fetching GitLab data
3. ✅ **Error Handling**: User-friendly error messages for API failures, GitLab auth issues
4. ✅ **Empty States**: Helpful messages when no iterations selected
5. ✅ **Responsive Design**: Works on laptop and tablet (mobile optional)
6. ✅ **Polish**: Colors, spacing, typography match prototype design system

#### Technical Scope

**Presentation Layer (UI):**
- Dashboard container component
- Skeleton loaders for charts
- Error boundary component
- Toast/alert for error messages
- Responsive CSS Grid layout
- Design system tokens (colors, spacing from prototype)

#### Validation Checklist
- [ ] Resize browser window, verify layout adapts
- [ ] Disconnect network, verify error messages appear
- [ ] Clear iteration selection, verify empty state shows
- [ ] Check spacing and colors match prototype screenshots
- [ ] Test keyboard navigation (tab through controls)

#### Agents to Use
- 🤖 UX/UI Design Agent - Extract loading states, error messages, layout patterns from prototype
- 🤖 Product Owner Agent - Validate MVP completeness
- 🤖 Code Review Agent - Final review

---

## 🚀 Post-MVP Stories

### Story V4: Deployment Metrics - Add DORA Metrics

**User Story:** As an engineering manager, I want to see deployment frequency and lead time so that I can track our DORA metrics.

**Priority:** MEDIUM (Post-MVP)
**Complexity:** MEDIUM
**Estimate:** 4-5 hours
**Prerequisites:** V3 complete

#### Acceptance Criteria
1. ✅ **GitLab Integration**: Fetch merged MRs to main/master (deployment proxy)
2. ✅ **Metric Calculation**: Calculate deployment frequency and lead time
3. ✅ **API Endpoints**: GET /api/metrics/deployment-frequency, GET /api/metrics/lead-time
4. ✅ **React UI**: Add two new charts to dashboard (5 metrics total)
5. ✅ **Manual Validation**: Verify deployment counts and lead time match GitLab

#### Technical Scope

**Infrastructure Layer:**
- GitLabClient.fetchMergeRequestsForGroup() - Get MRs merged to main
- GitLabClient.fetchCommitsForProject() - Get commit timestamps

**Core Layer:**
- DeploymentFrequencyCalculator.calculate() - Already implemented ✅
- LeadTimeCalculator.calculate() - Already implemented ✅

**Presentation Layer (API):**
- GET /api/metrics/deployment-frequency
- GET /api/metrics/lead-time

**Presentation Layer (UI):**
- DeploymentFrequencyChart component
- LeadTimeChart component

---

### Story V5: Incident Metrics - Add MTTR

**User Story:** As an SRE lead, I want to see incident counts and MTTR so that I can track our reliability improvements.

**Priority:** MEDIUM (Post-MVP)
**Complexity:** MEDIUM
**Estimate:** 4-5 hours
**Prerequisites:** V3 complete (not dependent on V4)

#### Acceptance Criteria
1. ✅ **GitLab Integration**: Fetch incidents from GitLab (issues with incident type)
2. ✅ **Metric Calculation**: Calculate incident count and MTTR
3. ✅ **API Endpoint**: GET /api/metrics/incidents
4. ✅ **React UI**: Add incident chart to dashboard (6 metrics total)
5. ✅ **Manual Validation**: Verify incident data matches GitLab

#### Technical Scope

**Infrastructure Layer:**
- GitLabClient.fetchIncidents() - Get issues with incident type

**Core Layer:**
- IncidentAnalyzer.analyze() - Already implemented ✅

**Presentation Layer (API):**
- GET /api/metrics/incidents

**Presentation Layer (UI):**
- IncidentChart component (bar chart with MTTR trend)

---

### Story V6: Annotation System - Event Tracking

**User Story:** As a team lead, I want to annotate sprints with events (process changes, incidents, team changes) so that I can correlate events with metric changes.

**Priority:** MEDIUM (Post-MVP)
**Complexity:** LARGE (New feature domain)
**Estimate:** 6-7 hours
**Prerequisites:** V3 complete (can run in parallel with V4, V5)

#### Acceptance Criteria
1. ✅ **Core Entities**: Annotation entity already exists ✅
2. ✅ **CRUD Operations**: Create, read, update, delete annotations
3. ✅ **API Endpoints**: GET, POST, PUT, DELETE /api/annotations
4. ✅ **React UI**:
   - Modal for creating/editing annotations (matches prototype)
   - Annotation markers on all charts (vertical lines at sprint boundaries)
   - Keyboard shortcut (Ctrl+N to open modal)
5. ✅ **Manual Validation**: Create annotation, see markers appear on all charts

#### Technical Scope

**Core Layer:**
- Annotation entity - Already implemented ✅
- IAnnotationsRepository - Already defined ✅

**Infrastructure Layer:**
- FileAnnotationsRepository - Already implemented ✅

**Presentation Layer (API):**
- GET /api/annotations
- POST /api/annotations
- PUT /api/annotations/:id
- DELETE /api/annotations/:id
- Request validation middleware

**Presentation Layer (UI):**
- AnnotationModal component (form with event type, date, description, impact)
- AnnotationMarker component (vertical line overlay on Chart.js)
- Chart.js plugin for rendering annotations
- Keyboard shortcut handler (Ctrl+N)

---

### Story V7: Insights - Correlation Analysis

**User Story:** As a team lead, I want to see how annotations correlate with metric changes so that I can learn which events improve/hurt our metrics.

**Priority:** LOW (Post-MVP Enhancement)
**Complexity:** MEDIUM
**Estimate:** 4-5 hours
**Prerequisites:** V6 complete

#### Acceptance Criteria
1. ✅ **Core Logic**: Before/after analysis, pattern recognition by event type
2. ✅ **API Endpoint**: GET /api/analysis/insights
3. ✅ **React UI**: Insights panel showing:
   - Annotations with biggest metric impacts (positive/negative)
   - Patterns by event type (e.g., "Tool changes correlate with +15% velocity")
   - Recommendations based on historical patterns
4. ✅ **Manual Validation**: Create annotations, verify insights appear

#### Technical Scope

**Core Layer:**
- CorrelationAnalyzer service (new)
- ImpactDetector service (new)

**Presentation Layer (API):**
- GET /api/analysis/insights

**Presentation Layer (UI):**
- InsightsPanel component
- ImpactCard component
- RecommendationsList component

---

## Story Dependencies

```
V1 (Velocity)
├─ V2 (Throughput + Cycle Time)
│  └─ V3 (Dashboard Polish) ──> MVP COMPLETE
│     ├─ V4 (Deployment Metrics)
│     ├─ V5 (Incident Metrics)
│     └─ V6 (Annotations)
│        └─ V7 (Insights)
```

**Parallel Execution:**
- V4 and V5 can be done in any order (both independent of each other)
- V6 can start after V3 (doesn't depend on V4 or V5)

---

## Migration from Horizontal Stories

### Completed Work (Already Done)
- ✅ Story 0.1: Project Foundation (entities, repositories)
- ✅ Story 1.1: Metrics Calculation Engine (all 6 calculators)
- ✅ Story 1.2: MetricsService (orchestration layer)

### Work in Progress (Partially Done)
- ⏳ Story 0.2: GitLab Client (issue #3, branch feat/3-gitlab-client)
  - **Status**: Agents consulted, no code written
  - **Action**: Close issue #3, absorb into Story V1

### How Completed Work Maps to V1

**Story V1 can leverage:**
- VelocityCalculator from Story 1.1 ✅
- ThroughputCalculator from Story 1.1 ✅
- CycleTimeCalculator from Story 1.1 ✅
- Metric entity from Story 0.1 ✅
- FileMetricsRepository from Story 0.1 ✅
- MetricsService from Story 1.2 ✅
- IIterationDataProvider interface from Story 1.2 ✅

**Story V1 still needs to implement:**
- GitLabClient methods (fetchProject, fetchIterations, fetchIterationDetails)
- GitLabIterationDataProvider (adapt GitLabClient to interface)
- API routes (GET /api/iterations, GET /api/metrics/velocity)
- React components (IterationSelector, VelocityChart)
- Chart.js configuration
- End-to-end integration

**Estimate Impact:**
- Original V1 estimate: 8-10 hours (if starting from scratch)
- Adjusted estimate: 6-8 hours (leveraging completed foundation)
- Savings: ~2 hours from reusing calculators and entities

---

## Implementation Guidelines

### For Each Vertical Slice Story:

1. **Before Starting:**
   - Create GitHub issue with full acceptance criteria
   - Create feature branch (feat/vN-description)
   - Launch appropriate agents (Product Owner, GitLab, UX/UI, etc.)

2. **TDD Approach (Layer by Layer):**
   - **Infrastructure Layer**: Write tests for GitLabClient methods → Implement → Refactor
   - **Core Layer**: Write tests for new services/calculators → Implement → Refactor
   - **Presentation/API**: Write tests for endpoints → Implement → Refactor
   - **Presentation/UI**: Write tests for components → Implement → Refactor

3. **After Implementation:**
   - Run all tests (npm test)
   - Verify coverage ≥85% (npm run test:coverage)
   - Launch Clean Architecture Agent (validate structure)
   - Launch Code Review Agent (validate quality)

4. **Manual Verification Phase:**
   - Stop background processes
   - Start app in correct mode (npm run dev)
   - Follow validation checklist from story
   - User manually tests all functionality
   - Get user approval before committing

5. **Completion:**
   - Commit and push to feature branch
   - Create pull request with validation evidence
   - Merge PR and close issue
   - Move story to completed.md

### Clean Architecture in Vertical Slices

**Still applies! Each layer in isolation:**

**Core Layer (Business Logic):**
- Pure functions, no external dependencies
- Depends on interfaces, not implementations
- Fully testable in isolation

**Infrastructure Layer (External Systems):**
- Implements Core interfaces
- Handles GitLab API, file system, etc.
- Adapts external data to Core types

**Presentation Layer (API + UI):**
- Depends on Core interfaces
- Orchestrates use cases
- No business logic (just coordination)

**Dependency Flow:** Presentation → Infrastructure → Core
- Core has zero dependencies on outer layers
- Infrastructure implements Core interfaces
- Presentation uses Core through interfaces

---

## Why Vertical Slices Work for This Project

### 1. Prototype Validates Features
- Prototype has 6 working metrics end-to-end
- Prototype proves GitLab integration works
- Prototype proves Chart.js visualizations work
- We're not inventing, we're rebuilding with better architecture

### 2. Clear User Value Per Story
- V1: See velocity trends (immediately useful)
- V2: Add throughput and cycle time (more insights)
- V3: Polished dashboard (ready to share)
- V4+: Optional enhancements based on user feedback

### 3. Early Risk Discovery
- GitLab API issues discovered in V1 (not Phase 3)
- Chart.js integration issues discovered in V1 (not Phase 3)
- React architecture issues discovered in V1 (not Phase 3)

### 4. Flexible Prioritization
- After V3 (MVP), user can request V6 before V4 if annotations are more important
- Can defer V7 indefinitely if insights aren't valuable
- Can add new metrics as V8, V9, etc.

### 5. Demo-able Progress
- Every story is demo-able to stakeholders
- "Here's velocity tracking" is better than "Here's some calculators"
- Visible progress maintains momentum

---

## Backlog Maintenance

- Stories are ordered by dependency and user value
- MVP boundary is clear (V1-V3)
- Estimate times include full vertical slice (all layers + tests)
- All stories require agent usage (see each story)
- Coverage target: ≥85% for all modules
- Product Owner Agent validates all features against prototype

---

**Current Phase:** Vertical Slice Development
**Next Story:** V1 - Velocity Tracking (Complete Feature)
**MVP Target:** After V3 (15-20 hours total)
