# Error Handling

**Version:** 1.0
**Last Updated:** 2025-11-06

## Overview

Proper error handling ensures the application fails gracefully, provides useful feedback, and maintains security. This document outlines error handling patterns for each layer of the Clean Architecture.

## Error Handling Principles

1. **Fail fast** - Catch errors early and close to their source
2. **Fail gracefully** - Provide useful error messages
3. **Don't expose internals** - Hide implementation details from users
4. **Log appropriately** - Record errors for debugging (see logging-security.md)
5. **Recover when possible** - Don't crash the entire app for recoverable errors
6. **Validate inputs** - Prevent errors before they occur

## Error Handling by Layer

### Core Layer (Business Logic)

The Core layer should throw domain-specific errors that clearly describe business rule violations.

#### Custom Error Types

```javascript
// src/core/errors/domain-errors.js

/**
 * Base error for domain violations
 */
class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when sprint data is invalid
 */
class InvalidSprintError extends DomainError {
  constructor(message, details = {}) {
    super(message);
    this.details = details;
  }
}

/**
 * Thrown when issue data is invalid
 */
class InvalidIssueError extends DomainError {
  constructor(message, issueId) {
    super(message);
    this.issueId = issueId;
  }
}

/**
 * Thrown when a calculation cannot be performed
 */
class CalculationError extends DomainError {
  constructor(message, context = {}) {
    super(message);
    this.context = context;
  }
}

module.exports = {
  DomainError,
  InvalidSprintError,
  InvalidIssueError,
  CalculationError,
};
```

#### Using Domain Errors

```javascript
// src/core/use-cases/calculate-metrics.js

const { InvalidSprintError, CalculationError } = require('../errors/domain-errors');
const logger = require('../../infrastructure/logging/logger');

/**
 * Calculate metrics for a sprint
 * @param {Object} sprint - Sprint data
 * @returns {Object} Calculated metrics
 * @throws {InvalidSprintError} If sprint data is invalid
 * @throws {CalculationError} If calculation fails
 */
function calculateSprintMetrics(sprint) {
  // Validate inputs
  if (!sprint) {
    throw new InvalidSprintError('Sprint data is required');
  }

  if (!sprint.startDate || !sprint.endDate) {
    throw new InvalidSprintError('Sprint must have start and end dates', {
      sprintId: sprint.id,
      hasStartDate: !!sprint.startDate,
      hasEndDate: !!sprint.endDate,
    });
  }

  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);

  if (endDate <= startDate) {
    throw new InvalidSprintError(
      'Sprint end date must be after start date',
      { startDate: sprint.startDate, endDate: sprint.endDate }
    );
  }

  if (!Array.isArray(sprint.issues)) {
    throw new InvalidSprintError('Sprint issues must be an array', {
      sprintId: sprint.id,
      issuesType: typeof sprint.issues,
    });
  }

  // Perform calculations with error handling
  try {
    const velocity = calculateVelocity(sprint.issues);
    const cycleTime = calculateAverageCycleTime(sprint.issues);
    const completionRate = calculateCompletionRate(sprint.issues);

    logger.info('Metrics calculated successfully', {
      sprintId: sprint.id,
      velocity,
      cycleTime,
      completionRate,
    });

    return { velocity, cycleTime, completionRate };
  } catch (error) {
    logger.error('Metrics calculation failed', {
      sprintId: sprint.id,
      errorMessage: error.message,
    });

    throw new CalculationError(
      `Failed to calculate metrics for sprint ${sprint.id}`,
      { sprintId: sprint.id, originalError: error.message }
    );
  }
}

function calculateVelocity(issues) {
  return issues
    .filter(issue => issue.status === 'completed')
    .reduce((sum, issue) => {
      const points = Number(issue.points);
      if (Number.isNaN(points)) {
        logger.warn('Issue has invalid points value', {
          issueId: issue.id,
          points: issue.points,
        });
        return sum;
      }
      return sum + points;
    }, 0);
}

module.exports = { calculateSprintMetrics };
```

### Infrastructure Layer (External I/O)

The Infrastructure layer should catch external errors and translate them into domain errors or infrastructure-specific errors.

#### Custom Infrastructure Errors

