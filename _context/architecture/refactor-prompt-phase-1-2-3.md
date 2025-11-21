# Architectural Refactor - Complete Implementation Prompt
**Date:** 2025-11-21
**Status:** Phase 0 (Testing) ✅ COMPLETE - Ready for Phase 1
**Project:** GitLab Sprint Metrics Tracker

---

## Executive Summary

Phase 0 (Testing Foundation) is complete with 81.3% branch coverage and 865 passing tests. We are now ready to proceed with the architectural refactor in three sequential phases:

- **Phase 1**: Critical Blockers (10-15 hours)
- **Phase 2**: High Priority Improvements (6-9 hours)
- **Phase 3**: Hybrid Architecture Refactor (7-10 hours)

**Total Estimated Effort**: 23-34 hours

---

## Prerequisites ✅

- ✅ All tests passing: 865/866 tests (99.9%)
- ✅ Branch coverage: 81.3% (target: 85%, achieved: 81.3%)
- ✅ Statement coverage: 93.1%
- ✅ Clean Architecture Agent rating: B+ (Good with 2 critical violations)
- ✅ Code Review Agent rating: B- (3 CRITICAL BLOCKING issues identified)

---

## Phase 1: Critical Blockers (MUST DO FIRST)

### Estimated Effort: 10-15 hours

These issues are BLOCKING because they:
1. Violate Clean Architecture principles
2. Make refactoring harder and riskier
3. Cause bugs that need to be fixed in multiple places
4. Create security and maintainability risks

---

### 1.1 Replace Console.log with Structured Logger (4-6 hours)

**Severity**: CRITICAL BLOCKING
**Files Affected**: 27 files, 153 console.* occurrences

#### Problem Analysis

**Security Risk**: Sensitive data may be logged in production (tokens, API responses, user data)
**Clean Architecture Violation**: Core layer (services) depends on console (infrastructure concern)
**Makes Refactoring Harder**: Console spam everywhere makes debugging difficult
**No Structure**: Can't filter, aggregate, or analyze logs in production

**Worst Offenders**:
- `src/lib/infrastructure/api/GitLabClient.js` - 54 console statements
- `src/lib/core/services/MetricsService.js` - 30 console statements
- `src/server/routes/metrics.js` - 13 console statements

#### Implementation Steps

**Step 1: Create Logger Interface (30 min)**

Create `src/lib/core/interfaces/ILogger.js`:

```javascript
/**
 * Logger interface for dependency injection.
 * Allows swapping logging implementations without changing business logic.
 *
 * @interface ILogger
 */
export class ILogger {
  /**
   * Log informational message
   * @param {string} message
   * @param {Object} [context] - Additional context data
   */
  info(message, context = {}) {
    throw new Error('ILogger.info() must be implemented');
  }

  /**
   * Log warning message
   * @param {string} message
   * @param {Object} [context] - Additional context data
   */
  warn(message, context = {}) {
    throw new Error('ILogger.warn() must be implemented');
  }

  /**
   * Log error message
   * @param {string} message
   * @param {Error} [error] - Error object
   * @param {Object} [context] - Additional context data
   */
  error(message, error = null, context = {}) {
    throw new Error('ILogger.error() must be implemented');
  }

  /**
   * Log debug message (only in development)
   * @param {string} message
   * @param {Object} [context] - Additional context data
   */
  debug(message, context = {}) {
    throw new Error('ILogger.debug() must be implemented');
  }
}
```

**Step 2: Create Console Logger Implementation (1 hour)**

Create `src/lib/infrastructure/logging/ConsoleLogger.js`:

```javascript
import { ILogger } from '../../core/interfaces/ILogger.js';

/**
 * Console-based logger implementation.
 * Formats logs with timestamps and context.
 * Filters debug logs in production.
 *
 * Security: Sanitizes sensitive data before logging.
 *
 * @implements {ILogger}
 */
export class ConsoleLogger extends ILogger {
  constructor(options = {}) {
    super();
    this.env = options.env || process.env.NODE_ENV || 'development';
    this.serviceName = options.serviceName || 'gitlab-metrics-tracker';

    // List of keys to redact from logs (security)
    this.sensitiveKeys = [
      'token', 'password', 'secret', 'authorization',
      'api_key', 'apiKey', 'privateToken'
    ];
  }

  /**
   * Sanitize context to remove sensitive data
   * @private
   */
  _sanitize(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this._sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Format log message with timestamp and service name
   * @private
   */
  _format(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const sanitizedContext = this._sanitize(context);

    return {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...(Object.keys(sanitizedContext).length > 0 && { context: sanitizedContext })
    };
  }

  info(message, context = {}) {
    const log = this._format('INFO', message, context);
    console.log(JSON.stringify(log));
  }

  warn(message, context = {}) {
    const log = this._format('WARN', message, context);
    console.warn(JSON.stringify(log));
  }

  error(message, error = null, context = {}) {
    const log = this._format('ERROR', message, {
      ...context,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          ...(error.response && { response: error.response })
        }
      })
    });
    console.error(JSON.stringify(log));
  }

  debug(message, context = {}) {
    // Only log debug in development
    if (this.env !== 'production') {
      const log = this._format('DEBUG', message, context);
      console.debug(JSON.stringify(log));
    }
  }
}
```

**Step 3: Update ServiceFactory to Inject Logger (1 hour)**

Update `src/server/services/ServiceFactory.js`:

```javascript
import { ConsoleLogger } from '../../lib/infrastructure/logging/ConsoleLogger.js';

// Add logger to factory
const logger = new ConsoleLogger({
  env: process.env.NODE_ENV,
  serviceName: 'gitlab-metrics-tracker'
});

// Inject logger into all services
const gitLabClient = new GitLabClient(gitlabConfig.token, gitlabConfig.url, logger);
const dataProvider = new GitLabIterationDataProvider(gitLabClient, cacheRepository, logger);
const metricsService = new MetricsService(dataProvider, logger);
// ... etc for all services
```

**Step 4: Replace Console.* in All Files (2-4 hours)**

