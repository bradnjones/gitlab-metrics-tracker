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
          closedAt: '2025-01-02T00:00:00Z', // 1 day
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
          closedAt: '2025-01-04T00:00:00Z', // 3 days
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
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
          closedAt: '2025-01-02T00:00:00Z', // 1 day
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'opened', // Open - should be ignored
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
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
    });

    it('should handle issues with missing closedAt or inProgressAt timestamp', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
          closedAt: '2025-01-02T00:00:00Z', // 1 day - valid
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-01T00:00:00Z',
          closedAt: null, // Missing closedAt - should be ignored
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: null, // Missing inProgressAt - should be ignored
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
          closedAt: '2025-01-08T00:00:00Z', // Closed 3 days after starting
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z', // Issue created
          inProgressAt: '2025-01-03T00:00:00Z', // Work started 2 days later
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
          closedAt: '2025-01-04T00:00:00Z', // 2 days from inProgressAt
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: null, // No inProgressAt - EXCLUDED from cycle time
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
          closedAt: '2025-01-03T00:00:00Z', // 1 day from inProgressAt
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: null, // No inProgressAt - EXCLUDED
          closedAt: '2025-01-06T00:00:00Z',
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          inProgressAt: '2025-01-03T00:00:00Z',
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
  });
});