```javascript
// src/infrastructure/errors/infrastructure-errors.js

/**
 * Base error for infrastructure failures
 */
class InfrastructureError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when API requests fail
 */
class ApiError extends InfrastructureError {
  constructor(message, statusCode, cause) {
    super(message, cause);
    this.statusCode = statusCode;
  }
}

/**
 * Thrown when file operations fail
 */
class StorageError extends InfrastructureError {
  constructor(message, operation, filePath, cause) {
    super(message, cause);
    this.operation = operation;
    this.filePath = filePath;
  }
}

/**
 * Thrown when data cannot be found
 */
class NotFoundError extends InfrastructureError {
  constructor(resource, id) {
    super(`${resource} not found: ${id}`);
    this.resource = resource;
    this.id = id;
  }
}

module.exports = {
  InfrastructureError,
  ApiError,
  StorageError,
  NotFoundError,
};
```

#### API Error Handling

```javascript
// src/infrastructure/api/gitlab-client.js

const { GraphQLClient } = require('graphql-request');
const { ApiError, NotFoundError } = require('../errors/infrastructure-errors');
const logger = require('../logging/logger');

class GitLabApiClient {
  constructor(baseUrl, token) {
    this.client = new GraphQLClient(`${baseUrl}/api/graphql`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Fetch sprint issues from GitLab
   * @param {string} projectId
   * @param {string} milestoneId
   * @returns {Promise<Array>}
   * @throws {ApiError} If API request fails
   * @throws {NotFoundError} If project/milestone not found
   */
  async fetchSprintIssues(projectId, milestoneId) {
    logger.info('Fetching sprint issues', { projectId, milestoneId });

    try {
      const response = await this.client.request(SPRINT_ISSUES_QUERY, {
        projectId,
        milestoneId,
      });

      if (!response.project) {
        throw new NotFoundError('Project', projectId);
      }

      if (!response.project.milestone) {
        throw new NotFoundError('Milestone', milestoneId);
      }

      const issues = response.project.milestone.issues.nodes;

      logger.info('Sprint issues fetched', {
        projectId,
        milestoneId,
        issueCount: issues.length,
      });

      return issues.map(this._transformIssue);
    } catch (error) {
      // Handle GraphQL-specific errors
      if (error.response?.errors) {
        const graphqlError = error.response.errors[0];
        logger.error('GraphQL error', {
          message: graphqlError.message,
          type: graphqlError.extensions?.type,
        });

        if (graphqlError.extensions?.type === 'RATE_LIMITED') {
          throw new ApiError(
            'GitLab API rate limit exceeded',
            429,
            error
          );
        }

        if (graphqlError.extensions?.type === 'UNAUTHORIZED') {
          throw new ApiError(
            'GitLab API authentication failed',
            401,
            error
          );
        }
      }

      // Handle network errors
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        logger.error('Network error', {
          code: error.code,
          message: error.message,
        });

        throw new ApiError(
          'Unable to connect to GitLab API',
          0,
          error
        );
      }

      // Re-throw if already our error type
      if (error instanceof ApiError || error instanceof NotFoundError) {
        throw error;
      }

      // Generic API error
      logger.error('Unexpected API error', {
        errorMessage: error.message,
        errorName: error.name,
      });

      throw new ApiError(
        'Failed to fetch sprint issues from GitLab',
        error.statusCode || 500,
        error
      );
    }
  }
}

module.exports = { GitLabApiClient };
```

#### File System Error Handling

