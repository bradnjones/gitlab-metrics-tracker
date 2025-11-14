/**
 * Statistical Process Control (SPC) Control Limits Calculator
 *
 * Calculates control limits for XmR charts (Individual and Moving Range charts)
 * using the individuals chart formula with constant 2.66.
 *
 * Formulas:
 * - Average = mean of all individual values
 * - Moving Range (MR) = |current value - previous value|
 * - MR Bar = average of all moving ranges
 * - UCL (Upper Control Limit) = Average + 2.66 × MR Bar
 * - LCL (Lower Control Limit) = max(0, Average - 2.66 × MR Bar)
 *
 * @module public/utils/controlLimits
 */

/**
 * Statistical Process Control limits
 * @typedef {Object} ControlLimits
 * @property {number} average - Mean of the data points
 * @property {number} upperLimit - Upper Control Limit (UCL)
 * @property {number} lowerLimit - Lower Control Limit (LCL), never below 0
 * @property {number} mrBar - Average Moving Range
 */

/**
 * Calculate Statistical Process Control (SPC) control limits for a dataset
 *
 * @param {number[]} data - Array of numeric data points
 * @returns {ControlLimits} Calculated control limits
 * @throws {Error} If data is empty, null, undefined, or not an array
 *
 * @example
 * const data = [2.2, 2.4, 4.7, 3.9, 2.3, 6.3, 7.0];
 * const limits = calculateControlLimits(data);
 * // {
 * //   average: 4.11,
 * //   upperLimit: 9.87,
 * //   lowerLimit: 0,
 * //   mrBar: 2.17
 * // }
 */
function calculateControlLimits(data) {
  // Input validation
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Data array must contain at least one value');
  }

  // Filter out null and undefined values
  const cleanData = data.filter(val => val !== null && val !== undefined);

  if (cleanData.length === 0) {
    throw new Error('Data array must contain at least one value');
  }

  // Calculate average (center line)
  const average = cleanData.reduce((sum, val) => sum + val, 0) / cleanData.length;

  // Calculate moving ranges (absolute differences between consecutive values)
  const movingRanges = [];
  for (let i = 1; i < cleanData.length; i++) {
    movingRanges.push(Math.abs(cleanData[i] - cleanData[i - 1]));
  }

  // Calculate MR Bar (average of moving ranges)
  const mrBar = movingRanges.length > 0
    ? movingRanges.reduce((sum, val) => sum + val, 0) / movingRanges.length
    : 0;

  // SPC constant for individuals chart (d2 for n=2)
  const SPC_CONSTANT = 2.66;

  // Calculate control limits
  const upperLimit = average + (SPC_CONSTANT * mrBar);
  const lowerLimit = Math.max(0, average - (SPC_CONSTANT * mrBar));

  return {
    average,
    upperLimit,
    lowerLimit,
    mrBar
  };
}

export { calculateControlLimits };
