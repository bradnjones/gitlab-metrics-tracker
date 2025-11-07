/**
 * Deployment Frequency calculation service
 * Calculates deployments per day
 *
 * @module core/services/DeploymentFrequencyCalculator
 */

/**
 * DeploymentFrequencyCalculator - Domain service for deployment frequency calculations
 */
export class DeploymentFrequencyCalculator {
  /**
   * Calculate deployment frequency (deployments per day)
   *
   * @param {Array<Object>} pipelines - Pipeline data from GitLab
   * @param {string} pipelines[].status - Pipeline status (success, failed, etc.)
   * @param {string} pipelines[].ref - Branch reference (main, etc.)
   * @param {number} sprintDays - Number of days in the sprint
   * @returns {number} Deployments per day (0 if sprintDays is 0)
   */
  static calculate(pipelines, sprintDays) {
    if (sprintDays === 0) {
      return 0;
    }

    const successfulDeployments = pipelines.filter(
      (pipeline) => pipeline.status === 'success' && pipeline.ref === 'main'
    );

    return successfulDeployments.length / sprintDays;
  }
}
