# Clean Architecture Guide

**Version:** 1.0
**Last Updated:** 2025-01-06
**Reference:** https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html

---

## Overview

This project follows Clean Architecture principles to achieve maintainability, testability, and independence from frameworks, databases, and external dependencies. This document explains the architecture layers, dependency rules, and how they apply to this project.

**Key Principle:** Dependencies point inward. The Core layer has zero external dependencies. Infrastructure and Presentation layers depend on Core, never the reverse.

---

## The Layers

Clean Architecture organizes code into concentric layers, with dependencies flowing inward:

```
┌─────────────────────────────────────────┐
│       Presentation Layer                │
│   (UI, React Components, API Routes)    │
│   Depends on: Core, Infrastructure      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      Infrastructure Layer               │
│  (GitLab Client, File Storage, Logger)  │
│        Depends on: Core                 │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│          Core Layer                     │
│     (Business Logic, Entities)          │
│      Depends on: NOTHING                │
└─────────────────────────────────────────┘
```

---

## Layer 1: Core (Business Logic)

### Purpose
Contains pure business logic with **zero external dependencies**. No imports of Express, file system, GitLab client, or any framework.

### Contents
- **Entities:** Domain objects (Sprint, Metric, Annotation, Issue, MergeRequest)
- **Business Logic:** Metric calculations, correlation analysis, validation rules
- **Interfaces:** Abstract contracts that Infrastructure must implement

### Characteristics
- **Pure functions** - Same input always produces same output
- **No side effects** - No file I/O, no network calls, no logging
- **Framework independent** - Could run in browser, server, or CLI
- **Highly testable** - Easy to test in isolation

### Project Examples

**Entities:**
```javascript
// src/lib/core/entities/Sprint.js
/**
 * Sprint entity representing a GitLab iteration
 * @param {Object} data - Sprint data
 * @param {string} data.id - Sprint ID
 * @param {string} data.title - Sprint title
 * @param {Date} data.startDate - Start date
 * @param {Date} data.dueDate - Due date
 */
export class Sprint {
  constructor({ id, title, startDate, dueDate }) {
    this.id = id;
    this.title = title;
    this.startDate = startDate;
    this.dueDate = dueDate;
  }

  getDurationDays() {
    return (this.dueDate - this.startDate) / (1000 * 60 * 60 * 24);
  }
}
```

**Business Logic:**
```javascript
// src/lib/core/MetricsCalculator.js
import { mean, quantile } from 'simple-statistics';

/**
 * Pure business logic for calculating metrics
 * No dependencies on frameworks or infrastructure
 */
export class MetricsCalculator {
  /**
   * Calculate velocity from issues
   * @param {Array<Object>} issues - Array of issues
   * @returns {number} Sum of issue weights
   */
  calculateVelocity(issues) {
    return issues.reduce((sum, issue) => sum + (issue.weight || 0), 0);
  }

  /**
   * Calculate cycle time statistics
   * @param {Array<Object>} issues - Array of closed issues
   * @returns {{avg: number, p50: number, p90: number}}
   */
  calculateCycleTime(issues) {
    const cycleTimes = issues
      .filter(issue => issue.closedAt)
      .map(issue => {
        const created = new Date(issue.createdAt);
        const closed = new Date(issue.closedAt);
        return (closed - created) / (1000 * 60 * 60 * 24);
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
}
```

**Interfaces (Abstract Contracts):**
```javascript
// src/lib/core/interfaces/IMetricsRepository.js
/**
 * Interface for metrics storage
 * Infrastructure layer must implement this
 */
export class IMetricsRepository {
  async save(metrics) {
    throw new Error('Must implement save()');
  }

  async findBySprint(sprintId) {
    throw new Error('Must implement findBySprint()');
  }

  async findAll() {
    throw new Error('Must implement findAll()');
  }
}
```

### Directory Structure
```
src/lib/core/
├── entities/              # Domain objects
│   ├── Sprint.js
│   ├── Metric.js
│   ├── Annotation.js
│   └── Issue.js
├── interfaces/            # Abstract contracts
│   ├── IMetricsRepository.js
│   ├── IGitLabClient.js
│   └── ILogger.js
├── MetricsCalculator.js   # Calculation logic
├── CorrelationAnalyzer.js # Correlation logic
└── Validator.js           # Validation rules
```

