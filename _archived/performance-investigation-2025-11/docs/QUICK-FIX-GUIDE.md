# Quick Fix Guide - Performance Optimization

**Goal:** Reduce dashboard load time from 10 seconds to 2-3 seconds

---

## Fix #1: Reduce Notes Limit (HIGHEST IMPACT)

**Expected Improvement:** 30-50% faster (4000ms → 2000-2800ms per iteration with issues)

**File:** `/Users/brad/dev/smi/gitlab-metrics-tracker/src/lib/infrastructure/api/GitLabClient.js`

**Line:** 253

**Change:**
```javascript
// BEFORE
notes(first: 20) {

// AFTER
notes(first: 5) {
```

**Why:** Fetching issue notes is the #1 bottleneck (88% of query time). Most "In Progress" status changes occur in the first 5 notes.

**Risk:** May miss some "In Progress" timestamps. Validate with data analysis.

**Test:** Run performance-test.js before and after to measure improvement.

---

## Fix #2: Add Aggregated Endpoint (CRITICAL)

**Expected Improvement:** 40-50% faster (eliminates 6 separate API calls)

**File:** `/Users/brad/dev/smi/gitlab-metrics-tracker/src/server/routes/metrics.js`

**Add new route at end of file (before `export default router`):**

```javascript
/**
 * GET /api/metrics/all
 * Calculate ALL metrics for iterations in a single request
 * This eliminates the need for 6 separate API calls from the frontend
 */
router.get('/all', async (req, res) => {
  try {
    const { iterations } = req.query;

    if (!iterations) {
      return res.status(400).json({
        error: {
          message: 'Missing required parameter: iterations',
          details: 'Provide comma-separated iteration IDs in query string'
        }
      });
    }

    const iterationIds = iterations.split(',').map(id => id.trim());
    const metricsService = ServiceFactory.createMetricsService();

    // Fetch ALL data ONCE
    const allMetrics = await metricsService.calculateMultipleMetrics(iterationIds);

    // Transform to all 6 metric formats
    const response = {
      velocity: allMetrics.map(m => ({
        iterationId: m.iterationId,
        iterationTitle: m.iterationTitle,
        startDate: m.startDate,
        dueDate: m.endDate,
        totalPoints: m.velocityPoints + (m.rawData?.issues.filter(i => i.state !== 'closed').reduce((sum, i) => sum + (i.weight || 1), 0) || 0),
        completedPoints: m.velocityPoints,
        totalStories: m.issueCount,
        completedStories: m.velocityStories
      })),

      cycleTime: allMetrics.map(m => ({
        iterationId: m.iterationId,
        iterationTitle: m.iterationTitle,
        startDate: m.startDate,
        dueDate: m.endDate,
        cycleTimeAvg: m.cycleTimeAvg,
        cycleTimeP50: m.cycleTimeP50,
        cycleTimeP90: m.cycleTimeP90
      })),

      deploymentFrequency: allMetrics.map(m => ({
        iterationId: m.iterationId,
        iterationTitle: m.iterationTitle,
        startDate: m.startDate,
        dueDate: m.endDate,
        deploymentFrequency: m.deploymentFrequency
      })),

      leadTime: allMetrics.map(m => ({
        iterationId: m.iterationId,
        iterationTitle: m.iterationTitle,
        startDate: m.startDate,
        dueDate: m.endDate,
        leadTimeAvg: m.leadTimeAvg,
        leadTimeP50: m.leadTimeP50,
        leadTimeP90: m.leadTimeP90
      })),

      mttr: allMetrics.map(m => ({
        iterationId: m.iterationId,
        iterationTitle: m.iterationTitle,
        startDate: m.startDate,
        dueDate: m.endDate,
        mttrAvg: m.mttrAvg,
        incidentCount: m.incidentCount
      })),

      changeFailureRate: allMetrics.map(m => ({
        iterationId: m.iterationId,
        iterationTitle: m.iterationTitle,
        startDate: m.startDate,
        dueDate: m.endDate,
        changeFailureRate: m.changeFailureRate,
        deploymentCount: m.deploymentCount,
        incidentCount: m.incidentCount
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('[API Error] Failed to calculate all metrics:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: {
        message: 'Failed to calculate metrics',
        details: error.message
      }
    });
  }
});
```

**Frontend Changes:** Update your dashboard component to use the new endpoint:

```javascript
// BEFORE - 6 separate calls
const [velocity, cycleTime, deployFreq, leadTime, mttr, cfr] = await Promise.all([
  fetch(`/api/metrics/velocity?iterations=${iterationIds}`),
  fetch(`/api/metrics/cycle-time?iterations=${iterationIds}`),
  fetch(`/api/metrics/deployment-frequency?iterations=${iterationIds}`),
  fetch(`/api/metrics/lead-time?iterations=${iterationIds}`),
  fetch(`/api/metrics/mttr?iterations=${iterationIds}`),
  fetch(`/api/metrics/change-failure-rate?iterations=${iterationIds}`)
]);

// AFTER - 1 call
const response = await fetch(`/api/metrics/all?iterations=${iterationIds}`);
const { velocity, cycleTime, deploymentFrequency, leadTime, mttr, changeFailureRate } = await response.json();
```

