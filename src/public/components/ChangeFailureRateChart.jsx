/**
 * ChangeFailureRateChart Component
 * Displays change failure rate metrics (DORA metric) across iterations
 *
 * @module components/ChangeFailureRateChart
 */

import { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { calculateControlLimits } from '../utils/controlLimits.js';
import { useAnnotations } from '../hooks/useAnnotations.js';
import ChartFilterDropdown from './ChartFilterDropdown';


// Register Chart.js components
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, annotationPlugin);
// localStorage key for per-chart filter exclusions
const FILTER_STORAGE_KEY = 'chart-filters-change-failure-rate';


/**
 * Styled components
 */
const Container = styled.div`
  padding: 20px;

  /* Accessibility: Ensure container is keyboard navigable */
  &:focus-within {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-size: 14px;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #ef4444;
  font-size: 14px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #9ca3af;
  font-size: 14px;
`;

const ChartContainer = styled.div`
  position: relative;
  height: 400px;
  padding: 20px;
  background: white;
  border-radius: 8px;
`;

/**
 * ChangeFailureRateChart Component
 *
 * @param {Object} props - Component props
 * @param {Array<string>} props.iterationIds - Array of iteration IDs to fetch metrics for
 * @param {number} [props.annotationRefreshKey=0] - Key that triggers annotation re-fetch
 * @returns {JSX.Element} Rendered component
 */
const ChangeFailureRateChart = ({ selectedIterations = [], annotationRefreshKey = 0 }) => {
  const [chartData, setChartData] = useState(null);
  const [controlLimits, setControlLimits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [excludedIterationIds, setExcludedIterationIds] = useState([]);

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

  // Fetch annotations for change failure rate metric
  const { annotations: changeFailureAnnotations } = useAnnotations(
    'change_failure_rate',
    chartData ? chartData.labels : [],
    annotationRefreshKey
  );

  useEffect(() => {
    if (!selectedIterations || selectedIterations.length === 0) {
      setChartData(null);
      return;
    }

    // All iterations filtered out via filter dropdown
    if (iterationIds.length === 0) {
      setChartData(null);
      return;
    }

    /**
     * Fetch change failure rate data from API
     */
    const fetchCfrData = async () => {
      try {
        setLoading(true);
        setError(null);

        const iterationsParam = iterationIds.join(',');
        const url = `/api/metrics/change-failure-rate?iterations=${iterationsParam}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Transform API response to Chart.js format
        const transformedData = transformToChartData(data);
        setChartData(transformedData);

        // Calculate control limits for change failure rate data
        const cfrData = data.metrics.map(m => m.changeFailureRate);
        const limits = calculateControlLimits(cfrData);
        setControlLimits(limits);
      } catch (err) {
        setError(`Error loading change failure rate data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCfrData();
  }, [iterationIds]);

  /**
   * Format date to short MM/DD format (e.g., "1/14")
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
    const cfrData = apiData.metrics.map(m => m.changeFailureRate);

    return {
      labels,
      datasets: [
        {
          label: 'Change Failure Rate (%)',
          data: cfrData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        }
      ]
    };
  };

  /**
   * Generate Chart.js options configuration with control limit annotations
   * @param {Object|null} limits - Control limits (average, upperLimit, lowerLimit)
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
          text: 'Change Failure Rate (DORA)'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Percentage (%)'
          }
        }
      }
    };

    // Build annotation config by merging control limits and event annotations
    const allAnnotations = { ...eventAnnotations };

    // Add control limit annotations if available
    if (limits) {
      allAnnotations.upperLimit = {
        type: 'line',
        yMin: limits.upperLimit,
        yMax: limits.upperLimit,
        borderColor: '#fca5a5', // Light red solid line
        borderWidth: 2,
        label: {
          display: true,
          content: `UCL: ${limits.upperLimit.toFixed(1)}%`,
          position: 'end',
          backgroundColor: 'rgba(252, 165, 165, 0.8)',
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
        borderColor: '#ef4444', // Red dotted line (matches main data)
        borderWidth: 2,
        borderDash: [5, 5],
        label: {
          display: true,
          content: `Avg: ${limits.average.toFixed(1)}%`,
          position: 'end',
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
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
        borderColor: '#fca5a5', // Light red solid line
        borderWidth: 2,
        label: {
          display: true,
          content: `LCL: ${limits.lowerLimit.toFixed(1)}%`,
          position: 'end',
          backgroundColor: 'rgba(252, 165, 165, 0.8)',
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
   *  {Array<string>} newExcludedIds - New array of excluded iteration IDs
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
      <Container role="region" aria-label="Change Failure Rate Metrics">
        <EmptyState>Select iterations to view change failure rate metrics</EmptyState>
      </Container>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Container role="region" aria-label="Change Failure Rate Metrics" aria-busy="true">
        <LoadingMessage>Loading change failure rate data...</LoadingMessage>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container role="region" aria-label="Change Failure Rate Metrics">
        <ErrorMessage role="alert" aria-live="assertive">{error}</ErrorMessage>
      </Container>
    );
  }

  // Chart display
  return (
    <Container role="region" aria-label="Change Failure Rate Metrics Chart">
      <FilterContainer>
        <ChartFilterDropdown
          availableIterations={selectedIterations}
          excludedIterationIds={excludedIterationIds}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilter}
          chartTitle="Change Failure Rate Chart"
        />
      </FilterContainer>
      {chartData && (
        <ChartContainer>
          <Line
            data={chartData}
            options={getChartOptions(controlLimits, changeFailureAnnotations)}
            aria-label="Line chart showing change failure rate trends across selected iterations"
            role="img"
          />
        </ChartContainer>
      )}
    </Container>
  );
};

export default ChangeFailureRateChart;
