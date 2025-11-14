/**
 * Jest mock for controlLimits module (CommonJS version)
 *
 * This mock allows Jest/babel-jest to properly import the ES module
 * by providing a CommonJS version for test environments.
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

module.exports = { calculateControlLimits };
