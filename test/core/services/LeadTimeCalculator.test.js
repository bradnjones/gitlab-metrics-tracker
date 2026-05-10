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

    // --- Commit-date floor tests (ancient commits from monorepo absorptions) ---

    it('should cap lead time start at mr.createdAt when first commit predates MR creation', () => {
      // Simulates a monorepo absorption: commit from 2016, MR created and merged Oct 2025
      const mergeRequests = [
        {
          id: 'gid://gitlab/MergeRequest/81',
          state: 'merged',
          createdAt: '2025-10-20T09:00:00Z',
          mergedAt: '2025-10-21T09:00:00Z', // 1 day after MR creation
          commits: {
            nodes: [
              { committedDate: '2016-04-28T00:00:00Z' }, // ancient history from absorbed repo
              { committedDate: '2025-10-20T08:00:00Z' }, // actual change commit
            ],
          },
        },
      ];

      const leadTime = LeadTimeCalculator.calculate(mergeRequests);

      // Should be ~1 day (createdAt → mergedAt), NOT 3,463 days (2016 → 2025)
      expect(leadTime.avg).toBeCloseTo(1, 0);
      expect(leadTime.p50).toBeCloseTo(1, 0);
    });

    it('should NOT cap when first commit is after MR creation (normal case)', () => {
      // Normal branch: committed before creating the MR, recent history
      const mergeRequests = [
        {
          id: 'gid://gitlab/MergeRequest/1',
          state: 'merged',
          createdAt: '2025-01-01T00:00:00Z',
          mergedAt: '2025-01-05T00:00:00Z', // 5 days from merge
          commits: {
            nodes: [
              { committedDate: '2025-01-02T00:00:00Z' }, // 3 days before merge, after MR creation
            ],
          },
        },
      ];

      const leadTime = LeadTimeCalculator.calculate(mergeRequests);

      // firstCommit (Jan 2) > createdAt (Jan 1) — no cap, use firstCommit
      // lead time = Jan 5 - Jan 2 = 3 days
      expect(leadTime.avg).toBe(3);
    });

    it('should handle mix of capped and normal MRs correctly', () => {
      const mergeRequests = [
        {
          // Ancient commit → capped at createdAt: 1 day lead time
          id: 'gid://gitlab/MergeRequest/1',
          state: 'merged',
          createdAt: '2025-10-20T00:00:00Z',
          mergedAt: '2025-10-21T00:00:00Z',
          commits: { nodes: [{ committedDate: '2016-03-03T00:00:00Z' }] },
        },
        {
          // Normal MR: firstCommit within sprint → 4 days lead time
          id: 'gid://gitlab/MergeRequest/2',
          state: 'merged',
          createdAt: '2025-10-17T00:00:00Z',
          mergedAt: '2025-10-21T00:00:00Z',
          commits: { nodes: [{ committedDate: '2025-10-17T00:00:00Z' }] },
        },
      ];

      const leadTime = LeadTimeCalculator.calculate(mergeRequests);

      // MR1: 1 day (capped), MR2: 4 days (normal) → avg 2.5
      expect(leadTime.avg).toBe(2.5);
      expect(leadTime.p50).toBe(2.5);
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
