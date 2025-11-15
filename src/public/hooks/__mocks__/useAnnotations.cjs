/**
 * Jest mock for useAnnotations hook (CommonJS version)
 *
 * This mock allows Jest/babel-jest to properly import the ES module
 * by providing a CommonJS version for test environments.
 */

/**
 * Mock useAnnotations hook that returns empty annotations by default
 *
 * @param {string} metricKey - Metric identifier
 * @param {string[]} dateLabels - Array of date labels
 * @returns {Object} {annotations, loading, error}
 */
function useAnnotations(metricKey, dateLabels = []) {
  return {
    annotations: {}, // Empty annotations object by default
    loading: false,
    error: null
  };
}

module.exports = { useAnnotations };
