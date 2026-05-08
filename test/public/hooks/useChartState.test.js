/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useChartState } from '../../../src/public/hooks/useChartState.js';

describe('useChartState', () => {
  const sampleIterations = [
    { id: 'gid://gitlab/Iteration/1', title: 'Sprint 1', startDate: '2024-01-01', dueDate: '2024-01-14' },
    { id: 'gid://gitlab/Iteration/2', title: 'Sprint 2', startDate: '2024-01-15', dueDate: '2024-01-28' },
    { id: 'gid://gitlab/Iteration/3', title: 'Sprint 3', startDate: '2024-01-29', dueDate: '2024-02-11' },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  test('initialises chartData to null', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    expect(result.current.chartData).toBeNull();
  });

  test('initialises controlLimits to null', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    expect(result.current.controlLimits).toBeNull();
  });

  test('initialises loading to false', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    expect(result.current.loading).toBe(false);
  });

  test('initialises error to null', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    expect(result.current.error).toBeNull();
  });

  test('initialises excludedIterationIds to empty array', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    expect(result.current.excludedIterationIds).toEqual([]);
  });

  test('initialises isEnlarged to false', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    expect(result.current.isEnlarged).toBe(false);
  });

  test('initialises chartRef as a ref object', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    expect(result.current.chartRef).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(result.current.chartRef, 'current')).toBe(true);
  });

  // ── Setters ────────────────────────────────────────────────────────────────

  test('setChartData updates chartData', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    const mockData = { labels: ['1/1'], datasets: [] };
    act(() => { result.current.setChartData(mockData); });
    expect(result.current.chartData).toEqual(mockData);
  });

  test('setLoading updates loading flag', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    act(() => { result.current.setLoading(true); });
    expect(result.current.loading).toBe(true);
  });

  test('setError updates error message', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    act(() => { result.current.setError('something went wrong'); });
    expect(result.current.error).toBe('something went wrong');
  });

  test('setIsEnlarged updates isEnlarged flag', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    act(() => { result.current.setIsEnlarged(true); });
    expect(result.current.isEnlarged).toBe(true);
  });

  // ── visibleIterations ──────────────────────────────────────────────────────

  test('visibleIterations equals all iterations when nothing is excluded', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    expect(result.current.visibleIterations).toEqual(sampleIterations);
  });

  test('visibleIterations filters out excluded iteration ids', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));

    act(() => {
      result.current.setExcludedIterationIds(['gid://gitlab/Iteration/2']);
    });

    expect(result.current.visibleIterations).toEqual([
      sampleIterations[0],
      sampleIterations[2],
    ]);
  });

  test('visibleIterations is empty when all iterations are excluded', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));

    act(() => {
      result.current.setExcludedIterationIds([
        'gid://gitlab/Iteration/1',
        'gid://gitlab/Iteration/2',
        'gid://gitlab/Iteration/3',
      ]);
    });

    expect(result.current.visibleIterations).toEqual([]);
  });

  // ── iterationIds ───────────────────────────────────────────────────────────

  test('iterationIds returns array of all iteration ids when nothing excluded', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));
    expect(result.current.iterationIds).toEqual([
      'gid://gitlab/Iteration/1',
      'gid://gitlab/Iteration/2',
      'gid://gitlab/Iteration/3',
    ]);
  });

  test('iterationIds excludes ids that are in excludedIterationIds', () => {
    const { result } = renderHook(() => useChartState(sampleIterations));

    act(() => {
      result.current.setExcludedIterationIds(['gid://gitlab/Iteration/1']);
    });

    expect(result.current.iterationIds).toEqual([
      'gid://gitlab/Iteration/2',
      'gid://gitlab/Iteration/3',
    ]);
  });

  // ── Cleanup effect ─────────────────────────────────────────────────────────

  test('cleanup effect removes excluded ids that are no longer in iterations', () => {
    const { result, rerender } = renderHook(
      ({ iters }) => useChartState(iters),
      { initialProps: { iters: sampleIterations } }
    );

    // Exclude Sprint 3
    act(() => {
      result.current.setExcludedIterationIds(['gid://gitlab/Iteration/3']);
    });
    expect(result.current.excludedIterationIds).toEqual(['gid://gitlab/Iteration/3']);

    // Now remove Sprint 3 from the iterations list
    rerender({ iters: [sampleIterations[0], sampleIterations[1]] });

    // Sprint 3 exclusion should be cleaned up
    expect(result.current.excludedIterationIds).toEqual([]);
  });

  test('cleanup effect keeps exclusions that are still in iterations', () => {
    const { result, rerender } = renderHook(
      ({ iters }) => useChartState(iters),
      { initialProps: { iters: sampleIterations } }
    );

    act(() => {
      result.current.setExcludedIterationIds([
        'gid://gitlab/Iteration/1',
        'gid://gitlab/Iteration/3',
      ]);
    });

    // Remove only Sprint 3 from the iterations list; Sprint 1 stays
    rerender({ iters: [sampleIterations[0], sampleIterations[1]] });

    expect(result.current.excludedIterationIds).toEqual(['gid://gitlab/Iteration/1']);
  });

  test('cleanup effect does nothing when iterations list is empty', () => {
    const { result, rerender } = renderHook(
      ({ iters }) => useChartState(iters),
      { initialProps: { iters: sampleIterations } }
    );

    act(() => {
      result.current.setExcludedIterationIds(['gid://gitlab/Iteration/1']);
    });

    // Passing an empty list should NOT clear exclusions (guard clause in effect)
    rerender({ iters: [] });

    expect(result.current.excludedIterationIds).toEqual(['gid://gitlab/Iteration/1']);
  });

  // ── Default argument ───────────────────────────────────────────────────────

  test('works correctly with no iterations argument (default empty array)', () => {
    const { result } = renderHook(() => useChartState());
    expect(result.current.visibleIterations).toEqual([]);
    expect(result.current.iterationIds).toEqual([]);
  });
});
