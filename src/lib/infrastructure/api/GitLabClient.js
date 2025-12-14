import { GraphQLClient } from 'graphql-request';
import { RateLimitManager } from './core/RateLimitManager.js';
import { GraphQLExecutor } from './core/GraphQLExecutor.js';
import { DeploymentClient } from './clients/DeploymentClient.js';
import { PipelineClient } from './clients/PipelineClient.js';
import { MergeRequestClient } from './clients/MergeRequestClient.js';
import { IterationClient } from './clients/IterationClient.js';
import { IssueClient } from './clients/IssueClient.js';
import { IncidentClient } from './clients/IncidentClient.js';

/**
 * GitLab GraphQL API client for fetching sprint metrics data.
 * Provides methods for querying iterations, issues, merge requests, pipelines, and incidents.
 */
export class GitLabClient {
  /**
   * Creates a new GitLabClient instance.
   *
   * @param {Object} config - Configuration object
   * @param {string} [config.url='https://gitlab.com'] - GitLab instance URL
   * @param {string} config.token - GitLab personal access token
   * @param {string} config.projectPath - GitLab project path (e.g., 'group/project')
   * @param {import('../../core/interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional)
   * @throws {Error} If token or projectPath is missing
   */
  constructor(config, logger = null) {
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
    this.logger = logger;

    // Initialize helpers
    this.rateLimitManager = new RateLimitManager(logger);
    this.executor = new GraphQLExecutor(config, logger);

    // Initialize specialized clients
    this.deploymentClient = new DeploymentClient(
      this.executor,
      this.rateLimitManager,
      this.projectPath,
      logger
    );
    this.pipelineClient = new PipelineClient(
      this.executor,
      this.rateLimitManager,
      logger
    );
    this.mergeRequestClient = new MergeRequestClient(
      this.executor,
      this.rateLimitManager,
      this.projectPath,
      logger
    );
    this.iterationClient = new IterationClient(
      this.executor,
      this.rateLimitManager,
      this.projectPath,
      logger
    );
    this.issueClient = new IssueClient(
      this.executor,
      this.rateLimitManager,
      logger
    );
    this.incidentClient = new IncidentClient(
      this.executor,
      this.rateLimitManager,
      this.projectPath,
      this.mergeRequestClient,
      logger
    );

    // Initialize GraphQL client (legacy - will be replaced by executor)
    this.client = new GraphQLClient(`${this.url}/api/graphql`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });
  }

  /**
   * Fetches project metadata from GitLab.
   *
   * @returns {Promise<Object>} Project metadata
   * @throws {Error} If the request fails
   */
  async fetchProject() {
    const query = `
      query getProject($fullPath: ID!) {
        project(fullPath: $fullPath) {
          id
          name
          nameWithNamespace
          description
          webUrl
        }
      }
    `;

    try {
      const data = await this.client.request(query, { fullPath: this.projectPath });
      return data.project;
    } catch (error) {
      // Check for GraphQL errors
      if (error.response?.errors) {
        throw new Error(error.response.errors[0].message);
      }
      throw error;
    }
  }

  /**
   * Fetches all iterations (sprints) for the group.
   * Handles pagination and automatically falls back to parent group if needed.
   *
   * @returns {Promise<Array>} Array of iteration objects
   * @throws {Error} If the group is not found or request fails
   */
  async fetchIterations() {
    return this.iterationClient.fetchIterations();
  }

  /**
   * Fetches all notes for a specific issue using pagination.
   * Used when the first batch of notes doesn't contain an InProgress status change.
   *
   * @param {string} issueId - GitLab issue ID (e.g., 'gid://gitlab/Issue/123')
   * @param {string} startCursor - Cursor to start fetching from (endCursor from previous batch)
   * @returns {Promise<Array>} Array of all remaining note objects
   * @throws {Error} If the request fails
   */
  async fetchAdditionalNotesForIssue(issueId, startCursor) {
    return this.issueClient.fetchAdditionalNotesForIssue(issueId, startCursor);
  }

  /**
   * Fetches detailed information for a specific iteration, including all issues.
   * Issues are fetched from the group level with subgroup inclusion.
   *
   * @param {string} iterationId - GitLab iteration ID (e.g., 'gid://gitlab/Iteration/123')
   * @returns {Promise<Object>} Object with issues and mergeRequests arrays
   * @throws {Error} If the group is not found or request fails
   */
  async fetchIterationDetails(iterationId) {
    const query = `
      query getIterationDetails($fullPath: ID!, $iterationId: [ID!], $after: String, $notesAfter: String, $not: NegatedIssueFilterInput) {
        group(fullPath: $fullPath) {
          id
          issues(iterationId: $iterationId, includeSubgroups: true, first: 100, after: $after, not: $not) {
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
              webUrl
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
              # Performance Optimization: Reduced from 100 to 20
              # Justification: Status changes (especially "In progress") typically occur
              # early in an issue's history. Analysis shows 70% performance improvement
              # (8.5s → 2.5s for 18 issues) with minimal risk of missing data.
              notes(first: 20, after: $notesAfter) {
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

    try {
      while (hasNextPage) {
        const data = await this.client.request(query, {
          fullPath: this.projectPath,
          iterationId: [iterationId], // Pass as array
          after,
          not: { types: ['INCIDENT'] }, // BUG FIX: Exclude incidents from regular issues
        });

        if (!data.group) {
          throw new Error(`Group not found: ${this.projectPath}`);
        }

        const { nodes, pageInfo } = data.group.issues;
        allIssues = allIssues.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        // Small delay to avoid rate limiting
        if (hasNextPage) {
          await this.rateLimitManager.delay(100);
        }
      }

      if (this.logger) {
        this.logger.debug('Fetched issues for iteration', {
          issuesCount: allIssues.length,
          iterationId
        });
      }

      // Enrich issues with inProgressAt timestamp from status change notes
      // Only fetch additional notes for CLOSED stories (open stories don't need InProgress for cycle time)
      let issuesRequiringAdditionalFetch = 0;
      const enrichedIssues = await Promise.all(
        allIssues.map(async (issue) => {
          const initialNotes = issue.notes?.nodes || [];
          let inProgressAt = this.extractInProgressTimestamp(initialNotes);

          // Only fetch additional notes for CLOSED stories missing InProgress
          // Open stories don't need InProgress date (not used in cycle time calculations)
          const isClosed = issue.state === 'closed';
          if (!inProgressAt && issue.notes?.pageInfo?.hasNextPage && isClosed) {
            issuesRequiringAdditionalFetch++;
            if (this.logger) {
              this.logger.warn('Closed issue missing InProgress in first batch, fetching all notes', {
                issueIid: issue.iid,
                notesInFirstBatch: 20
              });
            }

            try {
              const additionalNotes = await this.fetchAdditionalNotesForIssue(
                issue.id,
                issue.notes.pageInfo.endCursor
              );

              // Combine initial notes with additional notes
              const allNotes = [...initialNotes, ...additionalNotes];

              // Try to extract InProgress date from all notes
              inProgressAt = this.extractInProgressTimestamp(allNotes);

              if (inProgressAt) {
                if (this.logger) {
                  this.logger.debug('Found InProgress date after fetching all notes', {
                    issueIid: issue.iid,
                    inProgressAt
                  });
                }
              } else {
                if (this.logger) {
                  this.logger.warn('Exhausted all notes without finding InProgress status change', {
                    issueIid: issue.iid,
                    totalNotes: allNotes.length,
                    fallback: 'using createdAt',
                    createdAt: issue.createdAt
                  });
                }
                // Fallback: Use createdAt if no InProgress status change found
                inProgressAt = issue.createdAt;
              }

              // Update issue with all notes for consistency
              return {
                ...issue,
                notes: {
                  ...issue.notes,
                  nodes: allNotes,
                  pageInfo: {
                    hasNextPage: false,
                    endCursor: null,
                  },
                },
                inProgressAt,
                inProgressAtSource: inProgressAt === issue.createdAt ? 'created' : 'status_change', // Track source
              };
            } catch (error) {
              if (this.logger) {
                this.logger.warn('Failed to fetch additional notes for issue', {
                  issueIid: issue.iid,
                  error: error.message
                });
              }
              // Fall back to using createdAt for closed stories
              if (isClosed && !inProgressAt) {
                if (this.logger) {
                  this.logger.debug('Error recovery: falling back to createdAt', {
                    issueIid: issue.iid,
                    createdAt: issue.createdAt
                  });
                }
                inProgressAt = issue.createdAt;
              }
              return {
                ...issue,
                inProgressAt,
                inProgressAtSource: inProgressAt === issue.createdAt ? 'created' : 'status_change',
              };
            }
          }

          // For closed stories without InProgress in first batch and no more notes to fetch
          if (isClosed && !inProgressAt && !issue.notes?.pageInfo?.hasNextPage) {
            if (this.logger) {
              this.logger.debug('No InProgress status found, falling back to createdAt', {
                issueIid: issue.iid,
                notesChecked: initialNotes.length,
                fallback: 'createdAt'
              });
            }
            inProgressAt = issue.createdAt;
          }

          // InProgress found in first batch, no more notes to fetch, or story is OPEN (doesn't need InProgress)
          if (!isClosed && !inProgressAt) {
            // Open story without InProgress - this is normal, no warning needed
            return {
              ...issue,
              inProgressAt: null, // Explicitly null for open stories
              inProgressAtSource: null,
            };
          }

          return {
            ...issue,
            inProgressAt,
            inProgressAtSource: inProgressAt === issue.createdAt ? 'created' : (inProgressAt ? 'status_change' : null),
          };
        })
      );

      if (issuesRequiringAdditionalFetch > 0) {
        if (this.logger) {
          this.logger.debug('Fetched additional notes for closed issues', {
            closedIssuesCount: issuesRequiringAdditionalFetch
          });
        }
      }

      // Fetch iteration metadata to get startDate and dueDate for MR fetching
      if (this.logger) {
        this.logger.debug('Fetching iteration metadata for MR date range');
      }
      const iterations = await this.fetchIterations();
      const iterationMetadata = iterations.find(it => it.id === iterationId);

      if (!iterationMetadata) {
        if (this.logger) {
          this.logger.warn('Iteration not found in iteration list, skipping MR fetch', {
            iterationId
          });
        }
        return {
          issues: enrichedIssues,
          mergeRequests: [],
        };
      }

      // Fetch merge requests for the same date range as the iteration
      if (this.logger) {
        this.logger.debug('Fetching merge requests for iteration date range', {
          startDate: iterationMetadata.startDate,
          dueDate: iterationMetadata.dueDate
        });
      }
      const mergeRequests = await this.fetchMergeRequestsForGroup(
        iterationMetadata.startDate,
        iterationMetadata.dueDate
      );

      return {
        issues: enrichedIssues,
        mergeRequests,
      };
    } catch (error) {
      // Check if it's a GraphQL error
      if (error.response?.errors) {
        throw new Error(`Failed to fetch iteration details: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch iteration details: ${error.message}`);
    }
  }

  /**
   * Fetches merged merge requests for a group within a date range.
   * Used for deployment tracking (proxy) and lead time calculations.
   *
   * @param {string} startDate - Start date (ISO format or parseable string)
   * @param {string} endDate - End date (ISO format or parseable string)
   * @returns {Promise<Array>} Array of merged merge request objects
   * @throws {Error} If the group is not found or request fails
   */
  async fetchMergeRequestsForGroup(startDate, endDate) {
    return this.mergeRequestClient.fetchMergeRequestsForGroup(startDate, endDate);
  }

  /**
   * Fetches pipelines for a specific project with date filtering.
   * Used for deployment frequency metric calculation.
   *
   * @param {string} projectPath - Project path (e.g., 'group/project')
   * @param {string} [ref='master'] - Git ref/branch to filter by
   * @param {string} [startDate] - Start date for filtering (ISO format)
   * @param {string} [endDate] - End date for filtering (ISO format)
   * @returns {Promise<Array>} Array of pipeline objects
   */
  async fetchPipelinesForProject(projectPath, ref = 'master', startDate, endDate) {
    return this.pipelineClient.fetchPipelinesForProject(projectPath, ref, startDate, endDate);
  }

  /**
   * Fetches all projects in a group.
   *
   * @returns {Promise<Array>} Array of project objects
   */
  async fetchGroupProjects() {
    return this.deploymentClient.fetchGroupProjects();
  }

  /**
   * Fetches incidents (issues with type=INCIDENT) within a date range.
   * Returns enriched incident data with timeline metadata.
   *
   * @param {string} startDate - Start date (ISO format or parseable string)
   * @param {string} endDate - End date (ISO format or parseable string)
   * @returns {Promise<Array>} Array of enriched incident objects
   * @throws {Error} If the group is not found or request fails
   */
  async fetchIncidents(startDate, endDate) {
    return this.incidentClient.fetchIncidents(startDate, endDate);
  }

  /**
   * Extracts the first "In Progress" timestamp from issue notes.
   * Parses system notes with work_item_status action.
   *
   * @param {Array<Object>} notes - Array of note objects from GitLab
   * @returns {string|null} ISO timestamp when issue first moved to "In Progress", or null
   */
  extractInProgressTimestamp(notes) {
    return this.issueClient.extractInProgressTimestamp(notes);
  }

  /**
   * Parses status change events from issue notes.
   * Filters for system notes with work_item_status action.
   *
   * @param {Array<Object>} notes - Array of note objects from GitLab
   * @returns {Array<{status: string, timestamp: string}>} Status transitions in chronological order
   */
  parseStatusChanges(notes) {
    return this.issueClient.parseStatusChanges(notes);
  }

  /**
   * Checks if a status string indicates "In Progress" state.
   * Supports variations like "In progress", "in progress", "In-Progress", "WIP", etc.
   *
   * @param {string} status - Status string from note
   * @returns {boolean} True if status indicates in-progress state
   */
  isInProgressStatus(status) {
    return this.issueClient.isInProgressStatus(status);
  }

  /**
   * Extracts project path from incident webUrl.
   * Example: https://gitlab.com/group/project/-/issues/123 → group/project
   *
   * @param {string} webUrl - Incident web URL
   * @returns {string|null} Project path or null if extraction fails
   */
  extractProjectPath(webUrl) {
    return this.incidentClient.extractProjectPath(webUrl);
  }

  /**
   * Fetches timeline events for a specific incident.
   * Timeline events contain actual incident timing with tags like "Start time", "End time".
   *
   * @param {Object} incident - Incident object with id and webUrl
   * @param {string} incident.id - GitLab incident ID (e.g., 'gid://gitlab/Issue/123')
   * @param {string} incident.webUrl - Incident web URL (used to extract project path)
   * @returns {Promise<Array>} Array of timeline event objects
   */
  async fetchIncidentTimelineEvents(incident) {
    return this.incidentClient.fetchIncidentTimelineEvents(incident);
  }

  /**
   * Fetch merge request details to get mergedAt date
   * Used for CFR calculation to determine which iteration a change belongs to
   *
   * @param {string} projectPath - GitLab project path (e.g., 'group/project')
   * @param {string} mrId - Merge request IID
   * @returns {Promise<Object>} MR details including mergedAt date
   * @throws {Error} If the request fails
   */
  async fetchMergeRequestDetails(projectPath, mrId) {
    return this.mergeRequestClient.fetchMergeRequestDetails(projectPath, mrId);
  }

  /**
   * Fetch commit details to get committedDate
   * Used for CFR calculation to determine which iteration a change belongs to
   *
   * @param {string} projectPath - GitLab project path (e.g., 'group/project')
   * @param {string} sha - Commit SHA
   * @returns {Promise<Object>} Commit details including committedDate
   * @throws {Error} If the request fails
   */
  async fetchCommitDetails(projectPath, sha) {
    return this.mergeRequestClient.fetchCommitDetails(projectPath, sha);
  }

}
