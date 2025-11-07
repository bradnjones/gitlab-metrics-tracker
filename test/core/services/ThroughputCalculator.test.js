import { describe, it, expect } from '@jest/globals';
import { ThroughputCalculator } from '../../../src/lib/core/services/ThroughputCalculator.js';

describe('ThroughputCalculator', () => {
  describe('calculate', () => {
    it('should count closed issues', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'closed',
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
        },
      ];

      const throughput = ThroughputCalculator.calculate(issues);

      expect(throughput).toBe(3);
    });
  });
});
