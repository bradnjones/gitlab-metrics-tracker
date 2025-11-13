# ADR 001: Calculate Metrics On-Demand Instead of Persisting

**Status:** Accepted
**Date:** 2025-11-13
**Context:** Story V9.1 - Persistent File Cache Implementation

---

## Context and Problem Statement

During implementation of Story V9.1 (caching iteration data from GitLab), we discovered that persisting calculated metrics to `data/metrics.json` created several problems:

1. **Race Condition:** Dashboard makes 6 concurrent API calls (velocity, cycle-time, deployment-frequency, lead-time, mttr, change-failure-rate). Each endpoint tried to save metrics to the same JSON file simultaneously, causing read-modify-write collisions that corrupted the file.

2. **File Size Explosion:** Each metric stored full raw iteration data (issues with notes, labels, assignees), causing the JSON file to balloon from 3 bytes to 81MB+ after a single page load.

3. **Architectural Misalignment:** The prototype calculated metrics on-demand from source data. Persisting calculated results adds complexity without clear benefit.

## Decision Drivers

- **Performance:** Metric calculations are extremely fast (~15ms total for all 6 metrics)
- **Simplicity:** On-demand calculation is simpler than managing persistence
- **Data Integrity:** Calculate from source of truth (cached iteration data) ensures accuracy
- **Prototype Alignment:** Prototype calculated on-demand successfully
- **Clean Architecture:** Source data (iterations) is the expensive part to fetch; calculations are cheap

## Considered Options

### Option 1: File Locking (Rejected)
**Approach:** Use `proper-lockfile` to serialize writes to JSON file
**Pros:**
- Keeps current architecture
- Simple library addition

**Cons:**
- Performance bottleneck (serializes 6 parallel requests)
- Doesn't solve file size issue
- Doesn't solve root architectural problem
- Adds complexity

### Option 2: SQLite Database (Rejected for now)
**Approach:** Replace JSON file with SQLite for metrics storage
**Pros:**
- ACID transactions handle concurrency
- Better for production
- Proper query capabilities
- Scales well

**Cons:**
- New dependency
- Requires migration
- Overengineered for current needs
- Still caching derived data unnecessarily

### Option 3: Calculate On-Demand (ACCEPTED)
**Approach:** Remove metrics persistence entirely, calculate from cached iteration data
**Pros:**
- ✅ Eliminates race condition entirely
- ✅ Simplifies architecture
- ✅ Always accurate (no stale data)
- ✅ Aligns with prototype approach
- ✅ Clean Architecture principle: cache expensive operations (GitLab API), recalculate cheap operations (math)
- ✅ Metric calculations are fast (~15ms total)

**Cons:**
- Cannot store historical metric snapshots (if needed in future)
- Must recalculate on every request

## Decision

**We will calculate metrics on-demand from cached iteration data and NOT persist calculated metrics.**

### Rationale

**Performance Analysis:**
```
GitLab API fetch (uncached):  5,000-10,000ms  ← CACHE THIS ✅
Metric calculations (all 6):         ~15ms  ← Fast enough, no cache needed
```

**Cache Strategy:**
- ✅ **DO cache:** Iteration data from GitLab API (expensive: 5-10 seconds)
- ❌ **DON'T cache:** Calculated metrics (cheap: 15ms)

**The math is clear:** Caching iteration data provides 100x performance improvement (10s → <100ms). Caching metrics would add complexity for minimal benefit (15ms → ~0ms is imperceptible to users).

### Implementation Changes

1. **Remove `FileMetricsRepository`** - No longer needed
2. **Remove metrics persistence from `MetricsService`** - Calculate and return, don't save
3. **Keep `IterationCacheRepository`** - This is the valuable cache
4. **Update `ServiceFactory`** - Remove metrics repository dependency
5. **Update tests** - Remove metrics persistence tests, focus on calculation correctness

## Consequences

### Positive
- ✅ **Simpler codebase** - Less code to maintain
- ✅ **No race conditions** - Problem eliminated
- ✅ **Always accurate** - Metrics calculated from latest iteration data
- ✅ **Clean separation** - Cache expensive operations (API calls), recalculate cheap operations (math)
- ✅ **Aligns with prototype** - Proven approach

### Negative
- ❌ **No historical snapshots** - Cannot view how metrics changed over time if iteration data changes
  - *Mitigation:* Not a current requirement. If needed in future, can add append-only metrics log or event sourcing approach
- ❌ **Recalculate every request** - 15ms overhead per request
  - *Mitigation:* 15ms is imperceptible to users; acceptable trade-off for simplicity

### Neutral
- If future requirements need historical metric snapshots, we can:
  - Add append-only event log (avoids race condition)
  - Use SQLite with proper transactions
  - Implement proper event sourcing
- Current decision doesn't preclude future enhancements

## Notes

This decision was made during Story V9.1 implementation after discovering:
1. Cache working perfectly (CACHE HIT everywhere)
2. Metrics persistence causing corruption
3. Calculations being fast enough to recalculate

The decision follows Clean Architecture principles:
- **Cache the boundary crossing** (expensive GitLab API calls)
- **Don't cache pure functions** (cheap calculations)

---

## Related Decisions

- Story V9.1: Persistent File Cache for Iteration Data (implemented)
- Future consideration: If historical metrics needed, revisit with proper design (append-only log, SQLite, event sourcing)
