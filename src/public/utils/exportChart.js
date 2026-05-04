/**
 * Exports a Chart.js chart as a high-resolution PNG with a white background.
 *
 * Two problems are solved here:
 *
 * 1. Dark background — Chart.js renders onto the app's dark canvas. We
 *    composite the chart onto a fresh white canvas so downloaded PNGs are
 *    legible outside the app.
 *
 * 2. Low resolution — Instead of upscaling the existing bitmap (which just
 *    stretches pixels and produces a grainy result), we temporarily raise the
 *    chart's devicePixelRatio to EXPORT_DPR and force a full re-render. Chart.js
 *    redraws all vector elements (lines, curves, text, axes, annotations) at
 *    the higher density, producing a genuinely sharp export. The chart is then
 *    restored to its original DPR so the UI is unaffected.
 *
 * @param {import('react').RefObject} chartRef - React ref pointing to a Chart.js instance
 * @param {string} filename - Desired filename for the download (e.g. 'velocity-chart.png')
 * @returns {void}
 */
export function exportChartAsPng(chartRef, filename) {
  if (!chartRef.current) return;

  const chart = chartRef.current;
  const EXPORT_DPR = 4;

  const originalDPR = chart.options.devicePixelRatio ?? window.devicePixelRatio ?? 1;

  // Re-render all vector elements at high DPI before capturing.
  chart.options.devicePixelRatio = EXPORT_DPR;
  chart.resize();

  const source = chart.canvas;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = source.width;
  exportCanvas.height = source.height;

  const ctx = exportCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  ctx.drawImage(source, 0, 0);

  const link = document.createElement('a');
  link.download = filename;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();

  // Restore the chart to its original pixel ratio.
  chart.options.devicePixelRatio = originalDPR;
  chart.resize();
}
