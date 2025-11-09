import { useState, useEffect, useMemo, useRef } from 'react';
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
  const [iterations, setIterations] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [stateFilter, setStateFilter] = useState('');
  const [cadenceFilter, setCadenceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const selectAllRef = useRef(null);

  // Fetch iterations on mount
  useEffect(() => {
    const fetchIterations = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/iterations');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setIterations(data.iterations || []);
      } catch (err) {
        setError(`Error loading iterations: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchIterations();
  }, []);

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
   * Format date string for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  // Get unique states from iterations
  const uniqueStates = [...new Set(iterations.map(i => i.state))].filter(Boolean);

  // Get unique cadences from iterations
  const uniqueCadences = [...new Set(iterations.map(i => i.iterationCadence?.title))].filter(Boolean);

  // Filter iterations by state, cadence, and search
  // useMemo prevents unnecessary recalculation when other state changes
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
  }, [iterations, stateFilter, cadenceFilter, searchQuery]);

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
