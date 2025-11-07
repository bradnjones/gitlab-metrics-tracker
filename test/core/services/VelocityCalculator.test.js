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

      expect(velocity).toBe(10); // 3 + 5 + 2
    });
  });
});
