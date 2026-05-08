/**
 * buildControlLimitAnnotations
 *
 * Builds the chartjs-plugin-annotation config object for Statistical Process
 * Control (SPC) control limit lines (UCL, average, LCL).
 *
 * Extracted from the identical `getChartOptions` implementation in every chart
 * component so Phase 2 agents can replace it with a single import.
 *
 * @module public/utils/buildControlLimitAnnotations
 */

/**
 * @typedef {Object} ControlLimits
 * @property {number} average - Centre line value
 * @property {number} upperLimit - Upper Control Limit (UCL)
 * @property {number} lowerLimit - Lower Control Limit (LCL)
 */

/**
 * @typedef {Object} AnnotationColorOptions
 * @property {string} [upperColor='#93c5fd']   - Border and label background colour for UCL/LCL lines
 * @property {string} [averageColor='#1976d2'] - Border and label background colour for the average line
 * @property {string} [lowerColor='#93c5fd']   - Border and label background colour for LCL line (defaults to upperColor)
 * @property {string} [tooltipFormat]          - Unused reserved field for future tooltip customisation
 */

/**
 * Build chartjs-plugin-annotation entries for SPC control limit lines.
 *
 * Returns an object with up to three keys — `upperLimit`, `average`, and
 * `lowerLimit` — each conforming to the chartjs-plugin-annotation line
 * annotation schema.  Returns an empty object when `controlLimits` is null
 * or undefined so callers can safely spread the result.
 *
 * @param {ControlLimits|null|undefined} controlLimits - Calculated SPC limits.
 *   When falsy the function returns `{}`.
 * @param {AnnotationColorOptions} [options={}] - Optional colour overrides.
 *
 * @returns {Object} Annotation config object suitable for
 *   `options.plugins.annotation.annotations` in a Chart.js config.
 *
 * @example
 * const annotations = buildControlLimitAnnotations(
 *   { average: 10, upperLimit: 15, lowerLimit: 5 },
 *   { upperColor: '#93c5fd', averageColor: '#1976d2' }
 * );
 * // { upperLimit: { type: 'line', yMin: 15, yMax: 15, ... }, ... }
 */
function buildControlLimitAnnotations(controlLimits, options = {}) {
  if (!controlLimits) {
    return {};
  }

  const {
    upperColor = '#93c5fd',
    averageColor = '#1976d2',
    lowerColor,
  } = options;

  const resolvedLowerColor = lowerColor || upperColor;

  return {
    upperLimit: {
      type: 'line',
      yMin: controlLimits.upperLimit,
      yMax: controlLimits.upperLimit,
      borderColor: upperColor,
      borderWidth: 2,
      label: {
        display: true,
        content: `UCL: ${controlLimits.upperLimit.toFixed(1)}`,
        position: 'end',
        backgroundColor: `rgba(147, 197, 253, 0.8)`,
        color: 'white',
        font: {
          size: 11,
        },
      },
    },

    average: {
      type: 'line',
      yMin: controlLimits.average,
      yMax: controlLimits.average,
      borderColor: averageColor,
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        display: true,
        content: `Avg: ${controlLimits.average.toFixed(1)}`,
        position: 'end',
        backgroundColor: `rgba(25, 118, 210, 0.8)`,
        color: 'white',
        font: {
          size: 11,
        },
      },
    },

    lowerLimit: {
      type: 'line',
      yMin: controlLimits.lowerLimit,
      yMax: controlLimits.lowerLimit,
      borderColor: resolvedLowerColor,
      borderWidth: 2,
      label: {
        display: true,
        content: `LCL: ${controlLimits.lowerLimit.toFixed(1)}`,
        position: 'end',
        backgroundColor: `rgba(147, 197, 253, 0.8)`,
        color: 'white',
        font: {
          size: 11,
        },
      },
    },
  };
}

export default buildControlLimitAnnotations;
