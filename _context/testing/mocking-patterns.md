# Mocking Patterns

**Version:** 1.0
**Last Updated:** 2025-11-06

## Overview

Mocking is essential for isolating code under test and controlling external dependencies. This document outlines when and how to mock effectively in our Clean Architecture application.

## Core Principle: Mock at the Boundaries

**Golden Rule:** Only mock external dependencies, never internal business logic.

```
Core Layer (No Mocks)
    ↓
Infrastructure Layer (Mock external I/O: APIs, fs, databases)
    ↓
Presentation Layer (Mock infrastructure dependencies)
```

## When to Mock

### DO Mock:
- External APIs (GitLab GraphQL API)
- File system operations (fs module)
- Database connections
- Network requests
- Date/time functions (for deterministic tests)
- Browser APIs (localStorage, fetch)
- Third-party libraries with side effects

### DON'T Mock:
- Core business logic
- Pure functions
- Domain entities
- Simple utilities (array operations, string manipulation)
- React itself
- Your own code unless it crosses boundaries

## Jest Mock Functions

### Basic Mock Function

```javascript
// Create a mock function
const mockCallback = jest.fn();

// Call it
mockCallback('test', 123);

// Assertions
expect(mockCallback).toHaveBeenCalled();
expect(mockCallback).toHaveBeenCalledWith('test', 123);
expect(mockCallback).toHaveBeenCalledTimes(1);
```

### Mock with Return Values

```javascript
// Simple return value
const mockFn = jest.fn().mockReturnValue(42);
expect(mockFn()).toBe(42);

// Different return values for each call
const mockFn = jest.fn()
  .mockReturnValueOnce(1)
  .mockReturnValueOnce(2)
  .mockReturnValue(3);

expect(mockFn()).toBe(1);
expect(mockFn()).toBe(2);
expect(mockFn()).toBe(3);
expect(mockFn()).toBe(3);
```

### Mock Resolved/Rejected Promises

```javascript
// Successful promise
const mockAsyncFn = jest.fn().mockResolvedValue({ data: 'success' });
const result = await mockAsyncFn();
expect(result).toEqual({ data: 'success' });

// Failed promise
const mockFailFn = jest.fn().mockRejectedValue(new Error('API Error'));
await expect(mockFailFn()).rejects.toThrow('API Error');
```

### Mock Implementation

```javascript
// Custom implementation
const mockCalculate = jest.fn((a, b) => a + b);
expect(mockCalculate(2, 3)).toBe(5);

// Different implementations per call
const mockFn = jest.fn()
  .mockImplementationOnce(() => 'first')
  .mockImplementationOnce(() => 'second')
  .mockImplementation(() => 'default');
```

## Mocking Modules

### Module-Level Mocking

```javascript
// Mock entire module
jest.mock('fs');

// Mock specific functions
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

// Access mocked functions
const fs = require('fs');
fs.promises.readFile.mockResolvedValue('file content');
```

### Partial Module Mocking

```javascript
// Keep some functions real, mock others
jest.mock('../utils/date-utils', () => ({
  ...jest.requireActual('../utils/date-utils'),
  getCurrentDate: jest.fn(),
}));

// Now getCurrentDate is mocked, but other functions are real
const { getCurrentDate, formatDate } = require('../utils/date-utils');
getCurrentDate.mockReturnValue('2024-01-01');
// formatDate still uses real implementation
```

### Auto-Mocking

```javascript
// Auto-mock all exports
jest.mock('../services/api-client');

const apiClient = require('../services/api-client');
// All methods are now jest.fn() with no implementation
apiClient.fetchData.mockResolvedValue({ data: [] });
```

## Mocking GitLab API (graphql-request)

### Basic GraphQL Mock

