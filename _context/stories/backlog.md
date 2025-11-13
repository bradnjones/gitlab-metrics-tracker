# Story Backlog - Vertical Slices

**Approach:** Vertical slices delivering complete user value (GitLab → Core → API → UI)
**Last Updated:** 2025-11-07
**Previous Approach:** Horizontal architectural layers (archived in `archived-horizontal-backlog.md`)

---

## 🎯 NEXT STORY TO START

**Story V8: Remove Legacy Caching Implementation**

See below for full details.

**PRIORITY SHIFT:** Performance optimization takes priority over V4-V7 feature development. Must complete V8 → V9.1 → V9.2 → V9.3 before resuming DORA metrics work.

**✅ MVP COMPLETE! (V1 + V2 + V3)**

**Completed Stories:**
- ✅ V1: Velocity Tracking (Issue #11, merged)
- ✅ V1.1: IterationSelector UX/UI Improvements (Issue #14, merged)
- ✅ V2: Cycle Time Metrics (merged)
- ✅ V3: Metrics Dashboard - Polish MVP (merged)
- ✅ Removed redundant ThroughputCalculator (PR #31, merged)
- ✅ Performance Optimization (Issue #51, PRs #52, #53 merged)

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

## 🚀 Performance Optimization Stories (PRIORITY)

### Story V8: Remove Legacy Caching Implementation

**User Story:** As a developer, I want to remove the old in-memory caching system so that it doesn't conflict with the new persistent file-based cache.

**Priority:** HIGHEST (Prerequisite for V9.x)
**Complexity:** SMALL (Cleanup/Refactoring)
**Estimate:** 1-2 hours
**Prerequisites:** None

#### Context

The current codebase has a legacy in-memory caching system in GitLabClient:
- **Projects cache**: 10-minute TTL (`_projectsCache`, `_projectsCacheTime`)
- **Response cache**: 5-minute TTL (`_responseCache` Map)

This caching provides minimal performance benefit (~5 minutes on repeat queries) but adds complexity. The new persistent file-based cache (Story V9) will be more effective and provide much longer cache duration.

**Problem:** Two caching layers will cause confusion:
- Which cache is being used?
- How do they interact?
- How to invalidate both?
- Different TTLs (5 min vs hours)

**Solution:** Remove the old caching before implementing the new one.

#### Acceptance Criteria

1. **Remove Response Cache**:
   - [ ] Remove `_responseCache` Map property (GitLabClient.js:46)
   - [ ] Remove `_responseCacheTTL` property (GitLabClient.js:47)
   - [ ] Remove `_cachedRequest()` method (GitLabClient.js:59-85)
   - [ ] Update all methods to call `this.client.request()` directly instead of `this._cachedRequest()`

2. **Remove Projects Cache**:
   - [ ] Remove `_projectsCache` property (GitLabClient.js:40)
   - [ ] Remove `_projectsCacheTime` property (GitLabClient.js:41)
   - [ ] Remove `_cacheTimeout` property (GitLabClient.js:42)
   - [ ] Remove cache check logic from `fetchProject()` method
   - [ ] Update `fetchProject()` to always fetch fresh data

3. **Update Tests**:
   - [ ] Remove cache-related test cases from GitLabClient.test.js
   - [ ] Update integration tests if they rely on caching behavior
   - [ ] Ensure all 212+ tests still pass
   - [ ] Coverage remains ≥85%

4. **Verify No Performance Regression**:
   - [ ] Test dashboard load times before and after (should be similar)
   - [ ] The 5-minute cache wasn't solving the real problem (notes fetching)
   - [ ] New persistent cache (V9) will provide real improvement

#### Files to Modify

**Primary:**
- `src/lib/infrastructure/api/GitLabClient.js` (remove cache properties and methods)

**Tests:**
- `test/infrastructure/api/GitLabClient.test.js` (remove cache tests)
- `test/integration/GitLabClient.integration.test.js` (update if needed)

**Documentation:**
- Update any comments that reference caching

#### Implementation Steps

1. **Read the current implementation**:
   - [ ] Review GitLabClient.js lines 39-85 (cache implementation)
   - [ ] Identify all methods using `_cachedRequest()`

2. **Remove cache infrastructure**:
   - [ ] Delete `_responseCache`, `_responseCacheTTL`, `_cachedRequest()`
   - [ ] Delete `_projectsCache`, `_projectsCacheTime`, `_cacheTimeout`

3. **Update methods**:
   - [ ] Change `await this._cachedRequest(query, variables)` to `await this.client.request(query, variables)`
   - [ ] Remove cache check from `fetchProject()`

4. **Update tests** (TDD):
   - [ ] Remove cache-specific tests
   - [ ] Update tests that expect cached behavior
   - [ ] Run full test suite

5. **Manual verification**:
   - [ ] Start dev server
   - [ ] Load dashboard with 3 iterations
   - [ ] Verify data loads correctly (no caching errors)
   - [ ] Check performance is similar to before

#### Validation Checklist

- [ ] All cache-related code removed from GitLabClient.js
- [ ] All methods call `this.client.request()` directly
- [ ] All tests pass (≥212 tests)
- [ ] Coverage ≥85%
- [ ] Dashboard loads and displays metrics correctly
- [ ] No console errors
- [ ] Clean git diff (only cache-related changes)

#### Agents to Use

- 🤖 Test Coverage Agent - Validate test updates and coverage
- 🤖 Code Review Agent - Ensure clean removal with no orphaned code
- 🤖 Clean Architecture Agent - Verify no architectural issues

#### Definition of Done

- [ ] All cache code removed
- [ ] All tests passing
- [ ] Coverage ≥85%
- [ ] Code review passed
- [ ] Manual testing completed
- [ ] Committed and pushed

**Note:** This is pure refactoring/cleanup. No new functionality added.

---

### Story V9.1: Persistent File Cache - Core Implementation

**User Story:** As a user, I want the app to cache GitLab iteration data to disk so that subsequent dashboard loads are near-instant instead of taking 10+ seconds.

**Priority:** HIGHEST (Critical Performance Improvement)
**Complexity:** MEDIUM
**Estimate:** 4-6 hours
**Prerequisites:** V8 complete (legacy cache removed)

#### Context

**Current Problem:** Loading 6 iterations takes 10+ seconds due to GitLab GraphQL API slowness (especially fetching notes).

**Solution:** Implement persistent file-based cache:
- Cache iteration data to `src/data/cache/iterations/*.json`
- Serve cached data instantly (< 100ms)
- 99% performance improvement for warm cache

**Performance Impact:**
- First load (cold cache): 10s (same as current)
- Repeat load (warm cache): < 100ms (100x faster)
- Average improvement: 95% faster

#### Acceptance Criteria

1. **Cache Storage**:
   - [ ] Create cache directory: `src/data/cache/iterations/`
   - [ ] Each iteration cached as separate file: `{iterationId}.json`
   - [ ] Cache includes metadata: `lastFetched`, `version`, `hash`

2. **Cache Read/Write**:
   - [ ] Implement `IterationCacheRepository` class
   - [ ] Methods: `get(iterationId)`, `set(iterationId, data)`, `has(iterationId)`, `clear(iterationId)`
   - [ ] Follows repository pattern (like FileMetricsRepository)

3. **GitLabIterationDataProvider Integration**:
   - [ ] Check cache before calling GitLab API
   - [ ] If cache hit, return cached data instantly
   - [ ] If cache miss, fetch from GitLab and cache result
   - [ ] Log cache hits/misses for debugging

4. **Basic Cache Validation**:
   - [ ] Verify cached data structure matches expected schema
   - [ ] Handle corrupted cache gracefully (fallback to fresh fetch)
   - [ ] Log warnings for invalid cache data

5. **Testing**:
   - [ ] Unit tests for IterationCacheRepository (8-10 tests)
   - [ ] Integration tests for cache flow (5-7 tests)
   - [ ] All tests pass, coverage ≥85%

6. **Manual Validation**:
   - [ ] First load: Dashboard takes ~10s (cold cache)
   - [ ] Check `src/data/cache/iterations/` has JSON files
   - [ ] Second load: Dashboard loads in < 1s (warm cache)
   - [ ] Verify metrics are correct (match first load)

#### Technical Scope

**Infrastructure Layer:**
- New file: `src/lib/infrastructure/repositories/IterationCacheRepository.js`
  - Implements file read/write operations
  - JSON serialization/deserialization
  - Cache metadata management
  - Error handling for corrupted cache

**Adapter Layer:**
- Update: `src/lib/infrastructure/adapters/GitLabIterationDataProvider.js`
  - Inject IterationCacheRepository dependency
  - Check cache before GitLab fetch
  - Store fetched data in cache
  - Add cache hit/miss logging

**Core Layer:**
- New interface: `src/lib/core/interfaces/IIterationCacheRepository.js` (optional, follows Clean Architecture)
  - Defines cache repository contract
  - Core layer depends on interface, not implementation

**File Structure:**
```
src/data/cache/iterations/
├── gid-gitlab-Iteration-2700495.json
├── gid-gitlab-Iteration-2700496.json
└── gid-gitlab-Iteration-2700497.json
```

**Cache File Format:**
```json
{
  "version": "1.0",
  "iterationId": "gid://gitlab/Iteration/2700495",
  "lastFetched": "2025-11-13T10:30:00.000Z",
  "hash": "abc123...",
  "data": {
    "issues": [...],
    "mergeRequests": [...],
    "pipelines": [...],
    "incidents": [...],
    "iteration": {...}
  }
}
```

#### Implementation Steps (TDD)

**Phase 1: IterationCacheRepository (Core)**
1. [ ] Write tests for cache repository (RED)
2. [ ] Implement IterationCacheRepository (GREEN)
3. [ ] Refactor and optimize (REFACTOR)

**Phase 2: GitLabIterationDataProvider Integration**
4. [ ] Write tests for cache integration (RED)
5. [ ] Add cache check to fetchIterationData() (GREEN)
6. [ ] Add cache storage after GitLab fetch (GREEN)
7. [ ] Refactor and add logging (REFACTOR)

**Phase 3: Validation & Testing**
8. [ ] Run all tests (≥85% coverage)
9. [ ] Manual performance testing
10. [ ] Verify cache files created correctly

#### Validation Checklist

**First Load (Cold Cache):**
- [ ] Dashboard loads in ~10s
- [ ] Console shows "Cache miss for iteration X" (6 times)
- [ ] Console shows "Cached iteration X" (6 times)
- [ ] Check `src/data/cache/iterations/` directory exists
- [ ] Verify 6 JSON files created (one per iteration)
- [ ] Open a cache file, verify structure matches schema

**Second Load (Warm Cache):**
- [ ] Dashboard loads in < 1s (100x faster!)
- [ ] Console shows "Cache hit for iteration X" (6 times)
- [ ] Metrics display correctly (same as first load)
- [ ] Charts render properly
- [ ] No errors in console

**Cache File Validation:**
- [ ] Each file has valid JSON structure
- [ ] `lastFetched` timestamp is recent
- [ ] `data` object contains all expected fields
- [ ] File size is reasonable (not empty, not gigabytes)

#### Agents to Use

- 🤖 Clean Architecture Agent - Validate repository pattern and layer separation
- 🤖 Test Coverage Agent - Plan TDD strategy and validate coverage
- 🤖 Code Review Agent - Review cache implementation for correctness and security
- 🤖 Performance Engineer Agent - Validate performance improvements (optional)

#### Key Decisions

**Cache Storage Location:**
- `src/data/cache/iterations/` (alongside existing data files)
- Reasoning: Consistent with current file storage pattern
- Alternative considered: SQLite (deferred for Phase 3)

**Cache Key Format:**
- `gid-gitlab-Iteration-2700495.json` (replace `://` with `-`)
- Reasoning: Valid filename, easy to read, no URL encoding needed

**Cache Invalidation:**
- None in V9.1 (cache lives forever)
- User must manually delete files to refresh
- TTL and smart invalidation added in V9.2 and V9.3

**Error Handling:**
- Corrupted cache → log warning, fetch fresh, overwrite cache
- Missing cache directory → create automatically
- Disk full → log error, continue without caching

#### Performance Expectations

**Based on Performance Engineer Analysis:**
- First load (cold): ~10 seconds (no change)
- Subsequent loads (warm): < 100ms (99% faster)
- Average (70% cache hit rate): ~500ms (95% faster)

#### Definition of Done

- [ ] IterationCacheRepository implemented and tested
- [ ] GitLabIterationDataProvider uses cache
- [ ] All tests pass (≥85% coverage)
- [ ] Manual testing shows 100x speedup on warm cache
- [ ] Cache files created correctly
- [ ] Code reviewed and approved
- [ ] Committed and pushed

---

### Story V9.2: Intelligent Cache Invalidation

**User Story:** As a user, I want the cache to automatically detect when iteration data is stale and refresh it, so I always see up-to-date metrics without manual cache clearing.

**Priority:** HIGH (Makes cache practical)
**Complexity:** MEDIUM
**Estimate:** 3-4 hours
**Prerequisites:** V9.1 complete (basic cache implemented)

#### Context

**Problem:** V9.1 caches data forever. If new issues are added to an iteration, the cache becomes stale and metrics are incorrect.

**Solution:** Implement smart cache invalidation:
1. **TTL-based**: Cache expires after configurable time (e.g., 6 hours)
2. **Incremental updates**: Detect new/updated issues since last fetch
3. **Manual refresh**: UI button to force cache clear

#### Acceptance Criteria

1. **TTL-Based Invalidation**:
   - [ ] Add `cacheTTL` config (default: 6 hours)
   - [ ] Check `lastFetched` timestamp on cache read
   - [ ] If age > TTL, treat as cache miss and refetch
   - [ ] Overwrite stale cache with fresh data

2. **Incremental Fetch Detection**:
   - [ ] Add `issueCount`, `mrCount` to cache metadata
   - [ ] On cache hit, quickly check GitLab for current counts
   - [ ] If counts changed, invalidate cache and do full refetch
   - [ ] Log: "Cache invalidated: 5 new issues detected"

3. **Manual Cache Clear**:
   - [ ] Add API endpoint: `DELETE /api/cache/iterations/:id`
   - [ ] Add API endpoint: `DELETE /api/cache/clear` (clear all)
   - [ ] Implement cache clear in IterationCacheRepository

4. **Testing**:
   - [ ] Unit tests for TTL logic (6-8 tests)
   - [ ] Unit tests for incremental detection (4-5 tests)
   - [ ] Integration tests for cache invalidation flow (5-6 tests)
   - [ ] All tests pass, coverage ≥85%

5. **Manual Validation**:
   - [ ] Load dashboard (warm cache, < 1s)
   - [ ] Wait 7 hours (or change TTL to 1 minute for testing)
   - [ ] Load dashboard again (cache expired, ~10s)
   - [ ] Cache refreshed with new TTL timestamp
   - [ ] Call DELETE /api/cache/clear
   - [ ] Verify cache directory is empty
   - [ ] Load dashboard (cache miss, ~10s)

#### Technical Scope

**Infrastructure Layer:**
- Update: `src/lib/infrastructure/repositories/IterationCacheRepository.js`
  - Add `isCacheValid(iterationId, ttl)` method
  - Add `delete(iterationId)` method
  - Add `deleteAll()` method

- Update: `src/lib/infrastructure/adapters/GitLabIterationDataProvider.js`
  - Check cache TTL before returning cached data
  - Optional: Quick count check for incremental detection

**Presentation Layer (API):**
- New endpoint: `DELETE /api/cache/iterations/:id` (clear single iteration)
- New endpoint: `DELETE /api/cache/clear` (clear all cache)
- Add cache admin routes

**Configuration:**
- Add `CACHE_TTL_HOURS` to .env (default: 6)
- Document in .env.example

#### Implementation Steps (TDD)

**Phase 1: TTL-Based Invalidation**
1. [ ] Write tests for TTL check logic (RED)
2. [ ] Implement `isCacheValid()` method (GREEN)
3. [ ] Update cache read logic to check TTL (GREEN)
4. [ ] Refactor and optimize (REFACTOR)

**Phase 2: Manual Cache Clear API**
5. [ ] Write tests for delete methods (RED)
6. [ ] Implement `delete()` and `deleteAll()` (GREEN)
7. [ ] Add API endpoints for cache clearing (GREEN)
8. [ ] Test endpoints with curl/Postman (MANUAL)

**Phase 3: Incremental Detection (Optional)**
9. [ ] Write tests for count-based detection (RED)
10. [ ] Implement quick count check (GREEN)
11. [ ] Add cache invalidation on count mismatch (GREEN)

**Phase 4: Validation**
12. [ ] Run all tests (≥85% coverage)
13. [ ] Manual testing with TTL expiration
14. [ ] Test cache clear API endpoints

#### Cache Invalidation Strategy

**Option 1: TTL Only (Recommended for V9.2)**
- Simple, predictable
- Cache expires after 6 hours
- User can adjust TTL via .env
- Trade-off: Data can be up to 6 hours stale

**Option 2: TTL + Incremental Detection**
- More complex, but more accurate
- Quick check: "How many issues in this iteration?"
- If count changed, invalidate and refetch
- Trade-off: Extra API call per cache hit

**Option 3: Manual Only**
- User clicks "Refresh" button
- No automatic invalidation
- Trade-off: User must remember to refresh

**Recommendation:** Start with Option 1 (TTL only), add Option 2 if users request it.

#### Validation Checklist

**TTL Expiration Test:**
- [ ] Set `CACHE_TTL_HOURS=0.001` (3.6 seconds) in .env
- [ ] Load dashboard (cold cache, ~10s)
- [ ] Wait 5 seconds
- [ ] Load dashboard again (cache expired, ~10s)
- [ ] Check logs show "Cache expired for iteration X"
- [ ] Verify cache files updated with new timestamps

**Manual Clear Test:**
- [ ] Load dashboard (warm cache, < 1s)
- [ ] Call `curl -X DELETE http://localhost:5173/api/cache/clear`
- [ ] Check `src/data/cache/iterations/` is empty
- [ ] Load dashboard (cache miss, ~10s)
- [ ] Cache repopulated

**Incremental Detection Test (if implemented):**
- [ ] Load dashboard (warm cache, < 1s)
- [ ] Manually add an issue to an iteration in GitLab
- [ ] Load dashboard again
- [ ] Check logs show "Cache invalidated: 1 new issue detected"
- [ ] Dashboard refetches and displays new issue

#### Agents to Use

- 🤖 Test Coverage Agent - Validate test strategy for invalidation logic
- 🤖 Code Review Agent - Review cache invalidation correctness
- 🤖 Clean Architecture Agent - Ensure repository pattern maintained

#### Definition of Done

- [ ] TTL-based invalidation implemented and tested
- [ ] Manual cache clear API endpoints working
- [ ] All tests pass (≥85% coverage)
- [ ] Manual testing shows cache expiration works
- [ ] Cache clear API tested with curl
- [ ] Configuration documented in .env.example
- [ ] Code reviewed and approved
- [ ] Committed and pushed

---

### Story V9.3: Cache Management UI

**User Story:** As a user, I want a UI to see cache status and manually refresh cached data, so I can control when I see the latest GitLab data.

**Priority:** MEDIUM (Quality of Life)
**Complexity:** SMALL (UI Enhancement)
**Estimate:** 2-3 hours
**Prerequisites:** V9.2 complete (cache invalidation API exists)

#### Context

**Problem:** Users can't see if they're viewing cached data or know when cache expires.

**Solution:** Add cache management UI to dashboard:
- Cache status indicator (Fresh/Stale/Expired)
- "Refresh Data" button to force cache clear
- Last updated timestamp display
- Optional: Cache size and statistics

#### Acceptance Criteria

1. **Cache Status Display**:
   - [ ] Show "Using cached data (updated 2 hours ago)" message
   - [ ] Color-coded: Green (fresh < 1hr), Yellow (stale 1-6hr), Red (expired > 6hr)
   - [ ] Display for each metric or globally

2. **Refresh Button**:
   - [ ] "Refresh Data" button in header or toolbar
   - [ ] On click: Clear cache, reload metrics
   - [ ] Show loading spinner during refresh
   - [ ] Toast notification: "Data refreshed successfully"

3. **Last Updated Timestamp**:
   - [ ] Display last fetch time per iteration
   - [ ] Format: "Updated 2 hours ago" (human-readable)
   - [ ] Tooltip shows exact timestamp

4. **Optional: Cache Statistics**:
   - [ ] Show cache size (MB)
   - [ ] Show number of cached iterations
   - [ ] "Clear All Cache" button (with confirmation)

5. **Testing**:
   - [ ] Component tests for CacheStatus (3-4 tests)
   - [ ] Component tests for RefreshButton (3-4 tests)
   - [ ] Integration test for refresh flow (2-3 tests)
   - [ ] All tests pass, coverage ≥85%

6. **Manual Validation**:
   - [ ] Load dashboard, see cache status indicator
   - [ ] Verify "Updated X hours ago" is accurate
   - [ ] Click "Refresh Data" button
   - [ ] See loading spinner, then fresh data
   - [ ] Toast notification appears

#### Technical Scope

**Presentation Layer (UI):**
- New component: `CacheStatus.jsx` (status indicator)
- New component: `RefreshButton.jsx` (manual refresh)
- Update: `Dashboard.jsx` (integrate cache UI)
- Styled components for cache UI elements

**API Integration:**
- Call `DELETE /api/cache/clear` on refresh button click
- Fetch cache metadata: `GET /api/cache/status` (new endpoint)

**API Endpoint (New):**
- `GET /api/cache/status` - Returns cache metadata for all iterations
  ```json
  {
    "iterations": [
      {
        "id": "gid://gitlab/Iteration/2700495",
        "lastFetched": "2025-11-13T10:30:00.000Z",
        "age": 7200000,
        "status": "stale",
        "size": 125000
      }
    ],
    "totalSize": 750000,
    "totalIterations": 6
  }
  ```

#### Implementation Steps (TDD)

**Phase 1: Cache Status API**
1. [ ] Write tests for GET /api/cache/status (RED)
2. [ ] Implement cache status endpoint (GREEN)
3. [ ] Test with curl (MANUAL)

**Phase 2: CacheStatus Component**
4. [ ] Write tests for CacheStatus component (RED)
5. [ ] Implement CacheStatus with color coding (GREEN)
6. [ ] Style component to match dashboard (REFACTOR)

**Phase 3: RefreshButton Component**
7. [ ] Write tests for RefreshButton component (RED)
8. [ ] Implement refresh button with API call (GREEN)
9. [ ] Add loading state and toast notification (GREEN)

**Phase 4: Dashboard Integration**
10. [ ] Integrate cache UI into Dashboard layout
11. [ ] Test full refresh flow end-to-end
12. [ ] Polish styling and UX

#### UI Design Reference

**Cache Status Indicator (Top of Dashboard):**
```
┌─────────────────────────────────────────┐
│ ℹ️ Using cached data (updated 2h ago)   │
│                         [Refresh Data] │
└─────────────────────────────────────────┘
```

**Color Coding:**
- **Green** (< 1 hour): "Fresh data (updated 30m ago)"
- **Yellow** (1-6 hours): "Using cache (updated 3h ago)"
- **Red** (> 6 hours): "Stale cache (updated 8h ago)"

**Refresh Button Behavior:**
1. User clicks "Refresh Data"
2. Button shows spinner: "Refreshing..."
3. API call: `DELETE /api/cache/clear`
4. Metrics refetch from GitLab (~10s)
5. Dashboard updates with fresh data
6. Toast: "✅ Data refreshed successfully"
7. Cache status updates: "Fresh data (updated just now)"

#### Validation Checklist

**Cache Status Display:**
- [ ] Load dashboard with warm cache
- [ ] See cache status indicator with correct age
- [ ] Color matches freshness (green/yellow/red)
- [ ] Hover over timestamp, see tooltip with exact time

**Refresh Button:**
- [ ] Click "Refresh Data" button
- [ ] See loading spinner
- [ ] Dashboard refetches all metrics
- [ ] Toast notification appears
- [ ] Cache status updates to "just now"
- [ ] Metrics remain accurate (no data loss)

**Cache Statistics (if implemented):**
- [ ] Open cache statistics panel
- [ ] See total cache size (MB)
- [ ] See number of cached iterations
- [ ] Click "Clear All Cache", see confirmation dialog
- [ ] Confirm, cache cleared, stats update

#### Agents to Use

- 🤖 UX/UI Design Agent - Design cache status UI matching dashboard style
- 🤖 Test Coverage Agent - Validate component test strategy
- 🤖 Code Review Agent - Review UI implementation

#### Definition of Done

- [ ] Cache status indicator implemented
- [ ] Refresh button working (clears cache, reloads data)
- [ ] Last updated timestamps display correctly
- [ ] Color coding matches freshness
- [ ] All tests pass (≥85% coverage)
- [ ] Manual testing completed
- [ ] Toast notifications working
- [ ] Code reviewed and approved
- [ ] Committed and pushed

---

## 🚀 Post-MVP Stories (Deferred Until After Performance Optimization)

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
V1 (Velocity) ✅
├─ V2 (Throughput + Cycle Time) ✅
│  └─ V3 (Dashboard Polish) ✅ ──> MVP COMPLETE
│     │
│     ├─ V8 (Remove Legacy Cache) ← CURRENT PRIORITY
│     │  └─ V9.1 (Persistent File Cache)
│     │     └─ V9.2 (Smart Invalidation)
│     │        └─ V9.3 (Cache Management UI) ──> PERFORMANCE OPTIMIZED
│     │
│     ├─ V4 (Deployment Metrics) ← DEFERRED
│     ├─ V5 (Incident Metrics) ← DEFERRED
│     └─ V6 (Annotations) ← DEFERRED
│        └─ V7 (Insights) ← DEFERRED
```

**Current Execution Order (MUST follow this sequence):**
1. V8: Remove Legacy Cache (prerequisite for V9)
2. V9.1: Core cache implementation (100x faster warm cache)
3. V9.2: Smart invalidation (TTL + manual refresh)
4. V9.3: Cache UI (user-friendly cache management)
5. THEN resume V4-V7 feature development

**Parallel Execution (Post-V9.3):**
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

**Current Phase:** Performance Optimization
**Next Story:** V8 - Remove Legacy Caching Implementation
**MVP Status:** ✅ COMPLETE (V1 + V2 + V3)
**Performance Target:** 95% faster average load time (after V8-V9.3)

---

## 📊 Performance Investigation Results

**Investigation Date:** 2025-11-13
**Location:** `_performance-investigation/` directory
**Problem:** Dashboard takes 10+ seconds to load 6 iterations
**Root Cause:** GitLab GraphQL API notes fetching (88% of query time)
**Solution:** Persistent file-based caching (Stories V8-V9.3)

**Key Documents:**
- **Start here:** `_performance-investigation/README.md` - Investigation overview
- **Executive summary:** `_performance-investigation/docs/PERFORMANCE-SOLUTION-SUMMARY.md`
- **Story reference:** `_performance-investigation/docs/CACHING-STORIES-SUMMARY.md`
- **Full analysis:** `_performance-investigation/docs/PERFORMANCE-ANALYSIS-REPORT.md`
- **Architecture:** `_performance-investigation/docs/ARCHITECTURAL-CACHING-INVESTIGATION.md`
- **Roadmap:** `_performance-investigation/docs/CACHING-IMPLEMENTATION-ROADMAP.md`

**Performance Testing:**
- `_performance-investigation/scripts/performance-test.js` - Current baseline testing
- `_performance-investigation/scripts/cache-poc-test.js` - Cache proof-of-concept
- `_performance-investigation/scripts/rest-api-investigation.sh` - REST API comparison

**Expected Results:**
- First load (cold cache): ~10s (same as current)
- Repeat load (warm cache): < 100ms (99% faster)
- Average improvement: 95% faster (< 500ms)
