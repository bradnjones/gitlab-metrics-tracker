# Metrics Formulas Reference

**Version:** 1.0
**Last Updated:** 2025-01-06
**Prototype Reference:** `/Users/brad/dev/smi/gitlab-sprint-metrics/src/lib/metrics.js`

---

## Overview

This document defines the exact calculation formulas for all six core metrics, based on the working prototype. These formulas are **proven in production** with real GitLab data.

**IMPORTANT:** These formulas must match the prototype exactly. Any deviations require Product Owner approval.

---

## 1. Velocity

### Definition
Sum of story points (issue weights) completed in a sprint.

### Formula
```
Velocity = Σ(closed_issue.weight) for all closed issues in sprint
```

### Calculation Details
- **Data Source:** GitLab issues with `state: closed`
- **Weight Field:** `issue.weight` (integer, can be null)
- **Null Handling:** Treat `null` or `undefined` weight as `0`
- **Sprint Boundary:** Issues closed between `iteration.startDate` and `iteration.dueDate`

### Prototype Reference
**File:** `gitlab-sprint-metrics/src/lib/metrics.js`
**Function:** `calculateVelocity(issues)`

```javascript
function calculateVelocity(issues) {
  return issues.reduce((sum, issue) => {
    return sum + (issue.weight || 0);
  }, 0);
}
```

### Example
```javascript
// Sprint with 5 closed issues
const issues = [
  { weight: 3 },
  { weight: 5 },
  { weight: 2 },
  { weight: null },  // Treated as 0
  { weight: 8 }
];

// Velocity = 3 + 5 + 2 + 0 + 8 = 18 points
```

### Visualization
- **Chart Type:** Line chart (trend over sprints)
- **Y-Axis:** Story points
- **X-Axis:** Sprint/iteration
- **Data Point:** One velocity value per sprint

---

## 2. Throughput

### Definition
Count of issues closed during a sprint (regardless of weight).

### Formula
```
Throughput = COUNT(closed issues in sprint)
```

### Calculation Details
- **Data Source:** GitLab issues with `state: closed`
- **Sprint Boundary:** Issues closed between `iteration.startDate` and `iteration.dueDate`
- **Count All:** Includes weighted and unweighted issues

### Prototype Reference
**File:** `gitlab-sprint-metrics/src/lib/metrics.js`
**Function:** `calculateThroughput(issues)`

```javascript
function calculateThroughput(issues) {
  return issues.length;
}
```

### Example
```javascript
// Sprint with 12 closed issues (various weights)
const issues = [
  { weight: 3 },
  { weight: null },
  { weight: 5 },
  // ... 9 more issues
];

// Throughput = 12 issues
```

### Visualization
- **Chart Type:** Bar chart
- **Y-Axis:** Issue count
- **X-Axis:** Sprint/iteration
- **Data Point:** One throughput value per sprint

---

## 3. Cycle Time

### Definition
Time from issue creation to closure (in days).

### Formula
```
Cycle Time (days) = (closedAt - createdAt) / (1000 * 60 * 60 * 24)

Aggregate Metrics:
- Average: MEAN(all cycle times)
- P50 (Median): 50th percentile
- P90: 90th percentile
```

### Calculation Details
- **Data Source:** GitLab issues with `state: closed`
- **Date Fields:** `issue.createdAt`, `issue.closedAt` (ISO 8601 timestamps)
- **Unit:** Days (decimal precision)
- **Filter:** Only closed issues (open issues have no cycle time yet)

### Prototype Reference
**File:** `gitlab-sprint-metrics/src/lib/metrics.js`
**Function:** `calculateCycleTime(issues)`

```javascript
import { mean, quantile } from 'simple-statistics';

function calculateCycleTime(issues) {
  const cycleTimes = issues
    .filter(issue => issue.closedAt)
    .map(issue => {
      const created = new Date(issue.createdAt);
      const closed = new Date(issue.closedAt);
      const days = (closed - created) / (1000 * 60 * 60 * 24);
      return days;
    });

  if (cycleTimes.length === 0) {
    return { avg: 0, p50: 0, p90: 0 };
  }

  return {
    avg: mean(cycleTimes),
    p50: quantile(cycleTimes, 0.5),
    p90: quantile(cycleTimes, 0.9)
  };
}
```

### Example
```javascript
const issues = [
  { createdAt: '2024-01-01T10:00:00Z', closedAt: '2024-01-05T15:00:00Z' }, // 4.2 days
  { createdAt: '2024-01-02T10:00:00Z', closedAt: '2024-01-04T10:00:00Z' }, // 2.0 days
  { createdAt: '2024-01-01T10:00:00Z', closedAt: '2024-01-15T10:00:00Z' }, // 14.0 days
  // ... more issues
];

// Result:
// avg: 6.73 days (mean)
// p50: 4.2 days (median)
// p90: 13.4 days (90th percentile)
```

