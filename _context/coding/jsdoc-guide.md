# JSDoc Guide

**Version:** 1.0
**Last Updated:** 2025-01-06
**Reference:** https://jsdoc.app/

---

## Overview

This project uses JSDoc for type annotations instead of TypeScript. JSDoc provides type safety, IDE autocomplete, and documentation without the complexity of a TypeScript build pipeline.

**Key Principle:** All public functions, classes, and modules must have JSDoc annotations. JSDoc serves as both documentation and type checking.

---

## Why JSDoc Instead of TypeScript?

### Advantages of JSDoc (For This Project)

1. **No build step** - JavaScript runs directly in Node.js and browsers
2. **Simpler tooling** - No transpilation, no tsconfig.json complexity
3. **Gradual adoption** - Can add types incrementally
4. **Standard JavaScript** - Works with any JavaScript runtime
5. **Good enough** - Provides 80% of TypeScript benefits with 20% of complexity

### When to Consider TypeScript

**Defer TypeScript until:**
- Codebase stabilizes (Phase 3+)
- JSDoc limitations become painful
- Team has strong TypeScript preference
- Complex type inference needed

**For now:** JSDoc is sufficient for this project's needs.

---

## Basic JSDoc Syntax

### Function Documentation

```javascript
/**
 * Calculate velocity from issues
 * @param {Array<Object>} issues - Array of GitLab issues
 * @returns {number} Sum of issue weights
 */
export function calculateVelocity(issues) {
  return issues.reduce((sum, issue) => sum + (issue.weight || 0), 0);
}
```

**Components:**
- `/** ... */` - JSDoc comment block (note the double asterisk)
- `@param` - Parameter type and description
- `@returns` - Return type and description
- Description on first line

### Parameter Types

```javascript
/**
 * Calculate cycle time statistics
 * @param {Array<Issue>} issues - Array of issue objects
 * @param {boolean} includeOpen - Include open issues (default: false)
 * @param {Object} options - Configuration options
 * @param {number} options.percentile - Percentile to calculate (default: 90)
 * @returns {{avg: number, p50: number, p90: number}} Cycle time statistics
 */
function calculateCycleTime(issues, includeOpen = false, options = {}) {
  // Implementation
}
```

**Nested properties:** Use dot notation for object properties

### Optional Parameters

```javascript
/**
 * Fetch iterations from GitLab
 * @param {string} groupPath - GitLab group path
 * @param {string} [after] - Pagination cursor (optional)
 * @param {number} [limit=100] - Max results per page (default: 100)
 * @returns {Promise<Array<Iteration>>}
 */
async function fetchIterations(groupPath, after, limit = 100) {
  // Implementation
}
```

**Optional:** Use brackets `[paramName]` or `[paramName=default]`

### Return Types

```javascript
/**
 * Fetch project details
 * @returns {Promise<Project>} Project object
 */
async function fetchProject() {
  // Returns Promise<Project>
}

/**
 * Validate sprint dates
 * @returns {void} No return value
 */
function validateDates() {
  // No return
}

/**
 * Get metric or default
 * @returns {number|null} Metric value or null if not found
 */
function getMetric() {
  // Returns number or null
}
```

**Async functions:** Use `Promise<Type>`
**Multiple types:** Use `Type1|Type2`
**No return:** Use `void`

---

## Class Documentation

### Basic Class

```javascript
/**
 * Calculate sprint metrics
 * @class
 */
export class MetricsCalculator {
  /**
   * Create a metrics calculator
   * @param {Object} options - Configuration options
   * @param {boolean} options.includeIncidents - Include incident metrics
   */
  constructor(options = {}) {
    this.includeIncidents = options.includeIncidents || false;
  }

  /**
   * Calculate velocity from issues
   * @param {Array<Issue>} issues - Array of issues
   * @returns {number} Velocity in story points
   */
  calculateVelocity(issues) {
    return issues.reduce((sum, i) => sum + (i.weight || 0), 0);
  }

  /**
   * Calculate all metrics for a sprint
   * @param {Sprint} sprint - Sprint object
   * @param {Array<Issue>} issues - Issues in sprint
   * @returns {Metrics} Calculated metrics
   */
  calculateAll(sprint, issues) {
    return {
      velocity: this.calculateVelocity(issues),
      throughput: issues.length,
      cycleTime: this.calculateCycleTime(issues)
    };
  }
}
```

