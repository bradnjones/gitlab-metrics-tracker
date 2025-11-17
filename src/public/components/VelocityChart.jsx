import { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Line } from 'react-chartjs-2';
// TESTING: Removed fetchWithRetry to see if plain fetch works with cache
// import { fetchWithRetry } from '../utils/fetchWithRetry.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { calculateControlLimits } from '../utils/controlLimits.js';
import { useAnnotations } from '../hooks/useAnnotations.js';
import ChartFilterDropdown from './ChartFilterDropdown';
import ChartEnlargementModal from './ChartEnlargementModal';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

// localStorage key for per-chart filter exclusions
const FILTER_STORAGE_KEY = 'chart-filters-velocity';

const Container = styled.div`
  padding: 20px;
`;

const FilterContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
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

const ChartContainer = styled.div`
  position: relative;
  height: 400px;
  padding: 20px;
  cursor: pointer;
  border-radius: 8px;
  transition: box-shadow 200ms ease-in-out;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
`;

/**
 * VelocityChart Component
 * Displays velocity metrics in a line chart
 *
 * @param {Object} props - Component props
 * @param {Array<Object>} props.selectedIterations - Array of selected iteration objects [{id, title, startDate, dueDate}]
 * @param {number} [props.annotationRefreshKey=0] - Key that triggers annotation re-fetch
 * @returns {JSX.Element} Rendered component
 */
