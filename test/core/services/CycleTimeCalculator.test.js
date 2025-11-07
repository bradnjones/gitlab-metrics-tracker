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
          closedAt: '2025-01-02T00:00:00Z', // 1 day
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          closedAt: '2025-01-04T00:00:00Z', // 3 days
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
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
          closedAt: '2025-01-02T00:00:00Z', // 1 day
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'opened', // Open - should be ignored
          createdAt: '2025-01-01T00:00:00Z',
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

    it('should handle issues with missing timestamps', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          closedAt: '2025-01-02T00:00:00Z', // 1 day - valid
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          createdAt: null, // Missing createdAt - should be ignored
          closedAt: '2025-01-02T00:00:00Z',
        },
      ];

      const cycleTime = CycleTimeCalculator.calculate(issues);

      expect(cycleTime.avg).toBe(1); // Only first issue counted
    });
  });
});
