import { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
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

const ModalToggleButton = styled.button`
  background: ${props => props.theme.colors.bgPrimary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.full};
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  padding: 4px 12px;
  transition: background 150ms ease, color 150ms ease;
  &:hover { background: ${props => props.theme.colors.bgTertiary}; color: ${props => props.theme.colors.textPrimary}; }
  &:focus { outline: 2px solid ${props => props.theme.colors.primary}; outline-offset: 2px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
`;

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

    // Control limits always shown; custom event annotations toggled by showAnnotations
    const allAnnotations = {
      ...(showAnnotations ? eventAnnotations : {}),
      ...buildControlLimitAnnotations(limits),
    };

    if (Object.keys(allAnnotations).length > 0) {
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

  // Local toggle state — only active while the enlargement modal is open; resets on close
  const [localShowP90, setLocalShowP90] = useState(showP90);
  const [localShowP50, setLocalShowP50] = useState(showP50);
  const [localShowAverage, setLocalShowAverage] = useState(showAverage);
  const [localShowAnnotations, setLocalShowAnnotations] = useState(showAnnotations);

  useEffect(() => {
    if (!isEnlarged) {
      setLocalShowP90(showP90);
      setLocalShowP50(showP50);
      setLocalShowAverage(showAverage);
      setLocalShowAnnotations(showAnnotations);
    }
  }, [isEnlarged, showP90, showP50, showAverage, showAnnotations]);

  const localDisplayedChartData = useMemo(() => {
    if (!chartData) return null;
    const datasets = chartData.datasets.filter(d => {
      if (d.label === 'P90') return localShowP90;
      if (d.label === 'P50') return localShowP50;
      if (d.label === 'Average') return localShowAverage;
      return true;
    });
    return { ...chartData, datasets };
  }, [chartData, localShowP90, localShowP50, localShowAverage]);

  const handleLocalToggleP90 = useCallback(() => setLocalShowP90(v => !v), []);
  const handleLocalToggleP50 = useCallback(() => setLocalShowP50(v => !v), []);
  const handleLocalToggleAverage = useCallback(() => setLocalShowAverage(v => !v), []);
  const handleLocalToggleAnnotations = useCallback(() => setLocalShowAnnotations(v => !v), []);

  const localOnlyOneVisible = [localShowAverage, localShowP50, localShowP90].filter(Boolean).length === 1;

  const modalToolbar = (
    <>
      <ModalToggleButton onClick={handleLocalToggleAverage} disabled={localShowAverage && localOnlyOneVisible}>
        {localShowAverage ? 'Average: On' : 'Average: Off'}
      </ModalToggleButton>
      <ModalToggleButton onClick={handleLocalToggleP50} disabled={localShowP50 && localOnlyOneVisible}>
        {localShowP50 ? 'P50: On' : 'P50: Off'}
      </ModalToggleButton>
      <ModalToggleButton onClick={handleLocalToggleP90} disabled={localShowP90 && localOnlyOneVisible}>
        {localShowP90 ? 'P90: On' : 'P90: Off'}
      </ModalToggleButton>
      <ModalToggleButton onClick={handleLocalToggleAnnotations}>
        {localShowAnnotations ? 'Annotations: On' : 'Annotations: Off'}
      </ModalToggleButton>
    </>
  );

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
        {displayedChartData && <ExportButton onClick={handleExport}>Export PNG</ExportButton>}
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
            toolbar={modalToolbar}
            chartElement={
              <Line
                data={localDisplayedChartData}
                options={getChartOptions(controlLimits, localShowAnnotations ? cycleTimeAnnotations : {})}
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