const VelocityChart = ({ selectedIterations = [], annotationRefreshKey = 0 }) => {
  const [chartData, setChartData] = useState(null);
  const [controlLimits, setControlLimits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [excludedIterationIds, setExcludedIterationIds] = useState([]);
  const [isEnlarged, setIsEnlarged] = useState(false);

  // Load excluded iterations from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setExcludedIterationIds(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load chart filters from localStorage:', error);
    }
  }, []);

  // Save excluded iterations to localStorage whenever they change
  useEffect(() => {
    try {
      if (excludedIterationIds.length > 0) {
        localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(excludedIterationIds));
      } else {
        localStorage.removeItem(FILTER_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to save chart filters to localStorage:', error);
    }
  }, [excludedIterationIds]);

  // Clean up excluded iterations that are no longer in selectedIterations
  useEffect(() => {
    if (!selectedIterations || selectedIterations.length === 0) {
      return;
    }

    const selectedIds = selectedIterations.map(iter => iter.id);
    const validExcludedIds = excludedIterationIds.filter(id => selectedIds.includes(id));

    // Only update if some excluded iterations were removed from selection
    if (validExcludedIds.length !== excludedIterationIds.length) {
      setExcludedIterationIds(validExcludedIds);
    }
  }, [selectedIterations]);

  // Filter iterations based on exclusions (memoized to prevent flickering)
  const visibleIterations = useMemo(
    () => selectedIterations.filter(iter => !excludedIterationIds.includes(iter.id)),
    [selectedIterations, excludedIterationIds]
  );

  const iterationIds = useMemo(
    () => visibleIterations.map(iter => iter.id),
    [visibleIterations]
  );

  // Fetch annotations for velocity metric
  const { annotations: velocityAnnotations } = useAnnotations(
    'velocity',
    chartData ? chartData.labels : [],
    annotationRefreshKey
  );

  // Fetch velocity data when iterationIds change
  useEffect(() => {
    // Don't fetch if no iterations selected
    if (!iterationIds || iterationIds.length === 0) {
      setChartData(null);
      return;
    }

    const fetchVelocityData = async () => {
      try {
        setLoading(true);
        setError(null);

        const iterationsParam = iterationIds.join(',');
        // TESTING: Using plain fetch instead of fetchWithRetry
        const response = await fetch(`/api/metrics/velocity?iterations=${iterationsParam}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Transform API response to Chart.js format
        const transformedData = transformToChartData(data);
        setChartData(transformedData);

        // Calculate control limits for Story Points data
        const pointsData = data.metrics.map(m => m.completedPoints);
        const limits = calculateControlLimits(pointsData);
        setControlLimits(limits);
      } catch (err) {
        setError(`Error loading velocity data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVelocityData();
  }, [iterationIds]);

  /**
   * Format date to short MM/DD format (e.g., "8/3")
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  /**
   * Transform API response to Chart.js data format
   * @param {Object} apiData - Raw API response
   * @returns {Object} Chart.js compatible data object
   */
  const transformToChartData = (apiData) => {
    const labels = apiData.metrics.map(m => formatDate(m.dueDate));
    const pointsData = apiData.metrics.map(m => m.completedPoints);
    const storiesData = apiData.metrics.map(m => m.completedStories);

    return {
      labels,
      datasets: [
        {
          label: 'Story Points',
          data: pointsData,
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          tension: 0.4
        },
        {
          label: 'Stories Completed',
          data: storiesData,
          borderColor: '#f57c00',
          backgroundColor: 'rgba(245, 124, 0, 0.1)',
          tension: 0.4
        }
      ]
    };
  };

  /**
   * Generate Chart.js options configuration with control limit annotations and event annotations
   * @param {Object|null} limits - Control limits (average, upperLimit, lowerLimit)
   * @param {Object} eventAnnotations - Event annotations from useAnnotations hook
   * @returns {Object} Chart.js options
   */
  const getChartOptions = (limits, eventAnnotations = {}) => {
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        },
        title: {
          display: true,
          text: 'Velocity Metrics'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Point / Story Count'
          },
          ticks: {
            stepSize: 1
          }
        }
      }
    };

    // Build annotation config by merging control limits and event annotations
    const allAnnotations = { ...eventAnnotations };

    // Add control limit annotations if available (for Story Points)
    if (limits) {
      allAnnotations.upperLimit = {
        type: 'line',
        yMin: limits.upperLimit,
        yMax: limits.upperLimit,
        borderColor: '#93c5fd', // Light blue solid line
        borderWidth: 2,
        label: {
          display: true,
          content: `UCL: ${limits.upperLimit.toFixed(1)}`,
          position: 'end',
          backgroundColor: 'rgba(147, 197, 253, 0.8)',
          color: 'white',
          font: {
            size: 11
          }
        }
      };

      allAnnotations.average = {
        type: 'line',
        yMin: limits.average,
        yMax: limits.average,
        borderColor: '#1976d2', // Blue dotted line (matches Story Points)
        borderWidth: 2,
        borderDash: [5, 5],
        label: {
          display: true,
          content: `Avg: ${limits.average.toFixed(1)}`,
          position: 'end',
          backgroundColor: 'rgba(25, 118, 210, 0.8)',
          color: 'white',
          font: {
            size: 11
          }
        }
      };

      allAnnotations.lowerLimit = {
        type: 'line',
        yMin: limits.lowerLimit,
        yMax: limits.lowerLimit,
        borderColor: '#93c5fd', // Light blue solid line
        borderWidth: 2,
        label: {
          display: true,
          content: `LCL: ${limits.lowerLimit.toFixed(1)}`,
          position: 'end',
          backgroundColor: 'rgba(147, 197, 253, 0.8)',
          color: 'white',
          font: {
            size: 11
          }
        }
      };
    }

    // Set annotations if we have any
    if (Object.keys(allAnnotations).length > 0) {
      options.plugins.annotation = {
        annotations: allAnnotations
      };
    }

    return options;
  };

  /**
   * Handle filter change from ChartFilterDropdown
   * @param {Array<string>} newExcludedIds - New array of excluded iteration IDs
   */
  const handleFilterChange = (newExcludedIds) => {
    setExcludedIterationIds(newExcludedIds);
  };

  /**
   * Handle reset filter to global selection
   */
  const handleResetFilter = () => {
    setExcludedIterationIds([]);
  };

  // Empty state - no iterations selected
  if (!selectedIterations || selectedIterations.length === 0) {
    return (
      <Container>
        <EmptyState>Select iterations to view velocity metrics</EmptyState>
      </Container>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Container>
        <LoadingMessage>Loading velocity data...</LoadingMessage>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  // Chart display
  return (
    <Container>
      <FilterContainer>
        <ChartFilterDropdown
          availableIterations={selectedIterations}
          excludedIterationIds={excludedIterationIds}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilter}
          chartTitle="Velocity Chart"
        />
      </FilterContainer>
      {chartData && (
        <>
          <ChartContainer
            onClick={() => setIsEnlarged(true)}
            role="button"
            tabIndex={0}
            aria-label="Click to enlarge velocity chart"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsEnlarged(true);
              }
            }}
          >
            <Line data={chartData} options={getChartOptions(controlLimits, velocityAnnotations)} />
          </ChartContainer>

          <ChartEnlargementModal
            isOpen={isEnlarged}
            onClose={() => setIsEnlarged(false)}
            chartTitle="Velocity Metrics"
            chartElement={
              <Line data={chartData} options={getChartOptions(controlLimits, velocityAnnotations)} />
            }
          />
        </>
      )}
    </Container>
  );
};

export default VelocityChart;
