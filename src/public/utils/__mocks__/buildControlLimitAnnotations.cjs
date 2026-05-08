/**
 * Jest mock for buildControlLimitAnnotations (CommonJS version)
 *
 * Returns a realistic annotation object when controlLimits is provided,
 * or an empty object when it is null/undefined, matching the real function's
 * behaviour so chart options tests can assert on annotation presence.
 */

function buildControlLimitAnnotations(controlLimits) {
  if (!controlLimits) {
    return {};
  }
  return {
    upperLimit: {
      type: 'line',
      yMin: controlLimits.upperLimit,
      yMax: controlLimits.upperLimit,
      borderColor: '#93c5fd',
      borderWidth: 2,
      label: {
        display: true,
        content: `UCL: ${controlLimits.upperLimit.toFixed(1)}`,
        position: 'end',
        backgroundColor: 'rgba(147, 197, 253, 0.8)',
        color: 'white',
        font: { size: 11 },
      },
    },
    average: {
      type: 'line',
      yMin: controlLimits.average,
      yMax: controlLimits.average,
      borderColor: '#1976d2',
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        display: true,
        content: `Avg: ${controlLimits.average.toFixed(1)}`,
        position: 'end',
        backgroundColor: 'rgba(25, 118, 210, 0.8)',
        color: 'white',
        font: { size: 11 },
      },
    },
    lowerLimit: {
      type: 'line',
      yMin: controlLimits.lowerLimit,
      yMax: controlLimits.lowerLimit,
      borderColor: '#93c5fd',
      borderWidth: 2,
      label: {
        display: true,
        content: `LCL: ${controlLimits.lowerLimit.toFixed(1)}`,
        position: 'end',
        backgroundColor: 'rgba(147, 197, 253, 0.8)',
        color: 'white',
        font: { size: 11 },
      },
    },
  };
}

module.exports = buildControlLimitAnnotations;
module.exports.default = buildControlLimitAnnotations;