---

## Layer 2: Infrastructure (External Dependencies)

### Purpose
Implements Core interfaces and handles all external dependencies (API calls, file I/O, databases, logging).

### Contents
- **GitLab Client:** GraphQL API integration
- **File Storage:** JSON file read/write
- **Logger:** Logging service
- **Cache:** Caching implementation

### Characteristics
- **Implements Core interfaces** - Concrete implementations
- **Handles side effects** - Network, file system, external services
- **Framework dependent** - Uses specific libraries (graphql-request, fs)
- **Depends on Core** - Uses Core entities and interfaces

### Project Examples

**GitLab Client (implements IGitLabClient):**
```javascript
// src/lib/infrastructure/GitLabClient.js
import { GraphQLClient } from 'graphql-request';
import { IGitLabClient } from '../core/interfaces/IGitLabClient.js';

/**
 * Concrete implementation of GitLab API client
 * Depends on Core interface, implements it with external library
 */
export class GitLabClient extends IGitLabClient {
  constructor(url, token) {
    super();
    this.client = new GraphQLClient(`${url}/api/graphql`, {
      headers: { authorization: `Bearer ${token}` }
    });
  }

  async fetchIterations() {
    const query = `
      query getIterations($fullPath: ID!, $after: String) {
        group(fullPath: $fullPath) {
          iterations(first: 100, after: $after) {
            nodes { id, title, startDate, dueDate }
            pageInfo { hasNextPage, endCursor }
          }
        }
      }
    `;

    // GraphQL query implementation
    const data = await this.client.request(query, { fullPath: this.groupPath });
    return data.group.iterations.nodes;
  }
}
```

**File Storage (implements IMetricsRepository):**
```javascript
// src/lib/infrastructure/FileMetricsRepository.js
import fs from 'fs/promises';
import path from 'path';
import { IMetricsRepository } from '../core/interfaces/IMetricsRepository.js';

/**
 * Concrete implementation using file system
 * Depends on Core interface, implements with fs module
 */
export class FileMetricsRepository extends IMetricsRepository {
  constructor(dataDir) {
    super();
    this.filePath = path.join(dataDir, 'metrics.json');
  }

  async save(metrics) {
    const data = JSON.stringify(metrics, null, 2);
    await fs.writeFile(this.filePath, data, 'utf-8');
  }

  async findAll() {
    const data = await fs.readFile(this.filePath, 'utf-8');
    return JSON.parse(data);
  }
}
```

### Directory Structure
```
src/lib/infrastructure/
├── GitLabClient.js        # GitLab API integration
├── FileMetricsRepository.js
├── FileAnnotationsRepository.js
├── Logger.js              # Logging service
└── Cache.js               # Caching implementation
```

---

## Layer 3: Presentation (UI & API)

### Purpose
Handles user interaction and external communication. For this project: React UI and Express API routes.

### Contents
- **React Components:** UI rendering
- **API Routes:** Express endpoints
- **Controllers:** Request handlers
- **View Models:** Data transformation for UI

### Characteristics
- **User-facing** - Handles HTTP requests, renders UI
- **Depends on Core & Infrastructure** - Uses both layers
- **Framework dependent** - React, Express, styled-components
- **Coordinates workflows** - Orchestrates Core and Infrastructure

### Project Examples

**API Route (Express):**
```javascript
// src/server/routes/metrics.js
import express from 'express';
import { MetricsCalculator } from '../lib/core/MetricsCalculator.js';
import { GitLabClient } from '../lib/infrastructure/GitLabClient.js';
import { FileMetricsRepository } from '../lib/infrastructure/FileMetricsRepository.js';

const router = express.Router();

/**
 * GET /api/metrics/:sprintId
 * Coordinates Core and Infrastructure to fetch and calculate metrics
 */
router.get('/metrics/:sprintId', async (req, res) => {
  try {
    // Infrastructure: Fetch data
    const gitLabClient = new GitLabClient(process.env.GITLAB_URL, process.env.GITLAB_TOKEN);
    const issues = await gitLabClient.fetchIssuesForSprint(req.params.sprintId);

    // Core: Calculate metrics (pure business logic)
    const calculator = new MetricsCalculator();
    const velocity = calculator.calculateVelocity(issues);
    const cycleTime = calculator.calculateCycleTime(issues);

    // Infrastructure: Persist
    const repository = new FileMetricsRepository(process.env.DATA_DIR);
    await repository.save({ sprintId: req.params.sprintId, velocity, cycleTime });

    // Response
    res.json({ velocity, cycleTime });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**React Component:**
```javascript
// src/public/components/MetricsCard.jsx
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

