/**
 * Metric Formatting Utilities
 *
 * Provides utilities for extracting and formatting metric values for display
 * in the metrics summary dashboard.
 *
 * @module public/utils/metricFormatters
 */

/**
 * Extract the last value from an array of objects
 *
 * @param {Array<Object>} data - Array of metric data objects
 * @param {string} key - Property key to extract
 * @returns {*} The last value for the specified key, or null if data is invalid
 *
 * @example
 * const data = [
 *   { iteration: 'Sprint 1', totalPoints: 10 },
 *   { iteration: 'Sprint 2', totalPoints: 22 }
 * ];
 * getLastValue(data, 'totalPoints'); // Returns 22
 */
function getLastValue(data, key) {
  // Input validation
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  // Get last item in array
  const lastItem = data[data.length - 1];

  // Return the value for the specified key
  return lastItem[key];
}

/**
 * Format numeric days as string with 'd' suffix
 *
 * @param {number} days - Number of days
 * @returns {string} Formatted string (e.g., "3.2d")
 *
 * @example
 * formatDays(3.2);    // Returns "3.2d"
 * formatDays(5);      // Returns "5.0d"
 * formatDays(null);   // Returns "0.0d"
 */
function formatDays(days) {
  // Handle invalid or negative values
  if (!days || isNaN(days) || days < 0) {
    return '0.0d';
  }

  return `${days.toFixed(1)}d`;
}

/**
 * Format numeric hours as string with 'hr' suffix
 *
 * @param {number} hours - Number of hours
 * @returns {string} Formatted string (e.g., "4.2hr")
 *
 * @example
 * formatHours(4.2);    // Returns "4.2hr"
 * formatHours(2);      // Returns "2.0hr"
 * formatHours(null);   // Returns "0.0hr"
 */
function formatHours(hours) {
  // Handle invalid or negative values
  if (!hours || isNaN(hours) || hours < 0) {
    return '0.0hr';
  }

  return `${hours.toFixed(1)}hr`;
}

/**
 * Format numeric frequency as string with '/day' suffix
 *
 * @param {number} frequency - Frequency per day
 * @returns {string} Formatted string (e.g., "2.3/day")
 *
 * @example
 * formatFrequency(2.3);    // Returns "2.3/day"
 * formatFrequency(5);      // Returns "5.0/day"
 * formatFrequency(null);   // Returns "0.0/day"
 */
function formatFrequency(frequency) {
  // Handle invalid or negative values
  if (!frequency || isNaN(frequency) || frequency < 0) {
    return '0.0/day';
  }

  return `${frequency.toFixed(1)}/day`;
}

/**
 * Format numeric percentage as string with '%' suffix
 *
 * @param {number} percentage - Percentage value
 * @returns {string} Formatted string (e.g., "5.3%")
 *
 * @example
 * formatPercentage(5.3);    // Returns "5.3%"
 * formatPercentage(100);    // Returns "100.0%"
 * formatPercentage(null);   // Returns "0.0%"
 */
function formatPercentage(percentage) {
  // Handle invalid or negative values
  if (!percentage || isNaN(percentage) || percentage < 0) {
    return '0.0%';
  }

  return `${percentage.toFixed(1)}%`;
}

export {
  getLastValue,
  formatDays,
  formatHours,
  formatFrequency,
  formatPercentage
};
