/**
 * MTTRChart Component
 * Displays Mean Time To Recovery (MTTR) metrics across iterations
 * Uses fetchWithRetry for robust API calls with timeout handling
 *
 * @module components/MTTRChart
 */

import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { fetchWithRetry } from '../utils/fetchWithRetry.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components for Bar charts
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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
 * MTTRChart component
 *
 * @param {Object} props - Component props
 * @param {Array<string>} props.iterationIds - Array of iteration IDs to fetch metrics for
 * @returns {JSX.Element} Rendered component
 */
const MTTRChart = ({ iterationIds }) => {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
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
        const response = await fetchWithRetry(`/api/metrics/mttr?iterations=${iterationsParam}`);

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
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1,
            },
          ],
        });
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
    return <div>Select iterations to view MTTR metrics</div>;
  }

  // Loading state - fetching data
  if (loading) {
    return <div>Loading MTTR data...</div>;
  }

  // Error state
  if (error) {
    return <div>Error loading MTTR data: {error}</div>;
  }

  // Success state - render chart
  if (chartData) {
    return <Bar data={chartData} />;
  }

  // Fallback (shouldn't reach here)
  return null;
};

export default MTTRChart;
