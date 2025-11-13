# Architectural Caching Investigation - GitLab Metrics Tracker

**Date:** 2025-11-13
**Context:** Performance issue with GraphQL notes fetching (4-5 seconds per iteration)
**Previous Finding:** Reducing notes to 5 is unreliable and risks missing "In Progress" timestamps
**New Mission:** Investigate architectural solutions for reliable, performant data fetching

---

## Executive Summary

This document investigates **persistent caching** and **hybrid API strategies** to solve the notes fetching performance problem WITHOUT sacrificing data reliability.

### Key Findings

1. **Persistent Caching is the Best Solution** - Cache iterations and notes locally, fetch only NEW data
2. **REST API Won't Help** - Still need notes for cycle time, REST doesn't provide status change history
3. **Incremental Fetching is Possible** - GitLab supports filtering by updatedAfter timestamp
4. **SQLite is Overkill** - JSON file-based cache is sufficient for this use case
5. **Expected Performance:** First load 10s → Subsequent loads < 1s (90% improvement)

---

## 1. Persistent Caching Architecture

### Problem Statement

**Current Behavior:**
- Every dashboard load fetches ALL iteration data from GitLab API
- Notes fetching is the bottleneck (4-5 seconds per iteration with issues)
- Even with response cache (5min TTL), we're still hitting API frequently
- Cache is in-memory only, lost on server restart

**Desired Behavior:**
- Fetch iterations and notes ONCE, store persistently
- On subsequent loads, fetch only NEW/UPDATED issues
- Persistent cache survives server restarts
- Smart invalidation when data changes

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PERSISTENT CACHE LAYER                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Cache Store (JSON files in src/data/cache/)                │
│  ├─ iterations.json        (iteration metadata)             │
│  ├─ iteration-123.json     (issues + notes for iteration)   │
│  ├─ iteration-456.json                                       │
│  └─ cache-metadata.json    (last fetch timestamps)          │
│                                                               │
│  Cache Strategy:                                             │
│  1. Check cache first (cache-metadata.json)                 │
│  2. If fresh (< 6 hours old), return cached data           │
│  3. If stale, fetch ONLY updated issues (incremental)       │
│  4. Merge updates into cache                                 │
│  5. Update cache-metadata.json timestamp                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              GitLabClient (with incremental fetch)           │
│  - fetchIterationDetails(id, updatedAfter?)                 │
│  - fetchIterationDetailsIncremental(id, lastFetchTime)      │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      GitLab GraphQL API                      │
└─────────────────────────────────────────────────────────────┘
```

### Cache Data Structure

**cache-metadata.json:**
```json
{
  "iterations": {
    "lastFullFetch": "2025-11-13T10:00:00Z",
    "byIteration": {
      "gid://gitlab/Iteration/123": {
        "lastFetch": "2025-11-13T10:00:00Z",
        "issueCount": 15,
        "noteCount": 234,
        "hash": "abc123def456" // For change detection
      },
      "gid://gitlab/Iteration/456": {
        "lastFetch": "2025-11-13T10:00:00Z",
        "issueCount": 8,
        "noteCount": 89,
        "hash": "xyz789ghi012"
      }
    }
  }
}
```

**iteration-123.json:**
```json
{
  "iterationId": "gid://gitlab/Iteration/123",
  "metadata": {
    "id": "gid://gitlab/Iteration/123",
    "title": "Sprint 1.23",
    "startDate": "2025-11-10T00:00:00Z",
    "dueDate": "2025-11-23T23:59:59Z"
  },
  "issues": [
    {
      "id": "gid://gitlab/Issue/111",
      "iid": 111,
      "title": "Issue title",
      "state": "closed",
      "createdAt": "2025-11-10T10:00:00Z",
      "closedAt": "2025-11-15T15:00:00Z",
      "inProgressAt": "2025-11-11T09:30:00Z",
      "weight": 3,
      "labels": ["feature", "backend"],
      "notes": [
        {
          "id": "gid://gitlab/Note/1001",
          "body": "set status to **In progress**",
          "system": true,
          "createdAt": "2025-11-11T09:30:00Z"
        }
      ]
    }
  ],
  "mergeRequests": [...],
  "incidents": [...],
  "cachedAt": "2025-11-13T10:00:00Z"
}
```

### Implementation Plan

#### Step 1: Create CacheManager class

**File:** `src/lib/infrastructure/cache/CacheManager.js`

```javascript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * CacheManager - Persistent cache for GitLab iteration data
 *
 * Features:
 * - File-based storage (JSON files)
 * - Incremental updates (fetch only new/changed data)
 * - Automatic invalidation based on TTL
 * - Cache metadata tracking
 *
 * Storage structure:
 * - src/data/cache/iterations.json (metadata cache)
 * - src/data/cache/iteration-{id}.json (per-iteration data)
 * - src/data/cache/cache-metadata.json (timestamps, hashes)
 */
