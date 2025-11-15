/**
 * DeploymentFrequencyChart Component
 * Displays deployment frequency metrics (DORA metric) across iterations
 *
 * @module components/DeploymentFrequencyChart
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
const FILTER_STORAGE_KEY = '';


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
 * DeploymentFrequencyChart Component
 *
 * @param {Object} props - Component props
 * @param {Array<string>} props.iterationIds - Array of iteration IDs to fetch metrics for
 * @param {number} [props.annotationRefreshKey=0] - Key that triggers annotation re-fetch
 * @returns {JSX.Element} Rendered component
 */
const DeploymentFrequencyChart = ({ selectedIterations = [], annotationRefreshKey = 0 }) => {
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

  // Filter iterations based on exclusions (memoized to prevent flickering)
  const visibleIterations = useMemo(
    () => selectedIterations.filter(iter => !excludedIterationIds.includes(iter.id)),
    [selectedIterations, excludedIterationIds]
  );

  const iterationIds = useMemo(
    () => visibleIterations.map(iter => iter.id),
    [visibleIterations]
  );

  // Fetch annotations for deployment frequency metric
  const { annotations: deploymentAnnotations } = useAnnotations(
    'deployment_frequency',
    chartData ? chartData.labels : [],
    annotationRefreshKey
  );

  useEffect(() => {
    if (!selectedIterations || selectedIterations.length === 0) {
      setChartData(null);
      return;
    }

    /**
     * Fetch deployment frequency data from API
     */
    const fetchDeploymentData = async () => {
      try {
        setLoading(true);
        setError(null);

        const iterationsParam = iterationIds.join(',');
        const url = `/api/metrics/deployment-frequency?iterations=${iterationsParam}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Transform API response to Chart.js format
        const transformedData = transformToChartData(data);
        setChartData(transformedData);

        // Calculate control limits for deployment frequency data
        const deploymentData = data.metrics.map(m => m.deploymentFrequency);
        const limits = calculateControlLimits(deploymentData);
        setControlLimits(limits);
      } catch (err) {
        setError(`Error loading deployment frequency data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDeploymentData();
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
    const deploymentData = apiData.metrics.map(m => m.deploymentFrequency);

    return {
      labels,
      datasets: [
        {
          label: 'Deployments per Day',
          data: deploymentData,
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
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
          text: 'Deployment Frequency (DORA)'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value.toFixed(2)} per day`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Deployments per Day'
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
        borderColor: '#1976d2', // Blue dotted line (matches main data)
        borderWidth: 2,
        borderDash: [5, 5],
        label: {
          display: true,
          content: `Avg: ${limits.average.toFixed(2)}`,
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
      <Container role="region" aria-label="Deployment Frequency Metrics">
        <EmptyState>Select iterations to view deployment frequency metrics</EmptyState>
      </Container>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Container role="region" aria-label="Deployment Frequency Metrics" aria-busy="true">
        <LoadingMessage>Loading deployment frequency data...</LoadingMessage>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container role="region" aria-label="Deployment Frequency Metrics">
        <ErrorMessage role="alert" aria-live="assertive">{error}</ErrorMessage>
      </Container>
    );
  }

  // Chart display
  return (
    <Container role="region" aria-label="Deployment Frequency Metrics Chart">
      <FilterContainer>
        <ChartFilterDropdown
          availableIterations={selectedIterations}
          excludedIterationIds={excludedIterationIds}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilter}
          chartTitle="Deployment Frequency Chart"
        />
      </FilterContainer>
      {chartData && (
        <ChartContainer>
          <Line
            data={chartData}
            options={getChartOptions(controlLimits, deploymentAnnotations)}
            aria-label="Line chart showing deployment frequency trends across selected iterations"
            role="img"
          />
        </ChartContainer>
      )}
    </Container>
  );
};

export default DeploymentFrequencyChart;
