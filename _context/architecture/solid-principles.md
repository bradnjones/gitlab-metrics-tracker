# SOLID Principles Guide

**Version:** 1.0
**Last Updated:** 2025-01-06
**Reference:** https://en.wikipedia.org/wiki/SOLID

---

## Overview

SOLID is an acronym for five object-oriented design principles that make software more maintainable, flexible, and testable. This document explains each principle with examples from the GitLab Metrics Tracker project.

**Key Principle:** SOLID principles work together with Clean Architecture to create well-structured, maintainable code.

---

## The Five SOLID Principles

1. **S** - Single Responsibility Principle (SRP)
2. **O** - Open/Closed Principle (OCP)
3. **L** - Liskov Substitution Principle (LSP)
4. **I** - Interface Segregation Principle (ISP)
5. **D** - Dependency Inversion Principle (DIP)

---

## S - Single Responsibility Principle (SRP)

### Definition
**A class should have only one reason to change.**

Each module, class, or function should have responsibility over a single part of the functionality, and that responsibility should be entirely encapsulated by the class.

### Why It Matters
- **Easier to understand** - One clear purpose
- **Easier to test** - Focused, isolated tests
- **Easier to modify** - Changes are localized
- **Reduces coupling** - Less interdependence

### Bad Example (Violates SRP)

```javascript
// ❌ This class has THREE responsibilities:
// 1. Fetch data from GitLab
// 2. Calculate metrics
// 3. Store results to file system
export class MetricsManager {
  constructor(gitLabUrl, token, dataDir) {
    this.gitLabUrl = gitLabUrl;
    this.token = token;
    this.dataDir = dataDir;
  }

  async processMetrics(sprintId) {
    // Responsibility 1: Fetch data (GitLab API)
    const response = await fetch(`${this.gitLabUrl}/api/graphql`, {
      headers: { authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ query: '...' })
    });
    const issues = await response.json();

    // Responsibility 2: Calculate metrics (Business logic)
    const velocity = issues.reduce((sum, i) => sum + (i.weight || 0), 0);
    const throughput = issues.length;

    // Responsibility 3: Store to file (File I/O)
    const filePath = path.join(this.dataDir, 'metrics.json');
    await fs.writeFile(filePath, JSON.stringify({ velocity, throughput }));

    return { velocity, throughput };
  }
}
```

**Problems:**
- Change GitLab API → must modify MetricsManager
- Change calculation logic → must modify MetricsManager
- Change storage (e.g., to database) → must modify MetricsManager
- Hard to test (must mock GitLab API, file system, and calculation logic)
- Three reasons to change violates SRP

### Good Example (Follows SRP)

```javascript
// ✅ Each class has ONE responsibility

// 1. Fetching data from GitLab (Infrastructure)
export class GitLabClient {
  constructor(gitLabUrl, token) {
    this.gitLabUrl = gitLabUrl;
    this.token = token;
  }

  async fetchIssuesForSprint(sprintId) {
    const response = await fetch(`${this.gitLabUrl}/api/graphql`, {
      headers: { authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ query: '...' })
    });
    return response.json();
  }
}

// 2. Calculating metrics (Core)
export class MetricsCalculator {
  calculateVelocity(issues) {
    return issues.reduce((sum, i) => sum + (i.weight || 0), 0);
  }

  calculateThroughput(issues) {
    return issues.length;
  }
}

// 3. Storing metrics (Infrastructure)
export class FileMetricsRepository {
  constructor(dataDir) {
    this.dataDir = dataDir;
  }

  async save(metrics) {
    const filePath = path.join(this.dataDir, 'metrics.json');
    await fs.writeFile(filePath, JSON.stringify(metrics));
  }
}

// 4. Orchestrating workflow (Presentation/Service)
export class MetricsService {
  constructor(gitLabClient, metricsCalculator, metricsRepository) {
    this.gitLabClient = gitLabClient;
    this.calculator = metricsCalculator;
    this.repository = metricsRepository;
  }

  async processMetrics(sprintId) {
    const issues = await this.gitLabClient.fetchIssuesForSprint(sprintId);
    const velocity = this.calculator.calculateVelocity(issues);
    const throughput = this.calculator.calculateThroughput(issues);
    await this.repository.save({ velocity, throughput });
    return { velocity, throughput };
  }
}
```

