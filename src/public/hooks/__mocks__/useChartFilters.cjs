/**
 * Jest mock for useChartFilters hook (CommonJS version)
 *
 * This mock allows Jest/babel-jest to handle the ES module when chart components
 * are tested in a CommonJS environment. It preserves the localStorage behaviour
 * so component-level tests that assert on localStorage calls continue to pass.
 */
const { useState, useEffect } = require('react');

/**
 * Mock useChartFilters hook — mirrors the real implementation's localStorage I/O.
 *
 * @param {string} storageKey - The localStorage key to persist filters under
 * @returns {[string[], Function]} Tuple of [excludedIterationIds, setExcludedIterationIds]
 */
function useChartFilters(storageKey) {
  const [excludedIterationIds, setExcludedIterationIds] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setExcludedIterationIds(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load chart filters from localStorage:', error);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      if (excludedIterationIds.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(excludedIterationIds));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn('Failed to save chart filters to localStorage:', error);
    }
  }, [excludedIterationIds, storageKey]);

  return [excludedIterationIds, setExcludedIterationIds];
}

module.exports = { useChartFilters };
