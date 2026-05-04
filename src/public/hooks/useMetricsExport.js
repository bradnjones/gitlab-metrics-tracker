/**
 * useMetricsExport Hook
 *
 * Fetches metrics for all selected iterations across all metric endpoints
 * and triggers a CSV download. Uses plain JS — no external CSV library.
 *
 * @module hooks/useMetricsExport
 */

import { useState } from 'react';

/**
 * Metric endpoints to fetch for the export.
 * Each entry maps to one GET /api/metrics/<path> endpoint.
 *
 * @type {string[]}
 */
const METRIC_ENDPOINTS = [
  'velocity',
  'cycle-time',
  'deployment-frequency',
  'lead-time',
  'mttr',
];

/**
 * Escape a single CSV cell value.
 * Wraps in double-quotes when the value contains a comma, double-quote, or newline.
 * Internal double-quotes are escaped by doubling them.
 *
 * @param {*} value - The raw cell value
 * @returns {string} Safe CSV cell string
 */
function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of row objects to a CSV string.
 * Column order is derived from the keys of the first row.
 *
 * @param {Object[]} rows - Array of plain objects with identical keys
 * @returns {string} CSV text (header + data rows, newline-separated)
 */
export function toCSV(rows) {
  if (!rows || rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const headerRow = headers.join(',');

  const dataRows = rows.map(row =>
    headers.map(h => escapeCell(row[h])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Trigger a browser file download for the given CSV content.
 *
 * @param {string} csv - CSV text content
 * @param {string} filename - Suggested filename for the download
 * @returns {void}
 */
export function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Merge metrics data from all endpoints into one row per iteration.
 *
 * Each endpoint returns `{ metrics: [...] }` where each entry has
 * `iterationId` as the key. We merge by iterationId.
 *
 * @param {Object[][]} metricArrays - Array of metrics arrays, one per endpoint
 * @returns {Object[]} Merged rows keyed by iterationId, sorted by dueDate
 */
function mergeMetricArrays(metricArrays) {
  /** @type {Map<string, Object>} */
  const byId = new Map();

  for (const metrics of metricArrays) {
    for (const entry of metrics) {
      const { iterationId } = entry;
      if (!byId.has(iterationId)) {
        byId.set(iterationId, {});
      }
      Object.assign(byId.get(iterationId), entry);
    }
  }

  const rows = Array.from(byId.values());

  // Sort chronologically by dueDate (oldest first)
  rows.sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate) : 0;
    const db = b.dueDate ? new Date(b.dueDate) : 0;
    return da - db;
  });

  // Shape into the desired column order for the CSV
  return rows.map(r => ({
    iterationId: r.iterationId ?? '',
    iterationTitle: r.iterationTitle ?? '',
    startDate: r.startDate ?? '',
    dueDate: r.dueDate ?? '',
    completedPoints: r.completedPoints ?? '',
    completedStories: r.completedStories ?? '',
    cycleTimeAvg: r.cycleTimeAvg ?? '',
    cycleTimeP50: r.cycleTimeP50 ?? '',
    cycleTimeP90: r.cycleTimeP90 ?? '',
    deploymentFrequency: r.deploymentFrequency ?? '',
    leadTimeAvg: r.leadTimeAvg ?? '',
    leadTimeP50: r.leadTimeP50 ?? '',
    leadTimeP90: r.leadTimeP90 ?? '',
    mttrAvg: r.mttrAvg ?? '',
    changeFailureRate: r.changeFailureRate ?? '',
  }));
}

/**
 * Hook that provides a CSV export action for the currently selected iterations.
 *
 * Fetches all metric endpoints in parallel, merges results, and downloads
 * a CSV file named `sprint-metrics-YYYY-MM-DD.csv`.
 *
 * @param {Array<{id: string, title?: string}>} selectedIterations - Iterations to export
 * @returns {{ exportCSV: Function, exporting: boolean }}
 */
export function useMetricsExport(selectedIterations) {
  const [exporting, setExporting] = useState(false);

  /**
   * Fetch all metrics for the selected iterations and trigger a CSV download.
   *
   * @returns {Promise<void>}
   */
  const exportCSV = async () => {
    if (!selectedIterations || selectedIterations.length === 0) return;

    setExporting(true);

    try {
      const iterationsParam = selectedIterations
        .map(iter => encodeURIComponent(iter.id))
        .join(',');

      // Fetch all metric endpoints in parallel
      const responses = await Promise.all(
        METRIC_ENDPOINTS.map(endpoint =>
          fetch(`/api/metrics/${endpoint}?iterations=${iterationsParam}`).then(r => r.json())
        )
      );

      // Each response is { metrics: [...] }
      const metricArrays = responses.map(r => r.metrics || []);

      const rows = mergeMetricArrays(metricArrays);
      const csv = toCSV(rows);

      const filename = `sprint-metrics-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCSV(csv, filename);
    } catch (error) {
      console.error('CSV export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return { exportCSV, exporting };
}
