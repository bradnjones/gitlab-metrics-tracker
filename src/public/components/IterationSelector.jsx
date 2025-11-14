import { useState, useEffect, useRef } from 'react';
import { useIterations } from '../hooks/useIterations.js';
import { useIterationFilters } from '../hooks/useIterationFilters.js';
import { useSelectAll } from '../hooks/useSelectAll.js';
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
  BadgesContainer,
  CachedBadge,
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
 * @param {Array<string>} [props.initialSelectedIds] - Initially selected iteration IDs
 * @returns {JSX.Element} Rendered component
 */
const IterationSelector = ({ onSelectionChange, initialSelectedIds = [] }) => {
  // Use custom hooks for data fetching and filtering
  const { iterations, loading, error } = useIterations();

  // Cache status state
  const [cachedIterationIds, setCachedIterationIds] = useState(new Set());

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

  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
  const [isInitialMount, setIsInitialMount] = useState(true);

  // Update selectedIds when initialSelectedIds prop changes (e.g., modal opens)
  // Use ref to track previous value to avoid unnecessary updates
  const prevInitialSelectedIdsRef = useRef(initialSelectedIds);
  useEffect(() => {
    // Only update if initialSelectedIds actually changed (deep comparison of arrays)
    const hasChanged = JSON.stringify(prevInitialSelectedIdsRef.current) !== JSON.stringify(initialSelectedIds);
    if (hasChanged) {
      prevInitialSelectedIdsRef.current = initialSelectedIds;
      setSelectedIds(initialSelectedIds);
    }
  }, [initialSelectedIds]);

  // Fetch cache status to know which iterations are cached
  useEffect(() => {
    const fetchCacheStatus = async () => {
      try {
        const response = await fetch('/api/cache/status');
        const data = await response.json();

        // Extract cached iteration IDs from the response
        const cachedIds = new Set(
          (data.iterations || []).map(iter => iter.iterationId)
        );
        setCachedIterationIds(cachedIds);
      } catch (error) {
        console.debug('Failed to fetch cache status:', error);
        // Fail silently - cached badge is optional enhancement
      }
    };

    fetchCacheStatus();
  }, []);

  // Use Select All hook for Select All checkbox functionality
  const { selectAllRef, handleSelectAll } = useSelectAll(
    filteredIterations,
    selectedIds,
    setSelectedIds
  );

  // Call onSelectionChange when selection changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false);
      // Call onSelectionChange with initial value on mount
      onSelectionChange(selectedIds);
      return;
    }

    // Only call if selectedIds is different from initialSelectedIds
    // This prevents infinite loops when parent updates initialSelectedIds in response to onSelectionChange
    if (JSON.stringify(selectedIds) !== JSON.stringify(initialSelectedIds)) {
      onSelectionChange(selectedIds);
    }
  }, [selectedIds]); // Removed onSelectionChange from dependencies to prevent loops

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
        {filteredIterations.map(iteration => {
          const isCached = cachedIterationIds.has(iteration.id);

          return (
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
                <BadgesContainer>
                  <IterationState className={iteration.state}>
                    {iteration.state}
                  </IterationState>
                  {isCached && (
                    <CachedBadge title="Data is cached and will load instantly">
                      Cached
                    </CachedBadge>
                  )}
                </BadgesContainer>
              </IterationDetails>
            </IterationItem>
          );
        })}
      </IterationList>
    </Container>
  );
};

export default IterationSelector;
