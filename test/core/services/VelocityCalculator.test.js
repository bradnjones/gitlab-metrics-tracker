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

    it('should handle null or missing weights as 1 point (standard agile practice)', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
          weight: 3,
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
          weight: null, // Null weight - treat as 1 point
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
          // No weight field - treat as 1 point
        },
      ];

      const velocity = VelocityCalculator.calculate(issues);

      expect(velocity).toEqual({ points: 5, stories: 3 }); // 5 points from 3 stories (3 + 1 + 1)
    });

    it('should throw TypeError when issues is not an array', () => {
      expect(() => VelocityCalculator.calculate(null)).toThrow(TypeError);
      expect(() => VelocityCalculator.calculate(null)).toThrow('issues must be an array');

      expect(() => VelocityCalculator.calculate(undefined)).toThrow(TypeError);
      expect(() => VelocityCalculator.calculate('not an array')).toThrow(TypeError);
      expect(() => VelocityCalculator.calculate({})).toThrow(TypeError);
      expect(() => VelocityCalculator.calculate(42)).toThrow(TypeError);
    });
  });
});