```javascript
// src/infrastructure/storage/file-repository.js

const fs = require('fs').promises;
const path = require('path');
const { StorageError, NotFoundError } = require('../errors/infrastructure-errors');
const logger = require('../logging/logger');

class FileRepository {
  constructor(dataDirectory) {
    this.dataDirectory = dataDirectory;
  }

  /**
   * Save metrics to file
   * @param {string} sprintId
   * @param {Object} metrics
   * @throws {StorageError} If file operation fails
   */
  async saveMetrics(sprintId, metrics) {
    const filePath = path.join(this.dataDirectory, `${sprintId}.json`);

    logger.debug('Saving metrics', { sprintId, filePath });

    try {
      // Ensure directory exists
      await fs.mkdir(this.dataDirectory, { recursive: true });

      // Write metrics to file
      await fs.writeFile(
        filePath,
        JSON.stringify(metrics, null, 2),
        'utf8'
      );

      logger.info('Metrics saved', { sprintId, filePath });
    } catch (error) {
      logger.error('Failed to save metrics', {
        sprintId,
        filePath,
        errorMessage: error.message,
        errorCode: error.code,
      });

      throw new StorageError(
        `Failed to save metrics for sprint ${sprintId}`,
        'write',
        filePath,
        error
      );
    }
  }

  /**
   * Load metrics from file
   * @param {string} sprintId
   * @returns {Promise<Object|null>}
   * @throws {StorageError} If file operation fails
   */
  async loadMetrics(sprintId) {
    const filePath = path.join(this.dataDirectory, `${sprintId}.json`);

    logger.debug('Loading metrics', { sprintId, filePath });

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const metrics = JSON.parse(content);

      logger.info('Metrics loaded', { sprintId, filePath });

      return metrics;
    } catch (error) {
      // File not found is expected, return null
      if (error.code === 'ENOENT') {
        logger.debug('Metrics file not found', { sprintId, filePath });
        return null;
      }

      // JSON parse error
      if (error instanceof SyntaxError) {
        logger.error('Invalid JSON in metrics file', {
          sprintId,
          filePath,
          errorMessage: error.message,
        });

        throw new StorageError(
          `Metrics file for sprint ${sprintId} contains invalid JSON`,
          'read',
          filePath,
          error
        );
      }

      // Other file system errors
      logger.error('Failed to load metrics', {
        sprintId,
        filePath,
        errorMessage: error.message,
        errorCode: error.code,
      });

      throw new StorageError(
        `Failed to load metrics for sprint ${sprintId}`,
        'read',
        filePath,
        error
      );
    }
  }
}

module.exports = { FileRepository };
```

### Presentation Layer (React Components)

The Presentation layer should catch errors from lower layers and display user-friendly messages.

#### Error Boundary Component

```javascript
// src/presentation/components/ErrorBoundary.jsx

import React from 'react';
import styled from 'styled-components';
import logger from '../../infrastructure/logging/logger';

const ErrorContainer = styled.div`
  padding: ${props => props.theme.spacing.xl};
  background: ${props => props.theme.colors.error}22;
  border: 1px solid ${props => props.theme.colors.error};
  border-radius: ${props => props.theme.borderRadius.md};
  text-align: center;
`;

const ErrorTitle = styled.h2`
  color: ${props => props.theme.colors.error};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const ErrorMessage = styled.p`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const RetryButton = styled.button`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;

  &:hover {
    background: ${props => props.theme.colors.secondary};
  }
`;

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error (sanitized)
    logger.error('React error boundary caught error', {
      errorMessage: error.message,
      errorName: error.name,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorTitle>Something went wrong</ErrorTitle>
          <ErrorMessage>
            {this.getUserFriendlyMessage(this.state.error)}
          </ErrorMessage>
          <RetryButton onClick={this.handleRetry}>
            Try Again
          </RetryButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }

  getUserFriendlyMessage(error) {
    // Map technical errors to user-friendly messages
    if (error.name === 'ApiError') {
      if (error.statusCode === 401) {
        return 'Authentication failed. Please check your GitLab token.';
      }
      if (error.statusCode === 429) {
        return 'Too many requests. Please wait a moment and try again.';
      }
      return 'Unable to connect to GitLab. Please check your connection.';
    }

    if (error.name === 'NotFoundError') {
      return `${error.resource} not found. Please check your configuration.`;
    }

    if (error.name === 'StorageError') {
      return 'Unable to save or load data. Please check file permissions.';
    }

    if (error.name === 'InvalidSprintError') {
      return 'Invalid sprint data. Please check the sprint configuration.';
    }

    // Generic fallback
    return 'An unexpected error occurred. Please try again.';
  }
}
```

#### Hook-Based Error Handling