Replace all 153 console.* calls with logger calls. Work file by file:

**Example Transformation:**

Before:
```javascript
console.log('Fetching iteration data:', iterationId);
console.error('Failed to fetch data:', error);
```

After:
```javascript
this.logger.info('Fetching iteration data', { iterationId });
this.logger.error('Failed to fetch data', error, { iterationId });
```

**Files to Update (Priority Order)**:
1. `src/lib/infrastructure/api/GitLabClient.js` (54 occurrences)
2. `src/lib/core/services/MetricsService.js` (30 occurrences)
3. `src/server/routes/metrics.js` (13 occurrences)
4. All other files (56 occurrences across 24 files)

**Testing Strategy**:
- Add logger parameter to each class constructor
- Replace console.* calls with logger methods
- Run tests after each file
- Verify logs are formatted correctly
- Check that sensitive data is redacted

#### Acceptance Criteria

- [ ] ILogger interface created with 4 methods (info, warn, error, debug)
- [ ] ConsoleLogger implements ILogger with JSON formatting
- [ ] ConsoleLogger redacts sensitive keys (token, password, etc.)
- [ ] ServiceFactory injects logger into all services
- [ ] All 153 console.* calls replaced with logger calls
- [ ] All tests still pass (865/866)
- [ ] Manual verification: Logs are JSON formatted
- [ ] Manual verification: Sensitive data is redacted

---

### 1.2 Eliminate MetricsService Duplication (2-3 hours)

**Severity**: CRITICAL BLOCKING
**Location**: `src/lib/core/services/MetricsService.js`

#### Problem Analysis

**Code Duplication**: 146 lines of ~95% duplicate code between:
- `calculateMetrics()` (lines 50-145)
- `calculateMultipleMetrics()` (lines 150-295)

