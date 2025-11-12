import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Line } from 'react-chartjs-2';
import { fetchWithRetry } from '../utils/fetchWithRetry.js';
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Container = styled.div`
  padding: 20px;

  /* Accessibility: Ensure container is keyboard navigable */
  &:focus-within {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
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
 * @returns {JSX.Element} Rendered component
 */
const CycleTimeChart = ({ iterationIds }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cycle time data when iterationIds change
  useEffect(() => {
    // Don't fetch if no iterations selected
    if (!iterationIds || iterationIds.length === 0) {
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

        const response = await fetchWithRetry(url);

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
   * Chart.js options configuration
   */
  const chartOptions = {
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

  // Empty state - no iterations selected
  if (!iterationIds || iterationIds.length === 0) {
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
      {chartData && (
        <ChartContainer>
          <Line
            data={chartData}
            options={chartOptions}
            aria-label="Line chart showing cycle time trends with average, P50, and P90 metrics across selected iterations"
            role="img"
          />
        </ChartContainer>
      )}
    </Container>
  );
};

export default CycleTimeChart;
