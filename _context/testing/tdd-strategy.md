# TDD Strategy Guide

**Version:** 1.0
**Last Updated:** 2025-01-06
**Reference:** Test-Driven Development (Kent Beck)

---

## Overview

This project follows Test-Driven Development (TDD) principles. Tests are written BEFORE implementation, not after. This document defines the TDD strategy, test structure, coverage requirements, and best practices.

**Key Principle:** RED-GREEN-REFACTOR. Write failing test first, make it pass with minimal code, then refactor. No code without tests.

---

## Why TDD?

### Problems Without Tests (From Prototype)

The prototype had **0% test coverage**, which caused:
- **Fear of refactoring** - "If it ain't broke, don't touch it"
- **Bugs in production** - No safety net
- **Slow feature addition** - Manual testing is time-consuming
- **No confidence** - "Did I break something?"

### Benefits of TDD

1. **Confidence to refactor** - Tests catch regressions
2. **Better design** - TDD forces small, focused functions
3. **Faster development** - Catch bugs early
4. **Living documentation** - Tests show how code works
5. **Higher quality** - Bugs found before production

---

## The RED-GREEN-REFACTOR Cycle

### Step 1: RED - Write Failing Test

Write a test for functionality that doesn't exist yet. The test must fail.

```javascript
// test/core/MetricsCalculator.test.js

import { MetricsCalculator } from '../../src/lib/core/MetricsCalculator.js';

describe('MetricsCalculator', () => {
  test('calculateVelocity sums issue weights', () => {
    const calculator = new MetricsCalculator();
    const issues = [
      { weight: 3 },
      { weight: 5 },
      { weight: 2 }
    ];

    const velocity = calculator.calculateVelocity(issues);

    expect(velocity).toBe(10); // ❌ FAILS - calculateVelocity doesn't exist yet
  });
});
```

**Run test:** `npm test`
**Expected:** Test fails (RED)

### Step 2: GREEN - Make Test Pass

Write the MINIMAL code to make the test pass. Don't over-engineer.

```javascript
// src/lib/core/MetricsCalculator.js

export class MetricsCalculator {
  calculateVelocity(issues) {
    return issues.reduce((sum, issue) => sum + (issue.weight || 0), 0);
  }
}
```

**Run test:** `npm test`
**Expected:** Test passes (GREEN)

### Step 3: REFACTOR - Improve Code

Refactor the code while keeping tests green. Improve design, remove duplication, add JSDoc.

```javascript
// src/lib/core/MetricsCalculator.js

/**
 * Calculate sprint metrics
 * @class
 */
export class MetricsCalculator {
  /**
   * Calculate velocity from issues
   * @param {Array<Issue>} issues - Array of closed issues
   * @returns {number} Sum of issue weights
   */
  calculateVelocity(issues) {
    return issues.reduce((sum, issue) => sum + (issue.weight || 0), 0);
  }
}
```

**Run test:** `npm test`
**Expected:** Test still passes (GREEN)

### Repeat

For each new feature:
1. **RED** - Write failing test
2. **GREEN** - Minimal code to pass
3. **REFACTOR** - Improve while keeping tests green

---

## Test Structure (Arrange-Act-Assert)

### AAA Pattern

Every test follows this structure:

```javascript
test('description of what it should do', () => {
  // ARRANGE - Set up test data and dependencies
  const calculator = new MetricsCalculator();
  const issues = [
    { weight: 3 },
    { weight: 5 }
  ];

  // ACT - Execute the code under test
  const velocity = calculator.calculateVelocity(issues);

  // ASSERT - Verify the result
  expect(velocity).toBe(8);
});
```

**Benefits:**
- Clear test structure
- Easy to understand intent
- Separates setup, execution, verification

### Given-When-Then (Alternative)

```javascript
test('calculateVelocity sums issue weights', () => {
  // GIVEN issues with weights 3 and 5
  const issues = [{ weight: 3 }, { weight: 5 }];
  const calculator = new MetricsCalculator();

  // WHEN calculating velocity
  const velocity = calculator.calculateVelocity(issues);

  // THEN velocity should be 8
  expect(velocity).toBe(8);
});
```

---

## Coverage Requirements

### Minimum Coverage: ≥85%

**Required coverage for all metrics:**
- **Statements:** ≥85%
- **Branches:** ≥85%
- **Functions:** ≥85%
- **Lines:** ≥85%

**Check coverage:**
```bash
npm run test:coverage
```