**Impact**:
- Bug fixes must be applied TWICE (caused issues in PRs #118, #125)
- Higher maintenance cost (2x work for every change)
- Violates DRY principle
- Increased test surface area

#### Current Structure

```javascript
// calculateMetrics() - Single iteration
async calculateMetrics(iterationId) {
  const data = await this.dataProvider.getIterationData(iterationId);

  // ~140 lines of calculation logic
  const velocity = this.velocityCalc.calculate(data.issues);
  const throughput = data.issues.filter(i => i.state === 'closed').length;
  // ... many more calculations

  return new Metric({ iterationId, velocity, throughput, ... });
}

// calculateMultipleMetrics() - Multiple iterations
async calculateMultipleMetrics(iterationIds) {
  const allData = await this.dataProvider.getMultipleIterationData(iterationIds);

  return allData.map(data => {
    // ~140 lines of DUPLICATE calculation logic
    const velocity = this.velocityCalc.calculate(data.issues);
    const throughput = data.issues.filter(i => i.state === 'closed').length;
    // ... same calculations repeated

    return new Metric({ iterationId: data.iteration.id, velocity, throughput, ... });
  });
}
```

#### Target Structure

Extract shared logic into private method:

```javascript
/**
 * Calculate metrics from iteration data.
 * Shared logic used by both single and batch calculations.
 *
 * @private
 * @param {Object} iterationData - Iteration data with issues, MRs, pipelines, incidents
 * @returns {Metric} Calculated metrics
 */
_calculateMetricsFromData(iterationData) {
  const { iteration, issues, mergeRequests, pipelines, incidents } = iterationData;

  // Velocity
  const velocity = this.velocityCalc.calculate(issues);

  // Throughput
  const throughput = issues.filter(i => i.state === 'closed').length;

  // Cycle Time (Avg, P50, P90)
  const cycleTime = this.cycleTimeCalc.calculate(issues);

  // Deployment Frequency
  const deploymentFrequency = this.deploymentFreqCalc.calculate(
    pipelines,
    iteration.startDate,
    iteration.dueDate
  );

  // Lead Time (Avg, P50, P90)
  const leadTime = this.leadTimeCalc.calculate(mergeRequests);

  // MTTR (Mean Time To Recovery)
  const mttr = this.incidentAnalyzer.calculateMTTR(incidents);

  // Change Failure Rate
  const changeFailureRate = this.changeLinkExtractor.calculateCFR(
    incidents,
    mergeRequests,
    iteration
  );

  return new Metric({
    iterationId: iteration.id,
    iterationTitle: iteration.title,
    startDate: iteration.startDate,
    dueDate: iteration.dueDate,
    velocity,
    throughput,
    cycleTimeAvg: cycleTime.average,
    cycleTimeP50: cycleTime.p50,
    cycleTimeP90: cycleTime.p90,
    deploymentFrequency,
    leadTimeAvg: leadTime.average,
    leadTimeP50: leadTime.p50,
    leadTimeP90: leadTime.p90,
    mttr,
    changeFailureRate
  });
}

/**
 * Calculate metrics for a single iteration.
 *
 * @param {string} iterationId - GitLab iteration ID
 * @returns {Promise<Metric>}
 */
async calculateMetrics(iterationId) {
  this.logger.info('Calculating metrics for iteration', { iterationId });

  const data = await this.dataProvider.getIterationData(iterationId);
  return this._calculateMetricsFromData(data);
}

/**
 * Calculate metrics for multiple iterations in batch.
 * More efficient than calling calculateMetrics() repeatedly.
 *
 * @param {string[]} iterationIds - Array of GitLab iteration IDs
 * @returns {Promise<Metric[]>}
 */
async calculateMultipleMetrics(iterationIds) {
  this.logger.info('Calculating metrics for multiple iterations', {
    count: iterationIds.length,
    iterationIds
  });

  const allData = await this.dataProvider.getMultipleIterationData(iterationIds);
  return allData.map(data => this._calculateMetricsFromData(data));
}
```

#### Implementation Steps

1. **Create private `_calculateMetricsFromData()` method** (1 hour)
   - Extract all calculation logic from `calculateMetrics()`
   - Make it pure: takes data, returns Metric (no async)
   - Add JSDoc documentation

2. **Refactor `calculateMetrics()` to use shared method** (30 min)
   - Keep only data fetching
   - Call `_calculateMetricsFromData()`
   - Update logger calls

3. **Refactor `calculateMultipleMetrics()` to use shared method** (30 min)
   - Keep only batch data fetching
   - Map over data calling `_calculateMetricsFromData()`
   - Update logger calls

4. **Run tests and verify** (30 min)
   - All MetricsService tests should pass
   - Coverage should remain same or improve
   - Manual verification: Metrics match between single/batch

#### Acceptance Criteria

- [ ] `_calculateMetricsFromData()` private method created (~140 lines)
- [ ] `calculateMetrics()` refactored to use shared method (~10 lines)
- [ ] `calculateMultipleMetrics()` refactored to use shared method (~15 lines)
- [ ] All MetricsService tests pass
- [ ] No code duplication between the two methods
- [ ] Coverage remains ≥75% for MetricsService
- [ ] Manual verification: Single and batch calculations produce same results

---

### 1.3 Split GitLabClient God Object (4-6 hours)

**Severity**: CRITICAL BLOCKING
**Location**: `src/lib/infrastructure/api/GitLabClient.js`

#### Problem Analysis

**Size**: 1,230 lines, 13+ responsibilities
**Violates SRP**: Single Responsibility Principle violation
**Hard to Test**: Mock complexity increases with each responsibility
**Hard to Maintain**: Changes ripple across unrelated features
**Violates Open/Closed**: Adding new resource type requires modifying existing class

**Current Responsibilities (13+)**:
1. Iteration queries
2. Issue queries
3. Merge request queries
4. Pipeline queries
5. Deployment queries
6. Incident queries
7. GraphQL query execution
8. Pagination handling
9. Rate limiting
10. Error handling
11. Retry logic
12. Response transformation
13. Timeline event fetching

#### Target Structure

Split into 11 focused classes:

```
src/lib/infrastructure/api/
├── GitLabClient.js          # 150 lines - Orchestration only
├── clients/
│   ├── IterationClient.js   # Iteration CRUD
│   ├── IssueClient.js       # Issue queries
│   ├── MergeRequestClient.js # MR queries
│   ├── PipelineClient.js    # Pipeline queries
│   ├── DeploymentClient.js  # Deployment queries
│   └── IncidentClient.js    # Incident queries + timeline
└── helpers/
    ├── GraphQLHelper.js     # Query execution
    ├── PaginationHelper.js  # Cursor pagination
    ├── RateLimitHelper.js   # Rate limiting
    └── ErrorHelper.js       # Error transformation
```

#### Implementation Strategy

**Approach**: Incremental extraction with adapter pattern

1. **Create helper classes first** (foundation)
2. **Create client classes** (resource-specific)
3. **Update GitLabClient to delegate** (orchestration)
4. **Update tests incrementally**

#### Step 1: Create Helper Classes (2 hours)

**1.1 GraphQLHelper** (30 min)

Create `src/lib/infrastructure/api/helpers/GraphQLHelper.js`:

```javascript
import { GraphQLClient } from 'graphql-request';

/**
 * Handles GraphQL query execution with error handling.
 * Centralizes GraphQL client configuration.
 */
export class GraphQLHelper {
  constructor(url, token, logger) {
    this.client = new GraphQLClient(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    this.logger = logger;
  }

  /**
   * Execute GraphQL query with error handling
   * @param {string} query - GraphQL query
   * @param {Object} variables - Query variables
   * @returns {Promise<Object>} Query result
   */
  async execute(query, variables = {}) {
    try {
      this.logger.debug('Executing GraphQL query', {
        query: query.substring(0, 100) + '...',
        variables
      });

      const data = await this.client.request(query, variables);
      return data;
    } catch (error) {
      this.logger.error('GraphQL query failed', error, { variables });
      throw this._transformError(error);
    }
  }

  /**
   * Transform GraphQL errors to application errors
   * @private
   */
  _transformError(error) {
    if (error.response?.errors) {
      const firstError = error.response.errors[0];
      const err = new Error(`GraphQL Error: ${firstError.message}`);
      err.graphQLErrors = error.response.errors;
      return err;
    }
    return error;
  }
}
```

**1.2 PaginationHelper** (30 min)

Create `src/lib/infrastructure/api/helpers/PaginationHelper.js`:

```javascript
/**
 * Handles cursor-based pagination for GitLab GraphQL API.
 * Fetches all pages automatically.
 */
export class PaginationHelper {
  constructor(graphQLHelper, logger) {
    this.graphQL = graphQLHelper;
    this.logger = logger;
  }

  /**
   * Fetch all pages using cursor pagination
   * @param {string} query - GraphQL query (must support after/endCursor)
   * @param {Object} variables - Base query variables
   * @param {Function} extractPageInfo - Function to extract pageInfo from response
   * @param {Function} extractNodes - Function to extract nodes from response
   * @returns {Promise<Array>} All nodes from all pages
   */
  async fetchAll(query, variables, extractPageInfo, extractNodes) {
    let allNodes = [];
    let hasNextPage = true;
    let endCursor = null;
    let pageCount = 0;

    while (hasNextPage && pageCount < 100) { // Safety limit
      const vars = { ...variables, after: endCursor };
      const data = await this.graphQL.execute(query, vars);

      const nodes = extractNodes(data);
      const pageInfo = extractPageInfo(data);

      allNodes = allNodes.concat(nodes);
      hasNextPage = pageInfo.hasNextPage;
      endCursor = pageInfo.endCursor;
      pageCount++;

      this.logger.debug('Fetched page', {
        pageCount,
        nodesInPage: nodes.length,
        totalNodes: allNodes.length,
        hasNextPage
      });
    }

    this.logger.info('Pagination complete', {
      totalPages: pageCount,
      totalNodes: allNodes.length
    });

    return allNodes;
  }
}
```

**1.3 RateLimitHelper** (30 min)

Create `src/lib/infrastructure/api/helpers/RateLimitHelper.js`:

```javascript
/**
 * Handles rate limiting with exponential backoff.
 * Prevents hitting GitLab API rate limits.
 */
export class RateLimitHelper {
  constructor(logger) {
    this.logger = logger;
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
  }

  /**
   * Execute function with rate limit handling
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} Function result
   */
  async withRateLimit(fn) {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (this._isRateLimitError(error) && attempt < this.maxRetries - 1) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          this.logger.warn('Rate limit hit, retrying', {
            attempt: attempt + 1,
            maxRetries: this.maxRetries,
            delayMs: delay
          });
          await this._sleep(delay);
        } else {
          throw error;
        }
      }
    }
  }

  _isRateLimitError(error) {
    return error.response?.status === 429 ||
           error.message?.includes('rate limit') ||
           error.message?.includes('too many requests');
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**1.4 ErrorHelper** (30 min)

Create `src/lib/infrastructure/api/helpers/ErrorHelper.js`:

```javascript
/**
 * Transforms and standardizes API errors.
 * Provides consistent error handling across clients.
 */
export class ErrorHelper {
  /**
   * Transform API error to application error
   * @param {Error} error - Original error
   * @param {string} context - Error context (e.g., 'fetching iterations')
   * @returns {Error} Transformed error
   */
  static transform(error, context) {
    if (error.response?.errors) {
      // GraphQL errors
      const message = error.response.errors
        .map(e => e.message)
        .join('; ');
      return new Error(`GitLab API Error (${context}): ${message}`);
    }

    if (error.response?.status) {
      // HTTP errors
      const status = error.response.status;
      const statusText = error.response.statusText || 'Unknown error';
      return new Error(`HTTP ${status} (${context}): ${statusText}`);
    }

    // Network or other errors
    return new Error(`Failed ${context}: ${error.message}`);
  }

  /**
   * Check if error is retryable
   * @param {Error} error
   * @returns {boolean}
   */
  static isRetryable(error) {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Rate limit errors (should be handled by RateLimitHelper)
    if (error.response?.status === 429) {
      return true;
    }

    // Server errors (5xx)
    if (error.response?.status >= 500) {
      return true;
    }

    return false;
  }
}
```

#### Step 2: Create Client Classes (2-3 hours)

**2.1 IterationClient** (30 min)

Create `src/lib/infrastructure/api/clients/IterationClient.js`:

```javascript
import { ErrorHelper } from '../helpers/ErrorHelper.js';

/**
 * Client for GitLab Iteration (Sprint) operations.
 * Handles iteration queries and CRUD operations.
 */
export class IterationClient {
  constructor(graphQLHelper, paginationHelper, logger) {
    this.graphQL = graphQLHelper;
    this.pagination = paginationHelper;
    this.logger = logger;
  }

  /**
   * Fetch iterations for a group
   * @param {string} groupPath - GitLab group path
   * @param {Object} options - Query options (state, startDate, endDate)
   * @returns {Promise<Array>} Iterations
   */
  async fetchIterations(groupPath, options = {}) {
    this.logger.info('Fetching iterations', { groupPath, options });

    const query = `
      query getIterations($groupPath: ID!, $state: IterationState, $after: String) {
        group(fullPath: $groupPath) {
          iterations(state: $state, after: $after, first: 100) {
            nodes {
              id
              iid
              title
              description
              state
              startDate
              dueDate
              webUrl
              iterationCadence {
                id
                title
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;

    try {
      const iterations = await this.pagination.fetchAll(
        query,
        { groupPath, state: options.state },
        (data) => data.group.iterations.pageInfo,
        (data) => data.group.iterations.nodes
      );

      this.logger.info('Fetched iterations', {
        groupPath,
        count: iterations.length
      });

      return iterations;
    } catch (error) {
      throw ErrorHelper.transform(error, 'fetching iterations');
    }
  }

  /**
   * Fetch single iteration by ID
   * @param {string} iterationId - GitLab iteration global ID
   * @returns {Promise<Object>} Iteration
   */
  async fetchIteration(iterationId) {
    this.logger.debug('Fetching iteration', { iterationId });

    const query = `
      query getIteration($id: ID!) {
        iteration(id: $id) {
          id
          iid
          title
          description
          state
          startDate
          dueDate
          webUrl
          iterationCadence {
            id
            title
          }
        }
      }
    `;

    try {
      const data = await this.graphQL.execute(query, { id: iterationId });

      if (!data.iteration) {
        throw new Error(`Iteration not found: ${iterationId}`);
      }

      return data.iteration;
    } catch (error) {
      throw ErrorHelper.transform(error, `fetching iteration ${iterationId}`);
    }
  }
}
```

**2.2 IssueClient** (30 min)

Create `src/lib/infrastructure/api/clients/IssueClient.js` following same pattern.

**2.3 MergeRequestClient** (30 min)

Create `src/lib/infrastructure/api/clients/MergeRequestClient.js` following same pattern.

**2.4 PipelineClient** (30 min)

Create `src/lib/infrastructure/api/clients/PipelineClient.js` following same pattern.

**2.5 DeploymentClient** (30 min)

Create `src/lib/infrastructure/api/clients/DeploymentClient.js` following same pattern.

**2.6 IncidentClient** (30 min)

Create `src/lib/infrastructure/api/clients/IncidentClient.js` following same pattern.

#### Step 3: Refactor GitLabClient to Delegate (1 hour)

Update `src/lib/infrastructure/api/GitLabClient.js`:

```javascript
import { GraphQLHelper } from './helpers/GraphQLHelper.js';
import { PaginationHelper } from './helpers/PaginationHelper.js';
import { RateLimitHelper } from './helpers/RateLimitHelper.js';
import { IterationClient } from './clients/IterationClient.js';
import { IssueClient } from './clients/IssueClient.js';
import { MergeRequestClient } from './clients/MergeRequestClient.js';
import { PipelineClient } from './clients/PipelineClient.js';
import { DeploymentClient } from './clients/DeploymentClient.js';
import { IncidentClient } from './clients/IncidentClient.js';

/**
 * GitLab API Client - Orchestration Layer
 * Delegates to specialized clients for each resource type.
 *
 * Responsibilities:
 * 1. Initialize specialized clients
 * 2. Provide unified API surface
 * 3. Coordinate cross-resource operations
 *
 * @class GitLabClient
 */
export class GitLabClient {
  constructor(token, url, logger) {
    this.logger = logger;

    // Initialize helpers
    const graphQL = new GraphQLHelper(url, token, logger);
    const pagination = new PaginationHelper(graphQL, logger);
    const rateLimit = new RateLimitHelper(logger);

    // Initialize specialized clients
    this.iterations = new IterationClient(graphQL, pagination, logger);
    this.issues = new IssueClient(graphQL, pagination, logger);
    this.mergeRequests = new MergeRequestClient(graphQL, pagination, logger);
    this.pipelines = new PipelineClient(graphQL, pagination, logger);
    this.deployments = new DeploymentClient(graphQL, pagination, logger);
    this.incidents = new IncidentClient(graphQL, pagination, logger);

    this.logger.info('GitLabClient initialized', { url });
  }

  // Delegate methods (keep backward compatibility)
  async fetchIterations(groupPath, options) {
    return this.iterations.fetchIterations(groupPath, options);
  }

  async fetchIssues(iterationId, options) {
    return this.issues.fetchIssues(iterationId, options);
  }

  // ... delegate all other methods to specialized clients
}
```

#### Step 4: Update Tests (1 hour)

Update `test/infrastructure/api/GitLabClient.test.js`:

1. Keep existing integration tests (test GitLabClient as before)
2. Add unit tests for each new client class
3. Add unit tests for each helper class
4. Verify all 20+ tests still pass

#### Acceptance Criteria

- [ ] 4 helper classes created (GraphQL, Pagination, RateLimit, Error)
- [ ] 6 client classes created (Iteration, Issue, MR, Pipeline, Deployment, Incident)
- [ ] GitLabClient refactored to ~150 lines (orchestration only)
- [ ] All GitLabClient methods delegate to specialized clients
- [ ] Backward compatibility maintained (public API unchanged)
- [ ] All existing tests pass
- [ ] New unit tests added for helpers and clients
- [ ] Code duplication eliminated
- [ ] Each class has single responsibility

---

## Phase 2: High Priority Improvements (AFTER Phase 1)

### Estimated Effort: 6-9 hours

---

### 2.1 Add Frontend Service Layer (3-4 hours)

**Priority**: HIGH
**Problem**: React components make direct fetch() calls to backend API

#### Current State (Bad)

```javascript
// VelocityChart.jsx
const response = await fetch(`/api/metrics/velocity?iterations=${ids}`);
const data = await response.json();
```

**Issues**:
- Frontend tightly coupled to API implementation
- Hard to test (must mock global fetch)
- No error handling consistency
- API changes break components directly

#### Target State (Good)

```javascript
// VelocityChart.jsx
import { ApiClient } from '../services/ApiClient.js';

const apiClient = new ApiClient();
const data = await apiClient.getVelocityMetrics(iterationIds);
```

**Benefits**:
- Decouples frontend from API details
- Easy to test (mock ApiClient)
- Consistent error handling
- API changes isolated to one file

#### Implementation

**Step 1: Create ApiClient** (2 hours)

Create `src/frontend/services/ApiClient.js`:

```javascript
/**
 * Frontend API Client
 * Handles all HTTP communication with backend API.
 * Provides type-safe methods for each endpoint.
 *
 * Benefits:
 * 1. Decouples components from API details
 * 2. Consistent error handling
 * 3. Easy to test (mock ApiClient instead of fetch)
 * 4. Single place to update when API changes
 */
export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch wrapper with error handling
   * @private
   */
  async _fetch(url, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      // Transform fetch errors to application errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to reach server');
      }
      throw error;
    }
  }

  // Metrics endpoints
  async getVelocityMetrics(iterationIds) {
    const ids = iterationIds.join(',');
    return this._fetch(`/api/metrics/velocity?iterations=${ids}`);
  }

  async getThroughputMetrics(iterationIds) {
    const ids = iterationIds.join(',');
    return this._fetch(`/api/metrics/throughput?iterations=${ids}`);
  }

  async getCycleTimeMetrics(iterationIds) {
    const ids = iterationIds.join(',');
    return this._fetch(`/api/metrics/cycle-time?iterations=${ids}`);
  }

  async getLeadTimeMetrics(iterationIds) {
    const ids = iterationIds.join(',');
    return this._fetch(`/api/metrics/lead-time?iterations=${ids}`);
  }

  async getDeploymentFrequencyMetrics(iterationIds) {
    const ids = iterationIds.join(',');
    return this._fetch(`/api/metrics/deployment-frequency?iterations=${ids}`);
  }

  async getMTTRMetrics(iterationIds) {
    const ids = iterationIds.join(',');
    return this._fetch(`/api/metrics/mttr?iterations=${ids}`);
  }

  // Iterations endpoints
  async getIterations(groupPath) {
    return this._fetch(`/api/iterations?groupPath=${encodeURIComponent(groupPath)}`);
  }

  // Annotations endpoints
  async getAnnotations() {
    return this._fetch('/api/annotations');
  }

  async createAnnotation(annotation) {
    return this._fetch('/api/annotations', {
      method: 'POST',
      body: JSON.stringify(annotation)
    });
  }

  async updateAnnotation(id, annotation) {
    return this._fetch(`/api/annotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(annotation)
    });
  }

  async deleteAnnotation(id) {
    return this._fetch(`/api/annotations/${id}`, {
      method: 'DELETE'
    });
  }

  // Cache endpoints
  async getCacheStatus() {
    return this._fetch('/api/cache/status');
  }

  async clearCache() {
    return this._fetch('/api/cache/clear', {
      method: 'POST'
    });
  }
}
```

**Step 2: Create React Hook for ApiClient** (30 min)

Create `src/frontend/hooks/useApiClient.js`:

```javascript
import { useMemo } from 'react';
import { ApiClient } from '../services/ApiClient.js';

