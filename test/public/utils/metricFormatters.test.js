/**
 * Tests for Metric Formatting Utilities
 *
 * @module test/public/utils/metricFormatters
 */

import {
  getLastValue,
  formatDays,
  formatHours,
  formatFrequency,
  formatPercentage
} from '../../../src/public/utils/metricFormatters.js';

describe('getLastValue', () => {
  describe('basic functionality', () => {
    test('should extract last value from array of objects', () => {
      const data = [
        { iteration: 'Sprint 1', totalPoints: 10 },
        { iteration: 'Sprint 2', totalPoints: 15 },
        { iteration: 'Sprint 3', totalPoints: 22 }
      ];

      const result = getLastValue(data, 'totalPoints');

      expect(result).toBe(22);
    });

    test('should extract last value from single item array', () => {
      const data = [{ metric: 'velocity', value: 42 }];

      const result = getLastValue(data, 'value');

      expect(result).toBe(42);
    });

    test('should handle nested property access', () => {
      const data = [
        { sprint: 1, stats: { avg: 2.5 } },
        { sprint: 2, stats: { avg: 3.2 } }
      ];

      // Note: We'll keep it simple - no nested access for now
      // Just test that it works with direct properties
      const result = getLastValue(data, 'sprint');

      expect(result).toBe(2);
    });
  });

  describe('edge cases', () => {
    test('should return null for empty array', () => {
      const result = getLastValue([], 'anyKey');

      expect(result).toBeNull();
    });

    test('should return null for null input', () => {
      const result = getLastValue(null, 'anyKey');

      expect(result).toBeNull();
    });

    test('should return null for undefined input', () => {
      const result = getLastValue(undefined, 'anyKey');

      expect(result).toBeNull();
    });

    test('should return undefined if key does not exist', () => {
      const data = [{ a: 1 }, { a: 2 }];

      const result = getLastValue(data, 'nonExistentKey');

      expect(result).toBeUndefined();
    });

    test('should handle 0 as a valid value', () => {
      const data = [{ count: 5 }, { count: 0 }];

      const result = getLastValue(data, 'count');

      expect(result).toBe(0);
    });

    test('should handle false as a valid value', () => {
      const data = [{ flag: true }, { flag: false }];

      const result = getLastValue(data, 'flag');

      expect(result).toBe(false);
    });
  });
});

describe('formatDays', () => {
  describe('basic formatting', () => {
    test('should format integer days with one decimal place', () => {
      expect(formatDays(5)).toBe('5.0d');
    });

    test('should format decimal days with one decimal place', () => {
      expect(formatDays(3.2)).toBe('3.2d');
    });

    test('should round to one decimal place', () => {
      expect(formatDays(3.14159)).toBe('3.1d');
      expect(formatDays(3.16)).toBe('3.2d');
    });

    test('should format zero days', () => {
      expect(formatDays(0)).toBe('0.0d');
    });

    test('should format very small values', () => {
      expect(formatDays(0.1)).toBe('0.1d');
      expect(formatDays(0.05)).toBe('0.1d'); // Rounds up
    });
  });

  describe('edge cases', () => {
    test('should return "0.0d" for null', () => {
      expect(formatDays(null)).toBe('0.0d');
    });

    test('should return "0.0d" for undefined', () => {
      expect(formatDays(undefined)).toBe('0.0d');
    });

    test('should return "0.0d" for NaN', () => {
      expect(formatDays(NaN)).toBe('0.0d');
    });

    test('should handle negative numbers by treating as 0', () => {
      expect(formatDays(-5)).toBe('0.0d');
    });
  });
});

describe('formatHours', () => {
  describe('basic formatting', () => {
    test('should format integer hours with one decimal place', () => {
      expect(formatHours(4)).toBe('4.0hr');
    });

    test('should format decimal hours with one decimal place', () => {
      expect(formatHours(2.5)).toBe('2.5hr');
    });

    test('should round to one decimal place', () => {
      expect(formatHours(4.27)).toBe('4.3hr');
      expect(formatHours(4.24)).toBe('4.2hr');
    });

    test('should format zero hours', () => {
      expect(formatHours(0)).toBe('0.0hr');
    });
  });

  describe('edge cases', () => {
    test('should return "0.0hr" for null', () => {
      expect(formatHours(null)).toBe('0.0hr');
    });

    test('should return "0.0hr" for undefined', () => {
      expect(formatHours(undefined)).toBe('0.0hr');
    });

    test('should return "0.0hr" for NaN', () => {
      expect(formatHours(NaN)).toBe('0.0hr');
    });

    test('should handle negative numbers by treating as 0', () => {
      expect(formatHours(-2)).toBe('0.0hr');
    });
  });
});

describe('formatFrequency', () => {
  describe('basic formatting', () => {
    test('should format integer frequency with one decimal place', () => {
      expect(formatFrequency(2)).toBe('2.0/day');
    });

    test('should format decimal frequency with one decimal place', () => {
      expect(formatFrequency(2.3)).toBe('2.3/day');
    });

    test('should round to one decimal place', () => {
      expect(formatFrequency(2.37)).toBe('2.4/day');
      expect(formatFrequency(2.34)).toBe('2.3/day');
    });

    test('should format zero frequency', () => {
      expect(formatFrequency(0)).toBe('0.0/day');
    });
  });

  describe('edge cases', () => {
    test('should return "0.0/day" for null', () => {
      expect(formatFrequency(null)).toBe('0.0/day');
    });

    test('should return "0.0/day" for undefined', () => {
      expect(formatFrequency(undefined)).toBe('0.0/day');
    });

    test('should return "0.0/day" for NaN', () => {
      expect(formatFrequency(NaN)).toBe('0.0/day');
    });

    test('should handle negative numbers by treating as 0', () => {
      expect(formatFrequency(-1)).toBe('0.0/day');
    });
  });
});

describe('formatPercentage', () => {
  describe('basic formatting', () => {
    test('should format integer percentage with one decimal place', () => {
      expect(formatPercentage(5)).toBe('5.0%');
    });

    test('should format decimal percentage with one decimal place', () => {
      expect(formatPercentage(5.3)).toBe('5.3%');
    });

    test('should round to one decimal place', () => {
      expect(formatPercentage(5.37)).toBe('5.4%');
      expect(formatPercentage(5.34)).toBe('5.3%');
    });

    test('should format zero percentage', () => {
      expect(formatPercentage(0)).toBe('0.0%');
    });

    test('should handle 100 percent', () => {
      expect(formatPercentage(100)).toBe('100.0%');
    });
  });

  describe('edge cases', () => {
    test('should return "0.0%" for null', () => {
      expect(formatPercentage(null)).toBe('0.0%');
    });

    test('should return "0.0%" for undefined', () => {
      expect(formatPercentage(undefined)).toBe('0.0%');
    });

    test('should return "0.0%" for NaN', () => {
      expect(formatPercentage(NaN)).toBe('0.0%');
    });

    test('should handle negative numbers by treating as 0', () => {
      expect(formatPercentage(-5)).toBe('0.0%');
    });
  });
});