**Output:**
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   87.5  |   85.2   |   90.1  |   87.3  |
 MetricsCalculator  |   95.0  |   90.0   |  100.0  |   95.0  |
 GitLabClient       |   80.0  |   75.0   |   85.0  |   80.0  |
--------------------|---------|----------|---------|---------|
```

### What to Test

**DO test:**
- ✅ Core business logic (100% coverage target)
- ✅ Edge cases (null, undefined, empty arrays)
- ✅ Error handling
- ✅ Boundary conditions
- ✅ Integration points

**DON'T test:**
- ❌ Third-party libraries (trust they're tested)
- ❌ Generated code
- ❌ Trivial getters/setters
- ❌ Simple pass-through functions

---

## Test Count: 3-10 Strategic Tests Per Module

### Quality Over Quantity

**Goal:** 3-10 strategic tests that cover all important scenarios, not 100 tests that repeat the same logic.

### Example: MetricsCalculator (5 tests)

```javascript
describe('MetricsCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new MetricsCalculator();
  });

  // Test 1: Happy path
  test('calculateVelocity sums issue weights', () => {
    const issues = [{ weight: 3 }, { weight: 5 }, { weight: 2 }];
    expect(calculator.calculateVelocity(issues)).toBe(10);
  });

  // Test 2: Edge case - null weights
  test('calculateVelocity treats null weight as 0', () => {
    const issues = [{ weight: 3 }, { weight: null }, { weight: 5 }];
    expect(calculator.calculateVelocity(issues)).toBe(8);
  });

  // Test 3: Edge case - empty array
  test('calculateVelocity returns 0 for empty array', () => {
    expect(calculator.calculateVelocity([])).toBe(0);
  });

  // Test 4: Edge case - undefined weights
  test('calculateVelocity handles undefined weights', () => {
    const issues = [{ weight: 3 }, {}, { weight: 5 }];
    expect(calculator.calculateVelocity(issues)).toBe(8);
  });

  // Test 5: Large numbers
  test('calculateVelocity handles large values', () => {
    const issues = [{ weight: 1000 }, { weight: 2000 }, { weight: 3000 }];
    expect(calculator.calculateVelocity(issues)).toBe(6000);
  });
});
```

**5 tests cover:**
- Happy path
- Null handling
- Empty input
- Undefined handling
- Large numbers

**Result:** ~95% coverage with 5 focused tests

---

## Test Types Distribution

### 80-90% Unit Tests

**Unit tests:** Test individual functions/classes in isolation.

```javascript
// Unit test - No dependencies, pure function
test('calculateVelocity sums weights', () => {
  const calculator = new MetricsCalculator();
  const issues = [{ weight: 3 }, { weight: 5 }];
  expect(calculator.calculateVelocity(issues)).toBe(8);
});
```

**Characteristics:**
- Fast (milliseconds)
- No external dependencies
- Easy to debug
- High coverage

### 10-20% Integration Tests

**Integration tests:** Test multiple components working together.

```javascript
// Integration test - MetricsService + Repository + Calculator
test('MetricsService calculates and saves metrics', async () => {
  const mockRepository = {
    save: jest.fn()
  };
  const mockGitLabClient = {
    fetchIssuesForSprint: jest.fn().mockResolvedValue([
      { weight: 3 },
      { weight: 5 }
    ])
  };

  const service = new MetricsService(mockGitLabClient, mockRepository);
  const result = await service.calculateAndSaveMetrics('sprint-1');

  expect(result.velocity).toBe(8);
  expect(mockRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({ velocity: 8 })
  );
});
```

**Characteristics:**
- Slower (hundreds of milliseconds)
- Test interactions between components
- Mock external dependencies
- Validate integration points

### Avoid E2E Tests (For Now)

**End-to-end tests:** Full system tests (browser, server, database).

**Why avoid (for now):**
- Very slow (seconds)
- Brittle (many failure points)
- Hard to debug
- Low ROI for local-first tool

**When to add:**
- After Phase 2 (UI complete)
- For critical user workflows
- Use Playwright or Cypress

---

## Mocking Guidelines

### When to Mock

**Mock external dependencies:**
- ✅ GitLab API calls
- ✅ File system operations
- ✅ Network requests
- ✅ Timers and dates
- ✅ External services

**Don't mock:**
- ❌ Core business logic
- ❌ Simple data transformations
- ❌ Pure functions

### Mock Examples

**Mock GitLab Client:**
```javascript
// test/core/MetricsService.test.js

