# Test Examples

**Version:** 1.0
**Last Updated:** 2025-11-06

## Overview

This document provides concrete test examples for each layer of the Clean Architecture, demonstrating testing patterns, best practices, and the Arrange-Act-Assert structure.

## Testing Principles

1. **Test behavior, not implementation**
2. **Follow Arrange-Act-Assert pattern**
3. **One assertion concept per test**
4. **Clear, descriptive test names**
5. **No mocks in Core layer tests**
6. **Mock external dependencies in Infrastructure**
7. **Test user interactions in Presentation**

## Core Layer Tests

### Example 1: MetricsCalculator (Pure Business Logic)

```javascript
// src/core/use-cases/calculate-metrics.test.js

const { calculateSprintMetrics } = require('./calculate-metrics');

describe('calculateSprintMetrics', () => {
  describe('velocity calculation', () => {
    it('calculates velocity as sum of completed issue points', () => {
      // Arrange
      const sprint = {
        id: 'sprint-1',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        issues: [
          { id: '1', points: 5, status: 'completed' },
          { id: '2', points: 3, status: 'completed' },
          { id: '3', points: 8, status: 'in-progress' },
        ],
      };

      // Act
      const metrics = calculateSprintMetrics(sprint);

      // Assert
      expect(metrics.velocity).toBe(8); // 5 + 3
    });

    it('returns zero velocity when no issues are completed', () => {
      // Arrange
      const sprint = {
        id: 'sprint-1',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        issues: [
          { id: '1', points: 5, status: 'in-progress' },
          { id: '2', points: 3, status: 'open' },
        ],
      };

      // Act
      const metrics = calculateSprintMetrics(sprint);

      // Assert
      expect(metrics.velocity).toBe(0);
    });

    it('ignores issues without point estimates', () => {
      // Arrange
      const sprint = {
        id: 'sprint-1',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        issues: [
          { id: '1', points: 5, status: 'completed' },
          { id: '2', points: null, status: 'completed' },
          { id: '3', points: undefined, status: 'completed' },
        ],
      };

      // Act
      const metrics = calculateSprintMetrics(sprint);

      // Assert
      expect(metrics.velocity).toBe(5);
    });
  });

  describe('cycle time calculation', () => {
    it('calculates average cycle time for completed issues', () => {
      // Arrange
      const sprint = {
        id: 'sprint-1',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        issues: [
          {
            id: '1',
            status: 'completed',
            startedAt: '2024-01-01T00:00:00Z',
            completedAt: '2024-01-03T00:00:00Z', // 2 days
          },
          {
            id: '2',
            status: 'completed',
            startedAt: '2024-01-02T00:00:00Z',
            completedAt: '2024-01-06T00:00:00Z', // 4 days
          },
        ],
      };

      // Act
      const metrics = calculateSprintMetrics(sprint);

      // Assert
      expect(metrics.averageCycleTime).toBe(3); // (2 + 4) / 2
    });

    it('excludes incomplete issues from cycle time calculation', () => {
      // Arrange
      const sprint = {
        id: 'sprint-1',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        issues: [
          {
            id: '1',
            status: 'completed',
            startedAt: '2024-01-01T00:00:00Z',
            completedAt: '2024-01-03T00:00:00Z',
          },
          {
            id: '2',
            status: 'in-progress',
            startedAt: '2024-01-02T00:00:00Z',
            completedAt: null,
          },
        ],
      };

      // Act
      const metrics = calculateSprintMetrics(sprint);

      // Assert
      expect(metrics.averageCycleTime).toBe(2); // Only completed issue
    });
  });

  describe('edge cases', () => {
    it('handles empty sprint', () => {
      // Arrange
      const sprint = {
        id: 'sprint-1',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        issues: [],
      };

      // Act
      const metrics = calculateSprintMetrics(sprint);

      // Assert
      expect(metrics.velocity).toBe(0);
      expect(metrics.averageCycleTime).toBe(0);
      expect(metrics.completionRate).toBe(0);
    });

    it('throws error for invalid sprint dates', () => {
      // Arrange
      const sprint = {
        id: 'sprint-1',
        startDate: '2024-01-14',
        endDate: '2024-01-01', // End before start
        issues: [],
      };

      // Act & Assert
      expect(() => calculateSprintMetrics(sprint)).toThrow(
        'Sprint end date must be after start date'
      );
    });
  });
});
```

## Infrastructure Layer Tests

### Example 2: FileRepository (with Mocked fs)

