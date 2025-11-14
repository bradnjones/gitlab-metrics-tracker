/**
 * Tests for Statistical Process Control (SPC) Control Limits Calculator
 *
 * @module test/public/utils/controlLimits
 */

import { calculateControlLimits } from '../../../src/public/utils/controlLimits.js';

describe('calculateControlLimits', () => {
  describe('basic calculations', () => {
    test('should calculate control limits for simple dataset', () => {
      // Sample data matching Excel example pattern
      const data = [2.2, 2.4, 4.7, 3.9, 2.3, 6.3, 7.0, 9.8, 4.3, 3.1];

      const result = calculateControlLimits(data);

      // Verify structure
      expect(result).toHaveProperty('average');
      expect(result).toHaveProperty('upperLimit');
      expect(result).toHaveProperty('lowerLimit');
      expect(result).toHaveProperty('mrBar');

      // Average should be mean of data
      const expectedAverage = data.reduce((sum, val) => sum + val, 0) / data.length;
      expect(result.average).toBeCloseTo(expectedAverage, 2);

      // MR Bar should be positive
      expect(result.mrBar).toBeGreaterThan(0);

      // UCL should be greater than average
      expect(result.upperLimit).toBeGreaterThan(result.average);

      // LCL should be less than or equal to average
      expect(result.lowerLimit).toBeLessThanOrEqual(result.average);

      // LCL should never be negative
      expect(result.lowerLimit).toBeGreaterThanOrEqual(0);
    });

    test('should match Excel calculation example', () => {
      // Data from Excel screenshot
      const data = [2.2, 2.4, 4.7, 3.9, 2.3, 6.3, 7.0, 9.8, 4.3, 3.1, 3.2, 6.2, 7.03, 5.5, 5.3];

      const result = calculateControlLimits(data);

      // Excel shows: Average = 4.9, Upper Limit = 9.582314083, Lower Limit ≈ 0.18
      // MR Bar = 1.77
      // LCL = 4.9 - (2.66 * 1.77) = 4.9 - 4.7082 = 0.1918
      expect(result.average).toBeCloseTo(4.9, 1);
      expect(result.mrBar).toBeCloseTo(1.77, 1);
      expect(result.upperLimit).toBeCloseTo(9.58, 1);
      expect(result.lowerLimit).toBeCloseTo(0.19, 1);
    });
  });

  describe('edge cases', () => {
    test('should handle single data point', () => {
      const data = [5.0];

      const result = calculateControlLimits(data);

      expect(result.average).toBe(5.0);
      expect(result.mrBar).toBe(0); // No moving range with single point
      expect(result.upperLimit).toBe(5.0); // UCL = avg + 0
      expect(result.lowerLimit).toBe(5.0); // LCL = max(0, avg - 0) = avg
    });

    test('should handle two data points', () => {
      const data = [3.0, 7.0];

      const result = calculateControlLimits(data);

      expect(result.average).toBe(5.0);
      expect(result.mrBar).toBe(4.0); // |7 - 3| = 4
      expect(result.upperLimit).toBeCloseTo(5.0 + (2.66 * 4.0), 1); // 15.64
      expect(result.lowerLimit).toBe(0); // Would be negative, capped at 0
    });

    test('should handle uniform data (no variation)', () => {
      const data = [5.0, 5.0, 5.0, 5.0, 5.0];

      const result = calculateControlLimits(data);

      expect(result.average).toBe(5.0);
      expect(result.mrBar).toBe(0); // No variation
      expect(result.upperLimit).toBe(5.0); // No spread
      expect(result.lowerLimit).toBe(5.0); // No variation means LCL = average
    });

    test('should ensure LCL never goes below zero', () => {
      const data = [1.0, 2.0, 15.0, 1.5, 2.5]; // High variation with low values

      const result = calculateControlLimits(data);

      expect(result.lowerLimit).toBeGreaterThanOrEqual(0);
    });
  });

  describe('input validation', () => {
    test('should throw error for empty array', () => {
      expect(() => calculateControlLimits([])).toThrow('Data array must contain at least one value');
    });

    test('should throw error for null input', () => {
      expect(() => calculateControlLimits(null)).toThrow('Data array must contain at least one value');
    });

    test('should throw error for undefined input', () => {
      expect(() => calculateControlLimits(undefined)).toThrow('Data array must contain at least one value');
    });

    test('should throw error for non-array input', () => {
      expect(() => calculateControlLimits(5)).toThrow('Data array must contain at least one value');
    });

    test('should filter out null and undefined values', () => {
      const data = [1.0, null, 2.0, undefined, 3.0];

      const result = calculateControlLimits(data);

      // Should calculate based on [1.0, 2.0, 3.0]
      expect(result.average).toBe(2.0);
    });
  });

  describe('SPC formula accuracy', () => {
    test('should use correct constant (2.66) for individuals chart', () => {
      const data = [10, 12, 11, 13, 10];

      const result = calculateControlLimits(data);

      // Calculate expected values manually
      const avg = 11.2;
      const movingRanges = [2, 1, 2, 3]; // |12-10|, |11-12|, |13-11|, |10-13|
      const mrBar = (2 + 1 + 2 + 3) / 4; // 2.0
      const expectedUCL = avg + (2.66 * mrBar); // 11.2 + 5.32 = 16.52
      const expectedLCL = Math.max(0, avg - (2.66 * mrBar)); // max(0, 11.2 - 5.32) = 5.88

      expect(result.average).toBeCloseTo(avg, 2);
      expect(result.mrBar).toBeCloseTo(mrBar, 2);
      expect(result.upperLimit).toBeCloseTo(expectedUCL, 2);
      expect(result.lowerLimit).toBeCloseTo(expectedLCL, 2);
    });
  });
});