class MockGitLabClient {
  async fetchIssuesForSprint(sprintId) {
    return [
      { id: '1', weight: 3 },
      { id: '2', weight: 5 }
    ];
  }
}

test('MetricsService uses GitLabClient', async () => {
  const mockClient = new MockGitLabClient();
  const service = new MetricsService(mockClient);

  const result = await service.fetchAndCalculateVelocity('sprint-1');

  expect(result).toBe(8);
});
```

**Mock File System:**
```javascript
// test/infrastructure/FileMetricsRepository.test.js

import fs from 'fs/promises';

jest.mock('fs/promises');

test('FileMetricsRepository saves to file', async () => {
  const repository = new FileMetricsRepository('./data');
  const metrics = { velocity: 42 };

  await repository.save(metrics);

  expect(fs.writeFile).toHaveBeenCalledWith(
    expect.stringContaining('metrics.json'),
    JSON.stringify(metrics, null, 2),
    'utf-8'
  );
});
```

**Mock Dates:**
```javascript
// Use fixed date for consistent tests
test('annotation created with current date', () => {
  const mockDate = new Date('2024-01-15T10:00:00Z');
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

  const annotation = createAnnotation({ title: 'Test' });

  expect(annotation.createdAt).toEqual(mockDate);
});
```

---

## Jest Configuration

### jest.config.js

```javascript
export default {
  // Test environment
  testEnvironment: 'node', // Use 'jsdom' for React components

  // Coverage thresholds (ENFORCED)
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 85,
      functions: 85,
      lines: 85
    }
  },

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/test/**',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],

  // Transform ES modules
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],

  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### Test Setup File

```javascript
// src/test/setup.js

// Mock environment variables
process.env.GITLAB_URL = 'https://gitlab.com';
process.env.GITLAB_TOKEN = 'mock-token';
process.env.GITLAB_PROJECT_PATH = 'group/project';
process.env.DATA_DIR = './test-data';

// Global test helpers
global.createMockIssues = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `issue-${i}`,
    weight: i + 1,
    title: `Issue ${i}`
  }));
};
```

---

## Testing Patterns by Layer

### Core Layer (Business Logic)

**Pure functions - Easy to test, no mocking:**

```javascript
// test/core/MetricsCalculator.test.js

describe('MetricsCalculator', () => {
  test('calculateCycleTime computes statistics', () => {
    const calculator = new MetricsCalculator();
    const issues = [
      { createdAt: '2024-01-01T10:00:00Z', closedAt: '2024-01-05T10:00:00Z' }, // 4 days
      { createdAt: '2024-01-02T10:00:00Z', closedAt: '2024-01-04T10:00:00Z' }, // 2 days
      { createdAt: '2024-01-01T10:00:00Z', closedAt: '2024-01-11T10:00:00Z' }  // 10 days
    ];

    const result = calculator.calculateCycleTime(issues);

    expect(result.avg).toBeCloseTo(5.33, 2); // Average
    expect(result.p50).toBe(4); // Median
    expect(result.p90).toBeCloseTo(9.2, 1); // 90th percentile
  });

  test('calculateCycleTime handles empty array', () => {
    const calculator = new MetricsCalculator();
    const result = calculator.calculateCycleTime([]);

    expect(result).toEqual({ avg: 0, p50: 0, p90: 0 });
  });
});
```

### Infrastructure Layer (External Dependencies)

**Mock external dependencies:**

```javascript
// test/infrastructure/GitLabClient.test.js

import { GraphQLClient } from 'graphql-request';
import { GitLabClient } from '../../src/lib/infrastructure/GitLabClient.js';

jest.mock('graphql-request');

describe('GitLabClient', () => {
  let client;
  let mockGraphQLClient;

  beforeEach(() => {
    mockGraphQLClient = {
      request: jest.fn()
    };
    GraphQLClient.mockImplementation(() => mockGraphQLClient);

    client = new GitLabClient('https://gitlab.com', 'token-123');
  });

  test('fetchIterations returns iterations from GraphQL', async () => {
    const mockData = {
      group: {
        iterations: {
          nodes: [
            { id: '1', title: 'Sprint 1', startDate: '2024-01-01', dueDate: '2024-01-14' }
          ]
        }
      }
    };

    mockGraphQLClient.request.mockResolvedValue(mockData);

    const iterations = await client.fetchIterations('group/project');

    expect(iterations).toHaveLength(1);
    expect(iterations[0].title).toBe('Sprint 1');
    expect(mockGraphQLClient.request).toHaveBeenCalledWith(
      expect.stringContaining('query getIterations'),
      expect.objectContaining({ fullPath: 'group/project' })
    );
  });

  test('fetchIterations throws error on failure', async () => {
    mockGraphQLClient.request.mockRejectedValue(new Error('GraphQL error'));

    await expect(client.fetchIterations('group/project')).rejects.toThrow('Failed to fetch iterations');
  });
});
```

### Presentation Layer (React Components)

**React Testing Library:**

```javascript
// test/components/MetricsCard.test.jsx

import { render, screen } from '@testing-library/react';
import { MetricsCard } from '../../src/public/components/MetricsCard.jsx';

describe('MetricsCard', () => {
  const mockMetrics = {
    velocity: 42,
    throughput: 12,
    cycleTime: { avg: 3.5, p50: 3.0, p90: 5.0 }
  };

  test('renders metrics correctly', () => {
    render(<MetricsCard metrics={mockMetrics} />);

    expect(screen.getByText(/42 points/i)).toBeInTheDocument();
    expect(screen.getByText(/12 issues/i)).toBeInTheDocument();
  });

  test('shows loading state', () => {
    render(<MetricsCard metrics={mockMetrics} loading={true} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText(/42 points/i)).not.toBeInTheDocument();
  });

  test('renders cycle time statistics', () => {
    render(<MetricsCard metrics={mockMetrics} />);

    expect(screen.getByText(/3.5/)).toBeInTheDocument(); // avg
    expect(screen.getByText(/3.0/)).toBeInTheDocument(); // p50
    expect(screen.getByText(/5.0/)).toBeInTheDocument(); // p90
  });
});
```

---

## Common Testing Scenarios

### Testing Async Functions

```javascript
test('fetchMetrics retrieves data from API', async () => {
  const mockFetch = jest.fn().mockResolvedValue({
    json: async () => ({ velocity: 42 })
  });
  global.fetch = mockFetch;

  const result = await fetchMetrics('sprint-1');

  expect(result.velocity).toBe(42);
  expect(mockFetch).toHaveBeenCalledWith('/api/metrics/sprint-1');
});
```

### Testing Error Handling

```javascript
test('handles fetch errors gracefully', async () => {
  const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
  global.fetch = mockFetch;

  await expect(fetchMetrics('sprint-1')).rejects.toThrow('Network error');
});
```

### Testing with Timers

```javascript
test('debounces input after 300ms', () => {
  jest.useFakeTimers();

  const mockCallback = jest.fn();
  const debouncedFn = debounce(mockCallback, 300);

  debouncedFn('test');
  debouncedFn('test');
  debouncedFn('test');

  expect(mockCallback).not.toHaveBeenCalled();

  jest.advanceTimersByTime(300);

  expect(mockCallback).toHaveBeenCalledTimes(1);
  expect(mockCallback).toHaveBeenCalledWith('test');

  jest.useRealTimers();
});
```

### Testing React Hooks

```javascript
import { renderHook, waitFor } from '@testing-library/react';
import { useMetrics } from '../../src/public/hooks/useMetrics.js';

test('useMetrics fetches and returns metrics', async () => {
  const mockFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ velocity: 42 })
  });
  global.fetch = mockFetch;

  const { result } = renderHook(() => useMetrics('sprint-1'));

  expect(result.current.loading).toBe(true);
  expect(result.current.metrics).toBeNull();

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.metrics.velocity).toBe(42);
  expect(result.current.error).toBeNull();
});
```

---

## TDD Workflow Example

### Feature: Calculate Deployment Frequency

**Step 1: Write Test (RED)**

```javascript
// test/core/MetricsCalculator.test.js

test('calculateDeploymentFrequency returns deployments per day', () => {
  const calculator = new MetricsCalculator();
  const sprint = {
    startDate: new Date('2024-01-01'),
    dueDate: new Date('2024-01-14') // 14 days
  };
  const pipelines = [
    { status: 'success', ref: 'main', finishedAt: '2024-01-02T10:00:00Z' },
    { status: 'success', ref: 'main', finishedAt: '2024-01-05T10:00:00Z' },
    { status: 'success', ref: 'main', finishedAt: '2024-01-09T10:00:00Z' },
    { status: 'success', ref: 'main', finishedAt: '2024-01-13T10:00:00Z' }
  ];

  const frequency = calculator.calculateDeploymentFrequency(pipelines, sprint);

  expect(frequency).toBeCloseTo(0.286, 3); // 4 deployments / 14 days
});
```

**Run:** `npm test` → ❌ FAILS (method doesn't exist)

**Step 2: Implement (GREEN)**

```javascript
// src/lib/core/MetricsCalculator.js

calculateDeploymentFrequency(pipelines, sprint) {
  const successfulDeployments = pipelines.filter(p =>
    p.status === 'success' && (p.ref === 'main' || p.ref === 'master')
  );

  const sprintDays = (sprint.dueDate - sprint.startDate) / (1000 * 60 * 60 * 24);

  return successfulDeployments.length / sprintDays;
}
```

**Run:** `npm test` → ✅ PASSES

**Step 3: Refactor**

```javascript
/**
 * Calculate deployment frequency
 * @param {Array<Pipeline>} pipelines - Array of pipelines
 * @param {Sprint} sprint - Sprint object
 * @returns {number} Deployments per day
 */