/**
 * Presentation component for displaying metrics
 * Depends on API (Presentation layer) for data
 */
export function MetricsCard({ sprintId }) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetch(`/api/metrics/${sprintId}`)
      .then(res => res.json())
      .then(data => setMetrics(data));
  }, [sprintId]);

  if (!metrics) return <Loading>Loading...</Loading>;

  return (
    <Card>
      <Title>Sprint Metrics</Title>
      <Metric>Velocity: {metrics.velocity} points</Metric>
      <Metric>Avg Cycle Time: {metrics.cycleTime.avg.toFixed(1)} days</Metric>
    </Card>
  );
}

const Card = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;
```

### Directory Structure
```
src/
├── server/                # Express API
│   ├── routes/           # API endpoints
│   │   ├── metrics.js
│   │   └── annotations.js
│   ├── controllers/      # Request handlers
│   └── server.js         # Express app
└── public/               # React UI
    ├── components/       # React components
    │   ├── MetricsCard.jsx
    │   └── AnnotationModal.jsx
    ├── hooks/            # Custom React hooks
    └── App.jsx           # Root component
```

---

## The Dependency Rule

**CRITICAL:** Dependencies always point inward. Outer layers depend on inner layers, NEVER the reverse.

### Valid Dependencies ✅
```
Presentation → Infrastructure ✅
Presentation → Core ✅
Infrastructure → Core ✅
```

### Invalid Dependencies ❌
```
Core → Infrastructure ❌
Core → Presentation ❌
Infrastructure → Presentation ❌
```

### How to Enforce

**1. Use Dependency Inversion Principle**

**BAD (Core depends on Infrastructure):**
```javascript
// src/lib/core/MetricsService.js
import { GitLabClient } from '../infrastructure/GitLabClient.js'; // ❌ Core depends on Infrastructure

export class MetricsService {
  constructor() {
    this.gitLabClient = new GitLabClient(); // ❌ Concrete dependency
  }
}
```

**GOOD (Core depends on abstraction):**
```javascript
// src/lib/core/MetricsService.js
import { IGitLabClient } from './interfaces/IGitLabClient.js'; // ✅ Core depends on Core

export class MetricsService {
  /**
   * @param {IGitLabClient} gitLabClient - Injected dependency
   */
  constructor(gitLabClient) {
    this.gitLabClient = gitLabClient; // ✅ Depends on interface, not implementation
  }
}
```

**2. Inject Dependencies from Outer Layers**

```javascript
// src/server/routes/metrics.js (Presentation layer)
import { MetricsService } from '../../lib/core/MetricsService.js';
import { GitLabClient } from '../../lib/infrastructure/GitLabClient.js';

// Presentation layer creates Infrastructure and injects into Core
const gitLabClient = new GitLabClient(process.env.GITLAB_URL, process.env.GITLAB_TOKEN);
const metricsService = new MetricsService(gitLabClient); // ✅ Dependency injection
```

**3. Use Interfaces to Define Contracts**

```javascript
// src/lib/core/interfaces/IGitLabClient.js
export class IGitLabClient {
  async fetchIssuesForSprint(sprintId) {
    throw new Error('Must implement fetchIssuesForSprint()');
  }
}
```

Core defines what it needs (interface), Infrastructure provides it (implementation).

---

## Why Clean Architecture?

### 1. Testability

**Core layer is trivially testable:**
```javascript
// test/core/MetricsCalculator.test.js
import { MetricsCalculator } from '../../src/lib/core/MetricsCalculator.js';