```javascript
// src/infrastructure/api/gitlab-client.test.js
const { GraphQLClient } = require('graphql-request');
const { GitLabApiClient } = require('./gitlab-client');

jest.mock('graphql-request');

describe('GitLabApiClient', () => {
  let mockGraphQLClient;
  let client;

  beforeEach(() => {
    // Create mock GraphQL client
    mockGraphQLClient = {
      request: jest.fn(),
    };

    // Mock the constructor
    GraphQLClient.mockImplementation(() => mockGraphQLClient);

    // Create instance with mock
    client = new GitLabApiClient('https://gitlab.com', 'token');
  });

  it('fetches sprint issues', async () => {
    // Arrange
    const mockResponse = {
      project: {
        milestone: {
          issues: {
            nodes: [
              { id: 'issue-1', title: 'Test Issue', state: 'closed' },
            ],
          },
        },
      },
    };

    mockGraphQLClient.request.mockResolvedValue(mockResponse);

    // Act
    const issues = await client.fetchSprintIssues('project-1', 'milestone-1');

    // Assert
    expect(mockGraphQLClient.request).toHaveBeenCalledWith(
      expect.stringContaining('query'),
      { projectId: 'project-1', milestoneId: 'milestone-1' }
    );
    expect(issues).toHaveLength(1);
  });

  it('handles API errors', async () => {
    // Arrange
    const apiError = new Error('GraphQL Error: Rate limit exceeded');
    mockGraphQLClient.request.mockRejectedValue(apiError);

    // Act & Assert
    await expect(
      client.fetchSprintIssues('project-1', 'milestone-1')
    ).rejects.toThrow('Rate limit exceeded');
  });
});
```

### Mocking Different GraphQL Responses

```javascript
it('handles pagination', async () => {
  // First page
  mockGraphQLClient.request.mockResolvedValueOnce({
    project: {
      issues: {
        nodes: [{ id: '1' }, { id: '2' }],
        pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
      },
    },
  });

  // Second page
  mockGraphQLClient.request.mockResolvedValueOnce({
    project: {
      issues: {
        nodes: [{ id: '3' }, { id: '4' }],
        pageInfo: { hasNextPage: false, endCursor: 'cursor-2' },
      },
    },
  });

  // Act
  const allIssues = await client.fetchAllIssues('project-1');

  // Assert
  expect(allIssues).toHaveLength(4);
  expect(mockGraphQLClient.request).toHaveBeenCalledTimes(2);
});
```

## Mocking File System (fs module)

### Basic fs Mocking

```javascript
// src/infrastructure/storage/file-repository.test.js
const fs = require('fs').promises;
const { FileRepository } = require('./file-repository');

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
    readdir: jest.fn(),
  },
}));

describe('FileRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves data to file', async () => {
    // Arrange
    const repository = new FileRepository('/data');
    const data = { velocity: 25 };

    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);

    // Act
    await repository.save('sprint-1', data);

    // Assert
    expect(fs.mkdir).toHaveBeenCalledWith('/data', { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/data/sprint-1.json',
      JSON.stringify(data, null, 2),
      'utf8'
    );
  });

  it('loads data from file', async () => {
    // Arrange
    const repository = new FileRepository('/data');
    const savedData = { velocity: 25 };

    fs.readFile.mockResolvedValue(JSON.stringify(savedData));

    // Act
    const data = await repository.load('sprint-1');

    // Assert
    expect(fs.readFile).toHaveBeenCalledWith(
      '/data/sprint-1.json',
      'utf8'
    );
    expect(data).toEqual(savedData);
  });

  it('handles file not found', async () => {
    // Arrange
    const repository = new FileRepository('/data');
    const error = new Error('ENOENT: no such file or directory');
    error.code = 'ENOENT';

    fs.readFile.mockRejectedValue(error);

    // Act
    const data = await repository.load('nonexistent');

    // Assert
    expect(data).toBeNull();
  });
});
```

## Avoiding Over-Mocking

### Bad: Mocking Everything

```javascript
// DON'T DO THIS - Over-mocking kills test value
jest.mock('../core/use-cases/calculate-metrics');
jest.mock('../core/entities/sprint');
jest.mock('../utils/array-utils');
jest.mock('../utils/date-utils');

it('calculates sprint metrics', () => {
  const mockCalculate = require('../core/use-cases/calculate-metrics');
  mockCalculate.mockReturnValue({ velocity: 25 });

  const result = myFunction();

  // This test proves nothing - you're just testing mocks!
  expect(result.velocity).toBe(25);
});
```

### Good: Mock Only Boundaries

