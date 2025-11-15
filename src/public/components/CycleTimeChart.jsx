import { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Line } from 'react-chartjs-2';
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
const FILTER_STORAGE_KEY = 'chart-filters-cycle-time';

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
`;

/**
 * CycleTimeChart Component
 * Displays cycle time metrics (Avg, P50, P90) in a line chart
 *
 * @param {Object} props - Component props
 * @param {string[]} props.iterationIds - Array of iteration IDs to fetch cycle time data for
 * @param {number} [props.annotationRefreshKey=0] - Key that triggers annotation re-fetch
 * @returns {JSX.Element} Rendered component
 */
const CycleTimeChart = ({ selectedIterations = [], annotationRefreshKey = 0 }) => {
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

  // Fetch annotations for cycle time metric
  const { annotations: cycleTimeAnnotations } = useAnnotations(
    'cycle_time_avg',
    chartData ? chartData.labels : [],
    annotationRefreshKey
  );

  // Fetch cycle time data when iterationIds change
  useEffect(() => {
    // Don't fetch if no iterations selected
    if (!selectedIterations || selectedIterations.length === 0) {
      setChartData(null);
      return;
    }

    // All iterations filtered out via filter dropdown
    if (iterationIds.length === 0) {
      setChartData(null);
      return;
    }

    const fetchCycleTimeData = async () => {
      try {
        setLoading(true);
        setError(null);

        const iterationsParam = iterationIds.join(',');
        const url = `/api/metrics/cycle-time?iterations=${iterationsParam}`;

        console.log('[CycleTimeChart] Fetching cycle time data:', {
          url,
          iterationCount: iterationIds.length,
          iterations: iterationIds
        });

        const response = await fetch(url);

        console.log('[CycleTimeChart] Response received:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[CycleTimeChart] HTTP error response body:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('[CycleTimeChart] Data received:', {
          metricsCount: data.metrics?.length,
          count: data.count
        });

        // Transform API response to Chart.js format
        const transformedData = transformToChartData(data);
        setChartData(transformedData);

        // Calculate control limits for the Average data
        const avgData = data.metrics.map(m => m.cycleTimeAvg);
        const limits = calculateControlLimits(avgData);
        setControlLimits(limits);
      } catch (err) {
        setError(`Error loading cycle time data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCycleTimeData();
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
    const avgData = apiData.metrics.map(m => m.cycleTimeAvg);
    const p50Data = apiData.metrics.map(m => m.cycleTimeP50);
    const p90Data = apiData.metrics.map(m => m.cycleTimeP90);

    return {
      labels,
      datasets: [
        {
          label: 'Average',
          data: avgData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'P50',
          data: p50Data,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        },
        {
          label: 'P90',
          data: p90Data,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderDash: [5, 5],
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
          text: 'Cycle Time'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value.toFixed(1)} days`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Days'
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
        borderColor: '#93c5fd', // Light blue solid line
        borderWidth: 2,
        label: {
          display: true,
          content: `UCL: ${limits.upperLimit.toFixed(2)}`,
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
        borderColor: '#3b82f6', // Blue dotted line (matches Average)
        borderWidth: 2,
        borderDash: [5, 5],
        label: {
          display: true,
          content: `Avg: ${limits.average.toFixed(2)}`,
          position: 'end',
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
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
          content: `LCL: ${limits.lowerLimit.toFixed(2)}`,
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
      <Container role="region" aria-label="Cycle Time Metrics">
        <EmptyState>Select iterations to view cycle time metrics</EmptyState>
      </Container>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Container role="region" aria-label="Cycle Time Metrics" aria-busy="true">
        <LoadingMessage>Loading cycle time data...</LoadingMessage>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container role="region" aria-label="Cycle Time Metrics">
        <ErrorMessage role="alert" aria-live="assertive">{error}</ErrorMessage>
      </Container>
    );
  }

  // Chart display
  return (
    <Container role="region" aria-label="Cycle Time Metrics Chart">
      <FilterContainer>
        <ChartFilterDropdown
          availableIterations={selectedIterations}
          excludedIterationIds={excludedIterationIds}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilter}
          chartTitle="Cycle Time Chart"
        />
      </FilterContainer>
      {chartData && (
        <ChartContainer>
          <Line
            data={chartData}
            options={getChartOptions(controlLimits, cycleTimeAnnotations)}
            aria-label="Line chart showing cycle time trends with average, P50, and P90 metrics across selected iterations, including statistical control limits"
            role="img"
          />
        </ChartContainer>
      )}
    </Container>
  );
};

export default CycleTimeChart;
