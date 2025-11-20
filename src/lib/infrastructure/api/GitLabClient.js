import { GraphQLClient } from 'graphql-request';
import { IncidentAnalyzer } from '../../core/services/IncidentAnalyzer.js';
import { ChangeLinkExtractor } from '../../core/services/ChangeLinkExtractor.js';

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
   * @throws {Error} If token or projectPath is missing
   */
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
            console.log(`Trying parent group: ${groupPath}`);
            continue; // Retry with parent group
          }
          throw new Error(`Group not found: ${groupPath}. Please check your GITLAB_PROJECT_PATH in .env`);
        }

        // Check if iterations are available
        if (!data.group.iterations || !data.group.iterations.nodes) {
          console.warn('This group does not have iterations configured in GitLab.');
          console.warn('You may need to enable iterations: Group Settings > Iterations');
          return [];
        }

        const { nodes, pageInfo } = data.group.iterations;
        allIterations = allIterations.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        // Small delay to avoid rate limiting
        if (hasNextPage) {
          await this.delay(100);
        }
      }

      console.log(`Found ${allIterations.length} iterations from group: ${groupPath}`);

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
        console.log(`      → Fetched page ${pagesFetched}: ${nodes.length} notes (hasNextPage: ${hasNextPage})`);

        // Small delay to avoid rate limiting
        if (hasNextPage) {
          await this.delay(100);
        }
      }

      console.log(`      → Total: ${pagesFetched} pages, ${allNotes.length} notes (all notes exhausted)`);
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
          await this.delay(100);
        }
      }

      console.log(`✓ Fetched ${allIssues.length} issues for iteration ${iterationId}`);

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
            console.log(`  ⚠ CLOSED Issue #${issue.iid} missing InProgress in first 20 notes, fetching all notes...`);

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
                console.log(`    ✅ FOUND InProgress date after fetching ALL notes: ${inProgressAt}`);
              } else {
                console.log(`    ❌ EXHAUSTED all ${allNotes.length} notes - NO InProgress status change found`);
                console.log(`    → Falling back to createdAt: ${issue.createdAt}`);
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
              console.warn(`    ✗ Failed to fetch additional notes for issue #${issue.iid}: ${error.message}`);
              // Fall back to using createdAt for closed stories
              if (isClosed && !inProgressAt) {
                console.log(`    → Error recovery: Falling back to createdAt: ${issue.createdAt}`);
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
            console.log(`  → Issue #${issue.iid}: No InProgress in ${initialNotes.length} notes, falling back to createdAt`);
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
        console.log(`✓ Fetched additional notes for ${issuesRequiringAdditionalFetch} closed issues`);
      }

      // Fetch iteration metadata to get startDate and dueDate for MR fetching
      console.log(`Fetching iteration metadata for MR date range...`);
      const iterations = await this.fetchIterations();
      const iterationMetadata = iterations.find(it => it.id === iterationId);

      if (!iterationMetadata) {
        console.warn(`Iteration ${iterationId} not found in iteration list, skipping MR fetch`);
        return {
          issues: enrichedIssues,
          mergeRequests: [],
        };
      }

      // Fetch merge requests for the same date range as the iteration
      console.log(`Fetching merge requests for iteration date range (${iterationMetadata.startDate} to ${iterationMetadata.dueDate})...`);
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
              webUrl
              author {
                username
                name
              }
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

      console.log(`✓ Found ${allMRs.length} merged MRs in date range`);
      return allMRs;
    } catch (error) {
      // Check if it's a GraphQL error
      if (error.response?.errors) {
        throw new Error(`Failed to fetch merge requests: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch merge requests: ${error.message}`);
    }
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
          updatedAfter,
        });

        if (!data.project || !data.project.pipelines) {
          break;
        }

        const { nodes, pageInfo } = data.project.pipelines;
        allPipelines = allPipelines.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        // Only fetch first page if we have many results (performance optimization)
        if (nodes.length === 100 && hasNextPage) {
          console.log(`  └─ Found 100+ pipelines, fetching more...`);
        }

        if (hasNextPage) {
          await this.delay(50); // Reduced delay
        }
      }

      // Additional client-side filtering by end date
      if (endDate) {
        const end = new Date(endDate);
        allPipelines = allPipelines.filter((pipeline) => {
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

  /**
   * Fetches all projects in a group.
   *
   * @returns {Promise<Array>} Array of project objects
   */
  async fetchGroupProjects() {
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
          after,
        });

        if (!data.group) {
          console.warn(`Group not found: ${this.projectPath}`);
          return [];
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

      return allProjects;
    } catch (error) {
      console.warn('Failed to fetch group projects:', error.message);
      return [];
    }
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

      console.log(`Querying incidents from group (${fetchStart.toISOString().split('T')[0]} to ${endDate})...`);
      console.log(`  Iteration range: ${startDate} to ${endDate}`);
      console.log(`  Fetch range: ${fetchStart.toISOString().split('T')[0]} to ${endDate} (60-day lookback)`);

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
          await this.delay(100);
        }
      }

      console.log(`✓ Fetched ${allIncidents.length} incidents from broader date range`);

      // TIMELINE-BASED FILTERING: Fetch timeline events for each incident to get actual start times
      // This provides more accurate filtering for CFR and MTTR calculations
      console.log('Fetching timeline events for incidents...');
      const incidentsWithTimelines = await Promise.all(
        allIncidents.map(async (incident) => {
          const timelineEvents = await this.fetchIncidentTimelineEvents(incident);
          return { incident, timelineEvents };
        })
      );

      console.log(`✓ Fetched timeline events for ${incidentsWithTimelines.length} incidents`);

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

      console.log(`✓ Filtered to ${relevantIncidents.length} incidents with activity during iteration`);

      // Return raw data WITH timeline metadata for Data Explorer visibility
      // This enrichment helps users understand which fields are being used in calculations
      const relevantIncidentsData = relevantIncidents.map(({ incident, timelineEvents }) => {
        // DEBUG: Log timeline events for each incident
        console.log(`[DEBUG] Incident #${incident.iid} (${incident.title}):`);
        console.log(`  Timeline events count: ${timelineEvents?.length || 0}`);
        if (timelineEvents && timelineEvents.length > 0) {
          timelineEvents.forEach((event, idx) => {
            const tags = event.timelineEventTags?.nodes?.map(t => t.name).join(', ') || 'no tags';
            console.log(`  Event ${idx + 1}: ${event.occurredAt} - Tags: [${tags}]`);
          });
        }

        // Determine which timeline events are being used
        const startEvent = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'start time');
        const endEvent = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'end time');
        const stopEvent = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'stop time'); // GitLab also uses "stop time"
        const mitigatedEvent = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'impact mitigated');

        console.log(`  Found start event: ${startEvent ? 'YES' : 'NO'}`);
        console.log(`  Found end event: ${endEvent ? 'YES' : 'NO'}`);
        console.log(`  Found stop event: ${stopEvent ? 'YES' : 'NO'}`);
        console.log(`  Found mitigated event: ${mitigatedEvent ? 'YES' : 'NO'}`);

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

        console.log(`  → startTimeSource: ${startTimeSource}`);
        console.log(`  → endTimeSource: ${endTimeSource}`);
        console.log(`  → actualStartTime: ${actualStartTime}`);
        console.log(`  → actualEndTime: ${actualEndTime}`);

        // Extract change link (MR or commit) from timeline events for CFR calculation
        const changeLink = ChangeLinkExtractor.extractFromTimelineEvents(timelineEvents);
        if (changeLink) {
          console.log(`  → changeLink: ${changeLink.type} - ${changeLink.url}`);
        }
        console.log('---');

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
      console.log('Fetching change dates for incidents with change links...');
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
              console.log(`  Incident #${incidentData.iid}: MR #${incidentData.changeLink.id} merged at ${changeDate}`);
            } else if (incidentData.changeLink.type === 'commit') {
              // Fetch commit details to get commit date
              const commitDetails = await this.fetchCommitDetails(
                incidentData.changeLink.project,
                incidentData.changeLink.sha
              );
              changeDate = commitDetails?.committedDate || null;
              console.log(`  Incident #${incidentData.iid}: Commit ${incidentData.changeLink.sha.substring(0, 8)} committed at ${changeDate}`);
            }

            return {
              ...incidentData,
              changeDate,
            };
          } catch (error) {
            console.warn(`  Warning: Could not fetch change date for incident #${incidentData.iid}: ${error.message}`);
            return incidentData;
          }
        })
      );

      console.log(`✓ Fetched change dates for incidents with change links`);

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
      console.error(`Error extracting project path from URL: ${webUrl}`);
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
      console.error(`  ⚠️  Could not extract project path from: ${incident.webUrl}`);
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
      console.error(`  ⚠️  Error fetching timeline events: ${error.message}`);
      if (error.response?.errors) {
        error.response.errors.forEach(err => {
          console.error(`     → ${err.message}`);
        });
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
    const query = `
      query getMergeRequest($fullPath: ID!, $iid: String!) {
        project(fullPath: $fullPath) {
          mergeRequest(iid: $iid) {
            id
            iid
            title
            state
            mergedAt
            createdAt
            targetBranch
            sourceBranch
            webUrl
          }
        }
      }
    `;

    try {
      const data = await this.client.request(query, {
        fullPath: projectPath,
        iid: mrId
      });

      if (!data.project || !data.project.mergeRequest) {
        throw new Error(`Merge request !${mrId} not found in project ${projectPath}`);
      }

      return data.project.mergeRequest;
    } catch (error) {
      if (error.response?.errors) {
        throw new Error(`Failed to fetch MR details: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch MR details: ${error.message}`);
    }
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
    const query = `
      query getCommit($fullPath: ID!, $sha: String!) {
        project(fullPath: $fullPath) {
          repository {
            commit(ref: $sha) {
              id
              sha
              title
              message
              committedDate
              createdAt
              webUrl
            }
          }
        }
      }
    `;

    try {
      const data = await this.client.request(query, {
        fullPath: projectPath,
        sha
      });

      if (!data.project || !data.project.repository || !data.project.repository.commit) {
        throw new Error(`Commit ${sha} not found in project ${projectPath}`);
      }

      return data.project.repository.commit;
    } catch (error) {
      if (error.response?.errors) {
        throw new Error(`Failed to fetch commit details: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch commit details: ${error.message}`);
    }
  }

  /**
   * Helper method to delay execution (for rate limiting).
   *
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
