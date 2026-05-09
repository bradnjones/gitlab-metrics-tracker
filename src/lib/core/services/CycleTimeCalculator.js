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
   * Calculate cycle time statistics (avg, P50, P90) from closed issues.
   *
   * Cycle time is measured from when work actually started (inProgressAt) to when it
   * closed. Only issues where inProgressAtSource === 'status_change' are included — this
   * guarantees the timestamp reflects a real "In Progress" status transition recorded in
   * GitLab's system notes, never a fallback value.
   *
   * Issues that are closed but lack a confirmed status-change transition are counted in
   * excludedCount so callers can surface the information to users.
   *
   * @param {Array<Object>} issues - Issues from a sprint
   * @param {string} issues[].state - Issue state ('closed' | 'opened')
   * @param {string} issues[].createdAt - ISO timestamp when issue was created
   * @param {string|null} issues[].closedAt - ISO timestamp when issue closed (null if open)
   * @param {string|null} [issues[].inProgressAt] - ISO timestamp of confirmed "In Progress" transition
   * @param {'status_change'|'unknown'|null} [issues[].inProgressAtSource] - How inProgressAt was determined
   * @returns {Object} Cycle time statistics
   * @returns {number} returns.avg - Average cycle time in days (0 when no qualifying issues)
   * @returns {number} returns.p50 - Median cycle time in days (0 when no qualifying issues)
   * @returns {number} returns.p90 - 90th percentile cycle time in days (0 when no qualifying issues)
   * @returns {number} returns.includedCount - Number of issues contributing to the stats
   * @returns {number} returns.excludedCount - Number of closed issues excluded because inProgressAtSource !== 'status_change'
   */
  static calculate(issues) {
    // Count closed issues that lack a confirmed status-change source so callers can
    // inform users that those issues were excluded from cycle time.
    const excludedCount = issues.filter(
      (issue) =>
        issue.state === 'closed' &&
        issue.closedAt &&
        issue.inProgressAtSource !== 'status_change'
    ).length;

    // Only include closed issues with a confirmed "In Progress" status-change transition.
    // Requiring inProgressAtSource === 'status_change' is belt-and-suspenders: even if a
    // future bug reintroduces a non-null inProgressAt fallback, contaminated issues stay
    // out of the calculation.
    const closedIssuesWithProgress = issues.filter(
      (issue) =>
        issue.state === 'closed' &&
        issue.closedAt &&
        issue.inProgressAt &&
        issue.inProgressAtSource === 'status_change'
    );

    if (closedIssuesWithProgress.length === 0) {
      return { avg: 0, p50: 0, p90: 0, includedCount: 0, excludedCount };
    }

    // Calculate cycle times in days (inProgressAt → closedAt)
    const cycleTimes = closedIssuesWithProgress.map((issue) => {
      const start = new Date(issue.inProgressAt);
      const closed = new Date(issue.closedAt);
      const timeMs = closed - start;
      return timeMs / (1000 * 60 * 60 * 24); // Convert ms to days
    });

    return {
      avg: mean(cycleTimes),
      p50: quantile(cycleTimes, 0.5),
      p90: quantile(cycleTimes, 0.9),
      includedCount: closedIssuesWithProgress.length,
      excludedCount,
    };
  }
}
