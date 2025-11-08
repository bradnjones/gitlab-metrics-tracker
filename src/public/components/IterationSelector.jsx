import { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: 20px;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const ErrorMessage = styled.div`
  padding: 20px;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const IterationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 20px 0;
`;

const IterationItem = styled.label`
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #f5f5f5;
  }

  input[type="checkbox"] {
    margin-right: 12px;
  }
`;

const IterationDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const IterationTitle = styled.strong`
  font-size: 14px;
  color: #333;
`;

const IterationDates = styled.span`
  font-size: 12px;
  color: #666;
`;

const IterationState = styled.span`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  text-transform: uppercase;
  width: fit-content;

  &.closed {
    background-color: #e0e0e0;
    color: #666;
  }

  &.current {
    background-color: #e3f2fd;
    color: #1976d2;
  }

  &.upcoming {
    background-color: #fff3e0;
    color: #f57c00;
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
        {iterations.map(iteration => (
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
