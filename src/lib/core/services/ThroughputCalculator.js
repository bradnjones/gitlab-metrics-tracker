/**
 * Throughput calculation service
 * Calculates number of issues completed per sprint
 *
 * @module core/services/ThroughputCalculator
 */

/**
 * ThroughputCalculator - Domain service for throughput calculations
 */
export class ThroughputCalculator {
  /**
   * Calculate throughput (count of closed issues) from sprint issues
   *
   * @param {Array<Object>} issues - Issues from a sprint
   * @param {string} issues[].state - Issue state (closed, opened)
   * @returns {number} Count of closed issues
   */
  static calculate(issues) {
    return issues.filter((issue) => issue.state === 'closed').length;
  }
}