calculateDeploymentFrequency(pipelines, sprint) {
  const deployments = this._filterSuccessfulDeployments(pipelines);
  const durationDays = this._getSprintDurationDays(sprint);
  return deployments.length / durationDays;
}

/**
 * Filter successful main branch deployments
 * @private
 */
_filterSuccessfulDeployments(pipelines) {
  return pipelines.filter(p =>
    p.status === 'success' && (p.ref === 'main' || p.ref === 'master')
  );
}

/**
 * Get sprint duration in days
 * @private
 */
_getSprintDurationDays(sprint) {
  return (sprint.dueDate - sprint.startDate) / (1000 * 60 * 60 * 24);
}
```

**Run:** `npm test` → ✅ STILL PASSES

**Step 4: Add Edge Case Tests**

```javascript
test('calculateDeploymentFrequency excludes failed pipelines', () => {
  const calculator = new MetricsCalculator();
  const sprint = { startDate: new Date('2024-01-01'), dueDate: new Date('2024-01-14') };
  const pipelines = [
    { status: 'success', ref: 'main', finishedAt: '2024-01-02T10:00:00Z' },
    { status: 'failed', ref: 'main', finishedAt: '2024-01-03T10:00:00Z' }
  ];

  expect(calculator.calculateDeploymentFrequency(pipelines, sprint)).toBeCloseTo(0.071, 3);
});

