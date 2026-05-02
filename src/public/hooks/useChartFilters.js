import { useState, useEffect } from 'react';

/**
 * Custom hook for persisting chart filter exclusions to localStorage.
 * Returns a stateful array of excluded iteration IDs and a setter,
 * with automatic read/write sync to the provided storage key.
 *
 * @param {string} storageKey - The localStorage key to persist filters under
 * @returns {[string[], Function]} Tuple of [excludedIterationIds, setExcludedIterationIds]
 *
 * @example
 * const [excludedIterationIds, setExcludedIterationIds] = useChartFilters('chart-filters-velocity');
 */
export function useChartFilters(storageKey) {
  const [excludedIterationIds, setExcludedIterationIds] = useState([]);

  // Load excluded iterations from localStorage on mount
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

  // Save excluded iterations to localStorage whenever they change
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
