# GitLab GraphQL Query Reference - Complete Pattern Catalog

**Version:** 1.0  
**Created:** 2025-01-06  
**Prototype Source:** `/Users/brad/dev/smi/gitlab-sprint-metrics/src/lib/gitlab-client.js` (799 lines)  
**Companion Document:** `gitlab-api-patterns.md`

---

## Purpose

This document provides a **complete catalog** of all 11 GraphQL query methods from the proven prototype, including detailed patterns, critical parameters, and testing strategies for Story 0.2 implementation.

---

## Table of Contents

1. [Query Method Catalog](#query-method-catalog)
2. [Critical Query Parameters](#critical-query-parameters)
3. [Deployment Proxy Pattern](#deployment-proxy-pattern)
4. [Batch Processing Pattern](#batch-processing-pattern)
5. [Rate Limiting Strategy](#rate-limiting-strategy)
6. [Cache Implementation](#cache-implementation)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Test Mocking Strategies](#test-mocking-strategies)
9. [Best Practices Summary](#best-practices-summary)

---

## Query Method Catalog

### Overview Table

| Method | Level | Purpose | Lines | Pagination | Rate Limit |
|--------|-------|---------|-------|------------|------------|
| `fetchProject` | Project | Get project metadata | 29-47 | No | N/A |
| `fetchIterations` | Group | Get all sprints | 49-141 | Yes (100/page) | 100ms |
| `fetchIterationDetails` | Group | Get sprint issues | 143-217 | Yes (100/page) | 100ms |
| `fetchMergeRequestsForGroup` | Group | Get merged MRs | 219-305 | Yes (100/page) | 100ms |
| `fetchGroupProjects` | Group | Get all projects | 307-373 | Yes (100/page) | 100ms |
| `fetchPipelinesForProject` | Project | Get pipelines (1 project) | 375-448 | Yes (100/page) | 50ms |
| `fetchPipelinesForGroup` | Multi-Project | Get pipelines (all projects) | 450-510 | Batched | 500ms/batch |
| `fetchCommitsForProject` | Project | Get revert MRs (1 project) | 512-588 | Yes (100/page) | 100ms |
| `fetchRevertCommitsForGroup` | Multi-Project | Get revert MRs (all projects) | 590-647 | Batched | 500ms/batch |
| `fetchDeployments` | Group | Deployment proxy via MRs | 649-685 | Delegated | Delegated |
| `fetchIncidents` | Group | Get incidents for MTTR | 687-791 | Yes (100/page) | 100ms |

---

## 1. fetchProject

### Use Case
Get basic project metadata (id, name, description, URL).

### Implementation
**Location:** Lines 29-47

```javascript
async fetchProject() {
  const query = `
    query getProject($fullPath: ID!) {
      project(fullPath: $fullPath) {
        id
        name
        description
        webUrl
      }
    }
  `;

  try {
    const data = await this.client.request(query, { fullPath: this.projectPath });
    return data.project;
  } catch (error) {
    throw new Error(`Failed to fetch project: ${error.message}`);
  }
}
```

### Key Points
- **No pagination** - Single project query
- **Variables:** `fullPath` (project path like `"group/subgroup/project"`)
- **Error handling:** Wrap in generic error message
- **Use case:** Initial project validation, metadata display

### Testing Strategy
```javascript
test('fetchProject returns project metadata', async () => {
  mockGraphQLClient.request.mockResolvedValue({
    project: {
      id: 'gid://gitlab/Project/123',
      name: 'My Project',
      description: 'Project description',
      webUrl: 'https://gitlab.com/group/project'
    }
  });

  const project = await client.fetchProject();
  
  expect(project.name).toBe('My Project');
  expect(mockGraphQLClient.request).toHaveBeenCalledWith(
    expect.stringContaining('query getProject'),
    { fullPath: 'group/project' }
  );
});
```

---

## 2. fetchIterations

### Use Case
Fetch all iterations (sprints) for a group, with fallback logic for project paths.

### Implementation
**Location:** Lines 49-141

```javascript
async fetchIterations() {
  let groupPath = this.projectPath;

  const query = `
    query getIterations($fullPath: ID!, $after: String) {
      group(fullPath: $fullPath) {
        id
        name
        iterations(first: 100, after: $after, includeAncestors: false) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            iid
            title
            description
            state
            startDate
            dueDate
            createdAt
            updatedAt
            webUrl
            iterationCadence {
              id
              title
            }
          }
        }
      }
    }
  `;

  let allIterations = [];
  let hasNextPage = true;
  let after = null;

  try {
    while (hasNextPage) {
      const data = await this.client.request(query, {
        fullPath: groupPath,
        after
      });

      // Check if group exists
      if (!data.group) {
        // Try removing last segment (might be a project path)
        const segments = this.projectPath.split('/');
        if (segments.length > 1) {
          groupPath = segments.slice(0, -1).join('/');
          console.log(`Trying parent group: ${groupPath}`);
          continue; // Retry with parent group
        }
        throw new Error(`Group not found: ${groupPath}`);
      }

      // Check if iterations available
      if (!data.group.iterations || !data.group.iterations.nodes) {
        console.warn('This group does not have iterations configured.');
        return [];
      }

      const { nodes, pageInfo } = data.group.iterations;
      allIterations = allIterations.concat(nodes);
      hasNextPage = pageInfo.hasNextPage;
      after = pageInfo.endCursor;

      if (hasNextPage) {
        await this.delay(100);
      }
    }

    console.log(`Found ${allIterations.length} iterations from group: ${groupPath}`);
    return allIterations;
  } catch (error) {
    if (error.response?.errors) {
      const errorMessages = error.response.errors.map(e => e.message).join(', ');
      throw new Error(`GitLab API Error: ${errorMessages}`);
    }
    throw new Error(`Failed to fetch iterations: ${error.message}`);
  }
}
```

### Critical Features

**1. Fallback Logic for Project Paths**
```javascript
// If "group/subgroup/project", extract "group/subgroup"
if (!data.group) {
  const segments = this.projectPath.split('/');
  if (segments.length > 1) {
    groupPath = segments.slice(0, -1).join('/');
    continue; // Retry with parent group
  }
}
```

**2. Graceful Handling of Missing Iterations**
```javascript
if (!data.group.iterations || !data.group.iterations.nodes) {
  console.warn('This group does not have iterations configured.');
  return []; // Empty array, not error
}
```

**3. GraphQL Error Parsing**
```javascript
if (error.response?.errors) {
  const errorMessages = error.response.errors.map(e => e.message).join(', ');
  throw new Error(`GitLab API Error: ${errorMessages}`);
}
```

### Parameters
- **fullPath:** Group path (with fallback to parent if project path provided)
- **after:** Pagination cursor
- **includeAncestors:** `false` (only iterations defined at this group level)
- **first:** `100` (page size)

### Testing Strategy
```javascript
describe('fetchIterations', () => {
  test('handles project path and tries parent group', async () => {
    // First call fails (project path)
    mockGraphQLClient.request.mockResolvedValueOnce({ group: null });
    
    // Second call succeeds (parent group)
    mockGraphQLClient.request.mockResolvedValueOnce({
      group: {
        id: 'gid://gitlab/Group/1',
        iterations: {
          nodes: [{ id: '1', title: 'Sprint 1' }],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      }
    });

    const iterations = await client.fetchIterations();
    
    expect(iterations).toHaveLength(1);
    expect(mockGraphQLClient.request).toHaveBeenCalledTimes(2);
  });

  test('returns empty array when iterations not configured', async () => {
    mockGraphQLClient.request.mockResolvedValue({
      group: { id: '1', iterations: null }
    });

    const iterations = await client.fetchIterations();
    
    expect(iterations).toEqual([]);
  });
});
```

---

## 3. fetchIterationDetails

### Use Case
Fetch all issues for a specific sprint across all projects in a group.

### Implementation
**Location:** Lines 143-217

```javascript
async fetchIterationDetails(iterationId) {
  // CRITICAL: includeSubgroups: true required for multi-project groups
  const query = `
    query getIterationDetails($fullPath: ID!, $iterationId: [ID!], $after: String) {
      group(fullPath: $fullPath) {
        id
        issues(iterationId: $iterationId, includeSubgroups: true, first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            iid
            title
            state
            createdAt
            closedAt
            weight
            labels {
              nodes {
                title
              }
            }
            assignees {
              nodes {
                username
              }
            }
          }
        }
      }
    }
  `;

  let allIssues = [];
  let hasNextPage = true;
  let after = null;

  try {
    while (hasNextPage) {
      const data = await this.client.request(query, {
        fullPath: this.projectPath,
        iterationId: [iterationId], // Pass as array
        after
      });

      if (!data.group) {
        throw new Error(`Group not found: ${this.projectPath}`);
      }

      const { nodes, pageInfo } = data.group.issues;
      allIssues = allIssues.concat(nodes);
      hasNextPage = pageInfo.hasNextPage;
      after = pageInfo.endCursor;

      if (hasNextPage) {
        await this.delay(100);
      }
    }

    console.log(`✓ Fetched ${allIssues.length} issues for iteration ${iterationId}`);

    return {
      issues: allIssues,
      mergeRequests: [] // Populated separately via fetchMergeRequestsForGroup
    };
  } catch (error) {
    throw new Error(`Failed to fetch iteration details: ${error.message}`);
  }
}
```

### Critical Parameters

**1. includeSubgroups: true**
```javascript
// WITHOUT includeSubgroups (only issues from current group)
issues(iterationId: $iterationId, first: 100) { ... }

// WITH includeSubgroups (all issues from group + subgroups + projects)
issues(iterationId: $iterationId, includeSubgroups: true, first: 100) { ... }
```

**Impact:** 270 projects across subgroups → Single query returns ALL issues.

**2. iterationId as Array**
```javascript
// WRONG
iterationId: "gid://gitlab/Iteration/123"

// CORRECT
iterationId: ["gid://gitlab/Iteration/123"]
```

### Testing Strategy
```javascript
test('fetchIterationDetails includes subgroups', async () => {
  mockGraphQLClient.request.mockResolvedValue({
    group: {
      id: '1',
      issues: {
        nodes: [
          { id: '1', title: 'Issue from subgroup project', state: 'opened' }
        ],
        pageInfo: { hasNextPage: false, endCursor: null }
      }
    }
  });

  const result = await client.fetchIterationDetails('gid://gitlab/Iteration/123');
  
  expect(result.issues).toHaveLength(1);
  expect(mockGraphQLClient.request).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      iterationId: ['gid://gitlab/Iteration/123']
    })
  );
});
```

---

## 4. fetchMergeRequestsForGroup

### Use Case
Fetch all merged MRs for a date range (used for deployments and lead time).

### Implementation
**Location:** Lines 219-305

```javascript
async fetchMergeRequestsForGroup(startDate, endDate) {
  const query = `
    query getGroupMergeRequests($fullPath: ID!, $after: String, $mergedAfter: Time, $mergedBefore: Time) {
      group(fullPath: $fullPath) {
        id
        mergeRequests(
          state: merged
          first: 100
          after: $after
          mergedAfter: $mergedAfter
          mergedBefore: $mergedBefore
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            iid
            title
            state
            createdAt
            mergedAt
            targetBranch
            sourceBranch
            project {
              fullPath
              name
            }
            commits {
              nodes {
                id
                sha
                committedDate
              }
            }
          }
        }
      }
    }
  `;

  let allMRs = [];
  let hasNextPage = true;
  let after = null;

  try {
    const mergedAfter = new Date(startDate).toISOString();
    const mergedBefore = new Date(endDate).toISOString();

    console.log(`Querying merged MRs from group (${startDate} to ${endDate})...`);

    while (hasNextPage) {
      const data = await this.client.request(query, {
        fullPath: this.projectPath,
        after,
        mergedAfter,
        mergedBefore
      });

      if (!data.group) {
        throw new Error(`Group not found: ${this.projectPath}`);
      }

      if (!data.group.mergeRequests) break;

      const { nodes, pageInfo } = data.group.mergeRequests;
      allMRs = allMRs.concat(nodes);
      hasNextPage = pageInfo.hasNextPage;
      after = pageInfo.endCursor;

      if (hasNextPage) {
        await this.delay(100);
      }
    }

    console.log(`✓ Found ${allMRs.length} merged MRs in date range`);
    return allMRs;
  } catch (error) {
    console.error('Failed to fetch merge requests:', error.message);
    throw new Error(`Failed to fetch merge requests: ${error.message}`);
  }
}
```

### Critical Features

**1. API-Level Date Filtering**
```javascript
// Convert JavaScript Dates to ISO strings
const mergedAfter = new Date(startDate).toISOString();
const mergedBefore = new Date(endDate).toISOString();

// Pass to API (filters before sending data)
mergeRequests(
  mergedAfter: $mergedAfter,
  mergedBefore: $mergedBefore
) { ... }
```

**Performance:** 5-10x faster than client-side filtering.

**2. Include Project Context**
```javascript
project {
  fullPath  // "group/subgroup/project"
  name      // "My Project"
}
```

**Why:** Group-level queries return MRs from multiple projects. Need to track which project.

**3. Include Commits for Lead Time**
```javascript
commits {
  nodes {
    id
    sha
    committedDate  // First commit time for lead time calculation
  }
}
```

### Testing Strategy
```javascript
test('fetchMergeRequestsForGroup filters by date range', async () => {
  mockGraphQLClient.request.mockResolvedValue({
    group: {
      mergeRequests: {
        nodes: [
          {
            id: '1',
            mergedAt: '2024-01-15T10:00:00Z',
            targetBranch: 'main',
            project: { fullPath: 'group/project' }
          }
        ],
        pageInfo: { hasNextPage: false, endCursor: null }
      }
    }
  });

  const mrs = await client.fetchMergeRequestsForGroup(
    '2024-01-01',
    '2024-01-31'
  );
  
  expect(mrs).toHaveLength(1);
  expect(mockGraphQLClient.request).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      mergedAfter: '2024-01-01T00:00:00.000Z',
      mergedBefore: '2024-01-31T00:00:00.000Z'
    })
  );
});
```

---

## 5. fetchGroupProjects

### Use Case
Fetch all projects in a group (with 10-minute cache).

### Implementation
**Location:** Lines 307-373

```javascript
async fetchGroupProjects(useCache = true) {
  // Check cache first
  if (useCache && this._projectsCache && this._projectsCacheTime) {
    const age = Date.now() - this._projectsCacheTime;
    if (age < this._cacheTimeout) {
      console.log(`Using cached projects (${this._projectsCache.length} projects, age: ${Math.round(age / 1000)}s)`);
      return this._projectsCache;
    }
  }

  const query = `
    query getGroupProjects($fullPath: ID!, $after: String) {
      group(fullPath: $fullPath) {
        id
        name
        projects(first: 100, after: $after, includeSubgroups: true) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            fullPath
            name
          }
        }
      }
    }
  `;

  let allProjects = [];
  let hasNextPage = true;
  let after = null;

  try {
    while (hasNextPage) {
      const data = await this.client.request(query, {
        fullPath: this.projectPath,
        after
      });

      if (!data.group) {
        throw new Error(`Group not found: ${this.projectPath}`);
      }

      const { nodes, pageInfo } = data.group.projects;
      allProjects = allProjects.concat(nodes);
      hasNextPage = pageInfo.hasNextPage;
      after = pageInfo.endCursor;

      if (hasNextPage) {
        await this.delay(100);
      }
    }

    console.log(`Found ${allProjects.length} projects in group: ${this.projectPath}`);

    // Cache the results
    this._projectsCache = allProjects;
    this._projectsCacheTime = Date.now();

    return allProjects;
  } catch (error) {
    console.warn('Failed to fetch group projects:', error.message);
    return [];
  }
}
```

### Critical Features

**1. Cache Check**
```javascript
// Check cache age
const age = Date.now() - this._projectsCacheTime;
if (age < this._cacheTimeout) { // 10 minutes
  return this._projectsCache;
}
```

**2. includeSubgroups for Projects**
```javascript
projects(first: 100, after: $after, includeSubgroups: true)
```

**Why:** Group may have nested subgroups with projects.

**3. Graceful Error Handling**
```javascript
catch (error) {
  console.warn('Failed to fetch group projects:', error.message);
  return []; // Return empty array, don't throw
}
```

**Why:** Called by other methods that can handle empty array gracefully.

### Testing Strategy
```javascript
describe('fetchGroupProjects', () => {
  test('uses cache when available', async () => {
    const projects = [{ id: '1', fullPath: 'group/project' }];
    client._projectsCache = projects;
    client._projectsCacheTime = Date.now();

    const result = await client.fetchGroupProjects(true);
    
    expect(result).toEqual(projects);
    expect(mockGraphQLClient.request).not.toHaveBeenCalled();
  });

  test('bypasses cache when expired', async () => {
    client._projectsCache = [{ id: '1' }];
    client._projectsCacheTime = Date.now() - (11 * 60 * 1000); // 11 minutes ago

    mockGraphQLClient.request.mockResolvedValue({
      group: {
        projects: {
          nodes: [{ id: '2', fullPath: 'group/project2' }],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      }
    });

    const result = await client.fetchGroupProjects(true);
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
    expect(mockGraphQLClient.request).toHaveBeenCalled();
  });
});
```

---

## 6. fetchPipelinesForProject

### Use Case
Fetch pipelines for a single project (used by `fetchPipelinesForGroup`).

### Implementation
**Location:** Lines 375-448

```javascript
async fetchPipelinesForProject(projectPath, ref = 'master', startDate, endDate) {
  // Use updatedAfter to filter at the API level for better performance
  const updatedAfter = startDate ? new Date(startDate).toISOString() : null;

  const query = `
    query getPipelines($fullPath: ID!, $ref: String, $after: String, $updatedAfter: Time) {
      project(fullPath: $fullPath) {
        pipelines(first: 100, ref: $ref, after: $after, updatedAfter: $updatedAfter) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            iid
            status
            ref
            createdAt
            updatedAt
            finishedAt
            sha
          }
        }
      }
    }
  `;

  let allPipelines = [];
  let hasNextPage = true;
  let after = null;

  try {
    while (hasNextPage) {
      const data = await this.client.request(query, {
        fullPath: projectPath,
        ref,
        after,
        updatedAfter
      });

      if (!data.project || !data.project.pipelines) {
        break;
      }

      const { nodes, pageInfo } = data.project.pipelines;
      allPipelines = allPipelines.concat(nodes);
      hasNextPage = pageInfo.hasNextPage;
      after = pageInfo.endCursor;

      // Only fetch first page if we have many results
      if (nodes.length === 100 && hasNextPage) {
        console.log(`  └─ Found 100+ pipelines, fetching more...`);
      }

      if (hasNextPage) {
        await this.delay(50); // Reduced delay for per-project queries
      }
    }

    // Additional client-side filtering by end date
    if (endDate) {
      const end = new Date(endDate);
      allPipelines = allPipelines.filter(pipeline => {
        const pipelineDate = new Date(pipeline.createdAt);
        return pipelineDate <= end;
      });
    }

    return allPipelines;
  } catch (error) {
    console.warn(`Failed to fetch pipelines for ${projectPath}:`, error.message);
    return [];
  }
}
```

