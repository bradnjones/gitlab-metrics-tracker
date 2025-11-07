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

    it('should ignore open issues when counting', () => {
      const issues = [
        {
          id: 'gid://gitlab/Issue/1',
          state: 'closed',
        },
        {
          id: 'gid://gitlab/Issue/2',
          state: 'opened', // Should be ignored
        },
        {
          id: 'gid://gitlab/Issue/3',
          state: 'closed',
        },
      ];

      const throughput = ThroughputCalculator.calculate(issues);

      expect(throughput).toBe(2); // Only closed issues
    });

    it('should return 0 for empty array', () => {
      const throughput = ThroughputCalculator.calculate([]);

      expect(throughput).toBe(0);
    });
  });
});
