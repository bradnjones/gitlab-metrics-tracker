import { useRef, useEffect, useMemo } from 'react';

/**
 * Custom hook for managing "Select All" checkbox functionality
 * Handles checkbox state (checked, unchecked, indeterminate) and selection logic
 *
 * @param {Array<Object>} filteredIterations - Array of currently filtered iterations
 * @param {Array<string>} selectedIds - Array of currently selected iteration IDs
 * @param {Function} setSelectedIds - Function to update selected IDs
 * @returns {{
 *   selectAllRef: Object,
 *   isChecked: boolean,
 *   isIndeterminate: boolean,
 *   handleSelectAll: Function
 * }}
 *
 * @example
 * const { selectAllRef, isChecked, isIndeterminate, handleSelectAll } = useSelectAll(
 *   filteredIterations,
 *   selectedIds,
 *   setSelectedIds
 * );
 */
export function useSelectAll(filteredIterations, selectedIds, setSelectedIds) {
  const selectAllRef = useRef(null);

  /**
   * Compute checkbox state based on current selections
   */
  const { isChecked, isIndeterminate } = useMemo(() => {
    // If no filtered iterations or no selections, unchecked
    if (filteredIterations.length === 0 || selectedIds.length === 0) {
      return { isChecked: false, isIndeterminate: false };
    }

    const filteredIds = filteredIterations.map(iteration => iteration.id);
    const selectedFilteredCount = filteredIds.filter(id => selectedIds.includes(id)).length;

    if (selectedFilteredCount === 0) {
      // None selected
      return { isChecked: false, isIndeterminate: false };
    } else if (selectedFilteredCount === filteredIds.length) {
      // All selected
      return { isChecked: true, isIndeterminate: false };
    } else {
      // Some selected (indeterminate)
      return { isChecked: false, isIndeterminate: true };
    }
  }, [filteredIterations, selectedIds]);

  /**
   * Handle Select All checkbox change
   * Selects or deselects all filtered iterations
   * @param {boolean} checked - Whether the checkbox is checked
   */
  const handleSelectAll = (checked) => {
    const filteredIds = filteredIterations.map(iteration => iteration.id);

    if (checked) {
      // Select all filtered iterations
      setSelectedIds(filteredIds);
    } else {
      // Deselect all filtered iterations
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    }
  };

  // Update indeterminate state on ref (can't be set via prop)
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  return {
    selectAllRef,
    isChecked,
    isIndeterminate,
    handleSelectAll
  };
}
