/**
 * Incident analysis service
 * Provides business logic for incident data
 *
 * @module core/services/IncidentAnalyzer
 */

/**
 * IncidentAnalyzer - Domain service for incident calculations
 */
export class IncidentAnalyzer {
  /**
   * Finds a timeline event by tag name (case insensitive, partial match).
   *
   * @param {Array<Object>} timelineEvents - Array of timeline event objects
   * @param {string} tagName - Tag name to search for (case insensitive, partial match)
   * @returns {Object|undefined} First matching timeline event or undefined
   */
  static findTimelineEventByTag(timelineEvents, tagName) {
    return timelineEvents.find(event =>
      event.timelineEventTags?.nodes?.some(tag =>
        tag.name.toLowerCase().includes(tagName.toLowerCase())
      )
    );
  }

  /**
   * Gets the actual start time of an incident using cascading fallback.
   * Priority: Timeline event "Start time" tag → incident.createdAt
   *
   * @param {Object} incident - Incident object
   * @param {string} incident.createdAt - When incident was created in GitLab
   * @param {Array<Object>} [timelineEvents=[]] - Timeline events for this incident
   * @returns {string} ISO timestamp of actual incident start
   */
  static getActualStartTime(incident, timelineEvents = []) {
    const startEvent = this.findTimelineEventByTag(timelineEvents, 'start time');
    return startEvent?.occurredAt || incident.createdAt;
  }

  /**
   * Calculate downtime for a single incident using timeline events with cascading fallback.
   *
   * @param {Object} incident - Raw incident data
   * @param {string} incident.createdAt - ISO timestamp when incident created in GitLab
   * @param {string|null} incident.closedAt - ISO timestamp when incident closed in GitLab (null if open)
   * @param {Array<Object>} [timelineEvents=[]] - Timeline events for this incident
   * @returns {number} Downtime in hours (0 if incident still open)
   */
  static calculateDowntime(incident, timelineEvents = []) {
    // Find timeline events by tag (cascading fallback)
    const startEvent = this.findTimelineEventByTag(timelineEvents, 'start time');
    const endEvent = this.findTimelineEventByTag(timelineEvents, 'end time');
    const mitigatedEvent = this.findTimelineEventByTag(timelineEvents, 'impact mitigated');

    // Start time: "Start time" tag → createdAt
    const startTime = startEvent?.occurredAt || incident.createdAt;

    // End time: "End time" tag → "Impact mitigated" tag → closedAt
    const endTime = endEvent?.occurredAt || mitigatedEvent?.occurredAt || incident.closedAt;

    if (!endTime || !startTime) {
      return 0;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const downtimeMs = end - start;

    return downtimeMs / (1000 * 60 * 60); // Convert ms to hours
  }

  /**
   * Enrich incidents with calculated downtime
   *
   * @param {Array<Object>} incidents - Raw incident data from GitLab
   * @returns {Array<Object>} Incidents with downtimeHours field added
   */
  static enrichWithDowntime(incidents) {
    return incidents.map((incident) => ({
      ...incident,
      downtimeHours: this.calculateDowntime(incident),
    }));
  }

  /**
   * Calculate Mean Time To Recovery (MTTR) from incidents
   *
   * @param {Array<Object>} incidents - Raw incident data
   * @returns {number} Average downtime in hours (0 if no closed incidents)
   */
  static calculateMTTR(incidents) {
    const closedIncidents = incidents.filter(
      (i) => i.closedAt && i.createdAt
    );

    if (closedIncidents.length === 0) {
      return 0;
    }

    const totalDowntime = closedIncidents.reduce(
      (sum, incident) => sum + this.calculateDowntime(incident),
      0
    );

    return totalDowntime / closedIncidents.length;
  }
}