/**
 * Hook to access ApiClient instance
 * Ensures single instance across component tree
 */
export function useApiClient() {
  return useMemo(() => new ApiClient(), []);
}
```

**Step 3: Update Components** (1-2 hours)

Update all 37 components that make fetch() calls:

Before:
```javascript
const response = await fetch('/api/metrics/velocity?iterations=' + ids);
const data = await response.json();
```

After:
```javascript
const apiClient = useApiClient();
const data = await apiClient.getVelocityMetrics(iterationIds);
```

#### Acceptance Criteria

- [ ] ApiClient created with all backend endpoints
- [ ] useApiClient hook created
- [ ] All components updated to use ApiClient
- [ ] No direct fetch() calls in components
- [ ] Error handling is consistent
- [ ] All tests updated to mock ApiClient
- [ ] All 865 tests still pass

---

### 2.2 Move ServiceFactory to Correct Layer (1-2 hours)

**Priority**: HIGH
**Problem**: ServiceFactory is in Presentation layer, should be in Infrastructure layer

#### Current Location (Wrong)

```
src/server/services/ServiceFactory.js  ❌ Presentation layer
```

#### Target Location (Correct)

```
src/backend/infrastructure/di/ServiceFactory.js  ✅ Infrastructure layer
```

#### Why This Matters

**Clean Architecture Principle**: Dependency Injection is an infrastructure concern, not a presentation concern.

**Layer Responsibilities**:
- **Presentation**: Handle HTTP, render responses
- **Infrastructure**: External services, DI, persistence
- **Core**: Business logic

ServiceFactory creates infrastructure implementations (GitLabClient, FileRepository, etc), so it belongs in Infrastructure.

#### Implementation Steps

1. **Create new directory** (5 min)
   ```bash
   mkdir -p src/lib/infrastructure/di/
   ```

2. **Move file** (5 min)
   ```bash
   git mv src/server/services/ServiceFactory.js src/lib/infrastructure/di/ServiceFactory.js
   ```

3. **Update imports in routes** (30 min)
   - Update all files in `src/server/routes/`
   - Change: `../../server/services/ServiceFactory`
   - To: `../../lib/infrastructure/di/ServiceFactory`

4. **Update tests** (30 min)
   - Update `test/server/services/ServiceFactory.test.js`
   - Move to `test/infrastructure/di/ServiceFactory.test.js`
   - Update import paths

5. **Run tests** (5 min)
   - Verify all tests still pass
   - Fix any import errors

#### Acceptance Criteria

- [ ] ServiceFactory moved to `src/lib/infrastructure/di/`
- [ ] All route files updated with new import path
- [ ] Test file moved to `test/infrastructure/di/`
- [ ] All 865 tests still pass
- [ ] No broken imports

---

### 2.3 Standardize Error Handling (2-3 hours)

**Priority**: HIGH
**Problem**: Mix of thrown errors, logged errors, and silent failures

#### Current Issues

**Inconsistent Patterns**:
```javascript
// Pattern 1: Return error object
return { error: 'Something went wrong' };