test('calculates velocity', () => {
  const calculator = new MetricsCalculator();
  const issues = [{ weight: 3 }, { weight: 5 }];

  expect(calculator.calculateVelocity(issues)).toBe(8);
  // No mocking needed! Pure function with no dependencies
});
```

**Infrastructure can be mocked:**
```javascript
// test/core/MetricsService.test.js
import { MetricsService } from '../../src/lib/core/MetricsService.js';

class MockGitLabClient {
  async fetchIssuesForSprint() {
    return [{ weight: 3 }, { weight: 5 }]; // Mock data
  }
}

test('fetches and calculates metrics', async () => {
  const mockClient = new MockGitLabClient();
  const service = new MetricsService(mockClient);

  const metrics = await service.getMetricsForSprint('123');
  expect(metrics.velocity).toBe(8);
});
```

### 2. Maintainability

**Change infrastructure without touching business logic:**
- Switch from file storage → SQLite: Only change `FileMetricsRepository`
- Switch from GitLab → GitHub: Only change `GitLabClient`
- Business logic (Core) remains unchanged

### 3. Independence from Frameworks

**Core has no framework dependencies:**
- Can run in Node.js, browser, or Deno
- Can be reused in CLI, web app, or desktop app
- Not tied to Express, React, or any specific technology

### 4. Defer Decisions

**Defer database choice:**
- Start with file storage (simple)
- Migrate to SQLite later (just swap implementation)
- Core logic unaffected

**Defer UI framework choice:**
- Start with React
- Could switch to Vue/Svelte later
- Core and Infrastructure unchanged

---

## Common Patterns in This Project

### Pattern 1: Repository Pattern

**Core defines interface:**
```javascript
// src/lib/core/interfaces/IMetricsRepository.js
export class IMetricsRepository {
  async save(metrics) { throw new Error('Not implemented'); }
  async findAll() { throw new Error('Not implemented'); }
}
```

**Infrastructure implements:**
```javascript
// src/lib/infrastructure/FileMetricsRepository.js
export class FileMetricsRepository extends IMetricsRepository {
  async save(metrics) { /* File system implementation */ }
  async findAll() { /* File system implementation */ }
}
```

**Presentation uses:**
```javascript
const repository = new FileMetricsRepository('./data');
await repository.save(metrics);
```

### Pattern 2: Service Pattern

**Core service orchestrates business logic:**
```javascript
// src/lib/core/MetricsService.js
export class MetricsService {
  constructor(gitLabClient, metricsRepository) {
    this.gitLabClient = gitLabClient;
    this.metricsRepository = metricsRepository;
  }

  async calculateAndSaveMetrics(sprintId) {
    const issues = await this.gitLabClient.fetchIssuesForSprint(sprintId);
    const calculator = new MetricsCalculator();
    const metrics = calculator.calculateVelocity(issues);
    await this.metricsRepository.save(metrics);
    return metrics;
  }
}
```

### Pattern 3: Dependency Injection

**Presentation layer wires everything together:**
```javascript
// src/server/server.js
import { MetricsService } from './lib/core/MetricsService.js';
import { GitLabClient } from './lib/infrastructure/GitLabClient.js';
import { FileMetricsRepository } from './lib/infrastructure/FileMetricsRepository.js';

// Create Infrastructure instances
const gitLabClient = new GitLabClient(process.env.GITLAB_URL, process.env.GITLAB_TOKEN);
const metricsRepository = new FileMetricsRepository(process.env.DATA_DIR);

// Inject into Core service
const metricsService = new MetricsService(gitLabClient, metricsRepository);

