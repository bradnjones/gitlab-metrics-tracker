/**
 * Lead Time calculation service
 * Calculates time from first commit to production deployment (DORA metric)
 *
 * @module core/services/LeadTimeCalculator
 */

import { mean, quantile } from 'simple-statistics';

/**
 * LeadTimeCalculator - Domain service for lead time calculations
 */
export class LeadTimeCalculator {
  /**
   * Calculate lead time statistics (avg, P50, P90) from merged MRs
   * Uses first commit date for accurate DORA metric (code commit → deployment)
   *
   * @param {Array<Object>} mergeRequests - Merge requests from GitLab
   * @param {string} mergeRequests[].state - MR state (merged, opened, closed)
   * @param {string} mergeRequests[].createdAt - ISO timestamp when MR created
   * @param {string|null} mergeRequests[].mergedAt - ISO timestamp when MR merged
   * @param {Object} mergeRequests[].commits - Commits in the MR
   * @param {Array} mergeRequests[].commits.nodes - Array of commit objects
   * @param {string} mergeRequests[].commits.nodes[].committedDate - Commit timestamp
   * @returns {Object} Lead time statistics
   * @returns {number} returns.avg - Average lead time in days
   * @returns {number} returns.p50 - Median lead time in days
   * @returns {number} returns.p90 - 90th percentile lead time in days
   */
  static calculate(mergeRequests) {
    const mergedMRs = mergeRequests.filter(
      (mr) => mr.state === 'merged' && mr.mergedAt
    );

    if (mergedMRs.length === 0) {
      return { avg: 0, p50: 0, p90: 0 };
    }

    // Calculate lead times in days (from first commit OR creation to merge)
    const leadTimes = mergedMRs
      .map((mr) => {
        let startTime;

        // Use first commit date if available (more accurate DORA metric)
        if (mr.commits?.nodes?.length > 0) {
          const commits = mr.commits.nodes;
          const firstCommit = commits.reduce((earliest, commit) => {
            const commitDate = new Date(commit.committedDate);
            return commitDate < earliest ? commitDate : earliest;
          }, new Date(commits[0].committedDate));
          startTime = firstCommit;
        } else if (mr.createdAt) {
          // Fallback to MR creation date if no commits but createdAt exists
          startTime = new Date(mr.createdAt);
        } else {
          // Skip MRs without commits or createdAt
          return null;
        }

        const merged = new Date(mr.mergedAt);
        const timeMs = merged - startTime;
        return timeMs / (1000 * 60 * 60 * 24); // Convert ms to days
      })
      .filter((time) => time !== null); // Remove null values

    return {
      avg: mean(leadTimes),
      p50: quantile(leadTimes, 0.5),
      p90: quantile(leadTimes, 0.9),
    };
  }
}
