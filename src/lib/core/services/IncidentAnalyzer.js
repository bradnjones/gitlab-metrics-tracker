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
   * Calculate downtime for a single incident
   *
   * @param {Object} incident - Raw incident data
   * @param {string} incident.createdAt - ISO timestamp when incident created
   * @param {string|null} incident.closedAt - ISO timestamp when incident closed (null if open)
   * @returns {number} Downtime in hours (0 if incident still open)
   */
  static calculateDowntime(incident) {
    if (!incident.closedAt || !incident.createdAt) {
      return 0;
    }

    const created = new Date(incident.createdAt);
    const closed = new Date(incident.closedAt);
    const downtimeMs = closed - created;

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