```javascript
// GOOD - Only mock external dependencies
jest.mock('graphql-request');

it('fetches and calculates sprint metrics', async () => {
  // Mock only the API (external boundary)
  mockGraphQLClient.request.mockResolvedValue({
    project: {
      issues: {
        nodes: [
          { id: '1', weight: 5, state: 'closed' },
          { id: '2', weight: 3, state: 'closed' },
        ],
      },
    },
  });

  // Act - real business logic runs
  const metrics = await calculateSprintMetrics('project-1', 'milestone-1');

  // Assert - testing real calculations
  expect(metrics.velocity).toBe(8);
});
```

## Test Doubles: Mocks, Stubs, Spies, Fakes

### Mock
Verifies behavior (calls, arguments).

```javascript
const mockLogger = jest.fn();
processData(data, mockLogger);
expect(mockLogger).toHaveBeenCalledWith('Processing complete');
```

### Stub
Returns predetermined values, no behavior verification.

```javascript
const stubRepository = {
  load: jest.fn().mockResolvedValue({ data: 'stubbed' }),
  save: jest.fn().mockResolvedValue(undefined),
};
```

### Spy
Observes real function calls without changing behavior.

```javascript
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
processData(invalidData);
expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid data detected');
consoleWarnSpy.mockRestore();
```

### Fake
Simplified working implementation for testing.

```javascript
class FakeFileRepository {
  constructor() {
    this.storage = new Map();
  }

  async save(id, data) {
    this.storage.set(id, data);
  }

  async load(id) {
    return this.storage.get(id) || null;
  }
}

// Use fake instead of mocking fs
const repository = new FakeFileRepository();
```

## Mocking Date/Time

### Mocking Current Date

```javascript
// Mock Date.now()
const mockNow = jest.spyOn(Date, 'now');
mockNow.mockReturnValue(new Date('2024-01-01').getTime());

// Act
const timestamp = Date.now();

// Assert
expect(timestamp).toBe(new Date('2024-01-01').getTime());

// Cleanup
mockNow.mockRestore();
```

### Using jest.useFakeTimers()

```javascript
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01'));
});

afterEach(() => {
  jest.useRealTimers();
});

it('calculates sprint duration', () => {
  const startDate = new Date();

  // Advance time by 14 days
  jest.advanceTimersByTime(14 * 24 * 60 * 60 * 1000);

  const endDate = new Date();
  const duration = calculateDuration(startDate, endDate);

  expect(duration).toBe(14);
});
```

## Mock Cleanup

### Clear Mocks Between Tests

```javascript
describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear call history
  });

  // Or reset to initial implementation
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Or completely restore original implementation
  afterEach(() => {
    jest.restoreAllMocks();
  });
});
```

## Best Practices

1. **Mock at boundaries** - Only external dependencies
2. **Clear between tests** - Prevent test pollution
3. **Verify behavior** - Use assertions on mock calls
4. **Keep it simple** - Don't over-complicate mocks
5. **Use type checking** - Ensure mocks match real interfaces
6. **Document complex mocks** - Explain why mocking is needed
7. **Prefer fakes for stateful dependencies** - Simpler than mocking

## Anti-Patterns

### Mocking Implementation Details
```javascript
// BAD - Testing implementation, not behavior
expect(mockFunction).toHaveBeenCalledBefore(otherMockFunction);
```

### Mocking Too Much
```javascript
// BAD - If you mock everything, you test nothing
jest.mock('./dependency1');
jest.mock('./dependency2');
jest.mock('./dependency3');
jest.mock('./dependency4');
```

### Not Clearing Mocks
```javascript
// BAD - Tests affect each other
it('test 1', () => {
  mockFn();
  expect(mockFn).toHaveBeenCalledTimes(1);
});

it('test 2', () => {
  // This fails because mockFn was called in previous test!
  expect(mockFn).toHaveBeenCalledTimes(0);
});
```

## Related Documentation

- **Test Examples:** `_context/testing/test-examples.md`
- **TDD Workflow:** `_context/testing/tdd-workflow.md`
- **Clean Architecture:** `_context/architecture/clean-architecture.md`
- **API Integration:** `_context/integration/gitlab-api.md`

## References

- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
- [Jest Manual Mocks](https://jestjs.io/docs/manual-mocks)
- [Test Doubles (Martin Fowler)](https://martinfowler.com/bliki/TestDouble.html)
