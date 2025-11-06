# Logging and Security

**Version:** 1.0
**Last Updated:** 2025-11-06

## Overview

Proper logging is essential for debugging and monitoring, but careless logging can expose sensitive information. This document outlines what's safe to log, what's not, and how to implement secure logging practices.

## Golden Rule

**Never log sensitive information that could compromise security or privacy.**

## What's Safe to Log

### Resource Identifiers (Non-Sensitive)

```javascript
// SAFE - Public resource IDs
logger.info('Fetching issues for project', { projectId: 'project-123' });
logger.info('Loading sprint', { sprintId: 'sprint-456' });
logger.info('Calculating metrics for milestone', { milestoneId: 'milestone-789' });
```

### Counts and Statistics

```javascript
// SAFE - Aggregate data
logger.info('Fetched issues', { count: 25 });
logger.info('Sprint metrics calculated', {
  velocity: 42,
  completionRate: 0.85
});
logger.info('Cache hit rate', { hits: 150, misses: 10 });
```

### Non-Sensitive Metadata

```javascript
// SAFE - Public metadata
logger.info('API request completed', {
  endpoint: '/api/sprints',
  method: 'GET',
  statusCode: 200,
  duration: '145ms',
});

logger.info('File operation', {
  operation: 'write',
  filename: 'sprint-123.json',
  size: '2.4KB',
});
```

### Application State

```javascript
// SAFE - Application state
logger.info('Application started', { version: '1.0.0', environment: 'development' });
logger.info('Configuration loaded', { dataDirectory: '/data', cacheEnabled: true });
logger.debug('Component rendered', { component: 'MetricsDisplay', props: { sprintId: 'sprint-123' } });
```

## What's Unsafe to Log

### Authentication Credentials (NEVER LOG)

```javascript
// DANGEROUS - Never log tokens or passwords
logger.error('Auth failed', {
  password: 'secret123' // ❌ NEVER
});

logger.info('API request', {
  headers: {
    Authorization: 'Bearer glpat-xxxxx' // ❌ NEVER
  }
});

// CORRECT - Redact credentials
logger.info('API request', {
  headers: {
    Authorization: '[REDACTED]' // ✓ Safe
  }
});
```

### API Keys and Secrets

```javascript
// DANGEROUS - Never log API keys
const apiKey = process.env.GITLAB_API_KEY;
logger.info('Using API key', { apiKey }); // ❌ NEVER

// CORRECT - Log that key exists, not the key itself
logger.info('API key loaded', { keyPresent: !!apiKey }); // ✓ Safe
```

### Personal Identifiable Information (PII)

```javascript
// DANGEROUS - Never log PII
logger.info('User logged in', {
  email: 'user@example.com', // ❌ Avoid
  ipAddress: '192.168.1.1',  // ❌ Avoid
  name: 'John Doe'            // ❌ Avoid
});

// CORRECT - Use anonymized identifiers
logger.info('User logged in', {
  userId: 'user-123', // ✓ Safe (internal ID)
});
```

### Full Request/Response Bodies

```javascript
// DANGEROUS - May contain sensitive data
logger.debug('API response', {
  body: apiResponse // ❌ Risky - might contain tokens
});

// CORRECT - Log specific safe fields
logger.debug('API response', {
  statusCode: apiResponse.status,
  itemCount: apiResponse.data.length,
  hasMore: apiResponse.hasMore,
});
```

### Stack Traces with Sensitive Data

```javascript
// DANGEROUS - Stack trace might contain sensitive variables
try {
  await authenticateWithToken(secretToken);
} catch (error) {
  logger.error('Auth failed', { error }); // ❌ Might expose secretToken
}

// CORRECT - Log safe error information
try {
  await authenticateWithToken(secretToken);
} catch (error) {
  logger.error('Auth failed', {
    message: error.message,
    code: error.code,
    // Exclude full stack trace or sanitize it
  });
}
```

## Logger Service Pattern

### Why Not console.log?

```javascript
// DON'T - Direct console usage
console.log('Fetching data'); // No context, hard to filter, no levels
console.error('Error occurred', error); // Might log sensitive data

// DO - Use logger service
logger.info('Fetching data', { operation: 'fetchSprintData' });
logger.error('Operation failed', { message: error.message, code: error.code });
```

### Basic Logger Service

```javascript
// src/infrastructure/logging/logger.js

/**
 * @typedef {Object} LogContext
 * @property {string} [operation] - Operation being performed
 * @property {Object} [metadata] - Additional metadata
 */

class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
  }

  /**
   * Log debug message
   * @param {string} message
   * @param {LogContext} [context]
   */
  debug(message, context = {}) {
    this._log('debug', message, context);
  }

  /**
   * Log info message
   * @param {string} message
   * @param {LogContext} [context]
   */
  info(message, context = {}) {
    this._log('info', message, context);
  }

  /**
   * Log warning message
   * @param {string} message
   * @param {LogContext} [context]
   */
  warn(message, context = {}) {
    this._log('warn', message, context);
  }

  /**
   * Log error message
   * @param {string} message
   * @param {LogContext} [context]
   */
  error(message, context = {}) {
    this._log('error', message, context);
  }

  /**
   * @private
   */
  _log(level, message, context) {
    if (this.levels[level] < this.levels[this.level]) {
      return; // Don't log below configured level
    }

    const sanitizedContext = this._sanitize(context);
    const timestamp = new Date().toISOString();

    const logEntry = {
      timestamp,
      level,
      message,
      ...sanitizedContext,
    };

    // Output based on level
    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Sanitize context to remove sensitive data
   * @private
   */
  _sanitize(context) {
    const sensitiveKeys = [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'session',
    ];

    const sanitized = {};

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this._sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

// Export singleton instance
module.exports = new Logger(process.env.LOG_LEVEL || 'info');
```

