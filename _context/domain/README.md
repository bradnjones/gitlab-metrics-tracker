# Domain Documentation

**Updated:** 2025-01-06

This directory contains domain-specific knowledge for the GitLab Sprint Metrics Tracker.

---

## Documents

### 1. metrics-formulas.md
**Purpose:** Detailed formulas and calculations for all sprint metrics.

**Contents:**
- Velocity (story points/sprint)
- Throughput (issues closed/sprint)
- Cycle Time (issue start → close)
- Deployment Frequency (deployments/day)
- Lead Time (commit → production)
- MTTR (incident resolution time)
- Change Failure Rate (reverts/deployments)

**Use when:** Implementing metrics calculation logic.

---

### 2. annotation-system.md
**Purpose:** Event annotation and correlation analysis patterns.

**Contents:**
- Event types (Process, Team, Tooling, External, Incident)
- Impact classification (Positive, Negative, Neutral)
- Before/after analysis
- Pattern detection algorithms
- Recommendation generation

**Use when:** Building annotation features or analysis algorithms.

---

### 3. gitlab-api-patterns.md
**Purpose:** High-level GitLab GraphQL API patterns and optimizations.

**Contents:**
- Why GraphQL over REST
- Group-level vs. per-project queries
- Performance benchmarks (20-30x improvements)
- Pagination strategies
- Rate limiting patterns
- Caching strategies
- Error handling
- Common pitfalls and solutions

**Use when:** 
- Understanding high-level API strategy
- Learning why certain patterns were chosen
- Reviewing performance optimizations

**Lines:** 1,167

---

### 4. gitlab-query-reference.md
**Purpose:** Complete catalog of all 11 GitLab GraphQL query methods.

**Contents:**
- Detailed implementation for each method
- Critical query parameters explained
- Deployment proxy pattern (MRs as deployment proxy)
- Batch processing pattern (10 parallel)
- Rate limiting strategy (50ms, 100ms, 500ms)
- Cache implementation (10-minute TTL)
- Error handling patterns
- Test mocking strategies
- Best practices (DO/DON'T)

**Use when:**
- Implementing GitLabClient for Story 0.2
- Writing tests for API client
- Debugging query issues
- Understanding specific query methods

**Lines:** ~1,100

---

## Quick Reference: Which Document?

| Task | Document |
|------|----------|
| Implement velocity calculation | `metrics-formulas.md` |
| Implement cycle time calculation | `metrics-formulas.md` |
| Build annotation UI | `annotation-system.md` |
| Understand API strategy | `gitlab-api-patterns.md` |
| Implement `fetchIterations()` | `gitlab-query-reference.md` |
| Implement `fetchMergeRequestsForGroup()` | `gitlab-query-reference.md` |
| Mock GraphQL client for tests | `gitlab-query-reference.md` |
| Debug pagination issues | Both `gitlab-api-patterns.md` + `gitlab-query-reference.md` |
| Optimize slow queries | `gitlab-api-patterns.md` |
| Understand deployment proxy | `gitlab-query-reference.md` (lines 649-685) |
| Review all 11 query methods | `gitlab-query-reference.md` |

---

## Story 0.2: GitLab Client Integration

**Primary Documents:**
1. `gitlab-query-reference.md` - Complete method catalog
2. `gitlab-api-patterns.md` - Performance and pagination strategies

**Implementation Steps:**
1. Read query catalog (all 11 methods)
2. Review pagination pattern (cursor-based)
3. Review rate limiting strategy (delays, batching)
4. Review error handling patterns
5. Review test mocking strategies
6. Implement GitLabClient interface (Clean Architecture)
7. Write tests FIRST (TDD)
8. Implement methods (proven patterns)
9. Validate with real GitLab instance (curl tests)

---

## Prototype Reference

**Location:** `/Users/brad/dev/smi/gitlab-sprint-metrics/src/lib/gitlab-client.js` (799 lines)

**All patterns documented in:**
- `gitlab-api-patterns.md` (high-level)
- `gitlab-query-reference.md` (method-level)

**Do NOT guess at query structures.** Always reference documented patterns.

---

## GitLab API Resources

**Official Documentation:**
- GraphQL API: https://docs.gitlab.com/ee/api/graphql/
- GraphQL Explorer: https://docs.gitlab.com/ee/api/graphql/getting_started.html
- Reference (Schema): https://docs.gitlab.com/ee/api/graphql/reference/
- Pagination: https://docs.gitlab.com/ee/api/graphql/index.html#pagination
- Rate Limits: https://docs.gitlab.com/ee/user/admin_area/settings/rate_limits.html

**Library:**
- graphql-request: https://github.com/prisma-labs/graphql-request

---

## Testing Approach

**Mock GitLab API:**
```javascript
import { GraphQLClient } from 'graphql-request';

jest.mock('graphql-request');

let mockGraphQLClient;

beforeEach(() => {
  mockGraphQLClient = {
    request: jest.fn()
  };
  GraphQLClient.mockImplementation(() => mockGraphQLClient);
});
```

**See:** `gitlab-query-reference.md` section "Test Mocking Strategies"

---

## Performance Benchmarks

**With Optimizations:** ~30 seconds initial load (270 projects, 50 sprints)  
**Without Optimizations:** ~18 minutes (36x slower)

**Key Optimizations:**
1. Group-level queries (20-30x faster)
2. API-level date filtering (5-10x faster)
3. Parallel batching (20x faster)
4. Deployment proxy pattern (100x faster)
5. Project caching (instant after first load)

**See:** `gitlab-api-patterns.md` lines 1041-1066

---

## Common Patterns

### Pagination (All Queries)
```javascript
let allResults = [];
let hasNextPage = true;
let after = null;

while (hasNextPage) {
  const data = await client.request(query, { after, first: 100 });
  const { nodes, pageInfo } = data.group.someField;
  allResults = allResults.concat(nodes);
  hasNextPage = pageInfo.hasNextPage;
  after = pageInfo.endCursor;
  
  if (hasNextPage) await delay(100);
}
```

### Batch Processing (Per-Project Queries)
```javascript
const batchSize = 10;
for (let i = 0; i < projects.length; i += batchSize) {
  const batch = projects.slice(i, i + batchSize);
  const batchPromises = batch.map(p => fetchData(p));
  const results = await Promise.all(batchPromises);
  allResults.push(...results.flat());
  
  if (i + batchSize < projects.length) {
    await delay(500);
  }
}
```

### Date Filtering (API-Level)
```javascript
const mergedAfter = new Date(startDate).toISOString();
const mergedBefore = new Date(endDate).toISOString();

mergeRequests(
  mergedAfter: $mergedAfter,
  mergedBefore: $mergedBefore
)
```

---

## Critical Parameters

**ALWAYS include:**
- `includeSubgroups: true` - For group-level issue/project queries
- `first: 100` - Page size (GitLab max)
- `after: cursor` - Pagination cursor
- Date filters (`mergedAfter`, `createdAfter`, `updatedAfter`) - API-level filtering

**NEVER:**
- Query per-project when group-level is available
- Skip pagination (assumes <100 results)
- Ignore rate limits (spam API)
- Filter dates client-side (use API parameters)

---

## Questions?

**API Strategy:** → `gitlab-api-patterns.md`  
**Specific Query Method:** → `gitlab-query-reference.md`  
**Metric Calculations:** → `metrics-formulas.md`  
**Annotation Features:** → `annotation-system.md`

**Remember:** These patterns are battle-tested with 270+ projects in production. Use them with confidence. 🚀
