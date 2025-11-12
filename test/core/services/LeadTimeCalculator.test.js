import { describe, it, expect } from '@jest/globals';
import { LeadTimeCalculator } from '../../../src/lib/core/services/LeadTimeCalculator.js';

describe('LeadTimeCalculator', () => {
  describe('calculate', () => {
    it('should calculate lead time from first commit to merge (DORA metric)', () => {
      const mergeRequests = [
        {
          id: 'gid://gitlab/MergeRequest/1',
          state: 'merged',
          createdAt: '2025-01-01T00:00:00Z',
          mergedAt: '2025-01-05T00:00:00Z',
          commits: {
            nodes: [
              { committedDate: '2025-01-03T00:00:00Z' }, // Second commit
              { committedDate: '2025-01-02T00:00:00Z' }, // First commit (earliest)
            ],
          },
        },
        {
          id: 'gid://gitlab/MergeRequest/2',
          state: 'merged',
          createdAt: '2025-01-01T00:00:00Z',
          mergedAt: '2025-01-06T00:00:00Z',
          commits: {
            nodes: [
              { committedDate: '2025-01-02T00:00:00Z' }, // Only commit
            ],
          },
        },
      ];

      const leadTime = LeadTimeCalculator.calculate(mergeRequests);

      // MR1: 2025-01-05 - 2025-01-02 = 3 days
      // MR2: 2025-01-06 - 2025-01-02 = 4 days
      // Avg: (3 + 4) / 2 = 3.5 days
      expect(leadTime.avg).toBe(3.5);
      expect(leadTime.p50).toBe(3.5); // Median of [3, 4]
      expect(leadTime.p90).toBe(4); // 90th percentile
    });

    it('should fallback to createdAt if no commits available', () => {
      const mergeRequests = [
        {
          id: 'gid://gitlab/MergeRequest/1',
          state: 'merged',
          createdAt: '2025-01-01T00:00:00Z',
          mergedAt: '2025-01-02T00:00:00Z', // 1 day from creation
          commits: { nodes: [] }, // No commits
        },
        {
          id: 'gid://gitlab/MergeRequest/2',
          state: 'merged',
          createdAt: '2025-01-01T00:00:00Z',
          mergedAt: '2025-01-04T00:00:00Z', // 3 days from creation
          // No commits property at all
        },
      ];

      const leadTime = LeadTimeCalculator.calculate(mergeRequests);

      expect(leadTime.avg).toBe(2); // (1 + 3) / 2
      expect(leadTime.p50).toBe(2); // Median
      expect(leadTime.p90).toBe(3); // 90th percentile
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
