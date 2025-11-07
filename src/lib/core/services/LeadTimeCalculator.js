/**
 * Lead Time calculation service
 * Calculates time from commit to production deployment
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
   *
   * @param {Array<Object>} mergeRequests - Merge requests from GitLab
   * @param {string} mergeRequests[].state - MR state (merged, opened, closed)
   * @param {string} mergeRequests[].createdAt - ISO timestamp when MR created
   * @param {string|null} mergeRequests[].mergedAt - ISO timestamp when MR merged
   * @returns {Object} Lead time statistics
   * @returns {number} returns.avg - Average lead time in days
   * @returns {number} returns.p50 - Median lead time in days
   * @returns {number} returns.p90 - 90th percentile lead time in days
   */
  static calculate(mergeRequests) {
    const mergedMRs = mergeRequests.filter(
      (mr) => mr.state === 'merged' && mr.createdAt && mr.mergedAt
    );

    if (mergedMRs.length === 0) {
      return { avg: 0, p50: 0, p90: 0 };
    }

    // Calculate lead times in days
    const leadTimes = mergedMRs.map((mr) => {
      const created = new Date(mr.createdAt);
      const merged = new Date(mr.mergedAt);
      const timeMs = merged - created;
      return timeMs / (1000 * 60 * 60 * 24); // Convert ms to days
    });

    return {
      avg: mean(leadTimes),
      p50: quantile(leadTimes, 0.5),
      p90: quantile(leadTimes, 0.9),
    };
  }
}
