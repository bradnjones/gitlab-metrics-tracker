import { useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { exportChartAsPng } from '../utils/exportChart.js';
import { apiFetch } from '../utils/apiFetch.js';
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
  ExportButton,
  FilterContainer
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
const FILTER_STORAGE_KEY = 'chart-filters-velocity';

/**
 * VelocityChart Component
 * Displays velocity metrics in a line chart
 *
 * @param {Object} props - Component props
 * @param {Array<Object>} props.selectedIterations - Array of selected iteration objects [{id, title, startDate, dueDate}]
 * @param {number} [props.annotationRefreshKey=0] - Key that triggers annotation re-fetch
 * @param {boolean} [props.showAnnotations=true] - Whether to render annotation markers on the chart
 * @returns {JSX.Element} Rendered component
 */
const VelocityChart = ({ selectedIterations = [], annotationRefreshKey = 0, showAnnotations = true }) => {
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
        const response = await apiFetch(`/api/metrics/velocity?iterations=${iterationsParam}`);

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

    // Control limits always shown; custom event annotations toggled by annotationsVisible
    const allAnnotations = {
      ...(annotationsVisible ? eventAnnotations : {}),
      ...buildControlLimitAnnotations(limits),
    };

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

  /**
   * Export the chart as a PNG image download
   */
  const handleExport = () => {
    if (!chartRef.current) return;
    exportChartAsPng(chartRef, 'velocity-chart.png');
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
        {chartData && <ExportButton onClick={handleExport}>Export PNG</ExportButton>}
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
            <Line ref={chartRef} data={chartData} options={getChartOptions(controlLimits, velocityAnnotations, showAnnotations)} />
          </ChartContainer>

          <ChartEnlargementModal
            isOpen={isEnlarged}
            onClose={() => setIsEnlarged(false)}
            chartTitle="Velocity Metrics"
            chartElement={
              <Line data={chartData} options={getChartOptions(controlLimits, velocityAnnotations, showAnnotations)} />
            }
          />
        </>
      )}
    </Container>
  );
};

export default VelocityChart;
