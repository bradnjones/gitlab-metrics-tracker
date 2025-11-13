# Persistent Caching Implementation Roadmap

**Goal:** Reduce dashboard load time from 10 seconds to < 1 second average
**Approach:** File-based persistent cache with incremental updates
**Estimated Effort:** 2-3 days (17 hours)

---

## Overview

This roadmap breaks down the caching implementation into 3 phases, each deliverable independently:

- **Phase 1:** Basic caching (1 day) - 100x improvement for warm cache
- **Phase 2:** Incremental updates (1 day) - 10x improvement for stale cache
- **Phase 3:** Cache management (1 day) - Production-ready monitoring

---

## Phase 1: Basic Caching (Day 1)

**Goal:** Cache hit = instant response, cache miss = fetch from GitLab

**Deliverables:**
1. CacheManager class (file-based cache)
2. CachedIterationDataProvider adapter
3. ServiceFactory integration
4. Basic tests

### Step 1.1: Create CacheManager (3 hours)

**File:** `src/lib/infrastructure/cache/CacheManager.js`

**Features:**
- Initialize cache directory (`src/data/cache/`)
- Save iteration data to JSON files
- Load cached data with TTL check (6 hours)
- Cache metadata tracking (timestamps, sizes)
- Clear cache operations

**API:**
```javascript
const cache = new CacheManager('./src/data/cache');
await cache.initialize();

// Save
await cache.setCachedIteration(iterationId, data);

// Load
const data = await cache.getCachedIteration(iterationId);
// Returns null if not cached or stale

// Invalidate
await cache.invalidateIteration(iterationId);
await cache.clearAll();
```

**Tests:** `src/lib/infrastructure/cache/CacheManager.test.js`
- Save and load iteration
- TTL expiry (stale cache returns null)
- Cache metadata updates
- Directory initialization
- Cache stats

**Acceptance Criteria:**
- [ ] Cache saves iteration data to JSON file
- [ ] Cache loads data within TTL (< 6 hours)
- [ ] Cache returns null for stale data
- [ ] Cache directory created automatically
- [ ] All tests pass (≥85% coverage)

---

### Step 1.2: Create CachedIterationDataProvider (3 hours)

**File:** `src/lib/infrastructure/adapters/CachedIterationDataProvider.js`

**Features:**
- Implements IIterationDataProvider interface
- Check cache before calling GitLab API
- Parallel cache checks for multiple iterations
- Separate cache hits and misses
- Fetch only cache misses from GitLab

**API:**
```javascript
const provider = new CachedIterationDataProvider(gitlabClient, cacheManager);

// Single iteration
const data = await provider.fetchIterationData(iterationId);

// Multiple iterations (optimized)
const allData = await provider.fetchMultipleIterations([id1, id2, id3]);
```

**Logic Flow:**
```
fetchMultipleIterations([id1, id2, id3])
  └─> Check cache for each ID in parallel
      ├─> id1: CACHE HIT (return cached)
      ├─> id2: CACHE MISS (fetch from GitLab)
      └─> id3: CACHE HIT (return cached)
  └─> Fetch misses from GitLab in parallel
  └─> Save fresh data to cache
  └─> Return combined results in original order
```

**Tests:** `src/lib/infrastructure/adapters/CachedIterationDataProvider.test.js`
- Cache hit returns cached data instantly
- Cache miss fetches from GitLab
- Multiple iterations with mixed hits/misses
- Fresh data saved to cache after fetch
- Error handling (cache failure falls back to GitLab)

**Acceptance Criteria:**
- [ ] Cache hit returns data without GitLab API call
- [ ] Cache miss fetches from GitLab and caches result
- [ ] Multiple iterations handled efficiently
- [ ] Errors handled gracefully
- [ ] All tests pass (≥85% coverage)

---

### Step 1.3: Wire up ServiceFactory (1 hour)

**File:** `src/lib/infrastructure/factories/ServiceFactory.js`