```javascript
// src/presentation/hooks/useSprintMetrics.js

import { useState, useEffect } from 'react';
import logger from '../../infrastructure/logging/logger';

export function useSprintMetrics(sprintId) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMetrics() {
      if (!sprintId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await calculateSprintMetrics(sprintId);

        if (!cancelled) {
          setMetrics(data);
          setLoading(false);
        }
      } catch (err) {
        logger.error('Failed to fetch sprint metrics', {
          sprintId,
          errorMessage: err.message,
          errorName: err.name,
        });

        if (!cancelled) {
          setError(getUserFriendlyError(err));
          setLoading(false);
        }
      }
    }

    fetchMetrics();

    return () => {
      cancelled = true;
    };
  }, [sprintId]);

  return { metrics, loading, error };
}

function getUserFriendlyError(error) {
  if (error.name === 'ApiError') {
    return 'Unable to fetch sprint data. Please try again.';
  }

  if (error.name === 'NotFoundError') {
    return 'Sprint not found. Please select a different sprint.';
  }

  if (error.name === 'InvalidSprintError') {
    return 'Sprint data is invalid. Please contact support.';
  }

  return 'An error occurred. Please try again.';
}
```

## Error Propagation

### Let Errors Bubble Up (When Appropriate)

```javascript
// Good - Let domain errors propagate
function validateAndCalculate(sprint) {
  // This throws InvalidSprintError - let it propagate
  validateSprint(sprint);

  // This might throw CalculationError - let it propagate
  return calculateMetrics(sprint);
}
```

### Catch and Translate at Boundaries

```javascript
// Good - Catch at infrastructure boundary and translate
async function fetchAndCalculateMetrics(sprintId) {
  try {
    const sprintData = await gitlabClient.fetchSprint(sprintId);
    return calculateMetrics(sprintData);
  } catch (error) {
    if (error instanceof ApiError) {
      throw new InfrastructureError('Failed to fetch sprint data', error);
    }
    throw error;
  }
}
```

## User-Facing Error Messages

### Good Error Messages

- **Specific:** "Unable to connect to GitLab API"
- **Actionable:** "Please check your internet connection and try again"
- **Non-technical:** Avoid stack traces, error codes in UI

### Bad Error Messages

- **Vague:** "Something went wrong"
- **Technical:** "Error: ECONNREFUSED at socket.connect"
- **Unhelpful:** "Error 500"

### Example Messages by Error Type

| Error Type | User Message |
|------------|-------------|
| ApiError (401) | "Authentication failed. Please check your GitLab token in Settings." |
| ApiError (429) | "Too many requests. Please wait a moment and try again." |
| ApiError (Network) | "Unable to connect to GitLab. Please check your internet connection." |
| NotFoundError | "Sprint not found. Please select a different sprint." |
| StorageError (Write) | "Unable to save data. Please check file permissions." |
| InvalidSprintError | "Sprint data is incomplete. Please ensure all required fields are filled." |

## Recovery Strategies

### Retry with Exponential Backoff

```javascript
async function fetchWithRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries || !isRetryable(error)) {
        throw error;
      }

      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      logger.warn('Retrying operation', { attempt, delay });
      await sleep(delay);
    }
  }
}

function isRetryable(error) {
  return (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ETIMEDOUT' ||
    (error instanceof ApiError && error.statusCode >= 500)
  );
}
```

### Graceful Degradation

```javascript
async function loadMetricsWithFallback(sprintId) {
  try {
    // Try to fetch from API
    return await apiClient.fetchMetrics(sprintId);
  } catch (error) {
    logger.warn('API fetch failed, using cached data', {
      sprintId,
      errorMessage: error.message,
    });

    // Fall back to cached data
    return await cache.load(sprintId);
  }
}
```

## Related Documentation

- **Logging and Security:** `_context/coding/logging-security.md`
- **Test Examples:** `_context/testing/test-examples.md`
- **API Integration:** `_context/integration/gitlab-api.md`
- **Clean Architecture:** `_context/architecture/clean-architecture.md`

## Quick Reference

| Layer | Error Type | Example |
|-------|-----------|---------|
| Core | Domain errors | `InvalidSprintError`, `CalculationError` |
| Infrastructure | Infrastructure errors | `ApiError`, `StorageError`, `NotFoundError` |
| Presentation | User-friendly messages | "Unable to load sprint data" |

## Best Practices Checklist

- [ ] Use custom error types for different error categories
- [ ] Include context (IDs, operation) in errors
- [ ] Log errors before throwing (with sanitized data)
- [ ] Translate technical errors to user-friendly messages
- [ ] Don't expose internal errors to users
- [ ] Validate inputs early to prevent errors
- [ ] Let domain errors propagate through Core layer
- [ ] Catch and translate at infrastructure boundaries
- [ ] Provide recovery strategies when possible
- [ ] Test error handling paths
