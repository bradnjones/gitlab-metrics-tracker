/**
 * Exports a Chart.js chart as a high-resolution PNG with a white background.
 *
 * Two problems are solved here:
 *
 * 1. Dark background — Chart.js renders onto the app's dark canvas. We
 *    composite the chart onto a fresh white canvas so downloaded PNGs are
 *    legible outside the app.
 *
 * 2. Low resolution — The chart canvas already renders at devicePixelRatio×
 *    (e.g. 2× on Retina). We scale the raw canvas pixels up by an additional
 *    3× factor by drawing onto a larger export canvas, giving a final PNG that
 *    is 3× the physical canvas in each dimension (9× area). Aspect ratio is
 *    always preserved because both dimensions are scaled by the same factor.
 *    No Chart.js resize is needed, so there is no risk of container constraints
 *    distorting the output.
 *
 * @param {import('react').RefObject} chartRef - React ref pointing to a Chart.js instance
 * @param {string} filename - Desired filename for the download (e.g. 'velocity-chart.png')
 * @returns {void}
 */
export function exportChartAsPng(chartRef, filename) {
  if (!chartRef.current) return;

  const source = chartRef.current.canvas;
  const SCALE = 3;

  const canvas = document.createElement('canvas');
  canvas.width = source.width * SCALE;
  canvas.height = source.height * SCALE;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // drawImage with explicit destination dimensions scales the source to fill
  // the export canvas — same factor on both axes so aspect ratio is preserved.
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