### Visualization
- **Chart Type:** Multi-line chart
- **Y-Axis:** Days
- **X-Axis:** Sprint/iteration
- **Lines:** 3 lines (Average, P50, P90)
- **Color Coding:** Avg (blue), P50 (green), P90 (orange)

---

## 4. Deployment Frequency

### Definition
Average number of deployments per day during a sprint.

### Formula
```
Deployment Frequency =
  COUNT(successful pipelines on main/master) / sprint_duration_days

Sprint Duration = (iteration.dueDate - iteration.startDate) / (1000 * 60 * 60 * 24)
```

### Calculation Details
- **Data Source:** GitLab pipelines
- **Filters:**
  - `status: 'success'`
  - `ref: 'main'` OR `ref: 'master'` (target branch)
  - `finishedAt` between `iteration.startDate` and `iteration.dueDate`
- **Unit:** Deployments per day (decimal)
- **Sprint Duration:** Calculated from iteration dates

### Prototype Reference
**File:** `gitlab-sprint-metrics/src/lib/metrics.js`
**Function:** `calculateDeploymentFrequency(pipelines, iteration)`

```javascript
function calculateDeploymentFrequency(pipelines, iteration) {
  const deployments = pipelines.filter(pipeline => {
    return pipeline.status === 'success' &&
           (pipeline.ref === 'main' || pipeline.ref === 'master') &&
           new Date(pipeline.finishedAt) >= new Date(iteration.startDate) &&
           new Date(pipeline.finishedAt) <= new Date(iteration.dueDate);
  });

  const sprintDays = (
    new Date(iteration.dueDate) - new Date(iteration.startDate)
  ) / (1000 * 60 * 60 * 24);

  return deployments.length / sprintDays;
}
```

### Example
```javascript
const iteration = {
  startDate: '2024-01-01T00:00:00Z',
  dueDate: '2024-01-14T23:59:59Z'  // 14 days
};

const pipelines = [
  { status: 'success', ref: 'main', finishedAt: '2024-01-02T14:00:00Z' },
  { status: 'success', ref: 'main', finishedAt: '2024-01-05T10:00:00Z' },
  { status: 'success', ref: 'main', finishedAt: '2024-01-09T16:00:00Z' },
  { status: 'success', ref: 'feature-branch', finishedAt: '2024-01-10T10:00:00Z' }, // Excluded (not main)
  { status: 'failed', ref: 'main', finishedAt: '2024-01-11T12:00:00Z' }, // Excluded (failed)
  { status: 'success', ref: 'main', finishedAt: '2024-01-13T09:00:00Z' }
];

// Successful main deployments: 4
// Sprint duration: 14 days
// Deployment Frequency = 4 / 14 = 0.286 deployments/day (~2 per week)
```

### Visualization
- **Chart Type:** Bar chart
- **Y-Axis:** Deployments per day
- **X-Axis:** Sprint/iteration
- **Data Point:** One frequency value per sprint

---

## 5. Lead Time

### Definition
Time from first commit to merge for merged merge requests (in days).

### Formula
```
Lead Time (days) = (mergedAt - firstCommitCreatedAt) / (1000 * 60 * 60 * 24)

Aggregate Metrics:
- Average: MEAN(all lead times)
- P50 (Median): 50th percentile
- P90: 90th percentile
```

### Calculation Details
- **Data Source:** GitLab merge requests
- **Filters:**
  - `state: 'merged'`
  - `mergedAt` between `iteration.startDate` and `iteration.dueDate`
- **Date Fields:**
  - `mergeRequest.commits[0].createdAt` (first commit timestamp)
  - `mergeRequest.mergedAt` (merge timestamp)
- **Unit:** Days (decimal precision)

### Prototype Reference
**File:** `gitlab-sprint-metrics/src/lib/metrics.js`
**Function:** `calculateLeadTime(mergeRequests)`

```javascript
import { mean, quantile } from 'simple-statistics';

function calculateLeadTime(mergeRequests) {
  const leadTimes = mergeRequests
    .filter(mr => mr.mergedAt && mr.commits && mr.commits.length > 0)
    .map(mr => {
      const firstCommit = new Date(mr.commits[0].createdAt);
      const merged = new Date(mr.mergedAt);
      const days = (merged - firstCommit) / (1000 * 60 * 60 * 24);
      return days;
    });

  if (leadTimes.length === 0) {
    return { avg: 0, p50: 0, p90: 0 };
  }

  return {
    avg: mean(leadTimes),
    p50: quantile(leadTimes, 0.5),
    p90: quantile(leadTimes, 0.9)
  };
}
```

