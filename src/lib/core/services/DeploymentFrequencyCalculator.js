/**
 * Deployment Frequency calculation service
 * Calculates deployments per day using merged MRs as deployment proxy
 *
 * @module core/services/DeploymentFrequencyCalculator
 */

/**
 * DeploymentFrequencyCalculator - Domain service for deployment frequency calculations
 */
export class DeploymentFrequencyCalculator {
  /**
   * Calculate deployment frequency (deployments per day)
   * Uses merged MRs to main/master as a proxy for deployments
   *
   * @param {Array<Object>} mergeRequests - Merge request data from GitLab
   * @param {string} mergeRequests[].state - MR state (merged, opened, closed)
   * @param {string} mergeRequests[].targetBranch - Target branch (main, master, etc.)
   * @param {number} sprintDays - Number of days in the sprint
   * @returns {number} Deployments per day (0 if sprintDays is 0)
   */
  static calculate(mergeRequests, sprintDays) {
    if (sprintDays === 0) {
      return 0;
    }

    // Use merged MRs to main/master as deployment proxy
    const deployments = mergeRequests.filter((mr) => {
      const targetBranch = mr.targetBranch?.toLowerCase();
      return (
        mr.state === 'merged' &&
        (targetBranch === 'main' || targetBranch === 'master')
      );
    });

    return deployments.length / sprintDays;
  }
}