```javascript
// src/infrastructure/storage/file-repository.test.js

const fs = require('fs').promises;
const path = require('path');
const { FileRepository } = require('./file-repository');

// Mock the fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
  },
}));

describe('FileRepository', () => {
  let repository;
  const testDataDir = '/tmp/test-data';

  beforeEach(() => {
    // Arrange - Create repository instance
    repository = new FileRepository(testDataDir);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('saveMetrics', () => {
    it('saves metrics to file system', async () => {
      // Arrange
      const sprintId = 'sprint-123';
      const metrics = {
        velocity: 25,
        cycleTime: 3.5,
        completionRate: 0.85,
      };

      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);

      // Act
      await repository.saveMetrics(sprintId, metrics);

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(
        testDataDir,
        { recursive: true }
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(testDataDir, `${sprintId}.json`),
        JSON.stringify(metrics, null, 2),
        'utf8'
      );
    });

    it('throws error when file write fails', async () => {
      // Arrange
      const sprintId = 'sprint-123';
      const metrics = { velocity: 25 };
      const writeError = new Error('EACCES: permission denied');

      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockRejectedValue(writeError);

      // Act & Assert
      await expect(
        repository.saveMetrics(sprintId, metrics)
      ).rejects.toThrow('Failed to save metrics');
    });
  });

  describe('loadMetrics', () => {
    it('loads metrics from file system', async () => {
      // Arrange
      const sprintId = 'sprint-123';
      const savedMetrics = {
        velocity: 25,
        cycleTime: 3.5,
        completionRate: 0.85,
      };

      fs.readFile.mockResolvedValue(
        JSON.stringify(savedMetrics)
      );

      // Act
      const metrics = await repository.loadMetrics(sprintId);

      // Assert
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(testDataDir, `${sprintId}.json`),
        'utf8'
      );
      expect(metrics).toEqual(savedMetrics);
    });

    it('returns null when metrics file does not exist', async () => {
      // Arrange
      const sprintId = 'nonexistent-sprint';
      const notFoundError = new Error('ENOENT: no such file');
      notFoundError.code = 'ENOENT';

      fs.readFile.mockRejectedValue(notFoundError);

      // Act
      const metrics = await repository.loadMetrics(sprintId);

      // Assert
      expect(metrics).toBeNull();
    });

    it('throws error when file read fails for non-ENOENT reasons', async () => {
      // Arrange
      const sprintId = 'sprint-123';
      const readError = new Error('EACCES: permission denied');
      readError.code = 'EACCES';

      fs.readFile.mockRejectedValue(readError);

      // Act & Assert
      await expect(
        repository.loadMetrics(sprintId)
      ).rejects.toThrow('Failed to load metrics');
    });
  });
});
```

### Example 3: GitLabApiClient (with Mocked graphql-request)

```javascript
// src/infrastructure/api/gitlab-client.test.js

const { GraphQLClient } = require('graphql-request');
const { GitLabApiClient } = require('./gitlab-client');

jest.mock('graphql-request');

describe('GitLabApiClient', () => {
  let client;
  let mockGraphQLClient;

  beforeEach(() => {
    // Arrange
    mockGraphQLClient = {
      request: jest.fn(),
    };
    GraphQLClient.mockImplementation(() => mockGraphQLClient);

    client = new GitLabApiClient('https://gitlab.com', 'test-token');
  });

  describe('fetchSprintIssues', () => {
    it('fetches issues for a given sprint', async () => {
      // Arrange
      const projectId = 'project-1';
      const milestoneId = 'milestone-1';
      const mockResponse = {
        project: {
          milestone: {
            issues: {
              nodes: [
                {
                  id: 'issue-1',
                  title: 'Implement feature',
                  state: 'closed',
                  weight: 5,
                },
                {
                  id: 'issue-2',
                  title: 'Fix bug',
                  state: 'opened',
                  weight: 3,
                },
              ],
            },
          },
        },
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      // Act
      const issues = await client.fetchSprintIssues(projectId, milestoneId);

      // Assert
      expect(mockGraphQLClient.request).toHaveBeenCalledWith(
        expect.any(String), // Query string
        { projectId, milestoneId }
      );
      expect(issues).toHaveLength(2);
      expect(issues[0]).toMatchObject({
        id: 'issue-1',
        title: 'Implement feature',
        status: 'closed',
        points: 5,
      });
    });

    it('handles API errors gracefully', async () => {
      // Arrange
      const projectId = 'project-1';
      const milestoneId = 'milestone-1';
      const apiError = new Error('GraphQL Error: Unauthorized');

      mockGraphQLClient.request.mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        client.fetchSprintIssues(projectId, milestoneId)
      ).rejects.toThrow('Failed to fetch sprint issues');
    });
  });
});
```

## Presentation Layer Tests

### Example 4: React Component (with React Testing Library)