### Usage Examples

```javascript
const logger = require('../infrastructure/logging/logger');

// Core layer
function calculateVelocity(sprint) {
  logger.debug('Calculating velocity', {
    sprintId: sprint.id,
    issueCount: sprint.issues.length
  });

  const velocity = sprint.issues
    .filter(i => i.status === 'completed')
    .reduce((sum, i) => sum + (i.points || 0), 0);

  logger.info('Velocity calculated', { sprintId: sprint.id, velocity });

  return velocity;
}

// Infrastructure layer
async function fetchSprintData(projectId, milestoneId) {
  logger.info('Fetching sprint data', { projectId, milestoneId });

  try {
    const response = await apiClient.request(query, { projectId, milestoneId });
    logger.info('Sprint data fetched', {
      projectId,
      milestoneId,
      issueCount: response.project.milestone.issues.nodes.length
    });
    return response;
  } catch (error) {
    logger.error('Failed to fetch sprint data', {
      projectId,
      milestoneId,
      errorMessage: error.message,
      errorCode: error.code,
      // Note: Not logging full error object which might contain sensitive request details
    });
    throw error;
  }
}

// Presentation layer
function MetricsDisplay({ sprintId }) {
  logger.debug('Rendering metrics display', { sprintId });
  // ...
}
```

## Log Levels

### DEBUG
Detailed diagnostic information. Only enabled in development.

```javascript
logger.debug('Cache lookup', { key: 'sprint-123', hit: true });
logger.debug('Component state updated', { component: 'Dashboard', state: { loading: false } });
```

### INFO
General informational messages about application flow.

```javascript
logger.info('Sprint loaded', { sprintId: 'sprint-123', issueCount: 25 });
logger.info('Metrics calculated', { velocity: 42, cycleTime: 3.5 });
```

### WARN
Warning messages for potentially harmful situations.

```javascript
logger.warn('Issue missing points estimate', { issueId: 'issue-123' });
logger.warn('API rate limit approaching', { remaining: 50, limit: 1000 });
```

### ERROR
Error messages for failures and exceptions.

```javascript
logger.error('Failed to save metrics', {
  sprintId: 'sprint-123',
  errorMessage: error.message
});
logger.error('API request failed', {
  endpoint: '/api/sprints',
  statusCode: 500
});
```

## Redaction Patterns

### Automatic Redaction

```javascript
function redactSensitiveData(obj) {
  const sensitive = ['password', 'token', 'apiKey', 'secret', 'authorization'];

  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const redacted = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}
```

### Manual Redaction for URLs

```javascript
function redactUrl(url) {
  try {
    const urlObj = new URL(url);

    // Redact password from URL if present
    if (urlObj.password) {
      urlObj.password = '[REDACTED]';
    }

    // Redact token query parameter
    if (urlObj.searchParams.has('token')) {
      urlObj.searchParams.set('token', '[REDACTED]');
    }

    return urlObj.toString();
  } catch {
    return '[INVALID_URL]';
  }
}

logger.info('API request', { url: redactUrl(apiUrl) });
```

## Security Best Practices

### 1. Never Log Raw Errors

```javascript
// BAD
catch (error) {
  logger.error('Error', { error }); // Might contain sensitive data
}

// GOOD
catch (error) {
  logger.error('Error', {
    message: error.message,
    code: error.code,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
}
```

### 2. Validate Before Logging

```javascript
function logUserAction(action, userId, details) {
  // Ensure details don't contain sensitive data
  const safeDetails = {
    action: details.action,
    resourceId: details.resourceId,
    // Explicitly exclude sensitive fields
  };

  logger.info('User action', { action, userId, ...safeDetails });
}
```

### 3. Use Environment-Based Logging

```javascript
// Development: More verbose
if (process.env.NODE_ENV === 'development') {
  logger.debug('Full request', { method, url, headers: sanitize(headers) });
}

// Production: Minimal
logger.info('Request processed', { method, url, statusCode });
```

### 4. Audit Log Access

```javascript
// If logs are stored, restrict access
// Implement log rotation and retention policies
// Consider encrypting logs at rest
```

## Testing Logging

### Test That Sensitive Data is Redacted

```javascript
describe('Logger', () => {
  it('redacts passwords from logs', () => {
    const consoleSpy = jest.spyOn(console, 'log');

    logger.info('User login', {
      username: 'user@example.com',
      password: 'secret123'
    });

    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toContain('[REDACTED]');
    expect(logOutput).not.toContain('secret123');

    consoleSpy.mockRestore();
  });
});
```

## Related Documentation

- **Error Handling:** `_context/coding/error-handling.md`
- **API Integration:** `_context/integration/gitlab-api.md`
- **Testing:** `_context/testing/test-examples.md`

## Quick Reference

| Data Type | Safe to Log? | Example |
|-----------|-------------|---------|
| Resource IDs | ✓ Yes | `sprintId: 'sprint-123'` |
| Counts | ✓ Yes | `issueCount: 25` |
| Status Codes | ✓ Yes | `statusCode: 200` |
| Passwords | ❌ Never | `password: 'xxx'` |
| API Tokens | ❌ Never | `token: 'glpat-xxx'` |
| Email Addresses | ❌ Avoid | `email: 'user@example.com'` |
| Full Errors | ❌ Be Careful | `error: error` (use message only) |

## Security Checklist

- [ ] No passwords in logs
- [ ] No API tokens in logs
- [ ] No PII (emails, names) in logs
- [ ] Error objects are sanitized
- [ ] Request headers are redacted
- [ ] URLs don't contain sensitive query params
- [ ] Stack traces are sanitized or dev-only
- [ ] Logger service used (not console.log)
- [ ] Log level appropriate for environment
- [ ] Sensitive fields automatically redacted