test('calculateDeploymentFrequency excludes feature branch pipelines', () => {
  const calculator = new MetricsCalculator();
  const sprint = { startDate: new Date('2024-01-01'), dueDate: new Date('2024-01-14') };
  const pipelines = [
    { status: 'success', ref: 'main', finishedAt: '2024-01-02T10:00:00Z' },
    { status: 'success', ref: 'feature-branch', finishedAt: '2024-01-03T10:00:00Z' }
  ];

  expect(calculator.calculateDeploymentFrequency(pipelines, sprint)).toBeCloseTo(0.071, 3);
});
```

---

## Test Organization

### Directory Structure

```
test/
├── core/                    # Core layer tests (unit)
│   ├── MetricsCalculator.test.js
│   ├── CorrelationAnalyzer.test.js
│   └── Validator.test.js
├── infrastructure/          # Infrastructure tests (integration)
│   ├── GitLabClient.test.js
│   ├── FileMetricsRepository.test.js
│   └── Logger.test.js
├── components/              # React component tests
│   ├── MetricsCard.test.jsx
│   ├── AnnotationModal.test.jsx
│   └── Chart.test.jsx
├── hooks/                   # Custom hooks tests
│   ├── useMetrics.test.js
│   └── useAnnotations.test.js
├── integration/             # Integration tests
│   └── metrics-workflow.test.js
└── setup.js                 # Test setup
```

---

## Related Documentation

- `_context/architecture/clean-architecture.md` - Testing by layer
- `_context/architecture/solid-principles.md` - Testable design
- `_context/coding/jsdoc-guide.md` - Documenting test types
- `_context/coding/react-conventions.md` - React component testing
- `.claude/agents/test-coverage-agent.md` - Test validation agent

---

## Further Reading

- **Test-Driven Development (Book):** Kent Beck
- **Jest Documentation:** https://jestjs.io/
- **React Testing Library:** https://testing-library.com/react

---

**Remember:** RED-GREEN-REFACTOR. Write test first, make it pass, then improve. Aim for 85% coverage with 3-10 strategic tests per module. Test behavior, not implementation. 🚀