**Class annotations:**
- `@class` - Mark class
- Document constructor
- Document all public methods
- Private methods: Use `@private` (or prefix with `_`)

### Class with Inheritance

```javascript
/**
 * Base repository interface
 * @interface
 */
export class IRepository {
  /**
   * Save entity
   * @param {Object} entity - Entity to save
   * @returns {Promise<void>}
   * @abstract
   */
  async save(entity) {
    throw new Error('Must implement save()');
  }
}

/**
 * File-based metrics repository
 * @extends IRepository
 */
export class FileMetricsRepository extends IRepository {
  /**
   * @param {string} dataDir - Data directory path
   */
  constructor(dataDir) {
    super();
    this.dataDir = dataDir;
  }

  /**
   * Save metrics to file
   * @override
   * @param {Metrics} metrics - Metrics to save
   * @returns {Promise<void>}
   */
  async save(metrics) {
    // Implementation
  }
}
```

**Inheritance annotations:**
- `@interface` - Abstract interface
- `@abstract` - Abstract method
- `@extends` - Class inheritance
- `@override` - Override parent method

---

## Type Definitions

### Custom Types (typedef)

```javascript
/**
 * Sprint iteration object
 * @typedef {Object} Sprint
 * @property {string} id - Sprint ID
 * @property {string} title - Sprint title
 * @property {Date} startDate - Start date
 * @property {Date} dueDate - Due date
 * @property {string} state - Sprint state (active, closed)
 */

/**
 * GitLab issue object
 * @typedef {Object} Issue
 * @property {string} id - Issue ID
 * @property {number} iid - Issue IID
 * @property {string} title - Issue title
 * @property {number|null} weight - Story points
 * @property {Date} createdAt - Creation timestamp
 * @property {Date|null} closedAt - Closure timestamp
 * @property {Array<string>} labels - Issue labels
 */

/**
 * Metrics object
 * @typedef {Object} Metrics
 * @property {string} sprintId - Sprint ID
 * @property {number} velocity - Velocity in points
 * @property {number} throughput - Issues closed
 * @property {CycleTimeStats} cycleTime - Cycle time statistics
 */

/**
 * Cycle time statistics
 * @typedef {Object} CycleTimeStats
 * @property {number} avg - Average cycle time (days)
 * @property {number} p50 - Median cycle time (days)
 * @property {number} p90 - 90th percentile cycle time (days)
 */

// Now use the types
/**
 * Calculate metrics for sprint
 * @param {Sprint} sprint - Sprint object
 * @param {Array<Issue>} issues - Issues in sprint
 * @returns {Metrics} Calculated metrics
 */
export function calculateMetrics(sprint, issues) {
  // Implementation
}
```

**typedef usage:**
- Define once at top of file or in separate types file
- Reuse throughout codebase
- IDE provides autocomplete for properties

### Import Types from Other Files

```javascript
// types.js - Central type definitions
/**
 * @typedef {Object} Sprint
 * @property {string} id
 * @property {string} title
 */

// metrics.js - Use types from other file
/**
 * @param {import('./types.js').Sprint} sprint
 * @returns {number}
 */
export function getSprintDuration(sprint) {
  // Implementation
}
```

**Import syntax:** `{import('./path/to/file.js').TypeName}`

---

## Advanced Patterns

### Generic Arrays

```javascript
/**
 * Get first element of array
 * @template T
 * @param {Array<T>} array - Input array
 * @returns {T|undefined} First element or undefined
 */
function first(array) {
  return array[0];
}

// Usage preserves type
const nums = [1, 2, 3];
const firstNum = first(nums); // Type: number|undefined
```

### Union Types

```javascript
/**
 * Format metric value
 * @param {number|string|null} value - Value to format
 * @returns {string} Formatted value
 */
function formatMetric(value) {
  if (value === null) return 'N/A';
  if (typeof value === 'string') return value;
  return value.toFixed(2);
}
```

### Callback Functions