**Benefits:**
- Each class has one reason to change
- Easy to test in isolation
- Can swap implementations (e.g., change storage from file to database)
- Clear, focused responsibilities

### Project Examples

**MetricsCalculator (Core):**
- **Responsibility:** Calculate metrics from raw data
- **One reason to change:** Metric formulas change

**GitLabClient (Infrastructure):**
- **Responsibility:** Fetch data from GitLab API
- **One reason to change:** GitLab API changes

**FileMetricsRepository (Infrastructure):**
- **Responsibility:** Persist metrics to file system
- **One reason to change:** Storage mechanism changes

---

## O - Open/Closed Principle (OCP)

### Definition
**Software entities should be open for extension, but closed for modification.**

You should be able to add new functionality without changing existing code.

### Why It Matters
- **Reduces risk** - Don't modify working code
- **Easier to extend** - Add features without breaking existing ones
- **Protects against bugs** - Existing code stays stable

### Bad Example (Violates OCP)

```javascript
// ❌ Must modify this class to add new metric types
export class MetricsCalculator {
  calculate(issues, metricType) {
    if (metricType === 'velocity') {
      return issues.reduce((sum, i) => sum + (i.weight || 0), 0);
    } else if (metricType === 'throughput') {
      return issues.length;
    } else if (metricType === 'cycle_time') {
      // New metric requires MODIFYING existing code
      const cycleTimes = issues.map(i => {
        return (new Date(i.closedAt) - new Date(i.createdAt)) / (1000 * 60 * 60 * 24);
      });
      return mean(cycleTimes);
    }
    // Adding new metrics means modifying this function (violates OCP)
  }
}
```

**Problems:**
- Every new metric type requires modifying the `calculate` method
- Risk of breaking existing metrics when adding new ones
- Growing if/else chain becomes hard to maintain

### Good Example (Follows OCP)

```javascript
// ✅ Open for extension, closed for modification

// Base interface (abstraction)
export class MetricCalculator {
  calculate(data) {
    throw new Error('Must implement calculate()');
  }
}

// Specific implementations (extensions)
export class VelocityCalculator extends MetricCalculator {
  calculate(issues) {
    return issues.reduce((sum, i) => sum + (i.weight || 0), 0);
  }
}

export class ThroughputCalculator extends MetricCalculator {
  calculate(issues) {
    return issues.length;
  }
}

export class CycleTimeCalculator extends MetricCalculator {
  calculate(issues) {
    const cycleTimes = issues
      .filter(i => i.closedAt)
      .map(i => (new Date(i.closedAt) - new Date(i.createdAt)) / (1000 * 60 * 60 * 24));
    return mean(cycleTimes);
  }
}

// Coordinator (uses strategy pattern)
export class MetricsService {
  constructor() {
    this.calculators = {
      velocity: new VelocityCalculator(),
      throughput: new ThroughputCalculator(),
      cycleTime: new CycleTimeCalculator()
    };
  }

  calculate(issues, metricType) {
    const calculator = this.calculators[metricType];
    if (!calculator) {
      throw new Error(`Unknown metric type: ${metricType}`);
    }
    return calculator.calculate(issues);
  }

  // Add new metric without modifying existing code
  registerCalculator(metricType, calculator) {
    this.calculators[metricType] = calculator;
  }
}

// Adding new metric (EXTENSION, not modification)
export class LeadTimeCalculator extends MetricCalculator {
  calculate(mergeRequests) {
    const leadTimes = mergeRequests.map(mr => {
      const firstCommit = new Date(mr.commits[0].createdAt);
      const merged = new Date(mr.mergedAt);
      return (merged - firstCommit) / (1000 * 60 * 60 * 24);
    });
    return mean(leadTimes);
  }
}

// Use it
const service = new MetricsService();
service.registerCalculator('leadTime', new LeadTimeCalculator()); // ✅ Extension!
```

