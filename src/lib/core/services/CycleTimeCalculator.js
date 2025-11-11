/**
 * Cycle Time calculation service
 * Calculates time from issue start to close
 *
 * @module core/services/CycleTimeCalculator
 */

import { mean, quantile } from 'simple-statistics';

/**
 * CycleTimeCalculator - Domain service for cycle time calculations
 */
export class CycleTimeCalculator {
  /**
   * Calculate cycle time statistics (avg, P50, P90) from closed issues
   *
   * @param {Array<Object>} issues - Issues from a sprint
   * @param {string} issues[].state - Issue state (closed, opened)
   * @param {string} issues[].createdAt - ISO timestamp when issue created
   * @param {string|null} issues[].closedAt - ISO timestamp when issue closed
   * @param {string|null} [issues[].inProgressAt] - ISO timestamp when issue first moved to "In Progress"
   * @returns {Object} Cycle time statistics
   * @returns {number} returns.avg - Average cycle time in days
   * @returns {number} returns.p50 - Median cycle time in days
   * @returns {number} returns.p90 - 90th percentile cycle time in days
   */
  static calculate(issues) {
    const closedIssues = issues.filter(
      (issue) => issue.state === 'closed' && issue.closedAt
    );

    if (closedIssues.length === 0) {
      return { avg: 0, p50: 0, p90: 0 };
    }

    // Calculate cycle times in days
    const cycleTimes = closedIssues.map((issue) => {
      // Prefer inProgressAt for accurate cycle time, fall back to createdAt
      const startTime = issue.inProgressAt || issue.createdAt;
      const start = new Date(startTime);
      const closed = new Date(issue.closedAt);
      const timeMs = closed - start;
      return timeMs / (1000 * 60 * 60 * 24); // Convert ms to days
    });

    return {
      avg: mean(cycleTimes),
      p50: quantile(cycleTimes, 0.5),
      p90: quantile(cycleTimes, 0.9),
    };
  }
}
