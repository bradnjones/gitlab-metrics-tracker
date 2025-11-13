/**
 * ChangeFailureRateChart Component
 * Displays change failure rate metrics (DORA metric) across iterations
 *
 * @module components/ChangeFailureRateChart
 */

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
 * @returns {JSX.Element} Rendered component
 */
const ChangeFailureRateChart = ({ iterationIds }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!iterationIds || iterationIds.length === 0) {
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

  // Empty state - no iterations selected
  if (!iterationIds || iterationIds.length === 0) {
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
      {chartData && (
        <ChartContainer>
          <Line
            data={chartData}
            options={chartOptions}
            aria-label="Line chart showing change failure rate trends across selected iterations"
            role="img"
          />
        </ChartContainer>
      )}
    </Container>
  );
};

export default ChangeFailureRateChart;