// Pattern 2: Throw exception
throw new Error('Something went wrong');

// Pattern 3: Log and continue
console.error('Error:', error);
// continue execution

// Pattern 4: Silent failure
catch (error) {
  // nothing
}
```

**Impact**:
- Frontend doesn't know how to handle errors
- Some errors are swallowed
- Some errors crash the app
- Inconsistent user experience

#### Target Standard

**API Error Response Format**:
```javascript
{
  success: false,
  error: {
    message: "Human-readable error message",
    code: "ERROR_CODE",
    details: { ... } // optional
  }
}
```

**Success Response Format**:
```javascript
{
  success: true,
  data: { ... }
}
```

#### Implementation

**Step 1: Create Error Types** (30 min)

Create `src/lib/core/domain/errors.js`:

```javascript
/**
 * Base application error
 */
export class AppError extends Error {
  constructor(message, code, statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        details: this.details
      }
    };
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Not found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(resource, id) {
    super(
      `${resource} not found: ${id}`,
      'NOT_FOUND',
      404,
      { resource, id }
    );
  }
}

/**
 * External API errors (502)
 */
export class ExternalApiError extends AppError {
  constructor(message, service, details = {}) {
    super(message, 'EXTERNAL_API_ERROR', 502, { service, ...details });
  }
}

