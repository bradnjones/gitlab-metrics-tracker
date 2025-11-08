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
   * Calculate velocity (sum of story points and story count) from closed issues
   *
   * @param {Array<Object>} issues - Issues from a sprint
   * @param {string} issues[].state - Issue state (closed, opened)
   * @param {number|null|undefined} issues[].weight - Story points assigned to issue (null/undefined treated as 1 point)
   * @returns {{points: number, stories: number}} Total points completed and count of closed stories
   * @throws {TypeError} If issues is not an array
   */
  static calculate(issues) {
    // Input validation
    if (!Array.isArray(issues)) {
      throw new TypeError('issues must be an array');
    }

    const closedIssues = issues.filter((issue) => issue.state === 'closed');

    return {
      points: closedIssues.reduce((sum, issue) => sum + (issue.weight ?? 1), 0),
      stories: closedIssues.length
    };
  }
}
