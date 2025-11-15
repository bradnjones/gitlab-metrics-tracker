/**
 * useAnnotations Hook
 * Fetches and formats annotations for Chart.js integration
 *
 * Features:
 * - Fetches annotations from API
 * - Filters by affected metrics
 * - Generates Chart.js annotation configurations
 * - Color-codes by impact (positive/negative/neutral)
 *
 * @module hooks/useAnnotations
 */

import { useState, useEffect } from 'react';

/**
 * Impact colors for annotation markers
 * Matches prototype design system
 */
const IMPACT_COLORS = {
  positive: '#10b981', // Green
  negative: '#ef4444', // Red
  neutral: '#6b7280',  // Gray
};

/**
 * Hook to fetch and format annotations for a specific metric
 *
 * @param {string} metricKey - Metric identifier (e.g., 'velocity', 'cycle_time_avg')
 * @param {string[]} dateLabels - Array of date labels for the chart (used to position annotations)
 * @param {number} [refreshKey=0] - Key that triggers re-fetch when changed (e.g., after saving annotation)
 * @returns {Object} {annotations, loading, error}
 */
export function useAnnotations(metricKey, dateLabels = [], refreshKey = 0) {
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnnotations = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/annotations');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Filter annotations that affect this metric
        const relevantAnnotations = data.filter(annotation =>
          annotation.affectedMetrics &&
          annotation.affectedMetrics.includes(metricKey)
        );

        // Transform to Chart.js annotation format
        const chartAnnotations = transformToChartAnnotations(relevantAnnotations, dateLabels);
        setAnnotations(chartAnnotations);
      } catch (err) {
        console.error('Error fetching annotations:', err);
        setError(err.message);
        setAnnotations([]);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if metric key is provided
    if (metricKey) {
      fetchAnnotations();
    }
  }, [metricKey, dateLabels.length, refreshKey]); // Re-fetch when metric, date range, or refreshKey changes

  return { annotations, loading, error };
}

/**
 * Transform API annotations to Chart.js annotation configurations
 *
 * @param {Array} annotations - Array of annotation objects from API
 * @param {string[]} dateLabels - Array of date labels from chart
 * @returns {Object} Chart.js annotations config object
 */
function transformToChartAnnotations(annotations, dateLabels) {
  const config = {};

  annotations.forEach((annotation, index) => {
    // Parse annotation date
    const annotationDateObj = new Date(annotation.date + 'T12:00:00'); // Noon to avoid timezone issues

    // Parse all chart label dates to find the range
    const chartDates = dateLabels.map((label, i) => {
      // Parse label to full date (assuming current year if not in label)
      const parts = label.split('/');
      const month = parseInt(parts[0], 10) - 1; // JS months are 0-indexed
      const day = parseInt(parts[1], 10);
      // Use annotation's year as reference
      const year = new Date(annotation.date).getFullYear();
      return { index: i, date: new Date(year, month, day, 12, 0, 0), label };
    });

    // Find where annotation falls in the date range
    let xPosition = -1;

    // Check if annotation is exactly on a data point
    const exactMatch = chartDates.findIndex(cd =>
      cd.date.getTime() === annotationDateObj.getTime()
    );

    if (exactMatch !== -1) {
      xPosition = exactMatch;
    } else {
      // Find the two points the annotation falls between
      for (let i = 0; i < chartDates.length - 1; i++) {
        if (annotationDateObj >= chartDates[i].date && annotationDateObj <= chartDates[i + 1].date) {
          // Calculate proportional position between the two points
          const totalSpan = chartDates[i + 1].date.getTime() - chartDates[i].date.getTime();
          const annotationSpan = annotationDateObj.getTime() - chartDates[i].date.getTime();
          const fraction = annotationSpan / totalSpan;
          xPosition = i + fraction;
          break;
        }
      }

      // Check if annotation is before first point or after last point
      if (xPosition === -1) {
        if (annotationDateObj < chartDates[0].date) {
          xPosition = 0; // Show at start
        } else if (annotationDateObj > chartDates[chartDates.length - 1].date) {
          xPosition = chartDates.length - 1; // Show at end
        }
      }
    }

    // Add annotation if we found a valid position
    if (xPosition !== -1) {
      // Use custom color if provided, otherwise fall back to impact-based color
      const color = annotation.color || IMPACT_COLORS[annotation.impact] || IMPACT_COLORS.neutral;

      config[`annotation_${annotation.id || index}`] = {
        type: 'line',
        xMin: xPosition,
        xMax: xPosition,
        borderColor: color,
        borderWidth: 2,
        borderDash: [6, 6],
        label: {
          display: true,
          content: annotation.title,
          position: 'start',
          backgroundColor: color,
          color: 'white',
          font: {
            size: 10,
            weight: 'bold'
          },
          padding: 4,
          rotation: -90,
          yAdjust: -10
        }
      };
    }
  });

  return config;
}

/**
 * Format annotation date for comparison
 * Converts ISO date to MM/DD format
 *
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {string} Formatted date (M/D)
 */
function formatDateForComparison(dateString) {
  // Parse date string directly to avoid timezone issues
  // Date is in YYYY-MM-DD format
  const [year, month, day] = dateString.split('-');
  return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
}

/**
 * Parse date label to MM/DD format for comparison
 *
 * @param {string} label - Chart label (might be MM/DD or other format)
 * @param {string} fallbackDate - Fallback ISO date if parsing fails
 * @returns {string} Formatted date (M/D)
 */
function parseDateLabel(label, fallbackDate) {
  // If label is already in M/D or MM/DD format, use it directly
  if (label.match(/^\d{1,2}\/\d{1,2}$/)) {
    return label;
  }

  // Otherwise try to parse as date
  try {
    const date = new Date(label);
    if (!isNaN(date.getTime())) {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  } catch (e) {
    // Ignore parsing errors
  }

  // Fallback to original label
  return label;
}