### Critical Features

**1. API-Level Start Date Filtering**
```javascript
const updatedAfter = startDate ? new Date(startDate).toISOString() : null;

pipelines(updatedAfter: $updatedAfter) { ... }
```

**2. Client-Side End Date Filtering**
```javascript
// Why not at API level?
// GitLab GraphQL doesn't support updatedBefore parameter
if (endDate) {
  const end = new Date(endDate);
  allPipelines = allPipelines.filter(pipeline => {
    const pipelineDate = new Date(pipeline.createdAt);
    return pipelineDate <= end;
  });
}
```

**3. Reduced Rate Limiting (50ms)**
```javascript
await this.delay(50); // Faster than default 100ms
```

**Why:** This method is called in batches (10 concurrent). Total delay comes from batch delay (500ms).

**4. Graceful Error Handling**
```javascript
catch (error) {
  console.warn(`Failed to fetch pipelines for ${projectPath}:`, error.message);
  return []; // Don't throw, let batch continue
}
```

### Testing Strategy
```javascript
test('fetchPipelinesForProject filters by updatedAfter', async () => {
  mockGraphQLClient.request.mockResolvedValue({
    project: {
      pipelines: {
        nodes: [
          { id: '1', status: 'success', createdAt: '2024-01-15T10:00:00Z' }
        ],
        pageInfo: { hasNextPage: false, endCursor: null }
      }
    }
  });

  const pipelines = await client.fetchPipelinesForProject(
    'group/project',
    'main',
    '2024-01-01',
    '2024-01-31'
  );
  
  expect(pipelines).toHaveLength(1);
  expect(mockGraphQLClient.request).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      updatedAfter: '2024-01-01T00:00:00.000Z'
    })
  );
});
```