export class CacheManager {
  constructor(cacheDir = './src/data/cache') {
    this.cacheDir = cacheDir;
    this.metadataFile = path.join(cacheDir, 'cache-metadata.json');
    this.ttl = 6 * 60 * 60 * 1000; // 6 hours (configurable)
  }

  /**
   * Initialize cache directory and metadata file
   */
  async initialize() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Create metadata file if it doesn't exist
      try {
        await fs.access(this.metadataFile);
      } catch {
        await this.saveMetadata({
          iterations: {
            lastFullFetch: null,
            byIteration: {}
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize cache:', error);
    }
  }

  /**
   * Get cached iteration data
   *
   * @param {string} iterationId - Iteration ID
   * @returns {Promise<Object|null>} Cached data or null if not cached/stale
   */
  async getCachedIteration(iterationId) {
    try {
      const metadata = await this.getMetadata();
      const iterationMeta = metadata.iterations.byIteration[iterationId];

      if (!iterationMeta) {
        return null; // Not cached
      }

      // Check if cache is fresh
      const age = Date.now() - new Date(iterationMeta.lastFetch).getTime();
      if (age > this.ttl) {
        console.log(`[CACHE] Stale cache for ${iterationId} (age: ${Math.round(age / 1000 / 60)}min)`);
        return null; // Stale
      }

      // Load cached data
      const cacheFile = this.getIterationCacheFile(iterationId);
      const data = await this.loadCacheFile(cacheFile);

      console.log(`[CACHE HIT] ${iterationId} (age: ${Math.round(age / 1000 / 60)}min)`);
      return data;
    } catch (error) {
      console.warn(`[CACHE] Failed to read cache for ${iterationId}:`, error.message);
      return null;
    }
  }

  /**
   * Save iteration data to cache
   *
   * @param {string} iterationId - Iteration ID
   * @param {Object} data - Iteration data to cache
   */
  async setCachedIteration(iterationId, data) {
    try {
      // Calculate hash for change detection
      const hash = this.calculateHash(data);

      // Save iteration data
      const cacheFile = this.getIterationCacheFile(iterationId);
      await this.saveCacheFile(cacheFile, {
        ...data,
        cachedAt: new Date().toISOString()
      });

      // Update metadata
      const metadata = await this.getMetadata();
      metadata.iterations.byIteration[iterationId] = {
        lastFetch: new Date().toISOString(),
        issueCount: data.issues?.length || 0,
        noteCount: this.countNotes(data.issues),
        hash
      };
      await this.saveMetadata(metadata);

      console.log(`[CACHE] Saved ${iterationId} (${data.issues?.length || 0} issues)`);
    } catch (error) {
      console.error(`[CACHE] Failed to save cache for ${iterationId}:`, error);
    }
  }

  /**
   * Get last fetch time for an iteration
   * Used for incremental fetching
   *
   * @param {string} iterationId - Iteration ID
   * @returns {Promise<string|null>} ISO timestamp or null
   */
  async getLastFetchTime(iterationId) {
    try {
      const metadata = await this.getMetadata();
      const iterationMeta = metadata.iterations.byIteration[iterationId];
      return iterationMeta?.lastFetch || null;
    } catch {
      return null;
    }
  }

  /**
   * Invalidate cache for a specific iteration
   *
   * @param {string} iterationId - Iteration ID to invalidate
   */
  async invalidateIteration(iterationId) {
    try {
      const cacheFile = this.getIterationCacheFile(iterationId);
      await fs.unlink(cacheFile);

      const metadata = await this.getMetadata();
      delete metadata.iterations.byIteration[iterationId];
      await this.saveMetadata(metadata);

      console.log(`[CACHE] Invalidated ${iterationId}`);
    } catch (error) {
      console.warn(`[CACHE] Failed to invalidate ${iterationId}:`, error.message);
    }
  }

  /**
   * Clear all cached data
   */
  async clearAll() {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.startsWith('iteration-') && file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
      await this.saveMetadata({
        iterations: {
          lastFullFetch: null,
          byIteration: {}
        }
      });
      console.log('[CACHE] Cleared all cached data');
    } catch (error) {
      console.error('[CACHE] Failed to clear cache:', error);
    }
  }

  // Helper methods

  getIterationCacheFile(iterationId) {
    // Clean iteration ID for filename (remove special chars)
    const cleanId = iterationId.replace(/[^a-zA-Z0-9]/g, '-');
    return path.join(this.cacheDir, `iteration-${cleanId}.json`);
  }

  async loadCacheFile(filepath) {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  }

  async saveCacheFile(filepath, data) {
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async getMetadata() {
    try {
      return await this.loadCacheFile(this.metadataFile);
    } catch {
      return {
        iterations: {
          lastFullFetch: null,
          byIteration: {}
        }
      };
    }
  }

  async saveMetadata(metadata) {
    await this.saveCacheFile(this.metadataFile, metadata);
  }

  calculateHash(data) {
    const content = JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  countNotes(issues) {
    if (!Array.isArray(issues)) return 0;
    return issues.reduce((sum, issue) => {
      return sum + (issue.notes?.length || 0);
    }, 0);
  }
}
```

#### Step 2: Update GitLabClient with incremental fetching

**File:** `src/lib/infrastructure/api/GitLabClient.js` (add new method)

```javascript
/**
 * Fetches UPDATED issues for an iteration since a given timestamp
 * Used for incremental cache updates
 *
 * @param {string} iterationId - Iteration ID
 * @param {string} updatedAfter - ISO timestamp (fetch issues updated after this time)
 * @returns {Promise<Object>} Updated issues and MRs
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
        id
        issues(
          iterationId: $iterationId,
          includeSubgroups: true,
          updatedAfter: $updatedAfter,
          first: 100,
          after: $after
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            iid
            title
            state
            createdAt
            closedAt
            updatedAt
            weight
            labels {
              nodes {
                title
              }
            }
            assignees {
              nodes {
                username
              }
            }
            notes(first: 20) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                body
                system
                systemNoteMetadata {
                  action
                }
                createdAt
              }
            }
          }
        }
      }
    }
  `;

  let allIssues = [];
  let hasNextPage = true;
  let after = null;

  try {
    console.log(`[INCREMENTAL] Fetching issues updated after ${updatedAfter}...`);

    while (hasNextPage) {
      const data = await this._cachedRequest(query, {
        fullPath: this.projectPath,
        iterationId: [iterationId],
        updatedAfter,
        after,
      });

      if (!data.group) {
        throw new Error(`Group not found: ${this.projectPath}`);
      }

      const { nodes, pageInfo } = data.group.issues;
      allIssues = allIssues.concat(nodes);
      hasNextPage = pageInfo.hasNextPage;
      after = pageInfo.endCursor;

      if (hasNextPage) {
        await this.delay(100);
      }
    }

    console.log(`[INCREMENTAL] Found ${allIssues.length} updated issues`);

    // Enrich with inProgressAt
    const enrichedIssues = allIssues.map((issue) => {
      const inProgressAt = this.extractInProgressTimestamp(issue.notes?.nodes || []);
      return {
        ...issue,
        inProgressAt,
      };
    });

    return {
      issues: enrichedIssues,
      mergeRequests: [], // MRs fetched separately if needed
    };
  } catch (error) {
    if (error.response?.errors) {
      throw new Error(`Failed to fetch incremental updates: ${error.response.errors[0].message}`);
    }
    throw new Error(`Failed to fetch incremental updates: ${error.message}`);
  }
}
```

#### Step 3: Create CachedIterationDataProvider

**File:** `src/lib/infrastructure/adapters/CachedIterationDataProvider.js`

```javascript
import { IIterationDataProvider } from '../../core/interfaces/IIterationDataProvider.js';
import { CacheManager } from '../cache/CacheManager.js';

/**
 * CachedIterationDataProvider
 * Wraps GitLabIterationDataProvider with persistent caching layer
 *
 * Strategy:
 * 1. Check cache first (cache hit = instant response)
 * 2. If cache miss or stale, fetch from GitLab
 * 3. If cache exists but stale, fetch ONLY updated data (incremental)
 * 4. Merge incremental updates into cache
 * 5. Return combined data
 */
export class CachedIterationDataProvider extends IIterationDataProvider {
  constructor(gitlabClient, cacheManager) {
    super();
    this.gitlabClient = gitlabClient;
    this.cache = cacheManager;
  }

  /**
   * Fetch iteration data with caching
   *
   * @param {string} iterationId - Iteration ID
   * @returns {Promise<IterationData>} Iteration data (from cache or GitLab)
   */
  async fetchIterationData(iterationId) {
    // Try cache first
    const cached = await this.cache.getCachedIteration(iterationId);
    if (cached) {
      return this.transformCachedData(cached);
    }

    // Cache miss - fetch from GitLab
    console.log(`[CACHE MISS] Fetching ${iterationId} from GitLab...`);
    const data = await this.fetchFromGitLab(iterationId);

    // Cache the result
    await this.cache.setCachedIteration(iterationId, data);

    return data;
  }

  /**
   * Fetch multiple iterations with caching
   * Uses parallel fetching for cache misses
   *
   * @param {Array<string>} iterationIds - Array of iteration IDs
   * @returns {Promise<Array<IterationData>>} Array of iteration data
   */
  async fetchMultipleIterations(iterationIds) {
    // Check cache for each iteration
    const results = await Promise.all(
      iterationIds.map(async (id) => {
        const cached = await this.cache.getCachedIteration(id);
        return { id, cached };
      })
    );

    // Separate cache hits and misses
    const hits = results.filter(r => r.cached !== null);
    const misses = results.filter(r => r.cached === null).map(r => r.id);

    console.log(`[CACHE] Hits: ${hits.length}, Misses: ${misses.length}`);

    // Fetch misses from GitLab in parallel
    let freshData = [];
    if (misses.length > 0) {
      freshData = await this.fetchMultipleFromGitLab(misses);

      // Cache the fresh data
      await Promise.all(
        freshData.map((data, index) =>
          this.cache.setCachedIteration(misses[index], data)
        )
      );
    }

    // Combine hits and misses in original order
    return iterationIds.map(id => {
      const hit = hits.find(h => h.id === id);
      if (hit) {
        return this.transformCachedData(hit.cached);
      }
      const miss = freshData[misses.indexOf(id)];
      return miss;
    });
  }

  /**
   * Fetch iteration from GitLab (no cache)
   */
  async fetchFromGitLab(iterationId) {
    const iterations = await this.gitlabClient.fetchIterations();
    const metadata = iterations.find(it => it.id === iterationId);

    const details = await this.gitlabClient.fetchIterationDetails(iterationId);
    const incidents = await this.gitlabClient.fetchIncidents(
      metadata?.startDate || new Date().toISOString(),
      metadata?.dueDate || new Date().toISOString()
    );

    return {
      issues: details.issues || [],
      mergeRequests: details.mergeRequests || [],
      pipelines: [],
      incidents: incidents || [],
      iteration: {
        id: metadata?.id || iterationId,
        title: metadata?.title || 'Unknown Sprint',
        startDate: metadata?.startDate || new Date().toISOString(),
        dueDate: metadata?.dueDate || new Date().toISOString(),
      },
    };
  }

  /**
   * Fetch multiple iterations from GitLab in parallel
   */
  async fetchMultipleFromGitLab(iterationIds) {
    const allIterations = await this.gitlabClient.fetchIterations();
    const iterationMap = new Map(allIterations.map(it => [it.id, it]));

    const fetchPromises = iterationIds.map(async (id) => {
      const metadata = iterationMap.get(id);
      const [details, incidents] = await Promise.all([
        this.gitlabClient.fetchIterationDetails(id),
        this.gitlabClient.fetchIncidents(
          metadata?.startDate || new Date().toISOString(),
          metadata?.dueDate || new Date().toISOString()
        )
      ]);
      return { details, incidents, metadata };
    });

    const allResults = await Promise.all(fetchPromises);

    return allResults.map(({ details, incidents, metadata }) => ({
      issues: details.issues || [],
      mergeRequests: details.mergeRequests || [],
      pipelines: [],
      incidents: incidents || [],
      iteration: {
        id: metadata?.id || 'unknown',
        title: metadata?.title || 'Unknown Sprint',
        startDate: metadata?.startDate || new Date().toISOString(),
        dueDate: metadata?.dueDate || new Date().toISOString(),
      },
    }));
  }

  /**
   * Transform cached data to expected format
   */
  transformCachedData(cached) {
    return {
      issues: cached.issues || [],
      mergeRequests: cached.mergeRequests || [],
      pipelines: cached.pipelines || [],
      incidents: cached.incidents || [],
      iteration: cached.metadata || cached.iteration,
    };
  }

  /**
   * Invalidate cache for specific iteration
   * Call this when you know data has changed (e.g., user manually refreshes)
   */
  async invalidateCache(iterationId) {
    await this.cache.invalidateIteration(iterationId);
  }

  /**
   * Clear all cached data
   */
  async clearAllCache() {
    await this.cache.clearAll();
  }
}
```

#### Step 4: Wire up in ServiceFactory

**File:** `src/lib/infrastructure/factories/ServiceFactory.js` (update)

```javascript
import { CacheManager } from '../cache/CacheManager.js';
import { CachedIterationDataProvider } from '../adapters/CachedIterationDataProvider.js';

// ... existing code ...

static createIterationDataProvider() {
  const gitlabClient = this.createGitLabClient();

  // Check if caching is enabled (default: true)
  const cachingEnabled = process.env.ENABLE_CACHING !== 'false';

  if (cachingEnabled) {
    const cacheManager = new CacheManager(
      process.env.CACHE_DIR || './src/data/cache'
    );

    // Initialize cache (create directory if needed)
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

### Performance Estimates

**Scenario 1: Cold Cache (First Load)**
```
Dashboard with 6 iterations:
  └─> Fetch 6 iterations from GitLab (same as current)
      └─> 10 seconds total
  └─> Save to cache
      └─> +200ms (writing JSON files)
  ────────────────────────────────
  Total: 10.2 seconds (no improvement, but now cached!)
```

**Scenario 2: Warm Cache (Subsequent Loads)**
```
Dashboard with 6 iterations:
  └─> Check cache (6 hits)
      └─> Read 6 JSON files from disk
      └─> 50-100ms total
  ────────────────────────────────
  Total: < 100ms (100x improvement!)
```

**Scenario 3: Incremental Update (Partial Stale)**
```
Dashboard with 6 iterations (2 have updates):
  └─> Check cache
      ├─> 4 iterations: cache hit (50ms)
      └─> 2 iterations: stale
          └─> Fetch ONLY updated issues (updatedAfter)
          └─> Typically 0-3 new issues
          └─> 500ms total
  ────────────────────────────────
  Total: 550ms (95% improvement vs full fetch)
```

### Cache Invalidation Strategy

**When to invalidate:**
1. **Manual Refresh:** User clicks "Refresh" button (invalidate all)
2. **TTL Expiry:** Automatic after 6 hours (configurable)
3. **Incremental Update:** Don't invalidate, just fetch updates
4. **Server Restart:** Cache persists (file-based)

**Configuration (.env):**
```bash
ENABLE_CACHING=true                    # Enable persistent caching
CACHE_DIR=./src/data/cache             # Cache directory
CACHE_TTL_HOURS=6                      # Cache freshness (hours)
```

### Trade-offs

**Pros:**
- 100x faster for cached data (10s → 100ms)
- Reduces GitLab API load by 90%+
- Survives server restarts
- Incremental updates keep data fresh
- No external dependencies (no SQLite, no Redis)
- Simple to implement (JSON files)

**Cons:**
- Data can be up to 6 hours stale (configurable)
- Disk space usage (~1-2MB per iteration)
- Complexity added (cache management logic)
- Need to handle cache corruption (graceful fallback)

---

## 2. REST API vs GraphQL Investigation

### REST API Endpoints

GitLab provides REST API endpoints that could theoretically be used instead of GraphQL:

```bash
# 1. Get iterations
GET /api/v4/groups/:group_id/iterations

# 2. Get issues for iteration
GET /api/v4/groups/:group_id/issues?iteration_id=:id

# 3. Get issue notes (status changes)
GET /api/v4/projects/:project_id/issues/:issue_iid/notes
```

### Key Problem: Notes Still Required

**The bottleneck is fetching notes** (for "In Progress" timestamp detection).

**REST API Notes Endpoint:**
```bash
GET /api/v4/projects/123/issues/456/notes?per_page=20
```

**Analysis:**
- Still need to fetch notes for EACH issue
- For 6 iterations × 10 issues = 60 separate REST calls
- Even if parallelized, this creates network overhead
- REST doesn't support batching like GraphQL

### Performance Comparison

| Approach | API Calls (6 iterations, 60 issues) | Estimated Time | Pros | Cons |
|----------|--------------------------------------|----------------|------|------|
| **GraphQL (current)** | 6 calls (one per iteration) | 10 seconds | Batching, field selection | Notes query slow |
| **REST API** | 6 + 60 = 66 calls | 15-20 seconds | Simpler, better HTTP caching | Many calls, no batching |
| **Hybrid (GraphQL + REST)** | 6 + 60 = 66 calls | 12-15 seconds | Best HTTP caching | Complexity, still many calls |
| **GraphQL + Persistent Cache** | 6 (cold), 0 (warm) | 10s (cold), 100ms (warm) | Best of all worlds | Cache management |

### Verdict: Stick with GraphQL + Caching

**Reasons:**
1. GraphQL batching is superior (1 call vs 11 calls per iteration)
2. REST doesn't solve the notes problem
3. Persistent caching solves performance WITHOUT changing APIs
4. Adding REST increases complexity without significant benefit

---

## 3. Incremental Fetch Strategy

### GitLab GraphQL Support for Incremental Fetching

GitLab GraphQL supports filtering by `updatedAfter`:

```graphql
query {
  group(fullPath: "mygroup") {
    issues(
      iterationId: ["gid://gitlab/Iteration/123"]
      updatedAfter: "2025-11-13T10:00:00Z"
    ) {
      nodes {
        id
        title
        updatedAt
      }
    }
  }
}
```

**This is the key to incremental updates!**

### Incremental Update Flow

```
1. User loads dashboard
   └─> Check cache for each iteration
       ├─> Cache hit (< 6 hours old)
       │   └─> Return cached data instantly
       └─> Cache miss or stale
           ├─> Get last fetch time from cache metadata
           ├─> Fetch ONLY issues updated since last fetch
           │   └─> GraphQL query with updatedAfter filter
           ├─> Merge updated issues into cached data
           │   └─> Update existing issues by ID
           │   └─> Add new issues
           ├─> Save merged data to cache
           └─> Return merged data
```

### Merge Logic (Incremental Updates)

```javascript
/**
 * Merge incremental updates into cached data
 *
 * @param {Object} cachedData - Existing cached iteration data
 * @param {Array} updatedIssues - Fresh issues from GitLab
 * @returns {Object} Merged data
 */
function mergeIncrementalUpdates(cachedData, updatedIssues) {
  const issueMap = new Map(cachedData.issues.map(issue => [issue.id, issue]));

  // Update or add each issue
  for (const issue of updatedIssues) {
    issueMap.set(issue.id, issue);
  }

  return {
    ...cachedData,
    issues: Array.from(issueMap.values()),
    cachedAt: new Date().toISOString()
  };
}
```

### Expected Performance

**Typical Scenario:** User loads dashboard multiple times per day

```
Load 1 (9am):  Cold cache → 10 seconds
Load 2 (11am): Warm cache → 100ms
Load 3 (2pm):  Warm cache → 100ms
Load 4 (4pm):  Stale cache, 2 new issues → 500ms (incremental)
Load 5 (5pm):  Warm cache → 100ms
```

**Average:** ~500ms per load (vs 10s current = 95% improvement)

---

## 4. Real-World Performance Testing Plan

### Test Scenarios

#### Scenario A: Cold Cache (Baseline)
```bash
# Clear cache
rm -rf src/data/cache/*

# Load dashboard (6 iterations)
time curl "http://localhost:3000/api/metrics/all?iterations=id1,id2,id3,id4,id5,id6"
```

**Expected:** 10 seconds (same as current, but now cached)

#### Scenario B: Warm Cache
```bash
# Load dashboard again (cache fresh)
time curl "http://localhost:3000/api/metrics/all?iterations=id1,id2,id3,id4,id5,id6"
```

**Expected:** < 100ms (100x faster)

#### Scenario C: Incremental Update
```bash
# Create new issue in GitLab
# Wait 1 minute for cache to notice (via updatedAt)

# Load dashboard (cache stale for 1 iteration)
time curl "http://localhost:3000/api/metrics/all?iterations=id1,id2,id3,id4,id5,id6"
```

**Expected:** 500ms (5 hits, 1 incremental fetch)

#### Scenario D: Manual Refresh
```bash
# Force cache invalidation
curl -X POST "http://localhost:3000/api/cache/clear"

# Load dashboard (cold cache again)
time curl "http://localhost:3000/api/metrics/all?iterations=id1,id2,id3,id4,id5,id6"
```

**Expected:** 10 seconds (re-populates cache)

### Metrics to Track

1. **Response Time:**
   - Cold cache: ~10s (baseline)
   - Warm cache: < 100ms (target)
   - Incremental: < 1s (target)

2. **Cache Hit Rate:**
   - First hour: ~20% (cold start)
   - After 1 hour: ~80% (typical usage)
   - Average over day: ~70-80%

3. **API Calls to GitLab:**
   - Without cache: 6 calls per dashboard load
   - With cache (warm): 0 calls per dashboard load
   - Reduction: 90-100%

4. **Disk Space:**
   - Per iteration: ~100-500KB (JSON)
   - 100 iterations: ~10-50MB
   - Negligible for modern systems

---

## 5. Implementation Complexity Analysis

### Development Time Estimates

| Component | Effort | Lines of Code | Test Cases |
|-----------|--------|---------------|------------|
| CacheManager | 4 hours | ~300 LOC | 15 tests |
| CachedIterationDataProvider | 3 hours | ~200 LOC | 10 tests |
| Incremental fetch in GitLabClient | 2 hours | ~100 LOC | 5 tests |
| ServiceFactory updates | 1 hour | ~30 LOC | 3 tests |
| Cache API endpoints (clear, status) | 2 hours | ~50 LOC | 5 tests |
| Integration testing | 3 hours | N/A | 10 tests |
| Documentation | 2 hours | N/A | N/A |
| **TOTAL** | **17 hours** (~2-3 days) | **~680 LOC** | **48 tests** |

### Code Complexity Assessment

**Low Complexity:**
- File-based cache (simple JSON read/write)
- No external dependencies
- Follows Clean Architecture (adapter pattern)
- Well-defined interfaces

**Medium Complexity:**
- Incremental merge logic (update existing issues)
- Cache metadata tracking
- TTL and invalidation logic

**High Complexity:**
- None (avoided by using simple file-based approach)

### Maintenance Risk

**Low Risk:**
- JSON files are human-readable (easy to debug)
- Graceful fallback (cache miss → fetch from GitLab)
- No schema migrations needed
- Cache can be deleted without data loss

**Medium Risk:**
- Disk space management (need to clean old cache files)
- Cache corruption handling (malformed JSON)

**Mitigation:**
- Add cache size monitoring
- Implement automatic cleanup (delete files > 30 days old)
- Wrap all file operations in try-catch
- Log cache errors clearly

### Breaking Changes

**None** - This is additive:
- Existing code continues to work
- Cache is opt-in (configurable)
- Fallback to non-cached provider
- No API changes

---

## 6. Recommended Architecture

### THE BEST APPROACH: GraphQL + Persistent File Cache

**Why this wins:**
1. **Performance:** 100x improvement for warm cache (10s → 100ms)
2. **Reliability:** ALL notes fetched (no data loss)
3. **Maintainability:** Simple JSON files, follows Clean Architecture
4. **Implementation Time:** 2-3 days
5. **Data Freshness:** Incremental updates keep data current
6. **No External Dependencies:** Just Node.js fs module

### Implementation Phases

#### Phase 1: Basic Caching (Day 1)
- Implement CacheManager
- Add simple cache check (hit = return cached, miss = fetch GitLab)
- No incremental updates yet

**Expected Result:** 10s (cold) → 100ms (warm)

#### Phase 2: Incremental Updates (Day 2)
- Add incremental fetch to GitLabClient
- Implement merge logic in CachedIterationDataProvider
- Add cache metadata tracking

**Expected Result:** Stale cache updates in < 1s instead of 10s

#### Phase 3: Cache Management (Day 3)
- Add cache status API endpoint
- Add manual refresh/clear endpoints
- Add cache size monitoring
- Documentation and testing

**Expected Result:** Production-ready caching system

### Configuration

**Add to .env:**
```bash
# Caching Configuration
ENABLE_CACHING=true                    # Enable persistent caching
CACHE_DIR=./src/data/cache             # Cache directory
CACHE_TTL_HOURS=6                      # Cache freshness (6 hours)
CACHE_MAX_SIZE_MB=100                  # Max cache size (auto-cleanup)
```

### Cache Management API

**New endpoints:**
```javascript
// Get cache status
GET /api/cache/status
Response: {
  "enabled": true,
  "totalSize": "45.2 MB",
  "iterationCount": 15,
  "hitRate": "78%",
  "oldestCache": "2025-11-13T04:00:00Z"
}

// Clear all cache
POST /api/cache/clear
Response: {
  "success": true,
  "message": "Cache cleared successfully",
  "freedSpace": "45.2 MB"
}

// Clear specific iteration
DELETE /api/cache/iterations/:id
Response: {
  "success": true,
  "message": "Iteration cache cleared"
}

// Force refresh iteration (clear + fetch)
POST /api/cache/refresh/:id
Response: {
  "success": true,
  "message": "Iteration refreshed",
  "fetchTime": "4.2s"
}
```

---

## 7. Alternative Architectures (NOT Recommended)

### SQLite Database

**Pros:**
- Structured queries
- Better for large datasets
- ACID transactions

**Cons:**
- Overkill for this use case
- Requires migrations
- Harder to inspect/debug
- External dependency

**Verdict:** Not worth the complexity

### Redis In-Memory Cache

**Pros:**
- Very fast
- Built-in TTL
- Distributed caching

**Cons:**
- External service required
- Lost on restart (unless persistent)
- Overkill for single-user app
- Deployment complexity

**Verdict:** Not needed for local-first app

### Background Job Pre-Calculation

**Pros:**
- Dashboard always instant
- No user-facing delays

**Cons:**
- Data can be stale
- Requires cron/scheduler
- More moving parts
- Doesn't solve real-time updates

**Verdict:** Good for future, but caching is simpler

---

## 8. Migration Path (Current → Cached)

### Step 1: Deploy Cache Layer (No Breaking Changes)

```bash
# 1. Create cache directory
mkdir -p src/data/cache

# 2. Add environment variable
echo "ENABLE_CACHING=true" >> .env

# 3. Deploy updated code (cache is opt-in)
npm run deploy
```

**Impact:** Zero downtime, falls back to GitLab if cache fails

### Step 2: Prime Cache (First Run)

```bash
# Load dashboard once (populates cache)
curl "http://localhost:3000/api/metrics/all?iterations=..."

# Check cache
ls -lh src/data/cache/
```

**Result:** Cache populated, subsequent loads fast

### Step 3: Monitor Performance

```bash
# Check cache status
curl "http://localhost:3000/api/cache/status"

# Monitor logs for cache hits/misses
tail -f logs/app.log | grep CACHE
```

### Step 4: Tune TTL (Optional)

```bash
# Experiment with different TTLs
CACHE_TTL_HOURS=3   # More frequent updates
CACHE_TTL_HOURS=12  # Longer cache life
```

---

## 9. Testing Strategy

### Unit Tests

```javascript
// CacheManager.test.js
describe('CacheManager', () => {
  test('should save and load cached iteration', async () => {
    const cache = new CacheManager('./test-cache');
    await cache.initialize();

    const data = { issues: [], iteration: { id: '123' } };
    await cache.setCachedIteration('123', data);

    const loaded = await cache.getCachedIteration('123');
    expect(loaded).toEqual(expect.objectContaining(data));
  });

  test('should return null for stale cache', async () => {
    const cache = new CacheManager('./test-cache');
    cache.ttl = 100; // 100ms TTL for testing

    await cache.setCachedIteration('123', { issues: [] });
    await new Promise(resolve => setTimeout(resolve, 150));

    const loaded = await cache.getCachedIteration('123');
    expect(loaded).toBeNull();
  });
});

// CachedIterationDataProvider.test.js
describe('CachedIterationDataProvider', () => {
  test('should use cache on hit', async () => {
    const mockCache = {
      getCachedIteration: jest.fn().mockResolvedValue({ issues: [] })
    };
    const provider = new CachedIterationDataProvider(null, mockCache);

    await provider.fetchIterationData('123');

    expect(mockCache.getCachedIteration).toHaveBeenCalledWith('123');
  });

  test('should fetch from GitLab on cache miss', async () => {
    const mockCache = {
      getCachedIteration: jest.fn().mockResolvedValue(null),
      setCachedIteration: jest.fn()
    };
    const mockClient = {
      fetchIterations: jest.fn().mockResolvedValue([{ id: '123' }]),
      fetchIterationDetails: jest.fn().mockResolvedValue({ issues: [] }),
      fetchIncidents: jest.fn().mockResolvedValue([])
    };
    const provider = new CachedIterationDataProvider(mockClient, mockCache);

    await provider.fetchIterationData('123');

    expect(mockClient.fetchIterationDetails).toHaveBeenCalledWith('123');
    expect(mockCache.setCachedIteration).toHaveBeenCalled();
  });
});
```

### Integration Tests

```javascript
// integration.test.js
describe('Integration: Cached Data Flow', () => {
  test('end-to-end: cold cache → warm cache', async () => {
    const cache = new CacheManager('./integration-test-cache');
    await cache.clearAll();

    const client = new GitLabClient({ token: '...', projectPath: '...' });
    const provider = new CachedIterationDataProvider(client, cache);

    // First load (cold cache)
    const start1 = Date.now();
    const data1 = await provider.fetchIterationData('gid://gitlab/Iteration/123');
    const time1 = Date.now() - start1;

    expect(data1.issues).toBeDefined();
    expect(time1).toBeGreaterThan(1000); // Slow (GitLab fetch)

    // Second load (warm cache)
    const start2 = Date.now();
    const data2 = await provider.fetchIterationData('gid://gitlab/Iteration/123');
    const time2 = Date.now() - start2;

    expect(data2).toEqual(data1);
    expect(time2).toBeLessThan(200); // Fast (cache hit)
  });
});
```

---

## 10. Conclusion & Next Steps

### Summary

**Problem:** GitLab notes fetching is slow (4-5 seconds per iteration)

**Solution:** Persistent file-based cache with incremental updates

**Expected Performance:**
- Cold cache: 10s (same as current, but now cached)
- Warm cache: < 100ms (100x improvement)
- Incremental update: < 1s (10x improvement)
- Cache hit rate: 70-80% in normal usage

**Implementation Effort:** 2-3 days

**Risk:** Low (additive change, graceful fallback)

### Recommended Next Steps

1. **Review this document** with the team
2. **Approve architecture** (persistent file cache)
3. **Implement Phase 1** (basic caching) - 1 day
4. **Test and validate** performance improvements
5. **Implement Phase 2** (incremental updates) - 1 day
6. **Implement Phase 3** (cache management) - 1 day
7. **Deploy to production** with monitoring

### Files to Create

1. `src/lib/infrastructure/cache/CacheManager.js` (core cache logic)
2. `src/lib/infrastructure/adapters/CachedIterationDataProvider.js` (adapter)
3. `src/server/routes/cache.js` (cache management API)
4. `src/lib/infrastructure/cache/CacheManager.test.js` (tests)
5. `docs/CACHING-ARCHITECTURE.md` (documentation)

### Performance Target

**Before:** 10 seconds per dashboard load
**After:** < 1 second average (with caching)

**User Experience:**
- First visit: Same speed (10s)
- Repeat visits: Near-instant (< 100ms)
- Daily usage: Fast (< 1s average)

---

## Appendix: Code Examples

All implementation code examples are provided inline in sections above:

- Section 1.1: CacheManager.js (full implementation)
- Section 1.2: GitLabClient incremental fetch method
- Section 1.3: CachedIterationDataProvider.js (full implementation)
- Section 1.4: ServiceFactory updates
- Section 6: Cache management API endpoints
- Section 9: Unit and integration tests

---

**Document prepared by:** Claude Code (Anthropic)
**Date:** 2025-11-13
**Status:** Recommendation for Approval
**Next Action:** Review with team and implement Phase 1