**Benefits:**
- Add new metrics without modifying existing calculators
- Existing metrics remain unchanged and stable
- Easier to test (each calculator isolated)

### Project Examples

**Annotation Event Types:**
```javascript
// Can add new event types without modifying existing logic
export class AnnotationEventType {
  constructor(name, color, icon) {
    this.name = name;
    this.color = color;
    this.icon = icon;
  }
}

export const EVENT_TYPES = {
  PROCESS: new AnnotationEventType('Process', '#3498db', '⚙️'),
  TEAM: new AnnotationEventType('Team', '#2ecc71', '👥'),
  TOOLING: new AnnotationEventType('Tooling', '#9b59b6', '🔧'),
  EXTERNAL: new AnnotationEventType('External', '#e74c3c', '🌐'),
  INCIDENT: new AnnotationEventType('Incident', '#e67e22', '🚨')
};

// Adding new event type is just adding to the map (extension, not modification)
EVENT_TYPES.RELEASE = new AnnotationEventType('Release', '#1abc9c', '🚀');
```

---

## L - Liskov Substitution Principle (LSP)

### Definition
**Objects of a superclass should be replaceable with objects of a subclass without breaking the application.**

If class B is a subclass of class A, then objects of class A should be replaceable with objects of class B without changing the correctness of the program.

### Why It Matters
- **Enables polymorphism** - Use interfaces confidently
- **Ensures correctness** - Subtypes behave as expected
- **Supports testing** - Mock objects can replace real ones

### Bad Example (Violates LSP)

```javascript
// ❌ Subclass changes expected behavior

export class MetricsRepository {
  async save(metrics) {
    // Expected: Save metrics and return nothing
    await fs.writeFile('./data/metrics.json', JSON.stringify(metrics));
  }
}

export class CachedMetricsRepository extends MetricsRepository {
  async save(metrics) {
    // ❌ VIOLATES LSP: Throws error instead of saving
    if (this.cache.has(metrics.id)) {
      throw new Error('Already exists in cache');
    }
    this.cache.set(metrics.id, metrics);
    await super.save(metrics);
  }
}

// Code that expects MetricsRepository behavior
async function saveMetrics(repository, metrics) {
  await repository.save(metrics); // ❌ May throw unexpected error if using CachedMetricsRepository
  console.log('Saved successfully');
}
```

**Problems:**
- CachedMetricsRepository throws errors where MetricsRepository doesn't
- Violates LSP because substituting subclass breaks behavior
- Code expecting MetricsRepository behavior will fail

### Good Example (Follows LSP)

```javascript
// ✅ Subclass maintains contract

export class MetricsRepository {
  /**
   * Save metrics
   * @param {Object} metrics
   * @returns {Promise<void>}
   */
  async save(metrics) {
    await fs.writeFile('./data/metrics.json', JSON.stringify(metrics));
  }
}

export class CachedMetricsRepository extends MetricsRepository {
  constructor(dataDir) {
    super(dataDir);
    this.cache = new Map();
  }

  /**
   * Save metrics with caching
   * ✅ FOLLOWS LSP: Same contract as parent, just adds caching behavior
   * @param {Object} metrics
   * @returns {Promise<void>}
   */
  async save(metrics) {
    this.cache.set(metrics.id, metrics); // Add caching
    await super.save(metrics); // Still saves (maintains contract)
  }

  async findById(id) {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    // Fall back to file system
    return super.findById(id);
  }
}

// Works with either implementation
async function saveMetrics(repository, metrics) {
  await repository.save(metrics); // ✅ Works with both implementations
  console.log('Saved successfully');
}
```