/**
 * Internal server errors (500)
 */
export class InternalError extends AppError {
  constructor(message, details = {}) {
    super(message, 'INTERNAL_ERROR', 500, details);
  }
}
```

**Step 2: Create Error Handling Middleware** (30 min)

Create `src/server/middleware/errorHandler.js`:

```javascript
import { AppError } from '../../lib/core/domain/errors.js';

/**
 * Express error handling middleware
 * Catches all errors and formats consistent response
 */
export function errorHandler(error, req, res, next) {
  // Log error (use logger in production)
  console.error('Error:', error);

  // Handle AppError instances
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Handle validation errors from express-validator
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.details
      }
    });
  }

  // Handle unknown errors (don't expose internals)
  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
}
```

**Step 3: Update app.js to Use Middleware** (15 min)

```javascript
import { errorHandler } from './middleware/errorHandler.js';

// ... routes

// Error handling (must be AFTER routes)
app.use(errorHandler);
```

**Step 4: Update Routes to Throw Errors** (1 hour)

Update all route files to throw AppError instead of returning error objects:

Before:
```javascript
try {
  const metrics = await metricsService.calculateMetrics(id);
  res.json(metrics);
} catch (error) {
  res.status(500).json({ error: error.message });
}
```

After:
```javascript
// Remove try/catch - let error middleware handle it
const metrics = await metricsService.calculateMetrics(id);
res.json({ success: true, data: metrics });