// Use in routes
app.get('/api/metrics/:id', async (req, res) => {
  const metrics = await metricsService.calculateAndSaveMetrics(req.params.id);
  res.json(metrics);
});
```

---

## Testing Strategy by Layer

### Core Layer (80-90% of tests)
- **Unit tests** - Pure functions, no mocking needed
- **Fast** - No I/O, no network calls
- **High coverage** - ≥90% target

### Infrastructure Layer (10-15% of tests)
- **Integration tests** - Test with real file system, mock GitLab API
- **Slower** - I/O involved
- **Focus on contracts** - Does it implement interface correctly?

### Presentation Layer (5-10% of tests)
- **Component tests** - React Testing Library
- **API tests** - Supertest for Express routes
- **Focus on integration** - Does it wire everything correctly?

---

## Real-World Examples from Prototype

### Example 1: Metrics Calculation (Before → After)

**BEFORE (Prototype - No separation):**
```javascript
// Everything in one file, mixed concerns
async function fetchAndCalculateMetrics(sprintId) {
  // Infrastructure (GitLab API)
  const response = await fetch(`/api/graphql`, { /* query */ });
  const issues = await response.json();

  // Core (Business logic)
  const velocity = issues.reduce((sum, i) => sum + i.weight, 0);

  // Infrastructure (File storage)
  fs.writeFileSync('./data/metrics.json', JSON.stringify({ velocity }));

  // Presentation (Rendering)
  document.getElementById('velocity').innerText = velocity;
}
```

**AFTER (Clean Architecture):**
```javascript
// Core: src/lib/core/MetricsCalculator.js
export class MetricsCalculator {
  calculateVelocity(issues) {
    return issues.reduce((sum, i) => sum + (i.weight || 0), 0);
  }
}

// Infrastructure: src/lib/infrastructure/GitLabClient.js
export class GitLabClient {
  async fetchIssuesForSprint(sprintId) {
    const response = await this.client.request(query, { sprintId });
    return response.data.issues;
  }
}

// Infrastructure: src/lib/infrastructure/FileMetricsRepository.js
export class FileMetricsRepository {
  async save(metrics) {
    await fs.writeFile(this.filePath, JSON.stringify(metrics));
  }
}

// Presentation: src/server/routes/metrics.js
router.get('/metrics/:id', async (req, res) => {
  const issues = await gitLabClient.fetchIssuesForSprint(req.params.id);
  const calculator = new MetricsCalculator();
  const velocity = calculator.calculateVelocity(issues);
  await metricsRepository.save({ velocity });
  res.json({ velocity });
});

// Presentation: src/public/components/MetricsCard.jsx
export function MetricsCard({ sprintId }) {
  const [velocity, setVelocity] = useState(0);
  useEffect(() => {
    fetch(`/api/metrics/${sprintId}`)
      .then(res => res.json())
      .then(data => setVelocity(data.velocity));
  }, [sprintId]);

  return <div>Velocity: {velocity}</div>;
}
```

Benefits:
- Core is testable without mocking
- Can switch from file storage to database without touching Core
- Can switch from Express to Fastify without touching Core
- Can reuse Core in CLI tool or browser extension

---

## Validation and Code Review

### Clean Architecture Agent Checklist

Use `.claude/agents/clean-architecture-agent.md` to validate:

1. **Core Layer:**
   - ✅ No framework imports (Express, React, fs, graphql-request)
   - ✅ Pure functions or classes with injected dependencies
   - ✅ Defines interfaces for external dependencies
   - ✅ No side effects (I/O, network, logging)

2. **Infrastructure Layer:**
   - ✅ Implements Core interfaces
   - ✅ Imports only Core and external libraries
   - ✅ No imports from Presentation layer

3. **Presentation Layer:**
   - ✅ Imports from Core and Infrastructure
   - ✅ Wires dependencies together
   - ✅ No business logic (delegates to Core)

4. **Dependency Rule:**
   - ✅ No upward dependencies
   - ✅ Dependency injection used correctly
   - ✅ Interfaces used for Core → Infrastructure boundary

---

## Related Documentation

- `_context/architecture/solid-principles.md` - SOLID principles with examples
- `_context/coding/jsdoc-guide.md` - Type annotations for interfaces
- `_context/testing/tdd-strategy.md` - Testing strategy by layer
- `_context/reference/prototype-lessons.md` - Why we're adopting Clean Architecture
- `.claude/agents/clean-architecture-agent.md` - Validation agent

---

## Further Reading

- **Uncle Bob's Blog:** https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- **Clean Code (Book):** Robert C. Martin
- **Dependency Inversion Principle:** https://en.wikipedia.org/wiki/Dependency_inversion_principle

---

**Remember:** Clean Architecture is about separation of concerns and dependency management. Core has no dependencies. Infrastructure implements interfaces. Presentation wires everything together. Test at the boundaries, not through them. 🚀
