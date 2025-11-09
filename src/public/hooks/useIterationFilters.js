import { useState, useMemo } from 'react';

/**
 * Custom hook for managing iteration filtering logic
 * Handles state filter, cadence filter, search query, and filtered results
 *
 * @param {Array<Object>} iterations - Array of iteration objects to filter
 * @param {Function} formatDate - Function to format dates for searching
 * @returns {{
 *   stateFilter: string,
 *   setStateFilter: Function,
 *   cadenceFilter: string,
 *   setCadenceFilter: Function,
 *   searchQuery: string,
 *   setSearchQuery: Function,
 *   uniqueStates: Array<string>,
 *   uniqueCadences: Array<string>,
 *   filteredIterations: Array<Object>
 * }}
 *
 * @example
 * const {
 *   stateFilter,
 *   setStateFilter,
 *   searchQuery,
 *   setSearchQuery,
 *   filteredIterations
 * } = useIterationFilters(iterations, formatDate);
 */
export function useIterationFilters(iterations, formatDate) {
  const [stateFilter, setStateFilter] = useState('');
  const [cadenceFilter, setCadenceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique states from iterations
  const uniqueStates = useMemo(() => {
    return [...new Set(iterations.map(i => i.state))].filter(Boolean);
  }, [iterations]);

  // Get unique cadences from iterations
  const uniqueCadences = useMemo(() => {
    return [...new Set(iterations.map(i => i.iterationCadence?.title))].filter(Boolean);
  }, [iterations]);

  // Filter iterations by state, cadence, and search
  const filteredIterations = useMemo(() => {
    return iterations.filter(iteration => {
      // State filter
      if (stateFilter && iteration.state !== stateFilter) {
        return false;
      }

      // Cadence filter
      if (cadenceFilter && iteration.iterationCadence?.title !== cadenceFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const title = (iteration.title || iteration.iterationCadence?.title || `Sprint ${iteration.iid}`).toLowerCase();
        const startDate = formatDate(iteration.startDate).toLowerCase();
        const dueDate = formatDate(iteration.dueDate).toLowerCase();

        if (!title.includes(searchLower) &&
            !startDate.includes(searchLower) &&
            !dueDate.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [iterations, stateFilter, cadenceFilter, searchQuery, formatDate]);

  return {
    stateFilter,
    setStateFilter,
    cadenceFilter,
    setCadenceFilter,
    searchQuery,
    setSearchQuery,
    uniqueStates,
    uniqueCadences,
    filteredIterations
  };
}
