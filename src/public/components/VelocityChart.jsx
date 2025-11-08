import { useState, useEffect } from 'react';
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
 * VelocityChart Component
 * Displays velocity metrics in a line chart
 *
 * @param {Object} props - Component props
 * @param {string[]} props.iterationIds - Array of iteration IDs to fetch velocity data for
 * @returns {JSX.Element} Rendered component
 */
const VelocityChart = ({ iterationIds }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        const response = await fetch(`/api/metrics/velocity?iterations=${iterationsParam}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Transform API response to Chart.js format
        const transformedData = transformToChartData(data);
        setChartData(transformedData);
      } catch (err) {
        setError(`Error loading velocity data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVelocityData();
  }, [iterationIds]);

  /**
   * Transform API response to Chart.js data format
   * @param {Object} apiData - Raw API response
   * @returns {Object} Chart.js compatible data object
   */
  const transformToChartData = (apiData) => {
    const labels = apiData.metrics.map(m => m.iterationTitle);
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
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  // Empty state - no iterations selected
  if (!iterationIds || iterationIds.length === 0) {
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
      {chartData && (
        <ChartContainer>
          <Line data={chartData} options={chartOptions} />
        </ChartContainer>
      )}
    </Container>
  );
};

export default VelocityChart;
