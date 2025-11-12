import { describe, it, expect } from '@jest/globals';
import { DeploymentFrequencyCalculator } from '../../../src/lib/core/services/DeploymentFrequencyCalculator.js';

describe('DeploymentFrequencyCalculator', () => {
  describe('calculate', () => {
    it('should calculate deployments per day using merged MRs', () => {
      const mergeRequests = [
        {
          id: 'gid://gitlab/MergeRequest/1',
          state: 'merged',
          targetBranch: 'main',
          mergedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'gid://gitlab/MergeRequest/2',
          state: 'merged',
          targetBranch: 'main',
          mergedAt: '2025-01-02T00:00:00Z',
        },
        {
          id: 'gid://gitlab/MergeRequest/3',
          state: 'merged',
          targetBranch: 'main',
          mergedAt: '2025-01-03T00:00:00Z',
        },
      ];

      const frequency = DeploymentFrequencyCalculator.calculate(
        mergeRequests,
        3 // 3-day sprint
      );

      expect(frequency).toBe(1); // 3 deployments / 3 days = 1 per day
    });

    it('should only count merged MRs to main or master branches', () => {
      const mergeRequests = [
        {
          id: 'gid://gitlab/MergeRequest/1',
          state: 'merged',
          targetBranch: 'main', // Count this
        },
        {
          id: 'gid://gitlab/MergeRequest/2',
          state: 'merged',
          targetBranch: 'master', // Count this (master also valid)
        },
        {
          id: 'gid://gitlab/MergeRequest/3',
          state: 'opened',
          targetBranch: 'main', // Don't count - not merged
        },
        {
          id: 'gid://gitlab/MergeRequest/4',
          state: 'merged',
          targetBranch: 'develop', // Don't count - not main/master
        },
      ];

      const frequency = DeploymentFrequencyCalculator.calculate(mergeRequests, 5);

      expect(frequency).toBe(0.4); // 2 deployments / 5 days
    });

    it('should return 0 for zero sprint days', () => {
      const mergeRequests = [
        {
          id: 'gid://gitlab/MergeRequest/1',
          state: 'merged',
          targetBranch: 'main',
        },
      ];

      const frequency = DeploymentFrequencyCalculator.calculate(mergeRequests, 0);

      expect(frequency).toBe(0);
    });

    it('should return 0 for empty merge request array', () => {
      const frequency = DeploymentFrequencyCalculator.calculate([], 5);

      expect(frequency).toBe(0);
    });

    it('should handle case-insensitive branch names', () => {
      const mergeRequests = [
        {
          id: 'gid://gitlab/MergeRequest/1',
          state: 'merged',
          targetBranch: 'Main', // Uppercase
        },
        {
          id: 'gid://gitlab/MergeRequest/2',
          state: 'merged',
          targetBranch: 'MASTER', // Uppercase
        },
      ];

      const frequency = DeploymentFrequencyCalculator.calculate(mergeRequests, 2);

      expect(frequency).toBe(1); // 2 deployments / 2 days
    });
  });
});
