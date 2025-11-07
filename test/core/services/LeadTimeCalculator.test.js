import { describe, it, expect } from '@jest/globals';
import { LeadTimeCalculator } from '../../../src/lib/core/services/LeadTimeCalculator.js';

describe('LeadTimeCalculator', () => {
  describe('calculate', () => {
    it('should calculate average, P50, and P90 lead times', () => {
      const mergeRequests = [
        {
          id: 'gid://gitlab/MergeRequest/1',
          state: 'merged',
          createdAt: '2025-01-01T00:00:00Z',
          mergedAt: '2025-01-02T00:00:00Z', // 1 day
        },
        {
          id: 'gid://gitlab/MergeRequest/2',
          state: 'merged',
          createdAt: '2025-01-01T00:00:00Z',
          mergedAt: '2025-01-04T00:00:00Z', // 3 days
        },
        {
          id: 'gid://gitlab/MergeRequest/3',
          state: 'merged',
          createdAt: '2025-01-01T00:00:00Z',
          mergedAt: '2025-01-06T00:00:00Z', // 5 days
        },
      ];

      const leadTime = LeadTimeCalculator.calculate(mergeRequests);

      expect(leadTime.avg).toBe(3); // (1 + 3 + 5) / 3
      expect(leadTime.p50).toBe(3); // Median
      expect(leadTime.p90).toBe(5); // 90th percentile
    });

    it('should ignore non-merged MRs when calculating lead time', () => {
      const mergeRequests = [
        {
          id: 'gid://gitlab/MergeRequest/1',
          state: 'merged',
          createdAt: '2025-01-01T00:00:00Z',
          mergedAt: '2025-01-02T00:00:00Z', // 1 day
        },
        {
          id: 'gid://gitlab/MergeRequest/2',
          state: 'opened', // Open - should be ignored
          createdAt: '2025-01-01T00:00:00Z',
          mergedAt: null,
        },
      ];

      const leadTime = LeadTimeCalculator.calculate(mergeRequests);

      expect(leadTime.avg).toBe(1);
      expect(leadTime.p50).toBe(1);
      expect(leadTime.p90).toBe(1);
    });

    it('should return zeros for empty or all-open MRs', () => {
      const leadTime = LeadTimeCalculator.calculate([]);

      expect(leadTime.avg).toBe(0);
      expect(leadTime.p50).toBe(0);
      expect(leadTime.p90).toBe(0);
    });

    it('should handle MRs with missing timestamps', () => {
      const mergeRequests = [
        {
          id: 'gid://gitlab/MergeRequest/1',
          state: 'merged',
          createdAt: '2025-01-01T00:00:00Z',
          mergedAt: '2025-01-02T00:00:00Z', // 1 day - valid
        },
        {
          id: 'gid://gitlab/MergeRequest/2',
          state: 'merged',
          createdAt: null, // Missing createdAt - should be ignored
          mergedAt: '2025-01-02T00:00:00Z',
        },
      ];

      const leadTime = LeadTimeCalculator.calculate(mergeRequests);

      expect(leadTime.avg).toBe(1); // Only first MR counted
    });
  });
});
