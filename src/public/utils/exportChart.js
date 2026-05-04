/**
 * Exports a Chart.js chart as a PNG with a white background.
 *
 * Chart.js renders onto the page canvas which inherits the dark app background.
 * This utility composites the chart onto a fresh white canvas before encoding
 * so the downloaded PNG is legible without a dark theme.
 *
 * @param {import('react').RefObject} chartRef - React ref pointing to a Chart.js instance
 * @param {string} filename - Desired filename for the download (e.g. 'velocity-chart.png')
 * @returns {void}
 */
export function exportChartAsPng(chartRef, filename) {
  if (!chartRef.current) return;

  const source = chartRef.current.canvas;
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0);

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