**Changes:**
```javascript
import { CacheManager } from '../cache/CacheManager.js';
import { CachedIterationDataProvider } from '../adapters/CachedIterationDataProvider.js';

static createIterationDataProvider() {
  const gitlabClient = this.createGitLabClient();

  // Check if caching is enabled
  const cachingEnabled = process.env.ENABLE_CACHING !== 'false';

  if (cachingEnabled) {
    const cacheManager = new CacheManager(
      process.env.CACHE_DIR || './src/data/cache'
    );
    cacheManager.initialize().catch(err => {
      console.error('Failed to initialize cache:', err);
    });
    return new CachedIterationDataProvider(gitlabClient, cacheManager);
  } else {
    // Fallback to non-cached provider
    return new GitLabIterationDataProvider(gitlabClient);
  }
}
```

**Environment Variables (.env):**
```bash
ENABLE_CACHING=true
CACHE_DIR=./src/data/cache
CACHE_TTL_HOURS=6
```

**Tests:** Update ServiceFactory tests
- Creates CachedIterationDataProvider when ENABLE_CACHING=true
- Falls back to GitLabIterationDataProvider when ENABLE_CACHING=false
- Uses correct cache directory from env

**Acceptance Criteria:**
- [ ] Caching can be toggled via ENABLE_CACHING
- [ ] Correct provider created based on config
- [ ] Cache directory configurable via CACHE_DIR
- [ ] Tests pass

---

### Step 1.4: Integration Testing (2 hours)

**File:** `tests/integration/caching.integration.test.js`

**Test Scenarios:**
1. Cold cache → fetch from GitLab → save to cache
2. Warm cache → load from cache (no GitLab API call)
3. Multiple iterations with mixed hits/misses
4. Cache expiry (stale data refetched)
5. Error handling (corrupted cache file)

**Run Against Real GitLab:**
```bash
# Use test environment
GITLAB_PROJECT_PATH=test-group/test-project npm run test:integration
```

**Acceptance Criteria:**
- [ ] Cold cache fetches from GitLab
- [ ] Warm cache reads from disk (< 100ms)
- [ ] Stale cache refetches data
- [ ] Integration tests pass

---

### Phase 1 Completion Checklist

- [ ] CacheManager implemented and tested
- [ ] CachedIterationDataProvider implemented and tested
- [ ] ServiceFactory updated and tested
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] Performance test shows 100x improvement for warm cache

**Expected Performance:**
- Cold cache: 10s (same as current)
- Warm cache: < 100ms (100x faster)

**Metrics to Track:**
```bash
node cache-poc-test.js 3
# Should show cold vs warm comparison
```

---

## Phase 2: Incremental Updates (Day 2)

**Goal:** Stale cache → fetch only updated data (not full refetch)

**Deliverables:**
1. Incremental fetch in GitLabClient
2. Merge logic for incremental updates
3. Cache metadata with last update timestamps
4. Tests for incremental flow

### Step 2.1: Add Incremental Fetch to GitLabClient (2 hours)

**File:** `src/lib/infrastructure/api/GitLabClient.js`

**New Method:**
```javascript
/**
 * Fetch UPDATED issues for an iteration since a given timestamp
 *
 * @param {string} iterationId - Iteration ID
 * @param {string} updatedAfter - ISO timestamp
 * @returns {Promise<Object>} Updated issues only
 */
async fetchIterationDetailsIncremental(iterationId, updatedAfter) {
  const query = `
    query getIterationDetailsIncremental(
      $fullPath: ID!,
      $iterationId: [ID!],
      $updatedAfter: Time,
      $after: String
    ) {
      group(fullPath: $fullPath) {
        issues(
          iterationId: $iterationId,
          includeSubgroups: true,
          updatedAfter: $updatedAfter,
          first: 100,
          after: $after
        ) {
          nodes {
            id
            iid
            title
            state
            createdAt
            closedAt
            updatedAt
            weight
            notes(first: 20) {
              nodes {
                id
                body
                system
                systemNoteMetadata { action }
                createdAt
              }
            }
          }
        }
      }
    }
  `;

  // ... fetch and parse logic
  // Return only updated issues
}
```

**Tests:**
- Fetch issues updated after timestamp
- Returns only new/updated issues
- Handles empty result (no updates)
- Pagination for large update sets