```javascript
// src/presentation/components/MetricsDisplay.test.jsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { MetricsDisplay } from './MetricsDisplay';
import { theme } from '../../styles/theme';

// Helper to render with theme
const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MetricsDisplay', () => {
  describe('rendering metrics', () => {
    it('displays all metrics correctly', () => {
      // Arrange
      const metrics = {
        velocity: 25,
        averageCycleTime: 3.5,
        completionRate: 0.85,
        totalIssues: 20,
        completedIssues: 17,
      };

      // Act
      renderWithTheme(<MetricsDisplay metrics={metrics} />);

      // Assert
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Velocity')).toBeInTheDocument();
      expect(screen.getByText('3.5 days')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('displays loading state when metrics are null', () => {
      // Arrange & Act
      renderWithTheme(<MetricsDisplay metrics={null} />);

      // Assert
      expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
    });

    it('displays zero values correctly', () => {
      // Arrange
      const metrics = {
        velocity: 0,
        averageCycleTime: 0,
        completionRate: 0,
        totalIssues: 0,
        completedIssues: 0,
      };

      // Act
      renderWithTheme(<MetricsDisplay metrics={metrics} />);

      // Assert
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('formatting', () => {
    it('formats completion rate as percentage', () => {
      // Arrange
      const metrics = {
        velocity: 25,
        averageCycleTime: 3.5,
        completionRate: 0.8571, // Should display as 86%
      };

      // Act
      renderWithTheme(<MetricsDisplay metrics={metrics} />);

      // Assert
      expect(screen.getByText('86%')).toBeInTheDocument();
    });

    it('formats cycle time with one decimal place', () => {
      // Arrange
      const metrics = {
        velocity: 25,
        averageCycleTime: 3.456789, // Should display as 3.5
        completionRate: 0.85,
      };

      // Act
      renderWithTheme(<MetricsDisplay metrics={metrics} />);

      // Assert
      expect(screen.getByText('3.5 days')).toBeInTheDocument();
    });
  });
});
```

### Example 5: Interactive Component with User Events

```javascript
// src/presentation/components/SprintSelector.test.jsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SprintSelector } from './SprintSelector';

describe('SprintSelector', () => {
  const mockSprints = [
    { id: 'sprint-1', name: 'Sprint 1', startDate: '2024-01-01' },
    { id: 'sprint-2', name: 'Sprint 2', startDate: '2024-01-15' },
    { id: 'sprint-3', name: 'Sprint 3', startDate: '2024-01-29' },
  ];

  it('calls onSelect when sprint is selected', async () => {
    // Arrange
    const user = userEvent.setup();
    const handleSelect = jest.fn();

    render(
      <SprintSelector
        sprints={mockSprints}
        onSelect={handleSelect}
      />
    );

    // Act
    const select = screen.getByLabelText('Select sprint');
    await user.selectOptions(select, 'sprint-2');

    // Assert
    expect(handleSelect).toHaveBeenCalledWith('sprint-2');
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('displays all available sprints', () => {
    // Arrange & Act
    render(
      <SprintSelector
        sprints={mockSprints}
        onSelect={jest.fn()}
      />
    );

    // Assert
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.getByText('Sprint 3')).toBeInTheDocument();
  });

  it('shows empty state when no sprints available', () => {
    // Arrange & Act
    render(
      <SprintSelector
        sprints={[]}
        onSelect={jest.fn()}
      />
    );

    // Assert
    expect(screen.getByText('No sprints available')).toBeInTheDocument();
  });
});
```

## Common Testing Patterns

### Arrange-Act-Assert (AAA)

```javascript
it('descriptive test name', () => {
  // Arrange: Set up test data and conditions
  const input = { /* ... */ };
  const expectedOutput = { /* ... */ };

  // Act: Execute the code under test
  const result = functionUnderTest(input);

  // Assert: Verify the results
  expect(result).toEqual(expectedOutput);
});
```

### Async/Await Tests

```javascript
it('handles async operations', async () => {
  // Arrange
  const mockData = { /* ... */ };
  apiClient.fetch.mockResolvedValue(mockData);

  // Act
  const result = await fetchData();

  // Assert
  expect(result).toEqual(mockData);
});
```

### Error Handling Tests

```javascript
it('throws error with descriptive message', () => {
  // Arrange
  const invalidInput = null;

  // Act & Assert
  expect(() => processInput(invalidInput)).toThrow(
    'Input cannot be null'
  );
});

it('handles async errors', async () => {
  // Arrange
  const error = new Error('Network error');
  apiClient.fetch.mockRejectedValue(error);

  // Act & Assert
  await expect(fetchData()).rejects.toThrow('Network error');
});
```

## What to Test vs What Not to Test

### DO Test:
- Business logic and calculations
- Error handling and edge cases
- User interactions
- Component rendering with different props
- API integration logic
- Data transformations

### DON'T Test:
- Third-party library internals
- Framework behavior (React, styled-components)
- Simple getters/setters
- Constants and configuration
- Trivial code (one-line functions)

## Related Documentation

- **TDD Workflow:** `_context/testing/tdd-workflow.md`
- **Mocking Patterns:** `_context/testing/mocking-patterns.md`
- **Test Structure:** `_context/testing/test-structure.md`
- **React Testing:** `_context/coding/react-patterns.md`

## Quick Reference

| Layer | Test Focus | Mocking Strategy |
|-------|-----------|------------------|
| Core | Pure logic | No mocks |
| Infrastructure | External I/O | Mock fs, APIs |
| Presentation | User interaction | Mock hooks, APIs |