```javascript
/**
 * Filter issues by predicate
 * @param {Array<Issue>} issues - Issues to filter
 * @param {function(Issue): boolean} predicate - Filter function
 * @returns {Array<Issue>} Filtered issues
 */
function filterIssues(issues, predicate) {
  return issues.filter(predicate);
}

// Alternative callback syntax
/**
 * Process issues with callback
 * @callback IssueProcessor
 * @param {Issue} issue - Issue to process
 * @returns {void}
 */

/**
 * @param {Array<Issue>} issues
 * @param {IssueProcessor} processor
 */
function processIssues(issues, processor) {
  issues.forEach(processor);
}
```

### Async Functions

```javascript
/**
 * Fetch and calculate metrics
 * @async
 * @param {string} sprintId - Sprint ID
 * @returns {Promise<Metrics>} Calculated metrics
 * @throws {Error} If sprint not found
 */
async function fetchMetrics(sprintId) {
  const sprint = await fetchSprint(sprintId);
  if (!sprint) {
    throw new Error('Sprint not found');
  }
  return calculateMetrics(sprint);
}
```

**Async annotations:**
- `@async` - Mark as async function
- `@returns {Promise<Type>}` - Return type
- `@throws {ErrorType}` - Document errors

### Destructured Parameters

```javascript
/**
 * Create annotation
 * @param {Object} params - Annotation parameters
 * @param {string} params.title - Annotation title
 * @param {string} params.type - Event type
 * @param {Date} params.date - Event date
 * @param {'positive'|'negative'|'neutral'} params.impact - Impact level
 * @param {Array<string>} [params.affectedMetrics] - Affected metrics (optional)
 * @returns {Annotation}
 */
function createAnnotation({ title, type, date, impact, affectedMetrics = [] }) {
  // Implementation
}
```

---

## Project-Specific Patterns

### Core Layer (Pure Business Logic)

```javascript
// src/lib/core/MetricsCalculator.js

/**
 * Pure metrics calculation (no side effects)
 * @class
 */
export class MetricsCalculator {
  /**
   * Calculate velocity from issues
   * @param {Array<Issue>} issues - Array of closed issues
   * @returns {number} Sum of issue weights
   * @example
   * const calculator = new MetricsCalculator();
   * const velocity = calculator.calculateVelocity([
   *   { weight: 3 },
   *   { weight: 5 }
   * ]); // Returns 8
   */
  calculateVelocity(issues) {
    return issues.reduce((sum, issue) => sum + (issue.weight || 0), 0);
  }
}
```

**Core annotations:**
- Document pure functions
- Include `@example` for clarity
- No `@async` (core is synchronous)

### Infrastructure Layer (External Dependencies)

```javascript
// src/lib/infrastructure/GitLabClient.js

import { GraphQLClient } from 'graphql-request';

/**
 * GitLab API client for fetching data
 * @implements {IGitLabClient}
 */
export class GitLabClient {
  /**
   * Create GitLab client
   * @param {string} url - GitLab instance URL
   * @param {string} token - Personal access token
   * @throws {Error} If token is missing
   */
  constructor(url, token) {
    if (!token) {
      throw new Error('GITLAB_TOKEN is required');
    }
    this.url = url;
    this.token = token;
    this.client = new GraphQLClient(`${url}/api/graphql`, {
      headers: { authorization: `Bearer ${token}` }
    });
  }

  /**
   * Fetch iterations from GitLab
   * @async
   * @param {string} groupPath - GitLab group path
   * @returns {Promise<Array<Sprint>>} Array of sprint iterations
   * @throws {Error} If GraphQL query fails
   */
  async fetchIterations(groupPath) {
    const query = `
      query getIterations($fullPath: ID!) {
        group(fullPath: $fullPath) {
          iterations(first: 100) {
            nodes {
              id
              title
              startDate
              dueDate
            }
          }
        }
      }
    `;

    try {
      const data = await this.client.request(query, { fullPath: groupPath });
      return data.group.iterations.nodes;
    } catch (error) {
      throw new Error(`Failed to fetch iterations: ${error.message}`);
    }
  }
}
```

**Infrastructure annotations:**
- Document external dependencies
- `@async` for async methods
- `@throws` for errors
- `@implements` for interfaces