**Acceptance Criteria:**
- [ ] Method fetches only updated issues
- [ ] Uses updatedAfter filter correctly
- [ ] Returns enriched issues with inProgressAt
- [ ] Tests pass

---

### Step 2.2: Implement Incremental Merge Logic (3 hours)

**File:** `src/lib/infrastructure/adapters/CachedIterationDataProvider.js`

**New Method:**
```javascript
/**
 * Merge incremental updates into cached data
 *
 * @param {Object} cachedData - Existing cached data
 * @param {Array} updatedIssues - Fresh issues from GitLab
 * @returns {Object} Merged data
 */
mergeIncrementalUpdates(cachedData, updatedIssues) {
  // Create map of existing issues by ID
  const issueMap = new Map(
    cachedData.issues.map(issue => [issue.id, issue])
  );

  // Update or add each issue
  for (const issue of updatedIssues) {
    issueMap.set(issue.id, issue);
  }

  return {
    ...cachedData,
    issues: Array.from(issueMap.values()),
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Fetch iteration with incremental update strategy
 */
async fetchIterationWithIncremental(iterationId) {
  const cached = await this.cache.getCachedIteration(iterationId);

  if (cached && this.isFresh(cached)) {
    // Cache hit - return cached data
    return cached;
  }

  if (cached && this.isStale(cached)) {
    // Stale cache - fetch only updates
    const lastFetch = cached.cachedAt;
    const updates = await this.gitlabClient.fetchIterationDetailsIncremental(
      iterationId,
      lastFetch
    );

    if (updates.issues.length === 0) {
      // No updates - refresh cache timestamp
      cached.cachedAt = new Date().toISOString();
      await this.cache.setCachedIteration(iterationId, cached);
      return cached;
    }

    // Merge updates into cached data
    const merged = this.mergeIncrementalUpdates(cached, updates.issues);
    await this.cache.setCachedIteration(iterationId, merged);
    return merged;
  }

  // Cache miss - full fetch
  return this.fetchFromGitLab(iterationId);
}
```

**Tests:**
- Merge updates into cached data
- Handle new issues (add to cache)
- Handle updated issues (replace in cache)
- Handle no updates (refresh timestamp only)
- Preserve non-updated issues

**Acceptance Criteria:**
- [ ] Merge logic updates existing issues
- [ ] Merge logic adds new issues
- [ ] No updates → timestamp refreshed
- [ ] Tests pass (≥85% coverage)

---

### Step 2.3: Update CacheManager with Last Fetch Tracking (2 hours)

**File:** `src/lib/infrastructure/cache/CacheManager.js`

**Enhanced Metadata:**
```javascript
// cache-metadata.json structure
{
  "iterations": {
    "gid://gitlab/Iteration/123": {
      "lastFetch": "2025-11-13T10:00:00Z",
      "lastFullFetch": "2025-11-13T10:00:00Z",
      "lastIncrementalFetch": "2025-11-13T14:30:00Z",
      "issueCount": 15,
      "noteCount": 234,
      "updateCount": 2  // Number of incremental updates
    }
  }
}
```

**New Methods:**
```javascript
async getLastFetchTime(iterationId) {
  const metadata = await this.getMetadata();
  return metadata.iterations[iterationId]?.lastFetch || null;
}

async updateIncrementalMetadata(iterationId, updateCount) {
  const metadata = await this.getMetadata();
  const iterationMeta = metadata.iterations[iterationId];
  iterationMeta.lastIncrementalFetch = new Date().toISOString();
  iterationMeta.updateCount = (iterationMeta.updateCount || 0) + 1;
  await this.saveMetadata(metadata);
}
```

**Acceptance Criteria:**
- [ ] Metadata tracks full vs incremental fetches
- [ ] Last fetch time retrievable
- [ ] Update count tracked
- [ ] Tests pass

---

### Step 2.4: Integration Testing (1 hour)

**Test Scenario:**
1. Fetch iteration (cold cache)
2. Modify issue in GitLab (via API)
3. Wait briefly
4. Fetch iteration again (should use incremental)
5. Verify only updated issue was fetched