---

## Fix #3: Frontend Session Caching (EASY WIN)

**Expected Improvement:** Near-instant on repeat loads

**Create new file:** `/Users/brad/dev/smi/gitlab-metrics-tracker/src/public/js/utils/cache.js`

```javascript
/**
 * Simple session cache for API responses
 * Caches data for 1 minute in browser sessionStorage
 */
export class SessionCache {
  constructor(ttlMs = 60000) {
    this.ttl = ttlMs;
  }

  get(key) {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;

      const { data, timestamp } = JSON.parse(item);
      const age = Date.now() - timestamp;

      if (age > this.ttl) {
        sessionStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  set(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  clear() {
    sessionStorage.clear();
  }
}
```

**Use in your dashboard component:**

```javascript
import { SessionCache } from './utils/cache.js';

const cache = new SessionCache(60000); // 1 minute cache

async function fetchAllMetrics(iterationIds) {
  const cacheKey = `metrics_all_${iterationIds.join('_')}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('[CACHE HIT] Returning cached metrics');
    return cached;
  }

  // Fetch from API
  console.log('[CACHE MISS] Fetching from API...');
  const response = await fetch(`/api/metrics/all?iterations=${iterationIds.join(',')}`);
  const data = await response.json();

  // Store in cache
  cache.set(cacheKey, data);

  return data;
}
```

---

## Testing the Fixes

### Before Changes
```bash
# Run performance test to establish baseline
node performance-test.js 6

# Note the times:
# - Sequential: ~14 seconds
# - Parallel: ~10 seconds
```

### After Each Fix
```bash
# Test after Fix #1 (notes reduction)
node performance-test.js 6
# Expected: ~6-7 seconds (30-40% improvement)

# Test after Fix #2 (aggregated endpoint)
node performance-test.js 6
# Expected: ~3-4 seconds (60-70% total improvement)

# Test after Fix #3 (frontend cache)
# Load dashboard twice
# Expected: First load ~3-4s, second load < 1s
```

---

## Validation Checklist

After implementing all fixes:

- [ ] Performance test shows 60-70% improvement
- [ ] All 6 metrics display correctly on dashboard
- [ ] Metrics values match previous implementation
- [ ] Cache works (second page load is instant)
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## If Something Goes Wrong

### Fix #1 breaks cycle time accuracy
**Symptom:** Cycle time values are missing or incorrect
**Solution:** Increase notes limit from 5 to 10 or 15
**File:** GitLabClient.js line 253

### Fix #2 returns wrong data
**Symptom:** Charts show incorrect values
**Solution:** Compare transformation logic with individual endpoints
**Debug:** Add console.log to see what data is being returned

### Fix #3 shows stale data
**Symptom:** Changes don't appear after refresh
**Solution:** Clear session storage or reduce cache TTL
**Manual fix:** `sessionStorage.clear()` in browser console

---

## Rollback Plan

If fixes cause problems:

```bash
# Revert all changes
git checkout src/lib/infrastructure/api/GitLabClient.js
git checkout src/server/routes/metrics.js

# Or revert specific fixes
git diff HEAD -- src/lib/infrastructure/api/GitLabClient.js  # See changes
git checkout -- src/lib/infrastructure/api/GitLabClient.js    # Revert
```

---

## Expected Final Results

**Current Performance:**
- Dashboard load: ~10 seconds
- User frustration: High

**After All Fixes:**
- Dashboard load: 2-3 seconds (first load)
- Dashboard load: < 1 second (cached)
- User satisfaction: High ✅

**Improvement:** 70-80% faster

---

## Next Steps After Quick Fixes

If 2-3 seconds is still too slow:

1. **Background job processing** (Phase 3 from report)
   - Pre-calculate metrics every 6 hours
   - Dashboard loads in < 100ms
   - Data is slightly stale (acceptable for analytics)

2. **Database instead of file storage**
   - Faster reads
   - Better querying
   - Supports background jobs

See full PERFORMANCE-ANALYSIS-REPORT.md for details.

---

## Support

**Questions?** Review the full performance analysis report:
`/Users/brad/dev/smi/gitlab-metrics-tracker/PERFORMANCE-ANALYSIS-REPORT.md`

**Performance testing:**
```bash
node performance-test.js [num_iterations]
```

**Instrumented files available for production monitoring:**
- `src/lib/infrastructure/api/GitLabClient-instrumented.js`
- `src/lib/infrastructure/adapters/GitLabIterationDataProvider-instrumented.js`
