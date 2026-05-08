/**
 * useChartState Hook
 *
 * Centralises the repeated state/effect/memo pattern shared by all six
 * chart components (VelocityChart, CycleTimeChart, LeadTimeChart,
 * DeploymentFrequencyChart, MTTRChart, ChangeFailureRateChart).
 *
 * @module hooks/useChartState
 */

import { useState, useEffect, useMemo, useRef } from 'react';

/**
 * Shared chart state hook — manages chart data, loading/error flags,
 * iteration exclusions, enlargement flag, chart ref, and derived iteration lists.
 *
 * The cleanup effect removes stale exclusion IDs whenever the `iterations`
 * prop changes (e.g. the user deselects an iteration that was previously
 * excluded from the chart filter).
 *
 * @param {Object[]} iterations - The selectedIterations prop passed to the chart.
 *   Each object must have at least an `id` property.
 * @param {string} [iterations[].id] - Unique iteration identifier.
 *
 * @returns {{
 *   chartData: Object|null,
 *   setChartData: Function,
 *   controlLimits: Object|null,
 *   setControlLimits: Function,
 *   loading: boolean,
 *   setLoading: Function,
 *   error: string|null,
 *   setError: Function,
 *   excludedIterationIds: string[],
 *   setExcludedIterationIds: Function,
 *   isEnlarged: boolean,
 *   setIsEnlarged: Function,
 *   chartRef: React.MutableRefObject,
 *   visibleIterations: Object[],
 *   iterationIds: string[]
 * }}
 */
export function useChartState(iterations = []) {
  const [chartData, setChartData] = useState(null);
  const [controlLimits, setControlLimits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [excludedIterationIds, setExcludedIterationIds] = useState([]);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const chartRef = useRef(null);

  // Remove exclusions that are no longer present in the iterations list.
  // This mirrors the cleanup useEffect in every chart component.
  useEffect(() => {
    if (!iterations || iterations.length === 0) {
      return;
    }

    const currentIds = iterations.map(iter => iter.id);
    const validExcludedIds = excludedIterationIds.filter(id => currentIds.includes(id));

    if (validExcludedIds.length !== excludedIterationIds.length) {
      setExcludedIterationIds(validExcludedIds);
    }
  }, [iterations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Iterations that are not excluded — drives the chart data fetch.
  const visibleIterations = useMemo(
    () => iterations.filter(iter => !excludedIterationIds.includes(iter.id)),
    [iterations, excludedIterationIds]
  );

  // Flat array of visible iteration IDs — passed to API calls.
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
