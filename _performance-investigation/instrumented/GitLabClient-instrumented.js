import { GraphQLClient } from 'graphql-request';

/**
 * Performance instrumented GitLab GraphQL API client for bottleneck analysis.
 * This is a temporary version with extensive timing instrumentation.
 */
export class GitLabClientInstrumented {
  constructor(config) {
    // Validate required configuration
    if (!config.token) {
      throw new Error('GITLAB_TOKEN is required');
    }

    if (!config.projectPath) {
      throw new Error('GITLAB_PROJECT_PATH is required');
    }

    // Store configuration
    this.url = config.url || 'https://gitlab.com';
    this.token = config.token;
    this.projectPath = config.projectPath;

    // Initialize GraphQL client
    this.client = new GraphQLClient(`${this.url}/api/graphql`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });

    // Initialize cache properties
    this._projectsCache = null;
    this._projectsCacheTime = null;
    this._cacheTimeout = 600000; // 10 minutes in milliseconds

    // Initialize response cache
    this._responseCache = new Map();
    this._responseCacheTTL = 300000; // 5 minutes in milliseconds

    // Performance tracking
    this.metrics = {
      queryCounts: {},
      queryTimes: {},
      cacheHits: 0,
      cacheMisses: 0,
      totalQueries: 0
    };
  }

  /**
   * Track performance of a query
   */
  _trackQuery(queryName, duration, fromCache = false) {
    if (!this.metrics.queryCounts[queryName]) {
      this.metrics.queryCounts[queryName] = 0;
      this.metrics.queryTimes[queryName] = [];
    }
    this.metrics.queryCounts[queryName]++;
    this.metrics.queryTimes[queryName].push(duration);
    this.metrics.totalQueries++;

    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }

  /**
   * Print performance summary
   */
  printMetrics() {
    console.log('\n========== PERFORMANCE METRICS ==========');
    console.log(`Total Queries: ${this.metrics.totalQueries}`);
    console.log(`Cache Hits: ${this.metrics.cacheHits} (${((this.metrics.cacheHits / this.metrics.totalQueries) * 100).toFixed(1)}%)`);
    console.log(`Cache Misses: ${this.metrics.cacheMisses} (${((this.metrics.cacheMisses / this.metrics.totalQueries) * 100).toFixed(1)}%)`);
    console.log('\nQuery Breakdown:');

    Object.keys(this.metrics.queryCounts).forEach(queryName => {
      const times = this.metrics.queryTimes[queryName];
      const count = this.metrics.queryCounts[queryName];
      const total = times.reduce((a, b) => a + b, 0);
      const avg = total / count;
      const max = Math.max(...times);
      const min = Math.min(...times);

      console.log(`\n${queryName}:`);
      console.log(`  Count: ${count}`);
      console.log(`  Total: ${total.toFixed(2)}ms`);
      console.log(`  Avg: ${avg.toFixed(2)}ms`);
      console.log(`  Min: ${min.toFixed(2)}ms`);
      console.log(`  Max: ${max.toFixed(2)}ms`);
    });

    console.log('\n=========================================\n');
  }

  /**
   * Makes a cached GraphQL request with performance tracking
   */
  async _cachedRequest(query, variables, queryName = 'unknown') {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = JSON.stringify({ query, variables });

    // Check cache
    const cached = this._responseCache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this._responseCacheTTL) {
        const duration = Date.now() - startTime;
        this._trackQuery(queryName, duration, true);
        console.log(`[CACHE HIT] ${queryName} - ${duration}ms`);
        return cached.data;
      }
      this._responseCache.delete(cacheKey);
    }

    // Fetch fresh data
    console.log(`[QUERY START] ${queryName}...`);
    const data = await this.client.request(query, variables);
    const duration = Date.now() - startTime;

    // Store in cache
    this._responseCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    this._trackQuery(queryName, duration, false);
    console.log(`[QUERY END] ${queryName} - ${duration}ms`);

    return data;
  }

  /**
   * Fetch iterations
   */
  async fetchIterations() {
    const overallStart = Date.now();
    console.log('\n[PERF] fetchIterations() started');

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
    let pageCount = 0;

    try {
      while (hasNextPage) {
        pageCount++;
        const data = await this._cachedRequest(query, {
          fullPath: groupPath,
          after,
        }, `fetchIterations_page${pageCount}`);

        if (!data.group) {
          const segments = this.projectPath.split('/');
          if (segments.length > 1) {
            groupPath = segments.slice(0, -1).join('/');
            console.log(`Trying parent group: ${groupPath}`);
            continue;
          }
          throw new Error(`Group not found: ${groupPath}`);
        }

        if (!data.group.iterations || !data.group.iterations.nodes) {
          console.warn('This group does not have iterations configured');
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

      const duration = Date.now() - overallStart;
      console.log(`[PERF] fetchIterations() completed - ${duration}ms - ${allIterations.length} iterations, ${pageCount} pages`);
      return allIterations;
    } catch (error) {
      if (error.response?.errors) {
        const errorMessages = error.response.errors.map(e => e.message).join(', ');
        throw new Error(`GitLab API Error: ${errorMessages}`);
      }
      throw error;
    }
  }

  /**
   * Fetch iteration details with instrumentation
   */
  async fetchIterationDetails(iterationId) {
    const overallStart = Date.now();
    console.log(`\n[PERF] fetchIterationDetails(${iterationId}) started`);

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
              notes(first: 20) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  body
                  system
                  systemNoteMetadata {
                    action
                  }
                  createdAt
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
    let pageCount = 0;

    try {
      // Fetch issues
      const issueStart = Date.now();
      while (hasNextPage) {
        pageCount++;
        const data = await this._cachedRequest(query, {
          fullPath: this.projectPath,
          iterationId: [iterationId],
          after,
        }, `fetchIterationDetails_issues_page${pageCount}`);

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
      const issueDuration = Date.now() - issueStart;
      console.log(`[PERF]   - Issues fetched: ${issueDuration}ms - ${allIssues.length} issues, ${pageCount} pages`);

      // Enrich issues
      const enrichStart = Date.now();
      const enrichedIssues = allIssues.map((issue) => {
        const inProgressAt = this.extractInProgressTimestamp(issue.notes?.nodes || []);
        return {
          ...issue,
          inProgressAt,
        };
      });
      const enrichDuration = Date.now() - enrichStart;
      console.log(`[PERF]   - Issue enrichment: ${enrichDuration}ms`);

      // Fetch iteration metadata for MR date range
      const metadataStart = Date.now();
      const iterations = await this.fetchIterations();
      const iterationMetadata = iterations.find(it => it.id === iterationId);
      const metadataDuration = Date.now() - metadataStart;
      console.log(`[PERF]   - Metadata fetch: ${metadataDuration}ms`);

      if (!iterationMetadata) {
        console.warn(`Iteration ${iterationId} not found, skipping MR fetch`);
        const totalDuration = Date.now() - overallStart;
        console.log(`[PERF] fetchIterationDetails() completed - ${totalDuration}ms (no MRs)`);
        return {
          issues: enrichedIssues,
          mergeRequests: [],
        };
      }

      // Fetch merge requests
      const mrStart = Date.now();
      const mergeRequests = await this.fetchMergeRequestsForGroup(
        iterationMetadata.startDate,
        iterationMetadata.dueDate
      );
      const mrDuration = Date.now() - mrStart;
      console.log(`[PERF]   - MRs fetched: ${mrDuration}ms - ${mergeRequests.length} MRs`);

      const totalDuration = Date.now() - overallStart;
      console.log(`[PERF] fetchIterationDetails() completed - ${totalDuration}ms`);

      return {
        issues: enrichedIssues,
        mergeRequests,
      };
    } catch (error) {
      if (error.response?.errors) {
        throw new Error(`Failed to fetch iteration details: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch iteration details: ${error.message}`);
    }
  }

  /**
   * Fetch merge requests for group
   */
  async fetchMergeRequestsForGroup(startDate, endDate) {
    const overallStart = Date.now();
    console.log(`\n[PERF] fetchMergeRequestsForGroup(${startDate}, ${endDate}) started`);

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
    let pageCount = 0;

    try {
      const mergedAfter = new Date(startDate).toISOString();
      const mergedBefore = new Date(endDate).toISOString();

      while (hasNextPage) {
        pageCount++;
        const data = await this.client.request(query, {
          fullPath: this.projectPath,
          after,
          mergedAfter,
          mergedBefore,
        });

        if (!data.group) {
          throw new Error(`Group not found: ${this.projectPath}`);
        }

        if (!data.group.mergeRequests) {
          break;
        }

        const { nodes, pageInfo } = data.group.mergeRequests;
        allMRs = allMRs.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        if (hasNextPage) {
          await this.delay(100);
        }
      }

      const duration = Date.now() - overallStart;
      console.log(`[PERF] fetchMergeRequestsForGroup() completed - ${duration}ms - ${allMRs.length} MRs, ${pageCount} pages`);
      return allMRs;
    } catch (error) {
      if (error.response?.errors) {
        throw new Error(`Failed to fetch merge requests: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch merge requests: ${error.message}`);
    }
  }

  /**
   * Fetch incidents
   */
  async fetchIncidents(startDate, endDate) {
    const overallStart = Date.now();
    console.log(`\n[PERF] fetchIncidents(${startDate}, ${endDate}) started`);

    const query = `
      query getIncidents($fullPath: ID!, $after: String, $createdAfter: Time, $createdBefore: Time) {
        group(fullPath: $fullPath) {
          id
          issues(
            types: [INCIDENT]
            createdAfter: $createdAfter
            createdBefore: $createdBefore
            first: 100
            after: $after
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
              closedAt
              updatedAt
              webUrl
              labels {
                nodes {
                  title
                }
              }
            }
          }
        }
      }
    `;

    let allIncidents = [];
    let hasNextPage = true;
    let after = null;
    let pageCount = 0;

    try {
      const createdAfter = new Date(startDate).toISOString();
      const createdBefore = new Date(endDate).toISOString();

      while (hasNextPage) {
        pageCount++;
        const data = await this.client.request(query, {
          fullPath: this.projectPath,
          after,
          createdAfter,
          createdBefore,
        });

        if (!data.group) {
          throw new Error(`Group not found: ${this.projectPath}`);
        }

        if (!data.group.issues) {
          break;
        }

        const { nodes, pageInfo } = data.group.issues;
        allIncidents = allIncidents.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        if (hasNextPage) {
          await this.delay(100);
        }
      }

      const duration = Date.now() - overallStart;
      console.log(`[PERF] fetchIncidents() completed - ${duration}ms - ${allIncidents.length} incidents, ${pageCount} pages`);

      return allIncidents.map((incident) => ({
        id: incident.id,
        iid: incident.iid,
        title: incident.title,
        state: incident.state,
        createdAt: incident.createdAt,
        closedAt: incident.closedAt,
        labels: incident.labels,
        webUrl: incident.webUrl,
      }));
    } catch (error) {
      if (error.response?.errors) {
        throw new Error(`Failed to fetch incidents: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch incidents: ${error.message}`);
    }
  }

  extractInProgressTimestamp(notes) {
    const statusChanges = this.parseStatusChanges(notes);
    const inProgressChange = statusChanges.find((change) =>
      this.isInProgressStatus(change.status)
    );
    return inProgressChange?.timestamp || null;
  }

  parseStatusChanges(notes) {
    return notes
      .filter(
        (note) =>
          note.system && note.systemNoteMetadata?.action === 'work_item_status'
      )
      .map((note) => {
        const match = note.body.match(/set status to \*\*(.+?)\*\*/);
        const status = match ? match[1] : null;

        return {
          status,
          timestamp: note.createdAt,
          body: note.body,
        };
      })
      .filter((change) => change.status !== null)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  isInProgressStatus(status) {
    const patterns = [
      /in progress/i,
      /in-progress/i,
      /wip/i,
      /working/i,
    ];
    return patterns.some((pattern) => pattern.test(status));
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
