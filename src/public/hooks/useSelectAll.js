import { useRef, useEffect } from 'react';

/**
 * Custom hook for managing "Select All" checkbox functionality
 * Handles checkbox state (checked, unchecked, indeterminate) and selection logic
 *
 * @param {Array<Object>} filteredIterations - Array of currently filtered iterations
 * @param {Array<string>} selectedIds - Array of currently selected iteration IDs
 * @param {Function} setSelectedIds - Function to update selected IDs
 * @returns {{
 *   selectAllRef: Object,
 *   handleSelectAll: Function
 * }}
 *
 * @example
 * const { selectAllRef, handleSelectAll } = useSelectAll(
 *   filteredIterations,
 *   selectedIds,
 *   setSelectedIds
 * );
 */
export function useSelectAll(filteredIterations, selectedIds, setSelectedIds) {
  const selectAllRef = useRef(null);

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

  // Update Select All checkbox state (checked/unchecked/indeterminate)
  useEffect(() => {
    if (!selectAllRef.current || filteredIterations.length === 0) return;

    const filteredIds = filteredIterations.map(iteration => iteration.id);
    const selectedFilteredCount = filteredIds.filter(id => selectedIds.includes(id)).length;

    if (selectedFilteredCount === 0) {
      // None selected
      selectAllRef.current.checked = false;
      selectAllRef.current.indeterminate = false;
    } else if (selectedFilteredCount === filteredIds.length) {
      // All selected
      selectAllRef.current.checked = true;
      selectAllRef.current.indeterminate = false;
    } else {
      // Some selected
      selectAllRef.current.checked = false;
      selectAllRef.current.indeterminate = true;
    }
  }, [selectedIds, filteredIterations]);

  return {
    selectAllRef,
    handleSelectAll
  };
}
