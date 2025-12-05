import { GraphQLClient } from 'graphql-request';
import { IncidentAnalyzer } from '../../core/services/IncidentAnalyzer.js';
import { ChangeLinkExtractor } from '../../core/services/ChangeLinkExtractor.js';
import { RateLimitManager } from './core/RateLimitManager.js';
import { GraphQLExecutor } from './core/GraphQLExecutor.js';
import { DeploymentClient } from './clients/DeploymentClient.js';
import { PipelineClient } from './clients/PipelineClient.js';
import { MergeRequestClient } from './clients/MergeRequestClient.js';

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
          after,
        });

        // Check if group exists
        if (!data.group) {
          // Try removing last segment (might be a project path)
          const segments = this.projectPath.split('/');
          if (segments.length > 1) {
            groupPath = segments.slice(0, -1).join('/');
            if (this.logger) {
              this.logger.debug('Trying parent group', { groupPath });
            }
            continue; // Retry with parent group
          }
          throw new Error(`Group not found: ${groupPath}. Please check your GITLAB_PROJECT_PATH in .env`);
        }

        // Check if iterations are available
        if (!data.group.iterations || !data.group.iterations.nodes) {
          if (this.logger) {
            this.logger.warn('Group does not have iterations configured', {
              groupPath,
              suggestion: 'Enable iterations in Group Settings > Iterations'
            });
          }
          return [];
        }

        const { nodes, pageInfo } = data.group.iterations;
        allIterations = allIterations.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        // Small delay to avoid rate limiting
        if (hasNextPage) {
          await this.rateLimitManager.delay(100);
        }
      }

      if (this.logger) {
        this.logger.debug('Found iterations', {
          count: allIterations.length,
          groupPath
        });
      }

      return allIterations;
    } catch (error) {
      // Check if it's a GraphQL error
      if (error.response?.errors) {
        const errorMessages = error.response.errors.map(e => e.message).join(', ');
        throw new Error(`GitLab API Error: ${errorMessages}`);
      }
      throw error;
    }
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
    const query = `
      query getIssueNotes($issueId: IssueID!, $after: String) {
        issue(id: $issueId) {
          id
          notes(first: 100, after: $after) {
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
    `;

    let allNotes = [];
    let hasNextPage = true;
    let after = startCursor;
    let pagesFetched = 0;

    try {
      while (hasNextPage) {
        const data = await this.client.request(query, {
          issueId,
          after,
        });

        if (!data.issue) {
          throw new Error(`Issue not found: ${issueId}`);
        }

        const { nodes, pageInfo } = data.issue.notes;
        allNotes = allNotes.concat(nodes);
        pagesFetched++;
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        // Log pagination progress
        if (this.logger) {
          this.logger.debug('Fetched notes page', {
            page: pagesFetched,
            notesCount: nodes.length,
            hasNextPage
          });
        }

        // Small delay to avoid rate limiting
        if (hasNextPage) {
          await this.rateLimitManager.delay(100);
        }
      }

      if (this.logger) {
        this.logger.debug('Completed fetching all notes', {
          totalPages: pagesFetched,
          totalNotes: allNotes.length,
          status: 'all notes exhausted'
        });
      }
      return allNotes;
    } catch (error) {
      // Check if it's a GraphQL error
      if (error.response?.errors) {
        throw new Error(`Failed to fetch additional notes: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch additional notes: ${error.message}`);
    }
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
   * Returns raw incident data. Use IncidentAnalyzer for downtime calculations.
   *
   * @param {string} startDate - Start date (ISO format or parseable string)
   * @param {string} endDate - End date (ISO format or parseable string)
   * @returns {Promise<Array>} Array of raw incident objects
   * @throws {Error} If the group is not found or request fails
   */
  async fetchIncidents(startDate, endDate) {
    const query = `
      query getIncidents($fullPath: ID!, $after: String, $createdAfter: Time, $createdBefore: Time) {
        group(fullPath: $fullPath) {
          id
          issues(
            types: [INCIDENT]
            includeSubgroups: true
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

    try {
      // BUG FIX: Fetch broader date range (60 days before iteration start)
      // to catch incidents created before iteration but active during it
      const iterationStart = new Date(startDate);
      const iterationEnd = new Date(endDate);
      const fetchStart = new Date(iterationStart);
      fetchStart.setDate(fetchStart.getDate() - 60); // 60 days before iteration

      const createdAfter = fetchStart.toISOString();
      const createdBefore = iterationEnd.toISOString();

      if (this.logger) {
        this.logger.debug('Querying incidents from group', {
          fetchStartDate: fetchStart.toISOString().split('T')[0],
          fetchEndDate: endDate,
          iterationStartDate: startDate,
          iterationEndDate: endDate,
          lookbackDays: 60
        });
      }

      while (hasNextPage) {
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
          await this.rateLimitManager.delay(100);
        }
      }

      if (this.logger) {
        this.logger.debug('Fetched incidents from broader date range', {
          count: allIncidents.length
        });
      }

      // TIMELINE-BASED FILTERING: Fetch timeline events for each incident to get actual start times
      // This provides more accurate filtering for CFR and MTTR calculations
      if (this.logger) {
        this.logger.debug('Fetching timeline events for incidents');
      }
      const incidentsWithTimelines = await Promise.all(
        allIncidents.map(async (incident) => {
          const timelineEvents = await this.fetchIncidentTimelineEvents(incident);
          return { incident, timelineEvents };
        })
      );

      if (this.logger) {
        this.logger.debug('Fetched timeline events for incidents', {
          count: incidentsWithTimelines.length
        });
      }

      // Filter to only include incidents with activity during iteration
      // Uses actual incident start time (from timeline events) when available
      const relevantIncidents = incidentsWithTimelines.filter(({ incident, timelineEvents }) => {
        // Get actual start time using IncidentAnalyzer (cascading fallback: timeline → createdAt)
        const actualStartTime = IncidentAnalyzer.getActualStartTime(incident, timelineEvents);
        const startTimeDate = new Date(actualStartTime);

        // Check if we have a timeline start time event (more authoritative than createdAt)
        const hasTimelineStartTime = timelineEvents && timelineEvents.length > 0 &&
          IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'start time') !== null;

        // Check various activity dates
        const startedDuringIteration = startTimeDate >= iterationStart && startTimeDate <= iterationEnd;

        // If we have a timeline start time event, ONLY use that for filtering
        // This is the most authoritative source and should take precedence
        if (hasTimelineStartTime) {
          return startedDuringIteration;
        }

        // Fallback: If no timeline events, use any activity (closed/updated) for backward compatibility
        const updated = incident.updatedAt ? new Date(incident.updatedAt) : null;
        const closed = incident.closedAt ? new Date(incident.closedAt) : null;

        const closedDuringIteration = closed && closed >= iterationStart && closed <= iterationEnd;
        const updatedDuringIteration = updated && updated >= iterationStart && updated <= iterationEnd;

        // Include incident if it has ANY activity during iteration (backward compatibility)
        return startedDuringIteration || closedDuringIteration || updatedDuringIteration;
      });

      if (this.logger) {
        this.logger.debug('Filtered to incidents with activity during iteration', {
          count: relevantIncidents.length
        });
      }

      // Return raw data WITH timeline metadata for Data Explorer visibility
      // This enrichment helps users understand which fields are being used in calculations
      const relevantIncidentsData = relevantIncidents.map(({ incident, timelineEvents }) => {
        // DEBUG: Log timeline events for each incident
        if (this.logger) {
          this.logger.debug('Processing incident timeline events', {
            incidentIid: incident.iid,
            incidentTitle: incident.title,
            timelineEventsCount: timelineEvents?.length || 0
          });

          if (timelineEvents && timelineEvents.length > 0) {
            timelineEvents.forEach((event, idx) => {
              const tags = event.timelineEventTags?.nodes?.map(t => t.name).join(', ') || 'no tags';
              this.logger.debug('Timeline event', {
                incidentIid: incident.iid,
                eventIndex: idx + 1,
                occurredAt: event.occurredAt,
                tags
              });
            });
          }
        }

        // Determine which timeline events are being used
        const startEvent = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'start time');
        const endEvent = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'end time');
        const stopEvent = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'stop time'); // GitLab also uses "stop time"
        const mitigatedEvent = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'impact mitigated');

        if (this.logger) {
          this.logger.debug('Timeline event analysis', {
            incidentIid: incident.iid,
            foundStartEvent: !!startEvent,
            foundEndEvent: !!endEvent,
            foundStopEvent: !!stopEvent,
            foundMitigatedEvent: !!mitigatedEvent
          });
        }

        // Get actual times used in calculations
        const actualStartTime = IncidentAnalyzer.getActualStartTime(incident, timelineEvents);

        // Determine end time using same cascading logic as calculateDowntime
        const actualEndTime = endEvent?.occurredAt || stopEvent?.occurredAt || mitigatedEvent?.occurredAt || incident.closedAt;

        // Determine sources for Data Explorer display
        const startTimeSource = startEvent ? 'timeline' : 'created';
        let endTimeSource = null;
        if (endEvent) {
          endTimeSource = 'timeline_end';
        } else if (stopEvent) {
          endTimeSource = 'timeline_stop';
        } else if (mitigatedEvent) {
          endTimeSource = 'timeline_mitigated';
        } else if (incident.closedAt) {
          endTimeSource = 'closed';
        }

        if (this.logger) {
          this.logger.debug('Incident time sources', {
            incidentIid: incident.iid,
            startTimeSource,
            endTimeSource,
            actualStartTime,
            actualEndTime
          });
        }

        // Extract change link (MR or commit) from timeline events for CFR calculation
        const changeLink = ChangeLinkExtractor.extractFromTimelineEvents(timelineEvents);
        if (changeLink && this.logger) {
          this.logger.debug('Found change link for incident', {
            incidentIid: incident.iid,
            changeLinkType: changeLink.type,
            changeLinkUrl: changeLink.url
          });
        }

        return {
          id: incident.id,
          iid: incident.iid,
          title: incident.title,
          state: incident.state,
          createdAt: incident.createdAt,
          closedAt: incident.closedAt,
          updatedAt: incident.updatedAt,
          labels: incident.labels,
          webUrl: incident.webUrl,
          // Timeline metadata for Data Explorer
          actualStartTime,
          actualEndTime,
          startTimeSource, // 'timeline' or 'created'
          endTimeSource, // 'timeline_end', 'timeline_mitigated', 'closed', or null
          hasTimelineEvents: timelineEvents && timelineEvents.length > 0,
          // Timeline events (full data for CFR calculation)
          timelineEvents: timelineEvents || [],
          // Extracted change link (MR or commit) for CFR correlation
          changeLink, // { type, url, project, id/sha } or null
          // Change date placeholder (will be populated after mapping)
          changeDate: null,
        };
      });

      // Fetch change dates for incidents with change links
      // This is done AFTER mapping to batch the API calls
      if (this.logger) {
        this.logger.debug('Fetching change dates for incidents with change links');
      }
      const incidentsWithChangeDates = await Promise.all(
        relevantIncidentsData.map(async (incidentData) => {
          if (!incidentData.changeLink) {
            return incidentData;
          }

          try {
            let changeDate = null;

            if (incidentData.changeLink.type === 'merge_request') {
              // Fetch MR details to get merge date
              const mrDetails = await this.fetchMergeRequestDetails(
                incidentData.changeLink.project,
                incidentData.changeLink.id
              );
              changeDate = mrDetails?.mergedAt || null;
              if (this.logger) {
                this.logger.debug('Fetched MR merge date for incident', {
                  incidentIid: incidentData.iid,
                  mrId: incidentData.changeLink.id,
                  mergedAt: changeDate
                });
              }
            } else if (incidentData.changeLink.type === 'commit') {
              // Fetch commit details to get commit date
              const commitDetails = await this.fetchCommitDetails(
                incidentData.changeLink.project,
                incidentData.changeLink.sha
              );
              changeDate = commitDetails?.committedDate || null;
              if (this.logger) {
                this.logger.debug('Fetched commit date for incident', {
                  incidentIid: incidentData.iid,
                  commitSha: incidentData.changeLink.sha.substring(0, 8),
                  committedAt: changeDate
                });
              }
            }

            return {
              ...incidentData,
              changeDate,
            };
          } catch (error) {
            if (this.logger) {
              this.logger.warn('Could not fetch change date for incident', {
                incidentIid: incidentData.iid,
                error: error.message
              });
            }
            return incidentData;
          }
        })
      );

      if (this.logger) {
        this.logger.debug('Fetched change dates for incidents with change links');
      }

      return incidentsWithChangeDates;
    } catch (error) {
      // Check if it's a GraphQL error
      if (error.response?.errors) {
        throw new Error(`Failed to fetch incidents: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch incidents: ${error.message}`);
    }
  }

  /**
   * Extracts the first "In Progress" timestamp from issue notes.
   * Parses system notes with work_item_status action.
   *
   * @param {Array<Object>} notes - Array of note objects from GitLab
   * @returns {string|null} ISO timestamp when issue first moved to "In Progress", or null
   */
  extractInProgressTimestamp(notes) {
    const statusChanges = this.parseStatusChanges(notes);
    const inProgressChange = statusChanges.find((change) =>
      this.isInProgressStatus(change.status)
    );
    return inProgressChange?.timestamp || null;
  }

  /**
   * Parses status change events from issue notes.
   * Filters for system notes with work_item_status action.
   *
   * @param {Array<Object>} notes - Array of note objects from GitLab
   * @returns {Array<{status: string, timestamp: string}>} Status transitions in chronological order
   */
  parseStatusChanges(notes) {
    return notes
      .filter(
        (note) =>
          note.system && note.systemNoteMetadata?.action === 'work_item_status'
      )
      .map((note) => {
        // Extract status from body text: "set status to **In progress**"
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

  /**
   * Checks if a status string indicates "In Progress" state.
   * Supports variations like "In progress", "in progress", "In-Progress", "WIP", etc.
   *
   * @param {string} status - Status string from note
   * @returns {boolean} True if status indicates in-progress state
   */
  isInProgressStatus(status) {
    const patterns = [
      /in progress/i,
      /in-progress/i,
      /wip/i,
      /working/i,
    ];
    return patterns.some((pattern) => pattern.test(status));
  }

  /**
   * Extracts project path from incident webUrl.
   * Example: https://gitlab.com/group/project/-/issues/123 → group/project
   *
   * @param {string} webUrl - Incident web URL
   * @returns {string|null} Project path or null if extraction fails
   */
  extractProjectPath(webUrl) {
    try {
      const url = new URL(webUrl);
      const pathParts = url.pathname.split('/-/')[0]; // Get everything before /-/
      const projectPath = pathParts.substring(1); // Remove leading /

      // Validate that we got a meaningful path
      if (!projectPath || projectPath.length === 0) {
        return null;
      }

      return projectPath;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Error extracting project path from URL', {
          webUrl,
          error: error.message
        });
      }
      return null;
    }
  }

  /**
   * Fetches timeline events for a specific incident.
   * Timeline events contain actual incident timing with tags like "Start time", "End time".
   *
   * @param {Object} incident - Incident object with id and webUrl
   * @param {string} incident.id - GitLab incident ID (e.g., 'gid://gitlab/Issue/123')
   * @param {string} incident.webUrl - Incident web URL (used to extract project path)
   * @returns {Promise<Array>} Array of timeline event objects
   * @throws {Error} If the request fails
   */
  async fetchIncidentTimelineEvents(incident) {
    // Extract project path from incident's webUrl
    const projectPath = this.extractProjectPath(incident.webUrl);

    if (!projectPath) {
      if (this.logger) {
        this.logger.error('Could not extract project path from incident webUrl', {
          incidentWebUrl: incident.webUrl
        });
      }
      return [];
    }

    const query = `
      query getIncidentTimelineEvents($fullPath: ID!, $incidentId: IssueID!) {
        project(fullPath: $fullPath) {
          incidentManagementTimelineEvents(incidentId: $incidentId) {
            nodes {
              id
              occurredAt
              createdAt
              note
              noteHtml
              editable
              action
              timelineEventTags {
                nodes {
                  name
                }
              }
              author {
                username
                name
              }
            }
          }
        }
      }
    `;

    try {
      const data = await this.client.request(query, {
        fullPath: projectPath,
        incidentId: incident.id,
      });

      if (!data.project || !data.project.incidentManagementTimelineEvents) {
        return [];
      }

      return data.project.incidentManagementTimelineEvents.nodes;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Error fetching timeline events', {
          incidentId: incident.id,
          error: error.message
        });
        if (error.response?.errors) {
          error.response.errors.forEach(err => {
            this.logger.error('GraphQL error detail', {
              message: err.message
            });
          });
        }
      }
      // Return empty array instead of throwing - timeline events might not be available
      return [];
    }
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
