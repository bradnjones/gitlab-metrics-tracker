/**
 * MTTRChart Component
 * Displays Mean Time To Recovery (MTTR) metrics across iterations
 * Uses Line chart with SPC control limits
 *
 * @module components/MTTRChart
 */

import React, { useState, useEffect } from 'react';
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
 * @returns {Object} Chart.js options
 */
const getChartOptions = (limits) => {
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

  // Add control limit annotations if available
  if (limits) {
    options.plugins.annotation = {
      annotations: {
        upperLimit: {
          type: 'line',
          yMin: limits.upperLimit,
          yMax: limits.upperLimit,
          borderColor: '#fca5a5',
          borderWidth: 2,
          label: {
            display: true,
            content: `UCL: ${limits.upperLimit.toFixed(1)} hrs`,
            position: 'end',
            backgroundColor: 'rgba(252, 165, 165, 0.8)',
            color: 'white',
            font: {
              size: 11
            }
          }
        },
        average: {
          type: 'line',
          yMin: limits.average,
          yMax: limits.average,
          borderColor: '#ef4444',
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            display: true,
            content: `Avg: ${limits.average.toFixed(1)} hrs`,
            position: 'end',
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            color: 'white',
            font: {
              size: 11
            }
          }
        },
        lowerLimit: {
          type: 'line',
          yMin: limits.lowerLimit,
          yMax: limits.lowerLimit,
          borderColor: '#fca5a5',
          borderWidth: 2,
          label: {
            display: true,
            content: `LCL: ${limits.lowerLimit.toFixed(1)} hrs`,
            position: 'end',
            backgroundColor: 'rgba(252, 165, 165, 0.8)',
            color: 'white',
            font: {
              size: 11
            }
          }
        }
      }
    };
  }

  return options;
};

/**
 * MTTRChart component
 *
 * @param {Object} props - Component props
 * @param {Array<string>} props.iterationIds - Array of iteration IDs to fetch metrics for
 * @returns {JSX.Element} Rendered component
 */
const MTTRChart = ({ iterationIds}) => {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [controlLimits, setControlLimits] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!iterationIds || iterationIds.length === 0) {
      return;
    }

    // Fetch MTTR data from API
    const fetchMTTRData = async () => {
      setLoading(true);
      setError(null);

      try {
        const iterationsParam = iterationIds.join(',');
        const response = await fetch(`/api/metrics/mttr?iterations=${iterationsParam}`);

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

  // Empty state - no iterations selected
  if (!iterationIds || iterationIds.length === 0) {
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
      {chartData && (
        <ChartContainer>
          <Line
            data={chartData}
            options={getChartOptions(controlLimits)}
            aria-label="Line chart showing MTTR trends across selected iterations"
            role="img"
          />
        </ChartContainer>
      )}
    </Container>
  );
};

export default MTTRChart;
