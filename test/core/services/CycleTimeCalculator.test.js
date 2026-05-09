import { describe, it, expect } from '@jest/globals';
import { CycleTimeCalculator } from '../../../src/lib/core/services/CycleTimeCalculator.js';

describe('CycleTimeCalculator', () => {
  describe('calculate', () => {
    it('should calculate average, P50, and P90 cycle times', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-02T00:00:00Z', // 1 day
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-04T00:00:00Z', // 3 days
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-06T00:00:00Z', // 5 days
        },
      ];

      const cycleTime = CycleTimeCalculator.calculate(issues);

      expect(cycleTime.avg).toBe(3); // (1 + 3 + 5) / 3
      expect(cycleTime.p50).toBe(3); // Median
      expect(cycleTime.p90).toBe(5); // 90th percentile
    });

    it('should ignore open issues when calculating cycle time', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-02T00:00:00Z', // 1 day
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'opened', // Open - should be ignored
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
          inProgressAtSource: null, // open issue has null source per contract
          closedAt: null,
        },
      ];

      const cycleTime = CycleTimeCalculator.calculate(issues);

      expect(cycleTime.avg).toBe(1);
      expect(cycleTime.p50).toBe(1);
      expect(cycleTime.p90).toBe(1);
    });

    it('should return zeros for empty or all-open issues', () => {
      const cycleTime = CycleTimeCalculator.calculate([]);

      expect(cycleTime.avg).toBe(0);
      expect(cycleTime.p50).toBe(0);
      expect(cycleTime.p90).toBe(0);
      expect(cycleTime.includedCount).toBe(0);
      expect(cycleTime.excludedCount).toBe(0);
    });

    it('should handle issues with missing closedAt or inProgressAt timestamp', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-02T00:00:00Z', // 1 day - valid
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: null, // Missing closedAt - should be ignored
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: null, // Missing inProgressAt - should be ignored
          inProgressAtSource: 'unknown',
          closedAt: '2025-01-05T00:00:00Z',
        },
      ];

      const cycleTime = CycleTimeCalculator.calculate(issues);

      expect(cycleTime.avg).toBe(1); // Only first issue counted
    });

    it('should use inProgressAt when available instead of createdAt', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z', // Issue created
          inProgressAt: '2025-01-05T00:00:00Z', // Work started 4 days later
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-08T00:00:00Z', // Closed 3 days after starting
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z', // Issue created
          inProgressAt: '2025-01-03T00:00:00Z', // Work started 2 days later
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-05T00:00:00Z', // Closed 2 days after starting
        },
      ];

      const cycleTime = CycleTimeCalculator.calculate(issues);

      // Should use inProgressAt → closedAt, not createdAt → closedAt
      // Issue 1: 3 days (Jan 5 → Jan 8)
      // Issue 2: 2 days (Jan 3 → Jan 5)
      // Avg: 2.5, P50: 2.5, P90: 3
      expect(cycleTime.avg).toBe(2.5);
      expect(cycleTime.p50).toBe(2.5);
      expect(cycleTime.p90).toBe(3);
    });

    it('should exclude issues without inProgressAt (never started)', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-02T00:00:00Z', // Has inProgressAt
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-04T00:00:00Z', // 2 days from inProgressAt
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: null, // No inProgressAt - EXCLUDED from cycle time
          inProgressAtSource: 'unknown',
          closedAt: '2025-01-05T00:00:00Z',
        },
      ];

      const cycleTime = CycleTimeCalculator.calculate(issues);

      // Only Issue 1 counted (Issue 2 excluded because it was never started)
      expect(cycleTime.avg).toBe(2);
      expect(cycleTime.p50).toBe(2);
      expect(cycleTime.p90).toBe(2);
    });

    it('should calculate more accurate cycle time with inProgressAt', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z', // Created
          inProgressAt: '2025-01-10T00:00:00Z', // Started 9 days later (refinement delay)
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-12T00:00:00Z', // Finished 2 days after starting work
        },
      ];

      // Without inProgressAt: would show 11 days (createdAt → closedAt)
      // With inProgressAt: shows 2 days (actual work time)
      const cycleTime = CycleTimeCalculator.calculate(issues);

      expect(cycleTime.avg).toBe(2);
      expect(cycleTime.p50).toBe(2);
      expect(cycleTime.p90).toBe(2);
    });

    it('should handle mixed issues with and without inProgressAt', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-02T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-03T00:00:00Z', // 1 day from inProgressAt
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: null, // No inProgressAt - EXCLUDED
          inProgressAtSource: 'unknown',
          closedAt: '2025-01-06T00:00:00Z',
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-03T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-06T00:00:00Z', // 3 days from inProgressAt
        },
      ];

      const cycleTime = CycleTimeCalculator.calculate(issues);

      // Only Issue 1 and 3 counted (Issue 2 excluded - never started)
      // Issue 1: 1 day, Issue 3: 3 days
      // Avg: 2, P50: 2, P90: 3
      expect(cycleTime.avg).toBe(2);
      expect(cycleTime.p50).toBe(2);
      expect(cycleTime.p90).toBe(3);
    });

    // --- New tests for inProgressAtSource filtering and excludedCount ---

    it('should only count status_change issues in stats; excludedCount reflects unknown closed issues', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-02T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-04T00:00:00Z', // 2 days
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: null,
          inProgressAtSource: 'unknown',
          closedAt: '2025-01-10T00:00:00Z', // would be 9 days from createdAt — must NOT be included
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-03T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-07T00:00:00Z', // 4 days
        },
      ];

      const result = CycleTimeCalculator.calculate(issues);

      // Only issues 1 and 3 count (status_change); issue 2 excluded (unknown)
      // avg = (2 + 4) / 2 = 3, p50 = 3, p90 = 4
      expect(result.avg).toBe(3);
      expect(result.p50).toBe(3);
      expect(result.p90).toBe(4);
      expect(result.includedCount).toBe(2);
      expect(result.excludedCount).toBe(1);
    });

    it('should return zeros with excludedCount=N when all closed issues have unknown source', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: null,
          inProgressAtSource: 'unknown',
          closedAt: '2025-01-05T00:00:00Z',
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: null,
          inProgressAtSource: 'unknown',
          closedAt: '2025-01-08T00:00:00Z',
        },
      ];

      const result = CycleTimeCalculator.calculate(issues);

      expect(result.avg).toBe(0);
      expect(result.p50).toBe(0);
      expect(result.p90).toBe(0);
      expect(result.includedCount).toBe(0);
      expect(result.excludedCount).toBe(2);
    });

    it('should include includedCount in return shape for status_change issues', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-02T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-04T00:00:00Z', // 2 days
        },
      ];

      const result = CycleTimeCalculator.calculate(issues);

      expect(result.avg).toBe(2);
      expect(result.includedCount).toBe(1);
      expect(result.excludedCount).toBe(0);
    });

    it('should exclude issues with non-status_change source even if inProgressAt is non-null (belt-and-suspenders)', () => {
      // Guard against a future bug where inProgressAt gets a fallback value but source
      // is not status_change. The calculator must still exclude these.
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z', // non-null but source is NOT status_change
          inProgressAtSource: 'created', // old/legacy source value — must be excluded
          closedAt: '2025-01-30T00:00:00Z', // would be 29 days — must NOT pollute avg
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-02T00:00:00Z',
          inProgressAtSource: 'status_change',
          closedAt: '2025-01-04T00:00:00Z', // 2 days
        },
      ];

      const result = CycleTimeCalculator.calculate(issues);

      expect(result.avg).toBe(2); // Only issue 2; issue 1 excluded despite non-null inProgressAt
      expect(result.includedCount).toBe(1);
      expect(result.excludedCount).toBe(1);
    });
  });
});