**Acceptance Criteria:**
- [ ] Incremental fetch detects updates
- [ ] Only changed issues fetched
- [ ] Cache updated correctly
- [ ] Performance improved (< 1s for incremental)

---

### Phase 2 Completion Checklist

- [ ] Incremental fetch implemented in GitLabClient
- [ ] Merge logic implemented in CachedIterationDataProvider
- [ ] Cache metadata tracks incremental fetches
- [ ] Integration tests pass
- [ ] Performance test shows 10x improvement for stale cache

**Expected Performance:**
- Cold cache: 10s
- Warm cache: < 100ms
- Stale cache (incremental): < 1s (10x faster than full refetch)

---

## Phase 3: Cache Management & Monitoring (Day 3)

**Goal:** Production-ready caching with monitoring and manual controls

**Deliverables:**
1. Cache status API
2. Cache clear/refresh endpoints
3. Cache size monitoring and cleanup
4. Performance metrics
5. Documentation

### Step 3.1: Cache Status API (2 hours)

**File:** `src/server/routes/cache.js`

**Endpoints:**
```javascript
// GET /api/cache/status
router.get('/status', async (req, res) => {
  const cache = ServiceFactory.getCacheManager();
  const stats = await cache.getStats();

  res.json({
    enabled: true,
    totalSizeMB: stats.totalSizeMB,
    iterationCount: stats.iterationCount,
    hitRate: stats.hitRate,
    missRate: stats.missRate,
    avgResponseTime: {
      cached: stats.avgCachedTime,
      uncached: stats.avgUncachedTime
    },
    oldestCache: stats.oldestCache,
    newestCache: stats.newestCache,
    cacheDir: cache.cacheDir
  });
});

// POST /api/cache/clear
router.post('/clear', async (req, res) => {
  const cache = ServiceFactory.getCacheManager();
  await cache.clearAll();

  res.json({
    success: true,
    message: 'Cache cleared successfully'
  });
});

// DELETE /api/cache/iterations/:id
router.delete('/iterations/:id', async (req, res) => {
  const { id } = req.params;
  const cache = ServiceFactory.getCacheManager();
  await cache.invalidateIteration(id);

  res.json({
    success: true,
    message: `Iteration ${id} cache cleared`
  });
});

// POST /api/cache/refresh/:id
router.post('/refresh/:id', async (req, res) => {
  const { id } = req.params;
  const cache = ServiceFactory.getCacheManager();
  const provider = ServiceFactory.createIterationDataProvider();

  // Clear cache
  await cache.invalidateIteration(id);

  // Force fresh fetch
  const start = Date.now();
  const data = await provider.fetchIterationData(id);
  const duration = Date.now() - start;

  res.json({
    success: true,
    message: 'Iteration refreshed',
    fetchTime: `${duration}ms`,
    issueCount: data.issues.length
  });
});
```

**Tests:**
- GET /api/cache/status returns stats
- POST /api/cache/clear clears all cache
- DELETE /api/cache/iterations/:id clears specific cache
- POST /api/cache/refresh/:id forces refresh

**Acceptance Criteria:**
- [ ] All endpoints implemented
- [ ] Status shows accurate metrics
- [ ] Clear operations work correctly
- [ ] Tests pass

---

### Step 3.2: Cache Statistics Tracking (2 hours)

**File:** `src/lib/infrastructure/cache/CacheManager.js`

**Enhanced Stats:**
```javascript
class CacheManager {
  constructor() {
    this.stats = {
      hits: 0,
      misses: 0,
      totalCachedTime: 0,
      totalUncachedTime: 0,
      requests: 0
    };
  }

  async getCachedIteration(iterationId) {
    const start = Date.now();
    const cached = await this._loadCache(iterationId);
    const duration = Date.now() - start;

    this.stats.requests++;
    if (cached) {
      this.stats.hits++;
      this.stats.totalCachedTime += duration;
    } else {
      this.stats.misses++;
    }

    return cached;
  }

  async setCachedIteration(iterationId, data) {
    const start = Date.now();
    await this._saveCache(iterationId, data);
    const duration = Date.now() - start;

    this.stats.totalUncachedTime += duration;
  }

  getStats() {
    const hitRate = this.stats.requests > 0
      ? (this.stats.hits / this.stats.requests * 100).toFixed(1)
      : 0;

    const avgCachedTime = this.stats.hits > 0
      ? Math.round(this.stats.totalCachedTime / this.stats.hits)
      : 0;

    const avgUncachedTime = this.stats.misses > 0
      ? Math.round(this.stats.totalUncachedTime / this.stats.misses)
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`,
      missRate: `${(100 - hitRate).toFixed(1)}%`,
      avgCachedTime: `${avgCachedTime}ms`,
      avgUncachedTime: `${avgUncachedTime}ms`,
      totalRequests: this.stats.requests
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Hit/miss tracking works
- [ ] Response time tracking works
- [ ] Stats returned via API
- [ ] Tests pass

