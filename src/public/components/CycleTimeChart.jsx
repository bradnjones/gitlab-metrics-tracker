import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../utils/apiFetch.js';
import { Line } from 'react-chartjs-2';
import { exportChartAsPng } from '../utils/exportChart.js';
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

/**
 * CycleTimeChart Component
 * Displays cycle time metrics (Avg, P50, P90) in a line chart
 *
 * @param {Object} props - Component props
 * @param {Object[]} [props.selectedIterations=[]] - Iterations to display
 * @param {number} [props.annotationRefreshKey=0] - Key that triggers annotation re-fetch
 * @param {boolean} [props.showAnnotations=true] - Whether to render annotation markers on the chart
 * @param {boolean} [props.showP90=true] - Whether to include the P90 dataset
 * @param {boolean} [props.showP50=true] - Whether to include the P50 dataset
 * @param {boolean} [props.showAverage=true] - Whether to include the Average dataset
 * @returns {JSX.Element} Rendered component
 */
const CycleTimeChart = ({ selectedIterations = [], annotationRefreshKey = 0, showAnnotations = true, showP90 = true, showP50 = true, showAverage = true }) => {
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

        const response = await apiFetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

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

  const displayedChartData = useMemo(() => {
    if (!chartData) return null;
    const datasets = chartData.datasets.filter(d => {
      if (d.label === 'P90') return showP90;
      if (d.label === 'P50') return showP50;
      if (d.label === 'Average') return showAverage;
      return true;
    });
    return { ...chartData, datasets };
  }, [chartData, showP90, showP50, showAverage]);

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
    exportChartAsPng(chartRef, 'cycle-time-chart.png');
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
      {displayedChartData && (
        <>
          <ChartToolbar>
            <ExportButton onClick={handleExport}>Export PNG</ExportButton>
          </ChartToolbar>
          <ChartContainer
            onClick={() => setIsEnlarged(true)}
            role="button"
            tabIndex={0}
            aria-label="Click to enlarge cycle time chart"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsEnlarged(true);
              }
            }}
          >
            <Line
              ref={chartRef}
              data={displayedChartData}
              options={getChartOptions(controlLimits, cycleTimeAnnotations)}
              aria-label="Line chart showing cycle time trends with average, P50, and P90 metrics across selected iterations, including statistical control limits"
              role="img"
            />
          </ChartContainer>

          <ChartEnlargementModal
            isOpen={isEnlarged}
            onClose={() => setIsEnlarged(false)}
            chartTitle="Cycle Time Metrics"
            chartElement={
              <Line
                data={displayedChartData}
                options={getChartOptions(controlLimits, cycleTimeAnnotations)}
                aria-label="Line chart showing cycle time trends with average, P50, and P90 metrics across selected iterations, including statistical control limits"
                role="img"
              />
            }
          />
        </>
      )}
    </Container>
  );
};

export default CycleTimeChart;
