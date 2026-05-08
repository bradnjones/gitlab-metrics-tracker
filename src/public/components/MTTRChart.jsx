/**
 * MTTRChart Component
 * Displays Mean Time To Recovery (MTTR) metrics across iterations
 * Uses Line chart with SPC control limits
 *
 * @module components/MTTRChart
 */

import React, { useEffect, useMemo } from 'react';
import { apiFetch } from '../utils/apiFetch.js';
import { exportChartAsPng } from '../utils/exportChart.js';
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

// Register Chart.js components for Line charts with annotations
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
const FILTER_STORAGE_KEY = 'chart-filters-mttr';

/**
 * Format date to short MM/DD format (e.g., "10/20")
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

/**
 * Generate Chart.js options configuration with control limit annotations
 * @param {Object|null} limits - Control limits (average, upperLimit, lowerLimit)
 * @param {Object} [eventAnnotations={}] - Event annotations from useAnnotations hook
 * @param {boolean} [annotationsVisible=true] - Whether to include annotation plugin config
 * @returns {Object} Chart.js options
 */
const getChartOptions = (limits, eventAnnotations = {}, annotationsVisible = true) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Mean Time To Recovery (MTTR)'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(1)} hrs`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours'
        }
      }
    }
  };

  // Build annotation config by merging control limits and event annotations
  const controlLimitAnnotations = buildControlLimitAnnotations(limits, {
    upperColor: '#fca5a5',
    averageColor: '#ef4444',
  });
  const allAnnotations = { ...controlLimitAnnotations, ...eventAnnotations };

  // Set annotations if we have any and annotations are visible
  if (annotationsVisible && Object.keys(allAnnotations).length > 0) {
    options.plugins.annotation = { annotations: allAnnotations };
  }

  return options;
};

/**
 * MTTRChart component
 *
 * @param {Object} props - Component props
 * @param {Array<Object>} props.selectedIterations - Array of iteration objects to display
 * @param {number} [props.annotationRefreshKey=0] - Key that triggers annotation re-fetch
 * @param {boolean} [props.showAnnotations=true] - Whether to render annotation markers on the chart
 * @returns {JSX.Element} Rendered component
 */
const MTTRChart = ({ selectedIterations = [], annotationRefreshKey = 0, showAnnotations = true }) => {
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

  // localStorage-persisted exclusion state — composes on top of useChartState
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

  // Fetch annotations for MTTR metric
  const { annotations: mttrAnnotations } = useAnnotations(
    'mttr_avg',
    chartData ? chartData.labels : [],
    annotationRefreshKey
  );

  useEffect(() => {
    if (!selectedIterations || selectedIterations.length === 0) {
      return;
    }

    // All iterations filtered out via filter dropdown
    if (iterationIds.length === 0) {
      setChartData(null);
      return;
    }

    // Fetch MTTR data from API
    const fetchMTTRData = async () => {
      setLoading(true);
      setError(null);

      try {
        const iterationsParam = iterationIds.join(',');
        const response = await apiFetch(`/api/metrics/mttr?iterations=${iterationsParam}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Transform API response to Chart.js format
        const labels = data.metrics.map(m => formatDate(m.dueDate));
        const mttrValues = data.metrics.map(m => m.mttrAvg);

        setChartData({
          labels,
          datasets: [
            {
              label: 'MTTR (hours)',
              data: mttrValues,
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              tension: 0.4
            },
          ],
        });

        // Calculate control limits for MTTR data
        const limits = calculateControlLimits(mttrValues);
        setControlLimits(limits);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMTTRData();
  }, [iterationIds]);

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
    exportChartAsPng(chartRef, 'mttr-chart.png');
  };

  // Empty state - no iterations selected
  if (!selectedIterations || selectedIterations.length === 0) {
    return (
      <Container role="region" aria-label="Mean Time To Recovery Metrics Chart">
        <EmptyState>Select iterations to view MTTR metrics</EmptyState>
      </Container>
    );
  }

  // Loading state - fetching data
  if (loading) {
    return (
      <Container role="region" aria-label="Mean Time To Recovery Metrics Chart" aria-busy="true">
        <LoadingMessage>Loading MTTR data...</LoadingMessage>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container role="region" aria-label="Mean Time To Recovery Metrics Chart">
        <ErrorMessage role="alert" aria-live="assertive">Error loading MTTR data: {error}</ErrorMessage>
      </Container>
    );
  }

  // Success state - render chart
  return (
    <Container role="region" aria-label="Mean Time To Recovery Metrics Chart">
      <FilterContainer>
        <ChartFilterDropdown
          availableIterations={selectedIterations}
          excludedIterationIds={excludedIterationIds}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilter}
          chartTitle="MTTR Chart"
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
            aria-label="Click to enlarge MTTR chart"
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
              options={getChartOptions(controlLimits, mttrAnnotations, showAnnotations)}
              aria-label="Line chart showing MTTR trends across selected iterations"
              role="img"
            />
          </ChartContainer>

          <ChartEnlargementModal
            isOpen={isEnlarged}
            onClose={() => setIsEnlarged(false)}
            chartTitle="MTTR Metrics"
            chartElement={
              <Line
                data={chartData}
                options={getChartOptions(controlLimits, mttrAnnotations, showAnnotations)}
                aria-label="Line chart showing MTTR trends across selected iterations"
                role="img"
              />
            }
          />
        </>
      )}
    </Container>
  );
};

export default MTTRChart;