### Presentation Layer (React Components)

```javascript
// src/public/components/MetricsCard.jsx

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Display sprint metrics in a card
 * @component
 * @param {Object} props - Component props
 * @param {Metrics} props.metrics - Metrics to display
 * @param {function} [props.onRefresh] - Refresh callback
 * @returns {React.Element}
 */
export function MetricsCard({ metrics, onRefresh }) {
  return (
    <div className="metrics-card">
      <h3>Sprint Metrics</h3>
      <p>Velocity: {metrics.velocity} points</p>
      <p>Throughput: {metrics.throughput} issues</p>
      {onRefresh && <button onClick={onRefresh}>Refresh</button>}
    </div>
  );
}

// PropTypes for runtime validation
MetricsCard.propTypes = {
  metrics: PropTypes.shape({
    velocity: PropTypes.number.isRequired,
    throughput: PropTypes.number.isRequired,
    cycleTime: PropTypes.object
  }).isRequired,
  onRefresh: PropTypes.func
};
```

**React annotations:**
- `@component` - Mark React component
- Document props with JSDoc
- Use PropTypes for runtime validation
- `@returns {React.Element}`

### Express Routes

```javascript
// src/server/routes/metrics.js

import express from 'express';

const router = express.Router();

/**
 * GET /api/metrics/:sprintId
 * Fetch metrics for a specific sprint
 * @route GET /api/metrics/:sprintId
 * @param {string} req.params.sprintId - Sprint ID
 * @returns {Object} 200 - Metrics object
 * @returns {Error} 404 - Sprint not found
 * @returns {Error} 500 - Server error
 */
router.get('/metrics/:sprintId', async (req, res) => {
  try {
    const metrics = await metricsService.getMetrics(req.params.sprintId);
    if (!metrics) {
      return res.status(404).json({ error: 'Sprint not found' });
    }
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Route annotations:**
- `@route` - HTTP method and path
- Document params, body, returns
- Document error responses

---

## IDE Integration

### VS Code Setup

**1. Enable type checking:**

Create `jsconfig.json` in project root:
```json
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true,
    "moduleResolution": "node",
    "target": "ES2020",
    "module": "ES2020"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**2. Enable IntelliSense:**
- Autocomplete for typed parameters
- Hover to see JSDoc documentation
- Type checking errors in editor

**3. Validate with VS Code:**
- Red squiggly lines for type errors
- Warnings for missing JSDoc
- Autocomplete suggestions

### WebStorm/IntelliJ Setup

- JSDoc supported by default
- Enable JavaScript type checking in settings
- Hover for documentation
- Autocomplete works automatically

---

## Common Patterns

### Validation Functions

```javascript
/**
 * Validate sprint dates
 * @param {Date} startDate - Sprint start date
 * @param {Date} dueDate - Sprint due date
 * @returns {boolean} True if valid
 * @throws {Error} If dates are invalid
 */
function validateSprintDates(startDate, dueDate) {
  if (!(startDate instanceof Date) || !(dueDate instanceof Date)) {
    throw new Error('Dates must be Date objects');
  }
  if (dueDate <= startDate) {
    throw new Error('Due date must be after start date');
  }
  return true;
}
```

### Factory Functions

```javascript
/**
 * Create a new annotation
 * @param {Object} data - Annotation data
 * @param {string} data.title - Title
 * @param {Date} data.date - Event date
 * @returns {Annotation} New annotation object
 */
function createAnnotation(data) {
  return {
    id: generateId(),
    title: data.title,
    date: data.date,
    createdAt: new Date()
  };
}
```

### Helper Functions

```javascript
/**
 * Convert days to milliseconds
 * @param {number} days - Number of days
 * @returns {number} Milliseconds
 */
function daysToMs(days) {
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Check if date is within sprint
 * @param {Date} date - Date to check
 * @param {Sprint} sprint - Sprint object
 * @returns {boolean} True if date is in sprint
 */
function isDateInSprint(date, sprint) {
  return date >= sprint.startDate && date <= sprint.dueDate;
}
```

---

## Testing with JSDoc

### Test Files