---

### Step 3.3: Cache Size Monitoring and Cleanup (2 hours)

**File:** `src/lib/infrastructure/cache/CacheManager.js`

**New Features:**
```javascript
/**
 * Get cache size and file count
 */
async getCacheSize() {
  let totalSize = 0;
  let fileCount = 0;

  const files = await fs.readdir(this.cacheDir);
  for (const file of files) {
    if (file.endsWith('.json') && file.startsWith('iteration-')) {
      const stats = await fs.stat(path.join(this.cacheDir, file));
      totalSize += stats.size;
      fileCount++;
    }
  }

  return {
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    fileCount
  };
}

/**
 * Clean up old cache files (> 30 days)
 */
async cleanupOldCache(maxAgeDays = 30) {
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let deletedCount = 0;

  const files = await fs.readdir(this.cacheDir);
  for (const file of files) {
    if (file.endsWith('.json') && file.startsWith('iteration-')) {
      const filepath = path.join(this.cacheDir, file);
      const stats = await fs.stat(filepath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        await fs.unlink(filepath);
        deletedCount++;
      }
    }
  }

  return { deletedCount };
}

/**
 * Enforce max cache size (delete oldest if exceeded)
 */
async enforceCacheLimit(maxSizeMB = 100) {
  const { totalSizeMB } = await this.getCacheSize();

  if (parseFloat(totalSizeMB) <= maxSizeMB) {
    return { deletedCount: 0 };
  }

  // Get files sorted by age (oldest first)
  const files = await fs.readdir(this.cacheDir);
  const fileStats = [];

  for (const file of files) {
    if (file.endsWith('.json') && file.startsWith('iteration-')) {
      const filepath = path.join(this.cacheDir, file);
      const stats = await fs.stat(filepath);
      fileStats.push({ file, mtime: stats.mtimeMs, size: stats.size });
    }
  }

  fileStats.sort((a, b) => a.mtime - b.mtime);

  // Delete oldest until under limit
  let currentSize = parseFloat(totalSizeMB);
  let deletedCount = 0;

  for (const fileInfo of fileStats) {
    if (currentSize <= maxSizeMB) break;

    await fs.unlink(path.join(this.cacheDir, fileInfo.file));
    currentSize -= fileInfo.size / 1024 / 1024;
    deletedCount++;
  }

  return { deletedCount };
}
```

**Cron Job (Optional):**
```javascript
// src/server/jobs/cacheCleanup.js
import cron from 'node-cron';

// Run daily at 2am
cron.schedule('0 2 * * *', async () => {
  const cache = ServiceFactory.getCacheManager();

  console.log('[CACHE CLEANUP] Starting daily cleanup...');

  // Clean up old cache (> 30 days)
  const { deletedCount: oldDeleted } = await cache.cleanupOldCache(30);
  console.log(`[CACHE CLEANUP] Deleted ${oldDeleted} old cache files`);

  // Enforce size limit
  const { deletedCount: sizeDeleted } = await cache.enforceCacheLimit(100);
  console.log(`[CACHE CLEANUP] Deleted ${sizeDeleted} files to enforce size limit`);

  console.log('[CACHE CLEANUP] Complete');
});
```

**Acceptance Criteria:**
- [ ] Cache size calculation works
- [ ] Old cache cleanup works
- [ ] Size limit enforcement works
- [ ] Tests pass