### Example
```javascript
const mergeRequests = [
  {
    mergedAt: '2024-01-05T14:00:00Z',
    commits: [
      { createdAt: '2024-01-03T10:00:00Z' }, // First commit
      { createdAt: '2024-01-04T15:00:00Z' }
    ]
  },
  // Lead Time = 2.17 days
  // ... more MRs
];
```

### Visualization
- **Chart Type:** Multi-line chart
- **Y-Axis:** Days
- **X-Axis:** Sprint/iteration
- **Lines:** 3 lines (Average, P50, P90)
- **Color Coding:** Avg (blue), P50 (green), P90 (orange)

---

## 6. MTTR (Mean Time To Recovery)

### Definition
Average time to resolve incidents (in hours).

### Formula
```
MTTR (hours) = MEAN(incident resolution times)

Incident Resolution Time (hours) =
  (closedAt - createdAt) / (1000 * 60 * 60)
```

### Calculation Details
- **Data Source:** GitLab issues with `type: INCIDENT`
- **Filters:**
  - `issueType: 'INCIDENT'`
  - `state: 'closed'`
  - `createdAt` between `iteration.startDate` and `iteration.dueDate`
- **Date Fields:** `issue.createdAt`, `issue.closedAt` (ISO 8601 timestamps)
- **Unit:** Hours (decimal precision)
- **Handle Zero:** If no incidents, MTTR = 0 (or null)

### Prototype Reference
**File:** `gitlab-sprint-metrics/src/lib/metrics.js`
**Function:** `calculateMTTR(incidents)`

```javascript
import { mean } from 'simple-statistics';

function calculateMTTR(incidents) {
  const resolutionTimes = incidents
    .filter(incident => incident.closedAt)
    .map(incident => {
      const created = new Date(incident.createdAt);
      const closed = new Date(incident.closedAt);
      const hours = (closed - created) / (1000 * 60 * 60);
      return hours;
    });

  if (resolutionTimes.length === 0) {
    return 0; // No incidents = 0 MTTR
  }

  return mean(resolutionTimes);
}
```

### Example
```javascript
const incidents = [
  { createdAt: '2024-01-05T10:00:00Z', closedAt: '2024-01-05T14:30:00Z' }, // 4.5 hours
  { createdAt: '2024-01-10T08:00:00Z', closedAt: '2024-01-10T10:00:00Z' }, // 2.0 hours
  { createdAt: '2024-01-12T15:00:00Z', closedAt: '2024-01-13T09:00:00Z' }, // 18.0 hours
];

// MTTR = (4.5 + 2.0 + 18.0) / 3 = 8.17 hours
```

### Visualization
- **Chart Type:** Bar chart
- **Y-Axis:** Hours
- **X-Axis:** Sprint/iteration
- **Data Point:** One MTTR value per sprint
- **Special:** Show "No incidents" if MTTR = 0

---

## Dependencies

All metric calculations use the `simple-statistics` library for statistical functions:

```javascript
import { mean, quantile } from 'simple-statistics';
```

### Functions Used
- `mean(array)` - Calculate arithmetic mean
- `quantile(array, p)` - Calculate percentile (p = 0.5 for P50, p = 0.9 for P90)

---

## Testing Guidance

### Test Coverage Per Metric

Each metric calculation should have 3-5 tests:

1. **Happy path** - Normal calculation with valid data
2. **Empty data** - Handle empty arrays gracefully
3. **Null/undefined handling** - Handle missing fields
4. **Edge cases** - Zero values, very large values
5. **Boundary conditions** - Sprint date boundaries

### Example Test Structure
```javascript
describe('calculateVelocity', () => {
  test('calculates sum of issue weights', () => {
    const issues = [
      { weight: 3 },
      { weight: 5 },
      { weight: 2 }
    ];
    expect(calculateVelocity(issues)).toBe(10);
  });

  test('treats null weight as 0', () => {
    const issues = [
      { weight: 3 },
      { weight: null },
      { weight: 5 }
    ];
    expect(calculateVelocity(issues)).toBe(8);
  });

  test('returns 0 for empty array', () => {
    expect(calculateVelocity([])).toBe(0);
  });
});
```

---

## Related Documentation

- `_context/domain/annotation-system.md` - How annotations affect metrics
- `_context/domain/gitlab-api-patterns.md` - How to fetch data for metrics
- `_context/reference/prototype-lessons.md` - Lessons learned from prototype
- `.claude/agents/product-owner.md` - Validates metric formulas

---

**IMPORTANT:** These formulas are battle-tested with real GitLab data. Do not modify without Product Owner agent validation and prototype comparison.