**Benefits:**
- CachedMetricsRepository can replace MetricsRepository
- Same contract, additional behavior (caching)
- Code using MetricsRepository works unchanged

### Project Examples

**IGitLabClient Interface:**
```javascript
// Base interface
export class IGitLabClient {
  async fetchIterations() {
    throw new Error('Must implement');
  }
}

// Real implementation
export class GitLabClient extends IGitLabClient {
  async fetchIterations() {
    const data = await this.client.request(query);
    return data.group.iterations.nodes;
  }
}

// Mock implementation (for testing) - ✅ Follows LSP
export class MockGitLabClient extends IGitLabClient {
  async fetchIterations() {
    // Returns same data structure as real client
    return [
      { id: '1', title: 'Sprint 1', startDate: '2024-01-01', dueDate: '2024-01-14' }
    ];
  }
}

// Both can be used interchangeably
async function loadDashboard(gitLabClient) {
  const iterations = await gitLabClient.fetchIterations(); // ✅ Works with real or mock
  renderIterations(iterations);
}
```

---

## I - Interface Segregation Principle (ISP)

### Definition
**No client should be forced to depend on methods it does not use.**

Many specific interfaces are better than one general-purpose interface.

### Why It Matters
- **Focused dependencies** - Only depend on what you need
- **Easier to implement** - Smaller, focused interfaces
- **Reduces coupling** - Changes don't affect unrelated code

### Bad Example (Violates ISP)

```javascript
// ❌ Monolithic interface forces implementations to provide everything

export class IDataClient {
  async fetchIterations() { throw new Error('Not implemented'); }
  async fetchIssues() { throw new Error('Not implemented'); }
  async fetchMergeRequests() { throw new Error('Not implemented'); }
  async fetchPipelines() { throw new Error('Not implemented'); }
  async fetchIncidents() { throw new Error('Not implemented'); }
  async saveMetrics() { throw new Error('Not implemented'); }
  async saveAnnotations() { throw new Error('Not implemented'); }
  async deleteMetrics() { throw new Error('Not implemented'); }
}

// Mock client for testing only needs fetchIssues, but must implement EVERYTHING
export class MockDataClient extends IDataClient {
  async fetchIterations() { throw new Error('Not needed for this test'); }
  async fetchIssues() { return [{ id: 1, weight: 3 }]; }
  async fetchMergeRequests() { throw new Error('Not needed'); }
  async fetchPipelines() { throw new Error('Not needed'); }
  async fetchIncidents() { throw new Error('Not needed'); }
  async saveMetrics() { throw new Error('Not needed'); }
  async saveAnnotations() { throw new Error('Not needed'); }
  async deleteMetrics() { throw new Error('Not needed'); }
}
```

**Problems:**
- MockDataClient forced to implement 8 methods when it only needs 1
- Changes to interface affect all implementations
- Bloated, unfocused interface

### Good Example (Follows ISP)

```javascript
// ✅ Segregated interfaces - clients depend only on what they need

// Separate focused interfaces
export class IGitLabClient {
  async fetchIterations() { throw new Error('Not implemented'); }
  async fetchIssues() { throw new Error('Not implemented'); }
  async fetchMergeRequests() { throw new Error('Not implemented'); }
  async fetchPipelines() { throw new Error('Not implemented'); }
  async fetchIncidents() { throw new Error('Not implemented'); }
}

export class IMetricsRepository {
  async save(metrics) { throw new Error('Not implemented'); }
  async findById(id) { throw new Error('Not implemented'); }
  async findAll() { throw new Error('Not implemented'); }
}

export class IAnnotationsRepository {
  async save(annotation) { throw new Error('Not implemented'); }
  async findAll() { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
}

// Mock only implements what it needs
export class MockGitLabClient extends IGitLabClient {
  async fetchIssues() {
    return [{ id: 1, weight: 3 }];
  }
  // Other methods not needed for test - don't implement them
}

// Service only depends on specific interfaces
export class VelocityCalculatorService {
  /**
   * @param {IGitLabClient} gitLabClient - Only needs fetchIssues
   */
  constructor(gitLabClient) {
    this.gitLabClient = gitLabClient;
  }

  async calculateVelocity(sprintId) {
    const issues = await this.gitLabClient.fetchIssues(sprintId);
    return issues.reduce((sum, i) => sum + (i.weight || 0), 0);
  }
}
```