---

### Step 3.4: Documentation (2 hours)

**Files to Create/Update:**
1. `docs/CACHING-GUIDE.md` - User guide for caching
2. `README.md` - Add caching section
3. JSDoc comments - Complete all methods

**CACHING-GUIDE.md Contents:**
- Overview of caching system
- Configuration (.env variables)
- Cache directory structure
- TTL and invalidation
- Manual cache management (API endpoints)
- Troubleshooting guide
- Performance expectations

**Acceptance Criteria:**
- [ ] Documentation complete
- [ ] Examples provided
- [ ] Troubleshooting guide included

---

### Phase 3 Completion Checklist

- [ ] Cache status API implemented
- [ ] Cache management endpoints working
- [ ] Statistics tracking accurate
- [ ] Size monitoring and cleanup working
- [ ] Documentation complete
- [ ] All tests pass

**Expected Performance:**
- Cold cache: 10s
- Warm cache: < 100ms
- Stale cache: < 1s
- Average (70% hit rate): < 500ms

---

## Testing Strategy

### Unit Tests (Jest)

**Target:** ≥85% coverage for all new files

**Files:**
- `CacheManager.test.js` (15 tests)
- `CachedIterationDataProvider.test.js` (10 tests)
- `ServiceFactory.test.js` (3 new tests)
- `cache.routes.test.js` (8 tests)

### Integration Tests

**Scenarios:**
1. End-to-end cold → warm cache flow
2. Incremental update flow
3. Cache expiry and refresh
4. Error handling (corrupted cache)
5. Parallel requests (cache consistency)

### Performance Tests

**Script:** `cache-poc-test.js` (already created)

**Metrics:**
- Cold cache time
- Warm cache time
- Incremental update time
- Hit rate over time
- Disk space usage

**Run:**
```bash
node cache-poc-test.js 6
```

**Expected Output:**
```
Cold Cache: 10,000ms (10s)
Warm Cache: 80ms (100x faster)
Improvement: 99.2%
```

---

## Deployment Plan

### Step 1: Deploy to Test Environment

```bash
# Set environment variables
echo "ENABLE_CACHING=true" >> .env
echo "CACHE_DIR=./src/data/cache" >> .env
echo "CACHE_TTL_HOURS=6" >> .env

# Run tests
npm test

# Start server
npm start
```

### Step 2: Validate Performance

```bash
# Run performance test
node cache-poc-test.js 3

# Load dashboard and measure
curl -w "@curl-format.txt" "http://localhost:3000/api/metrics/all?iterations=..."

# Check cache status
curl "http://localhost:3000/api/cache/status"
```

### Step 3: Monitor Logs

```bash
# Watch for cache hits/misses
tail -f logs/app.log | grep CACHE

# Expected output:
# [CACHE HIT] iteration-123 (age: 2min)
# [CACHE MISS] iteration-456 (fetching from GitLab...)
# [CACHE] Saved iteration-456 (15 issues)
```

### Step 4: Deploy to Production

```bash
# Backup current deployment
git tag pre-caching-$(date +%Y%m%d)

# Merge caching branch
git checkout main
git merge feat/persistent-caching

# Deploy
npm run deploy

# Prime cache (first load will be slow)
curl "http://production-url/api/metrics/all?iterations=..."

# Verify
curl "http://production-url/api/cache/status"
```

---

## Rollback Plan

If caching causes issues:

```bash
# 1. Disable caching via env variable
echo "ENABLE_CACHING=false" >> .env

# 2. Restart server
npm restart

# System will fall back to GitLabIterationDataProvider (no caching)
```

**No code changes required** - caching is opt-in and can be toggled via config.

---

## Success Metrics

### Performance Targets

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Cold cache | 10s | 10s | 0% (expected) |
| Warm cache | 10s | < 100ms | 99% |
| Stale cache | 10s | < 1s | 90% |
| Average (70% hit rate) | 10s | < 500ms | 95% |

### User Experience

**Before Caching:**
- Every dashboard load: 10 seconds
- User frustration: High
- GitLab API load: Heavy

