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
 * Matches prototype max-height and border styling
 * @component
 */
const IterationList = styled.div`
  margin: 1.5rem 0;
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
 * Header section for iteration list controls
 * Contains filters and controls
 * @component
 */
const IterationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

/**
 * Container for filter dropdowns
 * @component
 */
const FilterControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

/**
 * Individual filter group (label + dropdown)
 * @component
 */
const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
`;

/**
 * Filter label text
 * @component
 */
const FilterLabel = styled.label`
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: nowrap;
`;

/**
 * Filter dropdown select element
 * @component
 */
const FilterSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.9rem;
  background: var(--bg-primary);
  cursor: pointer;
  color: var(--text-primary);
  font-family: inherit;
  transition: border-color 0.2s;
  min-width: 150px;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: var(--primary);
  }

  @media (max-width: 768px) {
    width: 100%;
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

  // Get unique states from iterations
  const uniqueStates = [...new Set(iterations.map(i => i.state))].filter(Boolean);

  // Filter iterations by state
  const filteredIterations = stateFilter
    ? iterations.filter(i => i.state === stateFilter)
    : iterations;

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
      <IterationList>
        <IterationHeader>
          <FilterControls>
            <FilterGroup>
              <FilterLabel htmlFor="state-filter">Filter by State:</FilterLabel>
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
            </FilterGroup>
          </FilterControls>
        </IterationHeader>
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