**Benefits:**
- Each interface has focused responsibility
- Clients only depend on methods they use
- Easy to create test mocks (implement only what you need)

### Project Examples

**Segregated Repositories:**
```javascript
// Instead of one IRepository with all methods, split by concern

// Read-only interface
export class IMetricsReader {
  async findById(id) { throw new Error('Not implemented'); }
  async findAll() { throw new Error('Not implemented'); }
  async findBySprint(sprintId) { throw new Error('Not implemented'); }
}

// Write-only interface
export class IMetricsWriter {
  async save(metrics) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
}

// Dashboard only needs reading
export class MetricsDashboard {
  constructor(metricsReader) {
    this.reader = metricsReader; // Only depends on IMetricsReader
  }

  async loadMetrics() {
    return this.reader.findAll();
  }
}

// API route needs both
export class MetricsController {
  constructor(metricsReader, metricsWriter) {
    this.reader = metricsReader;
    this.writer = metricsWriter;
  }
}
```

---

## D - Dependency Inversion Principle (DIP)

### Definition
**High-level modules should not depend on low-level modules. Both should depend on abstractions.**
**Abstractions should not depend on details. Details should depend on abstractions.**

### Why It Matters
- **Decouples code** - High-level logic independent of implementation details
- **Enables testing** - Easy to swap implementations (e.g., mock)
- **Supports Clean Architecture** - Core doesn't depend on Infrastructure

### Bad Example (Violates DIP)

```javascript
// ❌ High-level module depends on low-level implementation

// Low-level module (Infrastructure)
export class GitLabApiClient {
  constructor(url, token) {
    this.url = url;
    this.token = token;
  }

  async fetchIssues(sprintId) {
    const response = await fetch(`${this.url}/api/graphql`, {
      headers: { authorization: `Bearer ${this.token}` }
    });
    return response.json();
  }
}

// High-level module (Core) depends on concrete implementation ❌
export class MetricsService {
  constructor() {
    // ❌ Creates concrete dependency (tightly coupled)
    this.gitLabClient = new GitLabApiClient('https://gitlab.com', process.env.GITLAB_TOKEN);
  }

  async calculateMetrics(sprintId) {
    const issues = await this.gitLabClient.fetchIssues(sprintId);
    return issues.reduce((sum, i) => sum + (i.weight || 0), 0);
  }
}
```