**After Caching:**
- First load: 10 seconds (primes cache)
- Subsequent loads: < 100ms (instant)
- Daily average: < 500ms
- User satisfaction: High
- GitLab API load: 90% reduced

### Technical Metrics

- Cache hit rate: 70-80%
- Disk space usage: < 100MB
- Cache initialization time: < 50ms
- Memory usage: Minimal (files on disk)

---

## Risk Assessment

### Low Risk
- File-based cache is simple and battle-tested
- Graceful fallback (cache miss → GitLab API)
- Can be disabled via config
- No schema migrations
- Cache can be deleted safely

### Medium Risk
- Disk space management (mitigated by cleanup job)
- Cache corruption (mitigated by try-catch and fallback)
- Stale data (mitigated by TTL)

### Mitigation Strategies
1. Wrap all file operations in try-catch
2. Log cache errors clearly
3. Automatic cleanup for old cache
4. Size limit enforcement
5. Manual cache clear endpoint
6. Comprehensive error handling

---

## Post-Implementation

### Monitoring

**Metrics to Track:**
- Cache hit rate (target: 70-80%)
- Average response time (target: < 500ms)
- Cache size (target: < 100MB)
- GitLab API call reduction (target: 90%)

**Alerts:**
- Cache hit rate < 50% (investigate TTL)
- Average response time > 1s (investigate stale cache)
- Cache size > 150MB (trigger cleanup)

### Optimization Opportunities

After caching is stable:
1. Implement background refresh (pre-warm cache)
2. Add cache preloading on server start
3. Implement cache sharing (if multi-instance)
4. Add cache compression (reduce disk usage)
5. Implement smart TTL (vary by iteration age)

---

## Files Created

### Phase 1
- `src/lib/infrastructure/cache/CacheManager.js`
- `src/lib/infrastructure/cache/CacheManager.test.js`
- `src/lib/infrastructure/adapters/CachedIterationDataProvider.js`
- `src/lib/infrastructure/adapters/CachedIterationDataProvider.test.js`
- `tests/integration/caching.integration.test.js`

### Phase 2
- Updated: `src/lib/infrastructure/api/GitLabClient.js` (add incremental fetch)
- Updated: `src/lib/infrastructure/adapters/CachedIterationDataProvider.js` (add merge logic)
- Updated: `src/lib/infrastructure/cache/CacheManager.js` (enhanced metadata)

### Phase 3
- `src/server/routes/cache.js`
- `src/server/routes/cache.test.js`
- `src/server/jobs/cacheCleanup.js` (optional)
- `docs/CACHING-GUIDE.md`
- Updated: `README.md`

### Supporting Files
- `ARCHITECTURAL-CACHING-INVESTIGATION.md` (design doc)
- `cache-poc-test.js` (performance test)
- `rest-api-investigation.sh` (REST vs GraphQL comparison)
- `CACHING-IMPLEMENTATION-ROADMAP.md` (this file)

---

## Timeline Summary

**Phase 1 (Day 1):** Basic caching
- Hours: 9 hours (CacheManager, Provider, Factory, Tests)
- Deliverable: Working cache system
- Performance: 100x improvement for warm cache

**Phase 2 (Day 2):** Incremental updates
- Hours: 8 hours (Incremental fetch, merge logic, tests)
- Deliverable: Smart cache updates
- Performance: 10x improvement for stale cache

**Phase 3 (Day 3):** Production readiness
- Hours: 8 hours (API, monitoring, cleanup, docs)
- Deliverable: Production-ready system
- Performance: Full monitoring and management

**Total:** 25 hours (~3 days)

---

## Next Steps

1. **Review this roadmap** with the team
2. **Approve approach** (file-based persistent cache)
3. **Create feature branch:** `feat/persistent-caching`
4. **Implement Phase 1** (basic caching)
5. **Test and validate** performance improvements
6. **Implement Phase 2** (incremental updates)
7. **Implement Phase 3** (production readiness)
8. **Deploy to production**
9. **Monitor and optimize**

---

**Document Prepared By:** Claude Code (Anthropic)
**Date:** 2025-11-13
**Status:** Ready for Implementation
**Approval Required:** Team Lead / Product Owner
