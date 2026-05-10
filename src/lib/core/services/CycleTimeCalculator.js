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
   * closed. Only issues where inProgressAtSource === 'status_change' AND inProgressAt
   * falls within the sprint (>= iterationStartDate) are included.
   *
   * Three classes of exclusion are tracked separately:
   * - excludedCount: closed issues with no recognized "In Progress" transition
   * - carryoverCount: closed issues that were already In Progress before the sprint started
   *
   * @param {Array<Object>} issues - Issues from a sprint
   * @param {string} issues[].state - Issue state ('closed' | 'opened')
   * @param {string} issues[].createdAt - ISO timestamp when issue was created
   * @param {string|null} issues[].closedAt - ISO timestamp when issue closed (null if open)
   * @param {string|null} [issues[].inProgressAt] - ISO timestamp of confirmed "In Progress" transition
   * @param {'status_change'|'unknown'|null} [issues[].inProgressAtSource] - How inProgressAt was determined
   * @param {string} [iterationStartDate] - ISO date of sprint start (e.g. '2026-02-16'). When
   *   provided, status_change issues whose inProgressAt precedes this date are treated as
   *   carry-overs and excluded from stats. Omit for backward-compatible behaviour.
   * @returns {Object} Cycle time statistics
   * @returns {number} returns.avg - Average cycle time in days (0 when no qualifying issues)
   * @returns {number} returns.p50 - Median cycle time in days (0 when no qualifying issues)
   * @returns {number} returns.p90 - 90th percentile cycle time in days (0 when no qualifying issues)
   * @returns {number} returns.includedCount - Number of issues contributing to the stats
   * @returns {number} returns.excludedCount - Closed issues with no recognized In Progress transition
   * @returns {number} returns.carryoverCount - Closed issues that were In Progress before sprint start
   */
  static calculate(issues, iterationStartDate) {
    const sprintStart = iterationStartDate ? new Date(iterationStartDate) : null;

    // excludedCount: closed issues with no confirmed status-change source
    const excludedCount = issues.filter(
      (issue) =>
        issue.state === 'closed' &&
        issue.closedAt &&
        issue.inProgressAtSource !== 'status_change'
    ).length;

    // Candidate pool: closed issues with a confirmed In Progress transition
    const statusChangeIssues = issues.filter(
      (issue) =>
        issue.state === 'closed' &&
        issue.closedAt &&
        issue.inProgressAt &&
        issue.inProgressAtSource === 'status_change'
    );

    // carryoverCount: In Progress before the sprint started (only when start date known)
    const carryoverCount = sprintStart
      ? statusChangeIssues.filter((issue) => new Date(issue.inProgressAt) < sprintStart).length
      : 0;

    // Only include issues whose In Progress transition is within this sprint
    const closedIssuesWithProgress = sprintStart
      ? statusChangeIssues.filter((issue) => new Date(issue.inProgressAt) >= sprintStart)
      : statusChangeIssues;

    if (closedIssuesWithProgress.length === 0) {
      return { avg: 0, p50: 0, p90: 0, includedCount: 0, excludedCount, carryoverCount };
    }

    // Calculate cycle times in days (inProgressAt → closedAt)
    const cycleTimes = closedIssuesWithProgress.map((issue) => {
      const start = new Date(issue.inProgressAt);
      const closed = new Date(issue.closedAt);
      return (closed - start) / (1000 * 60 * 60 * 24);
    });

    return {
      avg: mean(cycleTimes),
      p50: quantile(cycleTimes, 0.5),
      p90: quantile(cycleTimes, 0.9),
      includedCount: closedIssuesWithProgress.length,
      excludedCount,
      carryoverCount,
    };
  }
}