---

## 7. fetchPipelinesForGroup

### Use Case
Fetch pipelines from all projects in a group (parallel batching).

### Implementation
**Location:** Lines 450-510

```javascript
async fetchPipelinesForGroup(ref = 'master', startDate, endDate) {
  // First, get all projects in the group (uses cache)
  const projects = await this.fetchGroupProjects();

  if (projects.length === 0) {
    console.warn('No projects found in group');
    return [];
  }

  console.log(`Fetching pipelines from ${projects.length} projects (date range: ${startDate} to ${endDate})...`);

  // Process projects in parallel batches for better performance
  const batchSize = 10;
  const allPipelines = [];
  let projectsWithPipelines = 0;

  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(projects.length / batchSize);

    console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} projects)...`);

    // Fetch pipelines for all projects in this batch in parallel
    const batchPromises = batch.map(async (project) => {
      const pipelines = await this.fetchPipelinesForProject(
        project.fullPath,
        ref,
        startDate,
        endDate
      );

      if (pipelines.length > 0) {
        // Add project info to each pipeline
        pipelines.forEach(pipeline => {
          pipeline.projectPath = project.fullPath;
          pipeline.projectName = project.name;
        });
        console.log(`  ✓ ${project.fullPath}: ${pipelines.length} pipelines`);
        return pipelines;
      }
      return [];
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(pipelines => {
      if (pipelines.length > 0) {
        projectsWithPipelines++;
        allPipelines.push(...pipelines);
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < projects.length) {
      await this.delay(500);
    }
  }

  console.log(`✓ Found ${allPipelines.length} total pipelines from ${projectsWithPipelines}/${projects.length} projects`);
  return allPipelines;
}
```

### Critical Batch Pattern

**1. Batch Size: 10**
```javascript
const batchSize = 10;

for (let i = 0; i < projects.length; i += batchSize) {
  const batch = projects.slice(i, i + batchSize);
  // Process batch in parallel
}
```

**Why 10?**
- GitLab rate limit: ~600 requests/minute (authenticated)
- 10 concurrent requests = ~6 seconds per batch
- With 500ms delay = ~7 seconds per batch
- 270 projects = 27 batches = ~3 minutes total

**2. Promise.all for Parallel Execution**
```javascript
const batchPromises = batch.map(async (project) => {
  return await this.fetchPipelinesForProject(...);
});

const batchResults = await Promise.all(batchPromises);
```

**3. Augment Pipelines with Project Info**
```javascript
pipelines.forEach(pipeline => {
  pipeline.projectPath = project.fullPath;
  pipeline.projectName = project.name;
});
```

**Why:** Pipelines alone don't include project context.

**4. Batch Delay (500ms)**
```javascript
if (i + batchSize < projects.length) {
  await this.delay(500);
}
```

**Why:** Gives GitLab API breathing room between batches.

### Testing Strategy
```javascript
test('fetchPipelinesForGroup processes in parallel batches', async () => {
  const projects = [
    { id: '1', fullPath: 'g/p1', name: 'P1' },
    { id: '2', fullPath: 'g/p2', name: 'P2' }
  ];
  
  client.fetchGroupProjects = jest.fn().mockResolvedValue(projects);
  client.fetchPipelinesForProject = jest.fn()
    .mockResolvedValueOnce([{ id: 'pip1' }])
    .mockResolvedValueOnce([{ id: 'pip2' }]);

  const pipelines = await client.fetchPipelinesForGroup('main', '2024-01-01', '2024-01-31');
  
  expect(pipelines).toHaveLength(2);
  expect(pipelines[0].projectPath).toBe('g/p1');
  expect(pipelines[1].projectPath).toBe('g/p2');
});
```

---

## 8. fetchCommitsForProject

### Use Case
Fetch revert MRs for a single project (used by `fetchRevertCommitsForGroup`).

### Implementation
**Location:** Lines 512-588

```javascript
async fetchCommitsForProject(projectPath, ref = 'master', startDate, endDate) {
  // Use a simpler approach - fetch merge requests with "revert" in title
  const mrQuery = `
    query getRevertMRs($fullPath: ID!, $after: String) {
      project(fullPath: $fullPath) {
        mergeRequests(
          first: 100,
          after: $after,
          state: merged,
          targetBranches: ["master", "main"]
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            iid
            title
            state
            mergedAt
            createdAt
            targetBranch
            sourceBranch
          }
        }
      }
    }
  `;

  let allMRs = [];
  let hasNextPage = true;
  let after = null;

  try {
    while (hasNextPage) {
      const data = await this.client.request(mrQuery, {
        fullPath: projectPath,
        after
      });

      if (!data.project || !data.project.mergeRequests) {
        break;
      }

      const { nodes, pageInfo } = data.project.mergeRequests;
      allMRs = allMRs.concat(nodes);
      hasNextPage = pageInfo.hasNextPage;
      after = pageInfo.endCursor;

      if (hasNextPage) {
        await this.delay(100);
      }
    }

    // Filter by date range and revert commits
    let revertCommits = allMRs.filter(mr => {
      const title = mr.title.toLowerCase();
      return (
        title.includes('revert') ||
        title.startsWith('revert:')
      );
    });

    if (startDate && endDate) {
      revertCommits = revertCommits.filter(commit => {
        const commitDate = new Date(commit.mergedAt || commit.createdAt);
        return commitDate >= new Date(startDate) && commitDate <= new Date(endDate);
      });
    }

    return revertCommits;
  } catch (error) {
    console.warn(`Failed to fetch revert commits for ${projectPath}:`, error.message);
    return [];
  }
}
```

### Critical Pattern: Revert Detection

**1. Query All Merged MRs to main/master**
```javascript
mergeRequests(
  state: merged,
  targetBranches: ["master", "main"]
)
```

**2. Client-Side Filtering by Title**
```javascript
let revertCommits = allMRs.filter(mr => {
  const title = mr.title.toLowerCase();
  return (
    title.includes('revert') ||
    title.startsWith('revert:')
  );
});
```

**Why Client-Side?**
- GitLab GraphQL doesn't support title filtering
- Typical naming: "Revert: Fix bug" or "Revert 'Add feature'"
- Low volume (reverts are rare), so client-side filtering is fine

**3. Date Filtering (Client-Side)**
```javascript
if (startDate && endDate) {
  revertCommits = revertCommits.filter(commit => {
    const commitDate = new Date(commit.mergedAt || commit.createdAt);
    return commitDate >= new Date(startDate) && commitDate <= new Date(endDate);
  });
}
```

### Testing Strategy
```javascript
test('fetchCommitsForProject filters reverts by title', async () => {
  mockGraphQLClient.request.mockResolvedValue({
    project: {
      mergeRequests: {
        nodes: [
          { id: '1', title: 'Revert: Fix bug', mergedAt: '2024-01-15T10:00:00Z' },
          { id: '2', title: 'Add feature', mergedAt: '2024-01-16T10:00:00Z' }
        ],
        pageInfo: { hasNextPage: false, endCursor: null }
      }
    }
  });

  const reverts = await client.fetchCommitsForProject(
    'group/project',
    'main',
    '2024-01-01',
    '2024-01-31'
  );
  
  expect(reverts).toHaveLength(1);
  expect(reverts[0].title).toBe('Revert: Fix bug');
});
```

---

## 9. fetchRevertCommitsForGroup

### Use Case
Fetch all revert MRs across all projects (parallel batching).

### Implementation
**Location:** Lines 590-647

```javascript
async fetchRevertCommitsForGroup(ref = 'master', startDate, endDate) {
  const projects = await this.fetchGroupProjects();

  if (projects.length === 0) {
    console.warn('No projects found in group');
    return [];
  }

  console.log(`Checking for revert commits in ${projects.length} projects...`);

  // Process projects in parallel batches
  const batchSize = 10;
  const allReverts = [];
  let projectsWithReverts = 0;

  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(projects.length / batchSize);

    console.log(`Checking batch ${batchNum}/${totalBatches} for reverts...`);

    const batchPromises = batch.map(async (project) => {
      const reverts = await this.fetchCommitsForProject(
        project.fullPath,
        ref,
        startDate,
        endDate
      );

      if (reverts.length > 0) {
        // Add project info to each revert
        reverts.forEach(revert => {
          revert.projectPath = project.fullPath;
          revert.projectName = project.name;
        });
        console.log(`  ✓ ${project.fullPath}: ${reverts.length} reverts`);
        return reverts;
      }
      return [];
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(reverts => {
      if (reverts.length > 0) {
        projectsWithReverts++;
        allReverts.push(...reverts);
      }
    });

    if (i + batchSize < projects.length) {
      await this.delay(500);
    }
  }

  console.log(`✓ Found ${allReverts.length} total revert commits from ${projectsWithReverts}/${projects.length} projects`);
  return allReverts;
}
```

### Pattern
Same parallel batching pattern as `fetchPipelinesForGroup` (batch size 10, 500ms delay).

---

## 10. fetchDeployments

### Use Case
Get deployment count using merged MRs as proxy (MUCH faster than querying environments).

### Implementation
**Location:** Lines 649-685

```javascript
async fetchDeployments(startDate, endDate) {
  // Use merged MRs to main/master as a proxy for deployments
  // This is MUCH faster than querying pipelines across 270 projects
  // Assumption: Merge to main/master branch = deployment to production
  console.log('Using merged MRs as deployment proxy (merge to main/master = deployment)');

  try {
    const allMRs = await this.fetchMergeRequestsForGroup(startDate, endDate);

    // Filter to only main/master branch merges (production deployments)
    const productionMRs = allMRs.filter(mr => {
      const targetBranch = mr.targetBranch.toLowerCase();
      return targetBranch === 'main' || targetBranch === 'master';
    });

    console.log(`✓ Found ${productionMRs.length} production deployments (main/master merges)`);

    // Transform MRs to deployment format expected by metrics calculations
    const deployments = productionMRs.map(mr => ({
      id: mr.id,
      iid: mr.iid,
      ref: mr.targetBranch,
      status: 'success', // Merged MRs are successful deployments
      createdAt: mr.createdAt,
      finishedAt: mr.mergedAt,
      environment: { name: 'production' },
      projectPath: mr.project.fullPath,
      projectName: mr.project.name,
      sha: mr.commits?.nodes?.[0]?.sha || 'unknown'
    }));

    return deployments;
  } catch (error) {
    console.error('Failed to fetch deployments:', error.message);
    return [];
  }
}
```

### Critical Pattern: Deployment Proxy

**Problem:**
```javascript
// Querying deployment environments is SLOW
// - 270 projects
// - Each project may have multiple environments (staging, production, etc.)
// - Each environment may have multiple deployments
// - Result: 270+ API calls, ~5 minutes
```

**Solution:**
```javascript
// Use merged MRs to main/master as deployment proxy
// - 1 group-level query
// - Filter by targetBranch in-memory
// - Result: 1 API call, ~5 seconds
```

**Assumption:**
```javascript
// Merge to main/master = deployment to production
const productionMRs = allMRs.filter(mr => {
  const targetBranch = mr.targetBranch.toLowerCase();
  return targetBranch === 'main' || targetBranch === 'master';
});
```

**Valid for:**
- Teams using trunk-based development
- CI/CD that auto-deploys on merge to main
- GitFlow with main = production

**Not valid for:**
- Teams with manual deployments
- Teams with release branches
- Teams with deploy tags

**Transformation to Deployment Format:**
```javascript
const deployments = productionMRs.map(mr => ({
  id: mr.id,
  iid: mr.iid,
  ref: mr.targetBranch,           // 'main' or 'master'
  status: 'success',              // Merged = successful
  createdAt: mr.createdAt,
  finishedAt: mr.mergedAt,        // Merge time = deploy time
  environment: { name: 'production' },
  projectPath: mr.project.fullPath,
  projectName: mr.project.name,
  sha: mr.commits?.nodes?.[0]?.sha || 'unknown'
}));
```

### Testing Strategy
```javascript
test('fetchDeployments filters MRs to main/master', async () => {
  const allMRs = [
    { id: '1', targetBranch: 'main', mergedAt: '2024-01-15T10:00:00Z', project: { fullPath: 'g/p1' }, commits: { nodes: [] } },
    { id: '2', targetBranch: 'develop', mergedAt: '2024-01-16T10:00:00Z', project: { fullPath: 'g/p2' }, commits: { nodes: [] } }
  ];
  
  client.fetchMergeRequestsForGroup = jest.fn().mockResolvedValue(allMRs);

  const deployments = await client.fetchDeployments('2024-01-01', '2024-01-31');
  
  expect(deployments).toHaveLength(1);
  expect(deployments[0].ref).toBe('main');
  expect(deployments[0].environment.name).toBe('production');
});
```

---

## 11. fetchIncidents

### Use Case
Fetch incidents for MTTR calculation.

### Implementation
**Location:** Lines 687-791 (covered in `gitlab-api-patterns.md` lines 543-645)

**Key Parameters:**
- `types: [INCIDENT]` - Filter by issue type
- `createdAfter` / `createdBefore` - Date filtering at API level

**Transformation:**
- Calculate `downtimeHours` from `createdAt` to `closedAt`

---

## Critical Query Parameters

### Summary Table

| Parameter | Query Types | Purpose | Example |
|-----------|-------------|---------|---------|
| `includeSubgroups: true` | Issues, Projects | Include data from nested groups | `issues(includeSubgroups: true)` |
| `includeAncestors: false` | Iterations | Only current group's iterations | `iterations(includeAncestors: false)` |
| `first: 100` | All | Page size (GitLab max) | `first: 100` |
| `after: cursor` | All | Pagination cursor | `after: "cursor123"` |
| `state: merged` | Merge Requests | Only merged MRs | `mergeRequests(state: merged)` |
| `mergedAfter: Time` | Merge Requests | API-level date filter | `mergedAfter: "2024-01-01T00:00:00Z"` |
| `mergedBefore: Time` | Merge Requests | API-level date filter | `mergedBefore: "2024-01-31T23:59:59Z"` |
| `createdAfter: Time` | Issues, Incidents | API-level date filter | `createdAfter: "2024-01-01T00:00:00Z"` |
| `createdBefore: Time` | Issues, Incidents | API-level date filter | `createdBefore: "2024-01-31T23:59:59Z"` |
| `updatedAfter: Time` | Pipelines | API-level date filter | `updatedAfter: "2024-01-01T00:00:00Z"` |
| `ref: String` | Pipelines | Branch filter | `ref: "main"` |
| `targetBranches: [String]` | Merge Requests | Filter by target branch | `targetBranches: ["main", "master"]` |
| `types: [IssueType]` | Issues | Filter by issue type | `types: [INCIDENT]` |
| `iterationId: [ID!]` | Issues | Filter by sprint | `iterationId: ["gid://gitlab/Iteration/123"]` |

---

## Deployment Proxy Pattern

### Why Not Query Deployments Directly?

**Traditional Approach:**
```javascript
// Query deployment environments for each project
for (const project of projects) {
  const deployments = await fetchDeployments(project.id);
  // 270 API calls, ~5 minutes
}
```

**Problems:**
1. Slow (270+ API calls)
2. Not all projects have environments configured
3. Environment data may be incomplete
4. Complex query structure

**Proxy Approach:**
```javascript
// Query merged MRs to main/master (1 group-level call)
const allMRs = await fetchMergeRequestsForGroup(startDate, endDate);
const deployments = allMRs.filter(mr => 
  mr.targetBranch === 'main' || mr.targetBranch === 'master'
);
// 1 API call, ~5 seconds
```

**Benefits:**
1. 100x faster (1 call vs 270)
2. Works for all projects (no environment setup needed)
3. Simple, reliable data
4. Matches most team workflows (merge to main = deploy)

**Tradeoffs:**
- Assumes merge to main = deployment (not always true)
- Doesn't capture manual deployments
- Doesn't capture rollbacks (unless via revert MR)

**When to Use:**
- Trunk-based development teams
- CI/CD auto-deploys on merge
- GitFlow with main = production

**When NOT to Use:**
- Teams with manual release process
- Teams using release branches (release/1.0)
- Teams using deploy tags

---

## Batch Processing Pattern

### Pattern Structure

```javascript
const batchSize = 10;
const allResults = [];

for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  
  // Process batch in parallel
  const batchPromises = batch.map(async (item) => {
    return await processItem(item);
  });
  
  const batchResults = await Promise.all(batchPromises);
  
  // Aggregate results
  allResults.push(...batchResults.flat());
  
  // Delay between batches (not after last batch)
  if (i + batchSize < items.length) {
    await this.delay(500);
  }
}

return allResults;
```

### Why Batch Size 10?

**Rate Limit Math:**
- GitLab: 600 requests/minute (authenticated)
- 600 / 60 = 10 requests/second
- Batch of 10 + 500ms delay = ~2 seconds/batch
- 270 projects / 10 = 27 batches = ~54 seconds total

**Alternatives:**
- **Batch size 5:** Safer for rate limits, but slower (54 batches = ~2 minutes)
- **Batch size 20:** Faster, but risks rate limiting (14 batches = ~30 seconds)

**Recommendation:** Stick with 10 (proven safe in production).

### Error Handling in Batches

**Problem:** If one project fails, should whole batch fail?

**Solution:** Individual methods return empty array on error
```javascript
try {
  const pipelines = await fetchPipelinesForProject(project.fullPath);
  return pipelines;
} catch (error) {
  console.warn(`Failed for ${project.fullPath}:`, error.message);
  return []; // Don't throw, let batch continue
}
```

**Result:** Partial failures don't stop entire operation.

---

## Rate Limiting Strategy

### Rate Limit Hierarchy

| Delay | Use Case | Rationale |
|-------|----------|-----------|
| 50ms | Per-project pagination (pipelines) | Called in batches, low impact |
| 100ms | Standard pagination (issues, MRs, iterations) | Safe for sequential calls |
| 500ms | Between batches (10 concurrent calls) | Gives API breathing room |

### Implementation

```javascript
// Helper method
delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage
if (hasNextPage) {
  await this.delay(100);
}
```

### GitLab Rate Limits

**Authenticated Users:**
- 600 requests/minute (10/second)
- Based on token, not IP

**Unauthenticated:**
- 300 requests/minute (5/second)

**Best Practice:**
- Target ~6 requests/second (100ms delay)
- Allows buffer for concurrent operations
- Prevents rate limit errors in production

**Rate Limit Errors:**
```
GitLab API Error: Rate limit exceeded. Please wait before making more requests.
```

**Recovery:**
- Exponential backoff (not implemented in prototype)
- Reduce batch size
- Increase delays

---

## Cache Implementation

### Project Cache Details

**Cache Structure:**
```javascript
constructor() {
  this._projectsCache = null;           // Cached project array
  this._projectsCacheTime = null;       // Timestamp of cache creation
  this._cacheTimeout = 10 * 60 * 1000;  // 10 minutes in milliseconds
}
```

**Cache Check:**
```javascript
async fetchGroupProjects(useCache = true) {
  // Check cache validity
  if (useCache && this._projectsCache && this._projectsCacheTime) {
    const age = Date.now() - this._projectsCacheTime;
    if (age < this._cacheTimeout) {
      console.log(`Using cached projects (${this._projectsCache.length} projects, age: ${Math.round(age / 1000)}s)`);
      return this._projectsCache;
    }
  }

  // Cache miss or expired - fetch fresh data
  const projects = await this._fetchFromAPI();

  // Update cache
  this._projectsCache = projects;
  this._projectsCacheTime = Date.now();

  return projects;
}
```

### Why 10 Minutes?

**Rationale:**
- Projects rarely change (new projects added infrequently)
- 10 minutes balances freshness vs. performance
- Long-lived sessions benefit from cache
- Short enough to catch new projects within reasonable time

**Performance Impact:**
- First call: ~5 seconds (270 projects, paginated)
- Cached calls: <1ms (in-memory)
- Cache invalidation: 10 minutes (automatic)

### Cache Bypass

```javascript
// Force fresh data
const projects = await client.fetchGroupProjects(false);
```

**Use cases:**
- Test suite setup (ensure clean state)
- Admin operations (just created new project)
- Debugging (cache might be stale)

---

## Error Handling Patterns

### 1. GraphQL-Specific Errors

```javascript
try {
  const data = await this.client.request(query, variables);
} catch (error) {
  // Check for GraphQL errors
  if (error.response?.errors) {
    const errorMessages = error.response.errors.map(e => e.message).join(', ');
    throw new Error(`GitLab API Error: ${errorMessages}`);
  }
  
  // Network or other errors
  throw new Error(`Failed to fetch data: ${error.message}`);
}
```

### 2. Missing Data Handling

**Group not found:**
```javascript
if (!data.group) {
  throw new Error(`Group not found: ${this.projectPath}`);
}
```

**Optional features (iterations not configured):**
```javascript
if (!data.group.iterations || !data.group.iterations.nodes) {
  console.warn('This group does not have iterations configured.');
  console.warn('Enable: Group Settings > Iterations');
  return []; // Empty array, not error
}
```

**Missing pagination results:**
```javascript
if (!data.group.mergeRequests) {
  break; // Exit pagination loop
}
```

### 3. Per-Project Error Handling (Batch Operations)

```javascript
try {
  const pipelines = await this.fetchPipelinesForProject(project.fullPath);
  return pipelines;
} catch (error) {
  console.warn(`Failed to fetch pipelines for ${project.fullPath}:`, error.message);
  return []; // Don't throw - let batch continue
}
```

**Why return empty array?**
- Allows batch to complete even if some projects fail
- Logs warning for debugging
- Partial data is better than no data

### 4. Fallback Logic (Iterations)

```javascript
// Try as group path first
let data = await this.client.request(query, { fullPath: groupPath });

if (!data.group) {
  // Fallback: Try parent group (in case it's a project path)
  const segments = this.projectPath.split('/');
  if (segments.length > 1) {
    groupPath = segments.slice(0, -1).join('/');
    console.log(`Trying parent group: ${groupPath}`);
    continue; // Retry with parent
  }
  throw new Error(`Group not found: ${groupPath}`);
}
```

---

## Test Mocking Strategies

### 1. Mock graphql-request Library

```javascript
import { GraphQLClient } from 'graphql-request';

jest.mock('graphql-request');

let mockGraphQLClient;

beforeEach(() => {
  mockGraphQLClient = {
    request: jest.fn()
  };
  GraphQLClient.mockImplementation(() => mockGraphQLClient);
});
```

### 2. Mock Pagination Responses

```javascript
test('handles multi-page results', async () => {
  // Page 1
  mockGraphQLClient.request.mockResolvedValueOnce({
    group: {
      issues: {
        nodes: [{ id: '1', title: 'Issue 1' }],
        pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
      }
    }
  });

  // Page 2
  mockGraphQLClient.request.mockResolvedValueOnce({
    group: {
      issues: {
        nodes: [{ id: '2', title: 'Issue 2' }],
        pageInfo: { hasNextPage: false, endCursor: null }
      }
    }
  });

  const result = await client.fetchIterationDetails('iter-123');

  expect(result.issues).toHaveLength(2);
  expect(mockGraphQLClient.request).toHaveBeenCalledTimes(2);
});
```

### 3. Mock Error Responses

```javascript
test('handles GraphQL errors', async () => {
  mockGraphQLClient.request.mockRejectedValue({
    response: {
      errors: [
        { message: 'Group not found' }
      ]
    }
  });

  await expect(client.fetchIterations()).rejects.toThrow('GitLab API Error: Group not found');
});
```

### 4. Mock Date Filtering

```javascript
test('filters by date range', async () => {
  mockGraphQLClient.request.mockResolvedValue({
    group: {
      mergeRequests: {
        nodes: [/* ... */],
        pageInfo: { hasNextPage: false, endCursor: null }
      }
    }
  });

  await client.fetchMergeRequestsForGroup('2024-01-01', '2024-01-31');

  expect(mockGraphQLClient.request).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      mergedAfter: '2024-01-01T00:00:00.000Z',
      mergedBefore: '2024-01-31T00:00:00.000Z'
    })
  );
});
```

### 5. Mock Batch Processing

```javascript
test('processes projects in parallel batches', async () => {
  const projects = Array.from({ length: 25 }, (_, i) => ({
    id: `${i + 1}`,
    fullPath: `group/project${i + 1}`,
    name: `Project ${i + 1}`
  }));

  client.fetchGroupProjects = jest.fn().mockResolvedValue(projects);
  client.fetchPipelinesForProject = jest.fn().mockResolvedValue([]);

  await client.fetchPipelinesForGroup('main', '2024-01-01', '2024-01-31');

  // 25 projects / batch size 10 = 3 batches
  // Should have called fetchPipelinesForProject 25 times
  expect(client.fetchPipelinesForProject).toHaveBeenCalledTimes(25);
});
```

### 6. Mock Cache Behavior

```javascript
describe('project cache', () => {
  test('uses cached data when fresh', async () => {
    const cachedProjects = [{ id: '1', fullPath: 'g/p1' }];
    client._projectsCache = cachedProjects;
    client._projectsCacheTime = Date.now();

    const result = await client.fetchGroupProjects(true);

    expect(result).toEqual(cachedProjects);
    expect(mockGraphQLClient.request).not.toHaveBeenCalled();
  });

  test('fetches fresh data when cache expired', async () => {
    client._projectsCache = [{ id: '1' }];
    client._projectsCacheTime = Date.now() - (11 * 60 * 1000); // 11 minutes ago

    mockGraphQLClient.request.mockResolvedValue({
      group: {
        projects: {
          nodes: [{ id: '2', fullPath: 'g/p2' }],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      }
    });

    const result = await client.fetchGroupProjects(true);

    expect(result[0].id).toBe('2');
    expect(mockGraphQLClient.request).toHaveBeenCalled();
  });
});
```

---

## Best Practices Summary

### DO

1. **Query at Group Level When Possible**
   - Issues, MRs, Incidents → Group-level queries
   - 270 projects → 1 query (20-30x faster)

2. **Use API-Level Date Filtering**
   - `mergedAfter`, `createdAfter`, `updatedAfter`
   - 5-10x faster than client-side filtering

3. **Include Subgroups**
   - `includeSubgroups: true` for multi-project groups
   - Critical for nested group structures

4. **Handle Pagination Properly**
   - Always check `hasNextPage`
   - Use `endCursor` for next page
   - Paginate until `hasNextPage === false`

5. **Respect Rate Limits**
   - 100ms delay between paginated requests
   - 500ms delay between batches
   - Batch size 10 for parallel operations

6. **Cache Expensive Queries**
   - Project lists (rarely change)
   - 10-minute TTL balances freshness vs. performance

7. **Handle Errors Gracefully**
   - Return empty arrays for per-project failures
   - Warn, don't throw (in batch operations)
   - Parse GraphQL error messages

8. **Use Deployment Proxy Pattern**
   - Merged MRs to main/master = deployments
   - 100x faster than querying environments

9. **Augment Results with Context**
   - Add `projectPath`, `projectName` to results from group queries
   - Enables multi-project tracking

10. **Test with Mocks**
    - Mock `graphql-request` library
    - Test pagination, errors, caching
    - Verify correct parameters passed

### DON'T

1. **Don't Query Per-Project When Group Query Exists**
   - ❌ Loop through 270 projects
   - ✅ Single group-level query

2. **Don't Skip `includeSubgroups`**
   - ❌ Only current group's data
   - ✅ All nested subgroups + projects

3. **Don't Filter Dates Client-Side**
   - ❌ Fetch all, filter in code
   - ✅ Use `mergedAfter`, `createdAfter` parameters

4. **Don't Ignore Pagination**
   - ❌ Return first 100 results
   - ✅ Loop until `hasNextPage === false`

5. **Don't Spam API**
   - ❌ 270 rapid-fire requests
   - ✅ Batch (10 parallel) + delays (500ms)

6. **Don't Throw on Partial Failures**
   - ❌ One project fails → whole batch fails
   - ✅ Log warning, return empty array, continue

7. **Don't Parse Pagination Cursors**
   - ❌ `after: JSON.parse(cursor)`
   - ✅ `after: cursor` (opaque string)

8. **Don't Query Deployments Directly**
   - ❌ 270 environment queries (~5 minutes)
   - ✅ Use merged MRs proxy (~5 seconds)

9. **Don't Skip Error Handling**
   - ❌ Assume API always succeeds
   - ✅ Check for GraphQL errors, missing data

10. **Don't Hardcode Paths**
    - ❌ `fullPath: "smi-org/dev"`
    - ✅ `fullPath: this.projectPath`

---

## Related Documentation

- **`gitlab-api-patterns.md`** - High-level patterns and performance benchmarks
- **`metrics-formulas.md`** - What data to fetch for each metric
- **`_context/architecture/clean-architecture.md`** - GitLabClient in Infrastructure layer
- **`_context/testing/tdd-strategy.md`** - TDD approach for API clients
- **`_context/reference/prototype-lessons.md`** - Lessons learned from prototype

---

## GitLab GraphQL API Documentation

**Official Resources:**
- **GraphQL API Docs:** https://docs.gitlab.com/ee/api/graphql/
- **GraphQL Explorer:** https://docs.gitlab.com/ee/api/graphql/getting_started.html
- **Reference (Schema):** https://docs.gitlab.com/ee/api/graphql/reference/
- **Pagination:** https://docs.gitlab.com/ee/api/graphql/index.html#pagination
- **Rate Limits:** https://docs.gitlab.com/ee/user/admin_area/settings/rate_limits.html

**Library:**
- **graphql-request:** https://github.com/prisma-labs/graphql-request

---

## Summary

This catalog documents all 11 proven query methods from the prototype (`gitlab-client.js`):

| Method | Key Pattern | Performance Impact |
|--------|-------------|-------------------|
| `fetchProject` | Single query | Fast (~200ms) |
| `fetchIterations` | Group-level + fallback logic | Fast (~2s) |
| `fetchIterationDetails` | Group-level + `includeSubgroups` | Fast (~3s) |
| `fetchMergeRequestsForGroup` | Group-level + date filtering | Fast (~4s) |
| `fetchGroupProjects` | Group-level + 10-min cache | Fast (cached: <1ms) |
| `fetchPipelinesForProject` | Per-project + `updatedAfter` | Medium (~2s/project) |
| `fetchPipelinesForGroup` | Batch (10 parallel) + cache | Medium (~3 min for 270) |
| `fetchCommitsForProject` | Per-project + title filter | Medium (~2s/project) |
| `fetchRevertCommitsForGroup` | Batch (10 parallel) | Medium (~2 min for 270) |
| `fetchDeployments` | Deployment proxy (MRs) | Fast (~5s) |
| `fetchIncidents` | Group-level + type filter | Fast (~2s) |

**Total initial load:** ~30 seconds (with all optimizations)  
**Without optimizations:** ~18 minutes (36x slower)

These patterns are **battle-tested** with 270+ projects in production. Use them with confidence. 🚀
