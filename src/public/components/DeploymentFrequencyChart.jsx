/**
 * DeploymentFrequencyChart Component
 * Displays deployment frequency metrics (DORA metric) across iterations
 *
 * @module components/DeploymentFrequencyChart
 */

import { useEffect, useMemo } from 'react';
import { apiFetch } from '../utils/apiFetch.js';
import { Line } from 'react-chartjs-2';
import { exportChartAsPng } from '../utils/exportChart.js';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { calculateControlLimits } from '../utils/controlLimits.js';
import { useAnnotations } from '../hooks/useAnnotations.js';
import { useChartFilters } from '../hooks/useChartFilters.js';
import { useChartState } from '../hooks/useChartState.js';
import buildControlLimitAnnotations from '../utils/buildControlLimitAnnotations.js';
import ChartFilterDropdown from './ChartFilterDropdown';
import ChartEnlargementModal from './ChartEnlargementModal';
import {
  Container,
  LoadingMessage,
  ErrorMessage,
  EmptyState,
  ChartContainer,
  ChartToolbar,
  ExportButton,
  FilterContainer,
} from './chart-shared.jsx';

// Register Chart.js components
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, annotationPlugin);
// localStorage key for per-chart filter exclusions
const FILTER_STORAGE_KEY = 'chart-filters-deployment-frequency';


/**
 * DeploymentFrequencyChart Component
 *
 * @param {Object} props - Component props
 * @param {Array<string>} props.iterationIds - Array of iteration IDs to fetch metrics for
 * @param {number} [props.annotationRefreshKey=0] - Key that triggers annotation re-fetch
 * @param {boolean} [props.showAnnotations=true] - Whether to render annotation markers on the chart
 * @returns {JSX.Element} Rendered component
 */
const DeploymentFrequencyChart = ({ selectedIterations = [], annotationRefreshKey = 0, showAnnotations = true }) => {
  const {
    chartData,
    setChartData,
    controlLimits,
    setControlLimits,
    loading,
    setLoading,
    error,
    setError,
    isEnlarged,
    setIsEnlarged,
    chartRef,
  } = useChartState(selectedIterations);

  // localStorage-persisted filter exclusions — overrides the plain useState from useChartState
  const [excludedIterationIds, setExcludedIterationIds] = useChartFilters(FILTER_STORAGE_KEY);

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

    // All iterations filtered out via filter dropdown
    if (iterationIds.length === 0) {
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

        const response = await apiFetch(url);

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
    const allAnnotations = {
      ...eventAnnotations,
      ...buildControlLimitAnnotations(limits),
    };

    // Set annotations if we have any and annotations are visible
    if (showAnnotations && Object.keys(allAnnotations).length > 0) {
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

  /**
   * Export the chart as a PNG image download
   */
  const handleExport = () => {
    if (!chartRef.current) return;
    exportChartAsPng(chartRef, 'deployment-frequency-chart.png');
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
        <>
          <ChartToolbar>
            <ExportButton onClick={handleExport}>Export PNG</ExportButton>
          </ChartToolbar>
          <ChartContainer
            onClick={() => setIsEnlarged(true)}
            role="button"
            tabIndex={0}
            aria-label="Click to enlarge deployment frequency chart"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsEnlarged(true);
              }
            }}
          >
            <Line
              ref={chartRef}
              data={chartData}
              options={getChartOptions(controlLimits, deploymentAnnotations)}
              aria-label="Line chart showing deployment frequency trends across selected iterations"
              role="img"
            />
          </ChartContainer>

          <ChartEnlargementModal
            isOpen={isEnlarged}
            onClose={() => setIsEnlarged(false)}
            chartTitle="Deployment Frequency Metrics"
            chartElement={
              <Line
                data={chartData}
                options={getChartOptions(controlLimits, deploymentAnnotations)}
                aria-label="Line chart showing deployment frequency trends across selected iterations"
                role="img"
              />
            }
          />
        </>
      )}
    </Container>
  );
};

export default DeploymentFrequencyChart;