// Throw specific errors when needed
if (!iterationId) {
  throw new ValidationError('Iteration ID is required', {
    field: 'iterationId'
  });
}
```

**Step 5: Update Frontend Error Handling** (30 min)

Update ApiClient to handle new error format:

```javascript
async _fetch(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!data.success) {
    const error = new Error(data.error.message);
    error.code = data.error.code;
    error.details = data.error.details;
    throw error;
  }

  return data.data;
}
```

#### Acceptance Criteria

- [ ] Error types created (ValidationError, NotFoundError, etc.)
- [ ] Error handling middleware created
- [ ] app.js uses error middleware
- [ ] All routes throw AppError (no error objects)
- [ ] All responses use { success, data/error } format
- [ ] ApiClient handles new error format
- [ ] All 865 tests still pass
- [ ] Error messages are user-friendly

---

## Phase 3: Hybrid Architecture Refactor (AFTER Phase 1 & 2)

### Estimated Effort: 7-10 hours

---

### Target Structure

```
src/
├── backend/
│   ├── core/              # Business logic (Clean Architecture)
│   │   ├── domain/        # Entities, value objects, errors
│   │   ├── services/      # Business services
│   │   └── use-cases/     # Application use cases
│   ├── infrastructure/    # External dependencies
│   │   ├── gitlab/        # GitLab API clients (split from GitLabClient)
│   │   ├── persistence/   # File/DB repositories
│   │   ├── logging/       # Logger implementations
│   │   └── di/            # Dependency injection (ServiceFactory)
│   ├── api/               # Express API layer (was src/server)
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── server.js
│   └── __tests__/         # Backend tests (co-located)
├── frontend/
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── services/          # API client (NEW)
│   ├── styles/            # Theme, global styles
│   ├── utils/             # Utilities
│   ├── main.jsx           # Entry point
│   └── __tests__/         # Frontend tests (co-located)
├── shared/                # Shared types/constants (if needed)
data/                      # Runtime data (MOVED outside src/)
test/                      # Test setup files
```

### Implementation Plan

#### Step 1: Move Runtime Data Out of src/ (1 hour)

```bash
# Create data directory at root
mkdir -p data/

# Move data files
git mv src/data/metrics.json data/
git mv src/data/annotations.json data/
git mv src/data/cache/ data/

# Update paths in code
# FileAnnotationsRepository: src/data/ → data/
# IterationCacheRepository: src/data/cache/ → data/cache/
```

**Files to Update**:
- `src/lib/infrastructure/repositories/FileAnnotationsRepository.js`
- `src/lib/infrastructure/repositories/IterationCacheRepository.js`
- `src/lib/infrastructure/di/ServiceFactory.js`

#### Step 2: Create New Folder Structure (1 hour)

```bash
# Create backend structure
mkdir -p src/backend/core/{domain,services,use-cases}
mkdir -p src/backend/infrastructure/{gitlab,persistence,logging,di}
mkdir -p src/backend/api/{routes,middleware}

# Create frontend structure
mkdir -p src/frontend/{components,hooks,services,styles,utils}

# Create shared
mkdir -p src/shared
```

#### Step 3: Move Core Files (1 hour)

```bash
# Move entities → domain
git mv src/lib/core/entities/ src/backend/core/domain/entities/
git mv src/lib/core/domain/errors.js src/backend/core/domain/

# Move services
git mv src/lib/core/services/ src/backend/core/services/

# Move use-cases
git mv src/lib/core/use-cases/ src/backend/core/use-cases/

# Move interfaces (keep with core)
git mv src/lib/core/interfaces/ src/backend/core/interfaces/
```

#### Step 4: Move Infrastructure Files (1 hour)

```bash
# Move GitLab clients
git mv src/lib/infrastructure/api/ src/backend/infrastructure/gitlab/

# Move repositories
git mv src/lib/infrastructure/repositories/ src/backend/infrastructure/persistence/

# Move adapters
git mv src/lib/infrastructure/adapters/ src/backend/infrastructure/adapters/

# Move ServiceFactory
git mv src/lib/infrastructure/di/ src/backend/infrastructure/di/
```

#### Step 5: Move API Files (30 min)

```bash
# Move server files
git mv src/server/routes/ src/backend/api/routes/
git mv src/server/middleware/ src/backend/api/middleware/
git mv src/server/app.js src/backend/api/server.js
```

#### Step 6: Move Frontend Files (30 min)

```bash
# Move React files
git mv src/public/components/ src/frontend/components/
git mv src/public/hooks/ src/frontend/hooks/
git mv src/public/services/ src/frontend/services/
git mv src/public/styles/ src/frontend/styles/
git mv src/public/utils/ src/frontend/utils/
git mv src/public/js/main.jsx src/frontend/main.jsx
git mv src/public/index.html src/frontend/index.html
```

#### Step 7: Update Import Paths (2-3 hours)

This is the most tedious part. Use find/replace:

**Backend imports**:
```javascript
// Before
import { Metric } from '../../lib/core/entities/Metric.js';

// After
import { Metric } from '../../backend/core/domain/entities/Metric.js';
```

**Strategy**:
1. Update one layer at a time (core → infrastructure → api)
2. Run tests after each layer
3. Fix import errors as they appear
4. Use IDE refactoring tools if available

#### Step 8: Update Configuration Files (1 hour)

**Update vite.config.js**:
```javascript
export default defineConfig({
  root: 'src/frontend',
  build: {
    outDir: '../../dist/public'
  }
});
```

**Update jest.config.js**:
```javascript
export default {
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '**/test/**/*.test.js',
    '**/__tests__/**/*.test.js'
  ]
};
```

**Update package.json scripts**:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "nodemon src/backend/api/server.js",
    "dev:frontend": "vite",
    "build": "vite build"
  }
}
```

#### Step 9: Clean Up (30 min)

```bash
# Remove old directories
rm -rf src/lib/
rm -rf src/server/
rm -rf src/public/

# Remove empty src/test
rm -rf src/test/
```

#### Step 10: Verify Everything Works (1 hour)

1. **Run all tests**: `npm test`
   - Should pass all 865 tests
   - Fix any import errors

2. **Run backend**: `npm run dev:backend`
   - Should start without errors
   - Check console for errors

3. **Run frontend**: `npm run dev:frontend`
   - Should build without errors
   - Open browser and test UI

