/**
 * Exports a Chart.js chart as a high-resolution PNG with a white background.
 *
 * Two problems are solved here:
 *
 * 1. Dark background — Chart.js renders onto the app's dark canvas. We
 *    composite the chart onto a fresh white canvas so downloaded PNGs are
 *    legible outside the app.
 *
 * 2. Low resolution — Capturing the canvas at its rendered CSS size produces
 *    a small, grainy image. We temporarily resize the Chart.js instance to 3×
 *    its current dimensions before capturing, then restore it. Because resize,
 *    capture, and restore all happen synchronously within one JS task the
 *    browser never paints the intermediate state — there is no visible flash.
 *    The final PNG is 3× the chart's display size in each dimension (9× area).
 *
 * @param {import('react').RefObject} chartRef - React ref pointing to a Chart.js instance
 * @param {string} filename - Desired filename for the download (e.g. 'velocity-chart.png')
 * @returns {void}
 */
export function exportChartAsPng(chartRef, filename) {
  if (!chartRef.current) return;

  const chart = chartRef.current;
  const SCALE = 3;
  const origWidth = chart.width;
  const origHeight = chart.height;

  // Render at 3× for export — synchronous resize/capture/restore means no repaint
  chart.resize(origWidth * SCALE, origHeight * SCALE);

  const source = chart.canvas;
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

  chart.resize(origWidth, origHeight);
}
