/**
 * Velocity calculation service
 * Calculates story points completed per sprint
 *
 * @module core/services/VelocityCalculator
 */

/**
 * VelocityCalculator - Domain service for velocity calculations
 */
export class VelocityCalculator {
  /**
   * Calculate velocity (sum of story points) from closed issues
   *
   * @param {Array<Object>} issues - Issues from a sprint
   * @param {string} issues[].state - Issue state (closed, opened)
   * @param {number} issues[].weight - Story points assigned to issue
   * @returns {number} Total story points completed
   */
  static calculate(issues) {
    return issues
      .filter((issue) => issue.state === 'closed')
      .reduce((sum, issue) => sum + (issue.weight || 0), 0);
  }
}