4. **Manual testing**:
   - Select iterations
   - View charts
   - Create/edit annotations
   - Check cache status

### Acceptance Criteria

- [ ] `src/data/` moved to `data/` (outside src/)
- [ ] Backend files in `src/backend/`
- [ ] Frontend files in `src/frontend/`
- [ ] Shared files in `src/shared/` (if any)
- [ ] All import paths updated
- [ ] All configuration files updated
- [ ] Old directories cleaned up
- [ ] All 865 tests pass
- [ ] Backend starts without errors
- [ ] Frontend builds without errors
- [ ] Manual testing passes

---

## Testing Strategy Throughout All Phases

### After Each Change

1. **Run affected tests**:
   ```bash
   npm test -- --testPathPattern=GitLabClient
   ```

2. **Run all tests**:
   ```bash
   npm test
   ```

3. **Check coverage**:
   ```bash
   npm run test:coverage
   ```

### Regression Prevention

- Run full test suite before committing each phase
- Keep coverage ≥81% (current level)
- Add new tests for new code
- Update existing tests for refactored code

### Manual Testing Checklist

After each phase, verify:
- [ ] Backend starts: `npm run dev:backend`
- [ ] Frontend builds: `npm run dev:frontend`
- [ ] Can select iterations
- [ ] Charts render correctly
- [ ] Can create/edit annotations
- [ ] Cache status works
- [ ] No console errors

---

## Rollback Plan

If any phase breaks tests or functionality:

1. **Identify what broke**: Run tests to find failures
2. **Git revert**: Revert to last passing commit
   ```bash
   git revert HEAD
   ```
3. **Review changes**: Understand what went wrong
4. **Add tests**: Add specific tests for broken area
5. **Try again**: Attempt change more carefully

---

## Commit Strategy

### Phase 1 Commits

1. `refactor: Add ILogger interface and ConsoleLogger implementation`
2. `refactor: Replace all console.* calls with logger (GitLabClient)`
3. `refactor: Replace all console.* calls with logger (MetricsService)`
4. `refactor: Replace all console.* calls with logger (remaining files)`
5. `refactor: Extract shared metrics calculation in MetricsService`
6. `refactor: Create GitLabClient helper classes (GraphQL, Pagination, RateLimit, Error)`
7. `refactor: Create GitLabClient specialized clients (Iteration, Issue, MR, Pipeline, Deployment, Incident)`
8. `refactor: Update GitLabClient to delegate to specialized clients`

### Phase 2 Commits

1. `feat: Add frontend ApiClient service layer`
2. `refactor: Update all components to use ApiClient`
3. `refactor: Move ServiceFactory to infrastructure/di layer`
4. `feat: Standardize error handling with AppError and middleware`

### Phase 3 Commits

1. `refactor: Move runtime data outside src/ (src/data → data/)`
2. `refactor: Create new backend/frontend folder structure`
3. `refactor: Move core files to backend/core`
4. `refactor: Move infrastructure files to backend/infrastructure`
5. `refactor: Move API files to backend/api`
6. `refactor: Move frontend files to src/frontend`
7. `refactor: Update all import paths`
8. `refactor: Update build configuration (vite, jest, package.json)`
9. `refactor: Clean up old directories`

---

## Success Metrics

### Phase 1 Success

- [ ] 0 console.* calls in production code (down from 153)
- [ ] MetricsService has 0 duplicate code (down from 146 lines)
- [ ] GitLabClient is <150 lines (down from 1,230)
- [ ] 11 new classes created (4 helpers + 6 clients + 1 logger)
- [ ] All 865 tests pass
- [ ] Coverage ≥81.3%

### Phase 2 Success

- [ ] 0 direct fetch() calls in React components (down from 37)
- [ ] ServiceFactory in correct layer (infrastructure/di)
- [ ] Consistent error format across all APIs
- [ ] 5 error types defined
- [ ] All 865 tests pass
- [ ] Coverage ≥81.3%

### Phase 3 Success

- [ ] Clear backend/frontend separation
- [ ] Clean Architecture preserved in backend
- [ ] Runtime data outside src/
- [ ] All import paths correct
- [ ] All 865 tests pass
- [ ] Manual testing passes
- [ ] Build works without errors

---

## Estimated Timeline

### Conservative Estimate (Upper Bound)

- **Phase 1**: 15 hours (3 days @ 5 hours/day)
- **Phase 2**: 9 hours (2 days @ 4.5 hours/day)
- **Phase 3**: 10 hours (2 days @ 5 hours/day)

**Total**: 34 hours (~7 days @ 5 hours/day)

### Optimistic Estimate (Lower Bound)

- **Phase 1**: 10 hours (2 days @ 5 hours/day)
- **Phase 2**: 6 hours (1-2 days)
- **Phase 3**: 7 hours (1-2 days)

**Total**: 23 hours (~5 days @ 5 hours/day)

**Realistic Expectation**: 5-7 days of focused work

---

## Final Notes

1. **Phase 0 (Testing) is COMPLETE** ✅
   - 81.3% branch coverage achieved
   - 865 tests passing
   - Ready to proceed with refactoring

2. **Phases must be done in order**:
   - Phase 1 fixes code quality issues
   - Phase 2 improves architecture
   - Phase 3 reorganizes structure

3. **Keep tests passing**:
   - Run tests after each commit
   - Fix failures immediately
   - Don't proceed if tests fail

4. **Document as you go**:
   - Update ADRs for major decisions
   - Add JSDoc to new classes
   - Update README if needed

5. **Ask for help if stuck**:
   - Use agents for guidance
   - Pair program on complex parts
   - Review PRs before merging

---

## Questions to Answer Before Starting

1. **Schedule**: When should we start Phase 1?
2. **Reviewer**: Who will review PRs?
3. **Deployment**: Can we deploy incrementally or all at once?
4. **Backup**: Is there a backup plan if something goes wrong?
5. **Communication**: How should we communicate progress?

---

**Ready to begin Phase 1!** 🚀
