/**
 * @module trendCalculator
 * Statistical trend analysis utilities for sprint metrics.
 */

/**
 * Ordinary least squares linear regression over an array of values (index = x, value = y)
 * @param {number[]} values
 * @returns {{ slope: number, intercept: number, r2: number }}
 */
export function linearRegression(values) {
  const n = values.length;
  if (n < 2) {
    const intercept = n === 1 ? values[0] : 0;
    return { slope: 0, intercept, r2: 0 };
  }

  const mean = values.reduce((s, v) => s + v, 0) / n;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    return { slope: 0, intercept: mean, r2: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - mean) ** 2;
  }

  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

/**
 * Classify trend direction
 * @param {number} slope - regression slope
 * @param {number} mean - mean of the series
 * @param {boolean} [higherIsBetter=true] - whether a positive slope is good
 * @returns {'improving'|'stable'|'degrading'}
 */
export function classifyTrend(slope, mean, higherIsBetter = true) {
  const relativeSlope = mean === 0 ? 0 : Math.abs(slope) / Math.abs(mean);
  if (slope === 0 || relativeSlope < 0.02) return 'stable';
  if (higherIsBetter) return slope > 0 ? 'improving' : 'degrading';
  return slope < 0 ? 'improving' : 'degrading';
}

/**
 * Compare last N values to the historical mean
 * @param {number[]} values
 * @param {number} [n=3]
 * @returns {{ recentMean: number, historicalMean: number, delta: number, deltaPct: number }}
 */
export function recentVsHistorical(values, n = 3) {
  if (values.length === 0) {
    return { recentMean: 0, historicalMean: 0, delta: 0, deltaPct: 0 };
  }

  const recent = values.length <= n ? values : values.slice(-n);
  const recentMean = recent.reduce((s, v) => s + v, 0) / recent.length;
  const historicalMean = values.reduce((s, v) => s + v, 0) / values.length;
  const delta = recentMean - historicalMean;
  const deltaPct = historicalMean === 0 ? 0 : (delta / historicalMean) * 100;

  return { recentMean, historicalMean, delta, deltaPct };
}
