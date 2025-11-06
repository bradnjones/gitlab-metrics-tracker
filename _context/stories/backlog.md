# Story Backlog

## 🎯 NEXT STORY TO START

**Story 0.1: Project Foundation - Clean Architecture Setup**

See below for details.

---

## Phase 0: Foundation

### Story 0.1: Project Foundation - Clean Architecture Setup

**Goal:** Set up Clean Architecture structure with core entities and TDD infrastructure

**Priority:** HIGHEST (Foundation)
**Estimate:** 2-3 hours
**Prerequisites:** None

**Acceptance Criteria:**
- [ ] Core entities created (`Metric`, `Annotation`, `AnalysisResult`)
- [ ] Repository interfaces defined (abstraction for storage)
- [ ] File system repository implemented (JSON storage)
- [ ] Tests written FIRST (TDD) with ≥85% coverage
- [ ] Clean Architecture agent validates structure

**Technical Tasks:**
1. Create core entities in `src/lib/core/entities/`
   - `Metric.js` with JSDoc
   - `Annotation.js` with JSDoc
   - `AnalysisResult.js` with JSDoc
2. Define repository interface in `src/lib/core/repositories/`
   - `IMetricsRepository.js`
   - `IAnnotationsRepository.js`
3. Implement file system repositories in `src/lib/infrastructure/repositories/`
   - `FileMetricsRepository.js`
   - `FileAnnotationsRepository.js`
4. Write comprehensive tests (TDD approach)

**Agents to Use:**
- 🤖 Clean Architecture Agent (validate structure)
- 🤖 Test Coverage Agent (plan TDD approach)
- 🤖 Code Review Agent (final review)

---

### Story 0.2: GitLab Client Integration

**Goal:** Implement GitLab GraphQL client following prototype patterns

**Priority:** HIGH
**Estimate:** 3-4 hours
**Prerequisites:** Story 0.1 complete

**Acceptance Criteria:**
- [ ] GitLabClient class created in `src/lib/infrastructure/api/`
- [ ] All 12 query patterns from prototype migrated
- [ ] Pagination, caching, rate limiting implemented
- [ ] Tests with mocked GraphQL responses
- [ ] GitLab Integration Agent validates patterns

**Technical Tasks:**
1. Create `GitLabClient.js` based on prototype
2. Implement query methods (iterations, issues, MRs, pipelines, incidents)
3. Add pagination, caching, rate limiting
4. Write tests with mocked API responses

**Agents to Use:**
- 🤖 GitLab Integration Agent (reference prototype patterns)
- 🤖 Test Coverage Agent (plan tests)
- 🤖 Clean Architecture Agent (ensure proper layering)

---

## Phase 1: Core Metrics

### Story 1.1: Metrics Calculation Engine

**Goal:** Implement all 6 metric calculations with TDD

**Priority:** HIGH
**Estimate:** 4-5 hours
**Prerequisites:** Story 0.1, 0.2 complete

**Acceptance Criteria:**
- [ ] All 6 metrics calculators implemented (Velocity, Throughput, Cycle Time, Deployment Freq, Lead Time, MTTR)
- [ ] Formulas match prototype exactly (validated by Product Owner Agent)
- [ ] Pure functions (no side effects, no external dependencies)
- [ ] Tests written FIRST, ≥85% coverage
- [ ] simple-statistics library integrated

**Technical Tasks:**
1. Create `MetricsCalculator.js` in `src/lib/core/services/`
2. Implement each metric calculation (following prototype formulas)
3. Write comprehensive tests for each metric
4. Document formulas in `_context/domain/metrics-formulas.md`

**Agents to Use:**
- 🤖 Product Owner Agent (validate formulas against prototype)
- 🤖 Test Coverage Agent (TDD planning)
- 🤖 Clean Architecture Agent (ensure Core layer purity)

---

### Story 1.2: Express API - Metrics Endpoints

**Goal:** Create RESTful API for metrics operations

**Priority:** MEDIUM
**Estimate:** 2-3 hours
**Prerequisites:** Story 1.1 complete

**Acceptance Criteria:**
- [ ] API endpoints: GET /api/metrics, POST /api/analyze
- [ ] Request validation and error handling
- [ ] Tests for all endpoints
- [ ] Follows RESTful conventions

**Technical Tasks:**
1. Create Express routes in `src/server/routes/`
2. Implement controllers
3. Add request validation middleware
4. Write API tests

---

## Phase 2: Annotation System

### Story 2.1: Annotation CRUD

**Goal:** Full CRUD operations for annotations

**Priority:** MEDIUM
**Estimate:** 3 hours

**Acceptance Criteria:**
- [ ] API endpoints: GET, POST, PUT, DELETE /api/annotations
- [ ] Validation for event types and impact levels
- [ ] Tests for all operations
- [ ] Follows prototype behavior

---

### Story 2.2: Correlation Analysis Engine

**Goal:** Implement impact detection and pattern recognition

**Priority:** MEDIUM
**Estimate:** 4 hours

**Acceptance Criteria:**
- [ ] Before/after impact detection
- [ ] Pattern recognition by event type
- [ ] Recommendation generation
- [ ] Matches prototype algorithm

---

## Phase 3: React Frontend

### Story 3.1: React App Setup + Iteration Selector

**Goal:** Set up React + Vite, implement iteration selector UI

**Priority:** MEDIUM
**Estimate:** 3 hours

**Acceptance Criteria:**
- [ ] Vite configured with React
- [ ] styled-components setup
- [ ] Iteration selector matches prototype UI
- [ ] Multi-select functionality

**Agents to Use:**
- 🤖 UX/UI Design Agent (extract prototype design)
- 🤖 Product Owner Agent (validate behavior)

---

### Story 3.2: Metrics Dashboard with Charts

**Goal:** Build metrics dashboard with Chart.js visualizations

**Priority:** MEDIUM
**Estimate:** 4-5 hours

**Acceptance Criteria:**
- [ ] 6 charts match prototype exactly
- [ ] Card-based layout
- [ ] Responsive design
- [ ] Hover interactions

---

### Story 3.3: Annotation Modal (CRUD UI)

**Goal:** Implement annotation modal with full CRUD

**Priority:** MEDIUM
**Estimate:** 3 hours

**Acceptance Criteria:**
- [ ] Modal matches prototype design
- [ ] Create, edit, delete annotations
- [ ] Form validation
- [ ] Keyboard shortcuts (Ctrl+N)

---

### Story 3.4: Insights & Analysis View

**Goal:** Display correlation analysis and recommendations

**Priority:** LOW
**Estimate:** 2 hours

---

## Phase 4: Polish & Optimization

### Story 4.1: Error Handling & Loading States

**Goal:** Comprehensive error handling and loading UX

---

### Story 4.2: Export Functionality (JSON/CSV)

**Goal:** Export metrics and annotations

---

### Story 4.3: Performance Optimization

**Goal:** Optimize API calls, caching, rendering

---

## Backlog Notes

- Stories are ordered by dependency and priority
- Estimate times include TDD cycle (tests first)
- All stories require agent usage (see each story)
- Coverage target: ≥85% for all modules
- Product Owner Agent validates all features against prototype

---

**Current Phase:** Phase 0 - Foundation
**Next:** Story 0.1 - Project Foundation
