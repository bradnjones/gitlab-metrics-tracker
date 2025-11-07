import { describe, it, expect } from '@jest/globals';
import { VelocityCalculator } from '../../../src/lib/core/services/VelocityCalculator.js';

describe('VelocityCalculator', () => {
  describe('calculate', () => {
    it('should sum weights from closed issues', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          weight: 3,
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          weight: 5,
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          weight: 2,
        },
      ];

      const velocity = VelocityCalculator.calculate(issues);

      expect(velocity).toEqual({ points: 10, stories: 3 }); // 10 points from 3 stories
    });

    it('should ignore open issues when calculating velocity', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          weight: 3,
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'opened',
          weight: 5, // Should be ignored
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          weight: 2,
        },
      ];

      const velocity = VelocityCalculator.calculate(issues);

      expect(velocity).toEqual({ points: 5, stories: 2 }); // Only 5 points from 2 closed stories
    });

    it('should handle null or missing weights', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          weight: 3,
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          weight: null, // Null weight - treat as 0
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          // No weight field - treat as 0
        },
      ];

      const velocity = VelocityCalculator.calculate(issues);

      expect(velocity).toEqual({ points: 3, stories: 3 }); // 3 points from 3 stories (zeros don't reduce count)
    });
  });
});
