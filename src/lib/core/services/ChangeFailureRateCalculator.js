/**
 * Change Failure Rate calculation service
 * Calculates percentage of deployments that result in incidents
 *
 * @module core/services/ChangeFailureRateCalculator
 */

/**
 * ChangeFailureRateCalculator - Domain service for change failure rate calculations
 */
export class ChangeFailureRateCalculator {
  /**
   * Calculate change failure rate (percentage)
   * CFR = (incident count / deployment count) × 100
   *
   * @param {Array<Object>} incidents - Incident data from GitLab
   * @param {number} deployments - Number of deployments in the period
   * @returns {number} Change failure rate percentage (0-100)
   */
  static calculate(incidents, deployments) {
    // Guard against division by zero
    if (deployments === 0) {
      return 0;
    }

    // Calculate CFR: (incident count / deployment count) × 100
    const incidentCount = Array.isArray(incidents) ? incidents.length : 0;
    return (incidentCount / deployments) * 100;
  }
}