**Problems:**
- MetricsService (high-level) depends on GitLabApiClient (low-level implementation)
- Hard to test (can't mock GitLabApiClient)
- Can't swap implementations without changing MetricsService
- Violates Clean Architecture (Core depends on Infrastructure)

### Good Example (Follows DIP)

```javascript
// ✅ Both depend on abstraction

// Abstraction (Core layer)
export class IGitLabClient {
  async fetchIssues(sprintId) {
    throw new Error('Must implement fetchIssues()');
  }
}

// Low-level module depends on abstraction (Infrastructure)
export class GitLabApiClient extends IGitLabClient {
  constructor(url, token) {
    super();
    this.url = url;
    this.token = token;
  }

  async fetchIssues(sprintId) {
    const response = await fetch(`${this.url}/api/graphql`, {
      headers: { authorization: `Bearer ${this.token}` }
    });
    return response.json();
  }
}

// High-level module depends on abstraction (Core)
export class MetricsService {
  /**
   * @param {IGitLabClient} gitLabClient - Injected abstraction ✅
   */
  constructor(gitLabClient) {
    this.gitLabClient = gitLabClient; // ✅ Depends on interface
  }

  async calculateMetrics(sprintId) {
    const issues = await this.gitLabClient.fetchIssues(sprintId);
    return issues.reduce((sum, i) => sum + (i.weight || 0), 0);
  }
}

// Dependency injection (Presentation layer wires everything)
const gitLabClient = new GitLabApiClient('https://gitlab.com', process.env.GITLAB_TOKEN);
const metricsService = new MetricsService(gitLabClient); // ✅ Inject concrete implementation
```

**Benefits:**
- MetricsService depends on abstraction (IGitLabClient)
- Easy to test (inject mock implementation)
- Can swap implementations without changing MetricsService
- Follows Clean Architecture (Core depends on Core interface, not Infrastructure)

### Testing with DIP

```javascript
// Mock implementation for testing
class MockGitLabClient extends IGitLabClient {
  async fetchIssues(sprintId) {
    return [{ id: 1, weight: 3 }, { id: 2, weight: 5 }];
  }
}

// Test
test('calculateMetrics', async () => {
  const mockClient = new MockGitLabClient();
  const service = new MetricsService(mockClient); // ✅ Inject mock

  const metrics = await service.calculateMetrics('sprint-1');
  expect(metrics).toBe(8); // 3 + 5
});
```

### Project Examples

**MetricsCalculator (Core) with DIP:**
```javascript
// Core depends on abstractions (interfaces)
export class MetricsCalculator {
  /**
   * @param {IGitLabClient} gitLabClient
   * @param {IMetricsRepository} metricsRepository
   */
  constructor(gitLabClient, metricsRepository) {
    this.gitLabClient = gitLabClient;
    this.repository = metricsRepository;
  }

  async calculateAndSave(sprintId) {
    const issues = await this.gitLabClient.fetchIssuesForSprint(sprintId);
    const velocity = this.calculateVelocity(issues);
    await this.repository.save({ sprintId, velocity });
    return velocity;
  }

  calculateVelocity(issues) {
    return issues.reduce((sum, i) => sum + (i.weight || 0), 0);
  }
}

// Infrastructure provides concrete implementations
import { GitLabClient } from './infrastructure/GitLabClient.js';
import { FileMetricsRepository } from './infrastructure/FileMetricsRepository.js';

// Presentation layer wires dependencies
const gitLabClient = new GitLabClient(url, token);
const metricsRepository = new FileMetricsRepository(dataDir);
const calculator = new MetricsCalculator(gitLabClient, metricsRepository);
```

---

## SOLID Principles Working Together

### Example: Metrics Calculation Pipeline

```javascript
// S - Single Responsibility
// Each class has one job

// 1. Fetch data (Infrastructure)
export class GitLabClient extends IGitLabClient {
  async fetchIssuesForSprint(sprintId) { /* ... */ }
}

// 2. Calculate velocity (Core)
export class VelocityCalculator {
  calculate(issues) {
    return issues.reduce((sum, i) => sum + (i.weight || 0), 0);
  }
}

// 3. Calculate cycle time (Core)
export class CycleTimeCalculator {
  calculate(issues) {
    const times = issues.map(i => (new Date(i.closedAt) - new Date(i.createdAt)));
    return mean(times);
  }
}

// O - Open/Closed
// Can add new calculators without modifying existing code
export class MetricsCalculatorRegistry {
  constructor() {
    this.calculators = new Map();
  }

  register(name, calculator) {
    this.calculators.set(name, calculator);
  }

  calculate(name, data) {
    return this.calculators.get(name).calculate(data);
  }
}

// L - Liskov Substitution
// All calculators follow same contract
export class MetricCalculator {
  calculate(data) { throw new Error('Must implement'); }
}

export class VelocityCalculator extends MetricCalculator {
  calculate(issues) { /* velocity calculation */ }
}

export class ThroughputCalculator extends MetricCalculator {
  calculate(issues) { /* throughput calculation */ }
}

// I - Interface Segregation
// Separate interfaces for different concerns
export class IGitLabIssuesFetcher {
  async fetchIssuesForSprint(sprintId) { throw new Error('Must implement'); }
}

export class IGitLabMergeRequestsFetcher {
  async fetchMergeRequestsForSprint(sprintId) { throw new Error('Must implement'); }
}

// VelocityCalculator only depends on issues fetcher
export class VelocityService {
  constructor(issuesFetcher) { // Not entire GitLabClient
    this.issuesFetcher = issuesFetcher;
  }
}

// D - Dependency Inversion
// High-level service depends on abstraction
export class MetricsService {
  constructor(gitLabClient, metricsRepository) { // Abstractions injected
    this.gitLabClient = gitLabClient;
    this.repository = metricsRepository;
  }

  async processMetrics(sprintId) {
    const issues = await this.gitLabClient.fetchIssuesForSprint(sprintId);
    const calculator = new VelocityCalculator();
    const velocity = calculator.calculate(issues);
    await this.repository.save({ sprintId, velocity });
    return velocity;
  }
}
```

---

## Validation Checklist

Use `.claude/agents/clean-architecture-agent.md` to validate SOLID compliance:

### Single Responsibility
- ✅ Each class has one clear purpose
- ✅ Each method does one thing
- ✅ One reason to change per class

### Open/Closed
- ✅ New features added without modifying existing code
- ✅ Extension through inheritance or composition
- ✅ Strategy pattern for variability

### Liskov Substitution
- ✅ Subclasses can replace parent classes
- ✅ Contracts maintained in inheritance
- ✅ Mock objects work seamlessly

### Interface Segregation
- ✅ Focused, specific interfaces
- ✅ Clients depend only on needed methods
- ✅ No bloated, monolithic interfaces

### Dependency Inversion
- ✅ Core depends on abstractions, not implementations
- ✅ Dependency injection used
- ✅ High-level modules independent of low-level details

---

## Common Anti-Patterns to Avoid

### God Class
```javascript
// ❌ One class that does everything (violates S, O, I, D)
class Application {
  fetchData() { /* ... */ }
  calculateMetrics() { /* ... */ }
  saveToDatabase() { /* ... */ }
  renderUI() { /* ... */ }
  handleErrors() { /* ... */ }
}
```

### Tight Coupling
```javascript
// ❌ Direct dependency on concrete class (violates D)
class Service {
  constructor() {
    this.client = new GitLabClient(); // Tight coupling
  }
}
```

### Fragile Base Class
```javascript
// ❌ Subclass breaks when parent changes (violates L)
class Parent {
  process() { this.validate(); this.save(); }
  validate() { /* ... */ }
  save() { /* ... */ }
}

class Child extends Parent {
  validate() { throw new Error('Not supported'); } // Breaks contract
}
```

---

## Related Documentation

- `_context/architecture/clean-architecture.md` - Clean Architecture layers
- `_context/coding/jsdoc-guide.md` - Type annotations for interfaces
- `_context/testing/tdd-strategy.md` - Testing SOLID code
- `_context/reference/prototype-lessons.md` - Why SOLID matters
- `.claude/agents/clean-architecture-agent.md` - Validation agent

---

## Further Reading

- **SOLID Principles:** https://en.wikipedia.org/wiki/SOLID
- **Clean Code (Book):** Robert C. Martin
- **Design Patterns:** Gang of Four

---

**Remember:** SOLID principles work together. They're not rules to follow blindly, but guidelines for creating maintainable, testable, flexible code. Apply them pragmatically. 🚀
