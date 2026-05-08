/**
 * Jest mock for useChartState hook (CommonJS version)
 *
 * Provides a working useState/useRef implementation so chart component
 * tests can exercise state transitions (loading, data, error, enlarged)
 * without importing the ES Module directly.
 */
const { useState, useEffect, useMemo, useRef } = require('react');

function useChartState(iterations) {
  const [chartData, setChartData] = useState(null);
  const [controlLimits, setControlLimits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [excludedIterationIds, setExcludedIterationIds] = useState([]);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const chartRef = useRef(null);

  const safeIterations = iterations || [];

  useEffect(() => {
    if (!safeIterations.length) return;
    const currentIds = safeIterations.map(iter => iter.id);
    const valid = excludedIterationIds.filter(id => currentIds.includes(id));
    if (valid.length !== excludedIterationIds.length) {
      setExcludedIterationIds(valid);
    }
  }, [safeIterations]);

  const visibleIterations = useMemo(
    () => safeIterations.filter(iter => !excludedIterationIds.includes(iter.id)),
    [safeIterations, excludedIterationIds]
  );

  const iterationIds = useMemo(
    () => visibleIterations.map(iter => iter.id),
    [visibleIterations]
  );

  return {
    chartData,
    setChartData,
    controlLimits,
    setControlLimits,
    loading,
    setLoading,
    error,
    setError,
    excludedIterationIds,
    setExcludedIterationIds,
    isEnlarged,
    setIsEnlarged,
    chartRef,
    visibleIterations,
    iterationIds,
  };
}

module.exports = { useChartState };
