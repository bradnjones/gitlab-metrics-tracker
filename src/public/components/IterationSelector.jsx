import { useState, useEffect } from 'react';
import styled from 'styled-components';

/**
 * Container for the entire iteration selector component
 * @component
 */
const Container = styled.div`
  padding: 0;
`;

/**
 * Loading state message
 * @component
 */
const LoadingMessage = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  font-size: 1rem;
`;

/**
 * Error message display
 * @component
 */
const ErrorMessage = styled.div`
  padding: 1rem;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  color: #c33;
  font-size: 0.95rem;
`;

/**
 * Empty state message when no iterations found
 * @component
 */
const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  font-size: 1rem;
`;

/**
 * Scrollable list container for iterations
 * Removed top border-radius since controls are now separate
 * @component
 */
const IterationList = styled.div`
  margin: 0 1rem 1.5rem 1rem;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-primary);
`;

/**
 * Individual iteration item with checkbox
 * Fixed alignment: checkbox and details are siblings in flex container
 * Checkbox aligns to top via align-items: center with single-line flex
 * @component
 */
const IterationItem = styled.label`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.2s;
  background: var(--bg-primary);

  /* Remove border from last item */
  &:last-child {
    border-bottom: none;
  }

  /* Hover state - smooth background transition */
  &:hover {
    background: var(--bg-secondary);
  }

  /* Focus-within for keyboard accessibility */
  &:focus-within {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
  }

  /* Checkbox styling */
  input[type="checkbox"] {
    margin: 0 1rem 0 0;
    width: 18px;
    height: 18px;
    cursor: pointer;
    flex-shrink: 0; /* Prevent checkbox from shrinking */

    /* Align checkbox to optical center of first line */
    align-self: flex-start;
    margin-top: 2px; /* Optical alignment with title text */
  }
`;

/**
 * Container for iteration text details (title, dates, state)
 * Uses column layout for vertical stacking
 * @component
 */
const IterationDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0; /* Allow text truncation if needed */
`;

/**
 * Iteration title - primary identifier
 * Bold, larger text for clear hierarchy
 * @component
 */
const IterationTitle = styled.strong`
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
`;

/**
 * Date range display
 * Secondary text, smaller and grayed
 * @component
 */
const IterationDates = styled.span`
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
`;

/**
 * State badge (closed, current, upcoming)
 * Uppercase, colored background, inline-block for width fit-content
 * @component
 */
const IterationState = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  width: fit-content;
  line-height: 1;

  /* State color variants */
  &.closed {
    background: var(--secondary);
    color: white;
  }

  &.current,
  &.active {
    background: var(--success);
    color: white;
  }

  &.upcoming {
    background: var(--warning);
    color: white;
  }
`;

/**
 * Unified controls bar containing search and filters
 * Horizontal layout with consistent spacing and visual treatment
 * @component
 */
const ControlsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin: 1rem;

  /* Mobile: Stack vertically */
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
`;

/**
 * Search input wrapper - grows to fill available space
 * @component
 */
const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;

  @media (max-width: 640px) {
    min-width: 0;
    width: 100%;
  }
`;

/**
 * Filter controls section - compact horizontal layout
 * @component
 */
const FilterSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;

  @media (max-width: 640px) {
    width: 100%;
    justify-content: space-between;
  }
`;

/**
 * Filter label - concise text
 * @component
 */
const FilterLabel = styled.label`
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
`;

/**
 * Filter dropdown select
 * Matches search input height and style
 * @component
 */
const FilterSelect = styled.select`
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease-out;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  min-width: 140px;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover:not(:focus) {
    border-color: #cbd5e1;
  }

  @media (max-width: 640px) {
    flex: 1;
    min-width: 0;
  }
`;

/**
 * Search input field with icon spacing
 * Removed heavy border styling - relies on parent container
 * @component
 */
const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2.25rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: all 0.2s ease-out;

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.7;
  }

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover:not(:focus) {
    border-color: #cbd5e1;
  }
`;

/**
 * Search icon positioned inside input
 * @component
 */
const SearchIcon = styled.span`
  position: absolute;
  left: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
  font-size: 0.875rem;
  display: flex;
  align-items: center;

  &::before {
    content: '🔍';
  }
`;

/**
 * Clear button for search input
 * Only visible when search has content
 * @component
 */
const ClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease-out;
  display: ${props => props.$visible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--text-primary);
    background: var(--bg-secondary);
  }

  &:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    color: var(--primary);
  }

  &::before {
    content: '✕';
  }
`;

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
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Get unique states from iterations
  const uniqueStates = [...new Set(iterations.map(i => i.state))].filter(Boolean);

  // Filter iterations by state and search
  const filteredIterations = iterations.filter(iteration => {
    // State filter
    if (stateFilter && iteration.state !== stateFilter) {
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
