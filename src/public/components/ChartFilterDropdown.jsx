/**
 * ChartFilterDropdown Component
 *
 * Provides per-chart iteration filtering with dropdown UI matching prototype's iteration selector.
 * Allows users to exclude specific iterations from individual charts while maintaining global selection.
 *
 * **Design Pattern:** Dropdown menu with checkboxes (matches prototype iteration selector)
 * **Position:** Top-right of chart card (inline with chart title)
 * **Default State:** All globally selected iterations are visible
 * **Filtered State:** Warning badge shows "X of Y iterations" when exclusions exist
 *
 * @module components/ChartFilterDropdown
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  ChartFilterContainer,
  FilterButton,
  FilterBadge,
  DropdownOverlay,
  DropdownMenu,
  DropdownHeader,
  CloseButton,
  IterationList,
  IterationItem,
  IterationDetails,
  IterationTitle,
  IterationDates,
  DropdownFooter,
  ResetButton,
  ApplyButton,
  SelectionCount
} from './ChartFilterDropdown.styles';

/**
 * Filter icon SVG component (funnel icon)
 * @returns {JSX.Element} Filter icon
 */
const FilterIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

/**
 * ChartFilterDropdown Component
 *
 * @param {Object} props - Component props
 * @param {Array<Object>} props.availableIterations - All globally selected iterations [{id, title, startDate, dueDate}]
 * @param {Array<string>} props.excludedIterationIds - Currently excluded iteration IDs for this chart
 * @param {Function} props.onFilterChange - Callback when exclusions change: (excludedIds: string[]) => void
 * @param {Function} props.onReset - Callback to reset to global selection (clear all exclusions)
 * @param {string} [props.chartTitle='Chart'] - Chart title for accessibility labels
 * @returns {JSX.Element} Rendered dropdown component
 *
 * @example
 * <ChartFilterDropdown
 *   availableIterations={[
 *     { id: '1', title: 'Sprint 10/25', startDate: '2024-10-25', dueDate: '2024-11-08' },
 *     { id: '2', title: 'Sprint 11/08', startDate: '2024-11-08', dueDate: '2024-11-22' }
 *   ]}
 *   excludedIterationIds={['1']}
 *   onFilterChange={(excludedIds) => console.log('Excluded:', excludedIds)}
 *   onReset={() => console.log('Reset to global')}
 *   chartTitle="Lead Time Chart"
 * />
 */
const ChartFilterDropdown = ({
  availableIterations,
  excludedIterationIds,
  onFilterChange,
  onReset,
  chartTitle = 'Chart'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingExcluded, setPendingExcluded] = useState(excludedIterationIds);

  // Sync pending state when prop changes (external update)
  useEffect(() => {
    setPendingExcluded(excludedIterationIds);
  }, [excludedIterationIds]);

  // Add Escape key handler
  useEffect(() => {
    /**
     * Handle Escape key press to close dropdown
     * @param {KeyboardEvent} e - Keyboard event
     */
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  /**
   * Format date to MM/DD/YYYY format
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  /**
   * Toggle dropdown open/closed
   */
  const toggleDropdown = () => {
    if (!isOpen) {
      // Opening: Reset pending state to current state
      setPendingExcluded(excludedIterationIds);
    }
    setIsOpen(!isOpen);
  };

  /**
   * Close dropdown without applying changes
   */
  const handleClose = () => {
    setPendingExcluded(excludedIterationIds); // Revert to saved state
    setIsOpen(false);
  };

  /**
   * Toggle iteration exclusion in pending state
   * @param {string} iterationId - Iteration ID to toggle
   */
  const toggleIteration = (iterationId) => {
    setPendingExcluded(prev => {
      if (prev.includes(iterationId)) {
        return prev.filter(id => id !== iterationId);
      } else {
        return [...prev, iterationId];
      }
    });
  };

  /**
   * Apply pending exclusions
   */
  const handleApply = () => {
    onFilterChange(pendingExcluded);
    setIsOpen(false);
  };

  /**
   * Reset to global selection (clear all exclusions)
   */
  const handleReset = () => {
    setPendingExcluded([]);
    onReset();
    setIsOpen(false);
  };

  // Calculate counts
  const totalCount = availableIterations.length;
  const visibleCount = totalCount - excludedIterationIds.length;
  const hasExclusions = excludedIterationIds.length > 0;
  const pendingVisibleCount = totalCount - pendingExcluded.length;

  return (
    <ChartFilterContainer>
      {/* Filter Button */}
      <FilterButton
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Filter iterations for ${chartTitle}`}
      >
        <FilterIcon />
        Filter
      </FilterButton>

      {/* Warning Badge (when filtered) */}
      {hasExclusions && (
        <FilterBadge
          role="status"
          aria-label={`Showing ${visibleCount} of ${totalCount} iterations`}
        >
          {visibleCount}/{totalCount}
        </FilterBadge>
      )}

      {/* Dropdown Overlay (click outside to close) */}
      <DropdownOverlay
        $isOpen={isOpen}
        onClick={handleClose}
      />

      {/* Dropdown Menu */}
      <DropdownMenu
        $isOpen={isOpen}
        role="dialog"
        aria-label={`Filter iterations for ${chartTitle}`}
      >
        {/* Header */}
        <DropdownHeader>
          <h4>Filter Iterations</h4>
          <CloseButton
            onClick={handleClose}
            aria-label="Close filter menu"
          />
        </DropdownHeader>

        {/* Selection Count */}
        <SelectionCount>
          Showing {pendingVisibleCount} of {totalCount} iterations
        </SelectionCount>

        {/* Iteration List */}
        <IterationList>
          {availableIterations.map(iteration => {
            const isExcluded = pendingExcluded.includes(iteration.id);
            const isVisible = !isExcluded;
            // Fallback title if not provided (similar to IterationSelectorToolbar)
            const displayTitle = iteration.title || iteration.iterationCadence?.title || `Sprint ${iteration.iid}` || iteration.id;

            return (
              <IterationItem key={iteration.id}>
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => toggleIteration(iteration.id)}
                  aria-label={`${isVisible ? 'Hide' : 'Show'} ${displayTitle}`}
                />
                <IterationDetails>
                  <IterationTitle>{displayTitle}</IterationTitle>
                  <IterationDates>
                    {formatDate(iteration.startDate)} - {formatDate(iteration.dueDate)}
                  </IterationDates>
                </IterationDetails>
              </IterationItem>
            );
          })}
        </IterationList>

        {/* Footer Actions */}
        <DropdownFooter>
          <ResetButton
            onClick={handleReset}
            disabled={!hasExclusions && pendingExcluded.length === 0}
            aria-label="Reset to global selection"
          >
            Reset to Global
          </ResetButton>
          <ApplyButton
            onClick={handleApply}
            aria-label="Apply filter changes"
          >
            Apply
          </ApplyButton>
        </DropdownFooter>
      </DropdownMenu>
    </ChartFilterContainer>
  );
};

ChartFilterDropdown.propTypes = {
  availableIterations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,  // Optional - may be null/undefined from localStorage
      startDate: PropTypes.string,
      dueDate: PropTypes.string
    })
  ).isRequired,
  excludedIterationIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  chartTitle: PropTypes.string
};

export default ChartFilterDropdown;
