/**
 * Client for fetching GitLab incident data.
 * Handles incident queries, timeline events, and change link resolution.
 *
 * @module IncidentClient
 */

import { IncidentAnalyzer } from '../../../core/services/IncidentAnalyzer.js';
import { ChangeLinkExtractor } from '../../../core/services/ChangeLinkExtractor.js';

/**
 * Client responsible for fetching incident-related data from GitLab.
 * Includes timeline event fetching and incident filtering logic.
 */
export class IncidentClient {
  /**
   * Creates a new IncidentClient instance.
   *
   * @param {import('../core/GraphQLExecutor.js').GraphQLExecutor} executor - GraphQL executor
   * @param {import('../core/RateLimitManager.js').RateLimitManager} rateLimitManager - Rate limit manager
   * @param {string} projectPath - GitLab project path (e.g., 'group/project')
   * @param {import('./MergeRequestClient.js').MergeRequestClient} mergeRequestClient - MR client for change dates
   * @param {import('../../../../core/interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional)
   */
  constructor(executor, rateLimitManager, projectPath, mergeRequestClient, logger = null) {
    this.executor = executor;
    this.rateLimitManager = rateLimitManager;
    this.projectPath = projectPath;
    this.mergeRequestClient = mergeRequestClient;
    this.logger = logger;
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
      const data = await this.executor.execute(
        query,
        { fullPath: projectPath, incidentId: incident.id },
        'fetching incident timeline'
      );

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
   * Fetches incidents (issues with type=INCIDENT) within a date range.
   * Returns enriched incident data with timeline metadata for calculations.
   *
   * @param {string} startDate - Start date (ISO format or parseable string)
   * @param {string} endDate - End date (ISO format or parseable string)
   * @returns {Promise<Array>} Array of enriched incident objects
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
        const data = await this.executor.execute(
          query,
          { fullPath: this.projectPath, after, createdAfter, createdBefore },
          'fetching incidents'
        );

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
      const relevantIncidents = this._filterIncidentsByDateRange(
        incidentsWithTimelines,
        iterationStart,
        iterationEnd
      );

      if (this.logger) {
        this.logger.debug('Filtered to incidents with activity during iteration', {
          count: relevantIncidents.length
        });
      }

      // Return raw data WITH timeline metadata for Data Explorer visibility
      const relevantIncidentsData = relevantIncidents.map(({ incident, timelineEvents }) => {
        return this._enrichIncidentWithTimeline(incident, timelineEvents);
      });

      // Fetch change dates for incidents with change links
      const incidentsWithChangeDates = await this._fetchChangeDates(relevantIncidentsData);

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
   * Filters incidents to only include those with activity during the iteration.
   *
   * @param {Array} incidentsWithTimelines - Array of {incident, timelineEvents}
   * @param {Date} iterationStart - Iteration start date
   * @param {Date} iterationEnd - Iteration end date
   * @returns {Array} Filtered incidents
   * @private
   */
  _filterIncidentsByDateRange(incidentsWithTimelines, iterationStart, iterationEnd) {
    return incidentsWithTimelines.filter(({ incident, timelineEvents }) => {
      // Get actual start time using IncidentAnalyzer (cascading fallback: timeline → createdAt)
      const actualStartTime = IncidentAnalyzer.getActualStartTime(incident, timelineEvents);
      const startTimeDate = new Date(actualStartTime);

      // Check if we have a timeline start time event (more authoritative than createdAt)
      const hasTimelineStartTime = timelineEvents && timelineEvents.length > 0 &&
        IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'start time') !== null;

      // Check various activity dates
      const startedDuringIteration = startTimeDate >= iterationStart && startTimeDate <= iterationEnd;

      // If we have a timeline start time event, ONLY use that for filtering
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
  }

  /**
   * Enriches an incident with timeline metadata.
   *
   * @param {Object} incident - Raw incident object
   * @param {Array} timelineEvents - Timeline events for the incident
   * @returns {Object} Enriched incident object
   * @private
   */
  _enrichIncidentWithTimeline(incident, timelineEvents) {
    // Log timeline events for debugging
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
    const stopEvent = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'stop time');
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
      startTimeSource,
      endTimeSource,
      hasTimelineEvents: timelineEvents && timelineEvents.length > 0,
      // Timeline events (full data for CFR calculation)
      timelineEvents: timelineEvents || [],
      // Extracted change link (MR or commit) for CFR correlation
      changeLink,
      // Change date placeholder (will be populated after mapping)
      changeDate: null,
    };
  }

  /**
   * Fetches change dates for incidents with change links.
   *
   * @param {Array} incidents - Enriched incident objects
   * @returns {Promise<Array>} Incidents with change dates populated
   * @private
   */
  async _fetchChangeDates(incidents) {
    if (this.logger) {
      this.logger.debug('Fetching change dates for incidents with change links');
    }

    return Promise.all(
      incidents.map(async (incidentData) => {
        if (!incidentData.changeLink) {
          return incidentData;
        }

        try {
          let changeDate = null;

          if (incidentData.changeLink.type === 'merge_request') {
            // Fetch MR details to get merge date
            const mrDetails = await this.mergeRequestClient.fetchMergeRequestDetails(
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
            const commitDetails = await this.mergeRequestClient.fetchCommitDetails(
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
  }
}
