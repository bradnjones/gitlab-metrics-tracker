import { describe, it, expect } from '@jest/globals';
import { DeploymentFrequencyCalculator } from '../../../src/lib/core/services/DeploymentFrequencyCalculator.js';

describe('DeploymentFrequencyCalculator', () => {
  describe('calculate', () => {
    it('should calculate deployments per day', () => {
      const pipelines = [
        {
          id: 'gid://gitlab/Ci::Pipeline/1',
          status: 'success',
          ref: 'main',
          createdAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'gid://gitlab/Ci::Pipeline/2',
          status: 'success',
          ref: 'main',
          createdAt: '2025-01-02T00:00:00Z',
        },
        {
          id: 'gid://gitlab/Ci::Pipeline/3',
          status: 'success',
          ref: 'main',
          createdAt: '2025-01-03T00:00:00Z',
        },
      ];

      const frequency = DeploymentFrequencyCalculator.calculate(
        pipelines,
        3 // 3-day sprint
      );

      expect(frequency).toBe(1); // 3 deployments / 3 days = 1 per day
    });

    it('should only count successful main branch pipelines', () => {
      const pipelines = [
        {
          id: 'gid://gitlab/Ci::Pipeline/1',
          status: 'success',
          ref: 'main', // Count this
        },
        {
          id: 'gid://gitlab/Ci::Pipeline/2',
          status: 'failed',
          ref: 'main', // Don't count - failed
        },
        {
          id: 'gid://gitlab/Ci::Pipeline/3',
          status: 'success',
          ref: 'feature-branch', // Don't count - not main
        },
      ];

      const frequency = DeploymentFrequencyCalculator.calculate(pipelines, 5);

      expect(frequency).toBe(0.2); // 1 deployment / 5 days
    });

    it('should return 0 for zero sprint days', () => {
      const pipelines = [
        {
          id: 'gid://gitlab/Ci::Pipeline/1',
          status: 'success',
          ref: 'main',
        },
      ];

      const frequency = DeploymentFrequencyCalculator.calculate(pipelines, 0);

      expect(frequency).toBe(0);
    });

    it('should return 0 for empty pipeline array', () => {
      const frequency = DeploymentFrequencyCalculator.calculate([], 5);

      expect(frequency).toBe(0);
    });
  });
});