```javascript
// test/core/MetricsCalculator.test.js

import { MetricsCalculator } from '../../src/lib/core/MetricsCalculator.js';

/**
 * @typedef {Object} TestIssue
 * @property {number} weight
 */

describe('MetricsCalculator', () => {
  /** @type {MetricsCalculator} */
  let calculator;

  beforeEach(() => {
    calculator = new MetricsCalculator();
  });

  test('calculateVelocity sums issue weights', () => {
    /** @type {Array<TestIssue>} */
    const issues = [
      { weight: 3 },
      { weight: 5 },
      { weight: 2 }
    ];

    const result = calculator.calculateVelocity(issues);
    expect(result).toBe(10);
  });
});
```

**Test annotations:**
- Type test data
- Type test doubles/mocks
- IDE autocomplete in tests

---

## Documentation Generation

### Generate HTML Documentation

Install JSDoc:
```bash
npm install --save-dev jsdoc
```

Add script to `package.json`:
```json
{
  "scripts": {
    "docs": "jsdoc -c jsdoc.json"
  }
}
```

Create `jsdoc.json`:
```json
{
  "source": {
    "include": ["src"],
    "includePattern": ".+\\.js$"
  },
  "opts": {
    "destination": "./docs/api",
    "recurse": true
  },
  "plugins": ["plugins/markdown"]
}
```

Generate:
```bash
npm run docs
```

---

## Best Practices

### DO ✅

1. **Document all public APIs**
   ```javascript
   /**
    * Public function - must have JSDoc
    */
   export function publicFunction() {}
   ```

2. **Use specific types**
   ```javascript
   /** @param {Array<Issue>} issues */ // ✅ Specific
   /** @param {Array} issues */ // ❌ Too generic
   ```

3. **Document parameters completely**
   ```javascript
   /**
    * @param {string} id - Entity ID
    * @param {Object} options - Configuration
    * @param {boolean} options.includeDeleted - Include deleted
    */
   ```

4. **Include examples for complex functions**
   ```javascript
   /**
    * @example
    * const result = complexFunction({ foo: 'bar' });
    * console.log(result); // { baz: 'qux' }
    */
   ```

### DON'T ❌

1. **Don't skip JSDoc on public functions**
   ```javascript
   // ❌ No JSDoc
   export function important() {}
   ```

2. **Don't use `any` type**
   ```javascript
   /** @param {any} data */ // ❌ Defeats type checking
   ```

3. **Don't document obvious things**
   ```javascript
   /**
    * Get name
    * @returns {string} The name // ❌ Redundant
    */
   getName() { return this.name; }
   ```

4. **Don't let JSDoc get stale**
   - Update JSDoc when changing function signature
   - Remove outdated documentation

---

## Migration from Prototype

### Before (No JSDoc)
```javascript
// Prototype - No type information
function calculateMetrics(sprint, issues) {
  const velocity = issues.reduce((sum, i) => sum + i.weight, 0);
  return { velocity };
}
```

### After (With JSDoc)
```javascript
/**
 * Calculate metrics for a sprint
 * @param {Sprint} sprint - Sprint object
 * @param {Array<Issue>} issues - Array of closed issues
 * @returns {Metrics} Calculated metrics
 */
function calculateMetrics(sprint, issues) {
  const velocity = issues.reduce((sum, i) => sum + (i.weight || 0), 0);
  return { velocity };
}
```

**Benefits:**
- IDE knows `sprint` is a `Sprint` object
- Autocomplete for `sprint.startDate`, `sprint.dueDate`, etc.
- Type error if passing wrong type
- Documentation visible on hover

---

## Related Documentation

- `_context/architecture/clean-architecture.md` - Architecture layers
- `_context/architecture/solid-principles.md` - SOLID principles
- `_context/coding/react-conventions.md` - React component patterns
- `_context/testing/tdd-strategy.md` - Test documentation

---

## Further Reading

- **JSDoc Official:** https://jsdoc.app/
- **TypeScript JSDoc Support:** https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
- **VS Code JSDoc:** https://code.visualstudio.com/docs/languages/javascript#_jsdoc-support

---

**Remember:** JSDoc is documentation AND type safety. Write it for humans first, type checker second. Keep it clear, concise, and up-to-date. 🚀
