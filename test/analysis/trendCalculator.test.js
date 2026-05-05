/**
 * @jest-environment node
 */

import { describe, test, expect } from '@jest/globals';
import { linearRegression, classifyTrend, recentVsHistorical } from '../../src/lib/analysis/trendCalculator.js';

describe('linearRegression', () => {
  test('perfect linear series [1,2,3,4,5] returns slope=1, intercept=1, r2=1', () => {
    const result = linearRegression([1, 2, 3, 4, 5]);
    expect(result.slope).toBeCloseTo(1, 10);
    expect(result.intercept).toBeCloseTo(1, 10);
    expect(result.r2).toBeCloseTo(1.0, 10);
  });

  test('constant series [5,5,5] returns slope=0 and r2=0', () => {
    const result = linearRegression([5, 5, 5]);
    expect(result.slope).toBe(0);
    expect(result.r2).toBe(0);
  });
});

describe('classifyTrend', () => {
  test('positive slope with higherIsBetter=true is improving; negative is degrading', () => {
    expect(classifyTrend(5, 100, true)).toBe('improving');
    expect(classifyTrend(-5, 100, true)).toBe('degrading');
  });

  test('tiny slope (0.001) relative to mean of 100 returns stable', () => {
    expect(classifyTrend(0.001, 100)).toBe('stable');
  });
});

describe('recentVsHistorical', () => {
  test('[10,10,10,10,20,20,20] with n=3: recentMean=20, historicalMean~14.29, deltaPct positive', () => {
    const result = recentVsHistorical([10, 10, 10, 10, 20, 20, 20], 3);
    expect(result.recentMean).toBe(20);
    expect(result.historicalMean).toBeCloseTo(100 / 7, 5);
    expect(result.deltaPct).toBeGreaterThan(0);
    expect(result.deltaPct).toBeCloseTo(40, 5);
  });
});
