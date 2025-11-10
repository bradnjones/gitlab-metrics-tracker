import { useState, useEffect, useRef } from 'react';
import { useIterations } from '../hooks/useIterations.js';
import { useIterationFilters } from '../hooks/useIterationFilters.js';
import {
  Container,
  LoadingMessage,
  ErrorMessage,
  EmptyState,
  IterationList,
  IterationItem,
  IterationDetails,
  IterationTitle,
  IterationDates,
  IterationState,
  ControlsBar,
  SearchWrapper,
  FilterSection,
  FilterLabel,
  FilterSelect,
  SearchInput,
  SearchIcon,
  ClearButton,
  SelectAllSection,
  SelectAllLabel
} from './IterationSelector.styles.jsx';

/**
 * IterationSelector Component
 * Displays a list of GitLab iterations and allows multi-selection
 *
 * @param {Object} props - Component props
 * @param {Function} props.onSelectionChange - Callback function called when selection changes
 * @returns {JSX.Element} Rendered component
 */
const IterationSelector = ({ onSelectionChange }) => {
  // Use custom hooks for data fetching and filtering
  const { iterations, loading, error } = useIterations();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const {
    stateFilter,
    setStateFilter,
    cadenceFilter,
    setCadenceFilter,
    searchQuery,
    setSearchQuery,
    uniqueStates,
    uniqueCadences,
    filteredIterations
  } = useIterationFilters(iterations, formatDate);

  const [selectedIds, setSelectedIds] = useState([]);
  const selectAllRef = useRef(null);

  // Call onSelectionChange when selection changes
  useEffect(() => {
    onSelectionChange(selectedIds);
  }, [selectedIds, onSelectionChange]);

  /**
   * Handle checkbox change for an iteration
   * @param {string} iterationId - The ID of the iteration
   * @param {boolean} checked - Whether the checkbox is checked
   */
  const handleCheckboxChange = (iterationId, checked) => {
    setSelectedIds(prev => {
      if (checked) {
        return [...prev, iterationId];
      } else {
        return prev.filter(id => id !== iterationId);
      }
    });
  };

  /**
   * Clear search handler
   */
  const handleClearSearch = () => {
    setSearchQuery('');
  };

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

  if (loading) {
    return (
      <Container>
        <LoadingMessage>Loading iterations...</LoadingMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  if (iterations.length === 0) {
    return (
      <Container>
        <EmptyState>No iterations found</EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      {/* Unified Controls Bar */}
      <ControlsBar>
        {/* Select All Section */}
        <SelectAllSection>
          <SelectAllLabel>
            <input
              ref={selectAllRef}
              type="checkbox"
              onChange={(e) => handleSelectAll(e.target.checked)}
              aria-label="Select All"
            />
            Select All
          </SelectAllLabel>
        </SelectAllSection>

        {/* Search Section */}
        <SearchWrapper>
          <SearchIcon />
          <SearchInput
            type="search"
            placeholder="Search iterations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search iterations"
          />
          <ClearButton
            $visible={searchQuery.length > 0}
            onClick={handleClearSearch}
            aria-label="Clear search"
            type="button"
          />
        </SearchWrapper>

        {/* Filter Section */}
        <FilterSection>
          <FilterLabel htmlFor="state-filter">State:</FilterLabel>
          <FilterSelect
            id="state-filter"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">All States</option>
            {uniqueStates.map(state => (
              <option key={state} value={state}>
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </option>
            ))}
          </FilterSelect>

          <FilterLabel htmlFor="cadence-filter">Cadence:</FilterLabel>
          <FilterSelect
            id="cadence-filter"
            value={cadenceFilter}
            onChange={(e) => setCadenceFilter(e.target.value)}
          >
            <option value="">All Cadences</option>
            {uniqueCadences.map(cadence => (
              <option key={cadence} value={cadence}>
                {cadence}
              </option>
            ))}
          </FilterSelect>
        </FilterSection>
      </ControlsBar>

      {/* Iteration List */}
      <IterationList>
        {filteredIterations.map(iteration => (
          <IterationItem key={iteration.id}>
            <input
              type="checkbox"
              checked={selectedIds.includes(iteration.id)}
              onChange={(e) => handleCheckboxChange(iteration.id, e.target.checked)}
              aria-label={iteration.title || `Sprint ${iteration.iid}`}
            />
            <IterationDetails>
              <IterationTitle>
                {iteration.title || iteration.iterationCadence?.title || `Sprint ${iteration.iid}`}
              </IterationTitle>
              <IterationDates>
                {formatDate(iteration.startDate)} - {formatDate(iteration.dueDate)}
              </IterationDates>
              <IterationState className={iteration.state}>
                {iteration.state}
              </IterationState>
            </IterationDetails>
          </IterationItem>
        ))}
      </IterationList>
    </Container>
  );
};

export default IterationSelector;
