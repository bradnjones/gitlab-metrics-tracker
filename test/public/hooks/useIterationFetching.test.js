/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';

const { default: useIterationFetching } = await import(
  '../../../src/public/hooks/useIterationFetching.js'
);

const ITERATION_ID_1 = 'gid://gitlab/Iteration/1';
const ITERATION_ID_2 = 'gid://gitlab/Iteration/2';

const mockIterationsResponse = {
  iterations: [
    { id: ITERATION_ID_1, title: 'Sprint 1', startDate: '2025-01-01', dueDate: '2025-01-14' },
    { id: ITERATION_ID_2, title: 'Sprint 2', startDate: '2025-01-15', dueDate: '2025-01-28' }
  ]
};

const mockCacheStatusResponse = {
  iterations: [{ iterationId: ITERATION_ID_1 }]
};

/**
 * Helper: build a resolved fetch mock response.
 * @param {Object} body
 * @returns {Promise<{json: Function}>}
 */
const resolvedResponse = (body) =>
  Promise.resolve({ json: () => Promise.resolve(body) });

describe('useIterationFetching', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── initial state ───────────────────────────────────────────────────────────

  test('returns stable initial state when modal is closed', () => {
    const { result } = renderHook(() => useIterationFetching(false, []));

    expect(result.current.allIterations).toEqual([]);
    expect(result.current.downloadStates).toEqual({});
    expect(result.current.cachedIterationIds).toEqual(new Set());
    expect(result.current.isApplyReady).toBe(true);
    expect(result.current.progressStats).toEqual({
      cachedCount: 0,
      downloadingCount: 0,
      notDownloadedCount: 0,
      failedCount: 0,
      totalProgress: 0
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // ─── successful fetch on open ─────────────────────────────────────────────────

  test('fetches iterations and cache status when modal opens', async () => {
    global.fetch
      .mockImplementationOnce(() => resolvedResponse(mockIterationsResponse))
      .mockImplementationOnce(() => resolvedResponse(mockCacheStatusResponse));

    const { result } = renderHook(() => useIterationFetching(true, []));

    await waitFor(() => {
      expect(result.current.allIterations).toHaveLength(2);
    });

    expect(result.current.allIterations).toEqual(mockIterationsResponse.iterations);
    expect(result.current.cachedIterationIds).toEqual(new Set([ITERATION_ID_1]));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('isApplyReady is true when all selected ids are server-cached', async () => {
    global.fetch
      .mockImplementationOnce(() => resolvedResponse(mockIterationsResponse))
      .mockImplementationOnce(() => resolvedResponse(mockCacheStatusResponse));

    const { result } = renderHook(() =>
      useIterationFetching(true, [ITERATION_ID_1])
    );

    await waitFor(() => {
      expect(result.current.cachedIterationIds.size).toBeGreaterThan(0);
    });

    expect(result.current.isApplyReady).toBe(true);
  });

  // ─── error handling ───────────────────────────────────────────────────────────

  test('falls back to empty iterations on fetch error', async () => {
    global.fetch
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useIterationFetching(true, []));

    await waitFor(() => {
      // After rejection the state should stay at initial values
      expect(global.fetch).toHaveBeenCalled();
    });

    // Give async error paths time to settle
    await new Promise(r => setTimeout(r, 50));

    expect(result.current.allIterations).toEqual([]);
    expect(result.current.cachedIterationIds).toEqual(new Set());
  });

  // ─── background prefetch ──────────────────────────────────────────────────────

  test('starts prefetch when a new id is selected while open', async () => {
    // First two calls: iterations + cache status
    global.fetch
      .mockImplementationOnce(() => resolvedResponse(mockIterationsResponse))
      .mockImplementationOnce(() => resolvedResponse(mockCacheStatusResponse))
      // Third call: prefetch velocity
      .mockImplementationOnce(() => resolvedResponse({}));

    const { result } = renderHook(
      ({ selectedIds }) => useIterationFetching(true, selectedIds),
      { initialProps: { selectedIds: [] } }
    );

    // Wait for initial fetches to settle
    await waitFor(() => expect(result.current.allIterations).toHaveLength(2));

    // Select an uncached iteration to trigger prefetch
    act(() => {
      // re-render with ITERATION_ID_2 (not in cachedIds)
    });

    const { rerender } = renderHook(
      ({ selectedIds }) => useIterationFetching(true, selectedIds),
      { initialProps: { selectedIds: [ITERATION_ID_2] } }
    );

    // The velocity endpoint should be called for the prefetch
    await waitFor(() => {
      const calls = global.fetch.mock.calls.map(c => c[0]);
      expect(calls.some(url => url.includes('/api/metrics/velocity'))).toBe(true);
    });
  });

  test('marks download complete after successful prefetch', async () => {
    global.fetch
      .mockImplementationOnce(() => resolvedResponse(mockIterationsResponse))
      .mockImplementationOnce(() => resolvedResponse(mockCacheStatusResponse))
      .mockImplementationOnce(() => resolvedResponse({})); // prefetch

    const { result } = renderHook(() =>
      useIterationFetching(true, [ITERATION_ID_2])
    );

    await waitFor(() => {
      expect(result.current.downloadStates[ITERATION_ID_2]?.status).toBe('complete');
    });

    expect(result.current.isApplyReady).toBe(true);
  });

  test('marks download error on prefetch failure', async () => {
    global.fetch
      .mockImplementationOnce(() => resolvedResponse(mockIterationsResponse))
      .mockImplementationOnce(() => resolvedResponse(mockCacheStatusResponse))
      .mockRejectedValueOnce(new Error('prefetch boom')); // prefetch fails

    const { result } = renderHook(() =>
      useIterationFetching(true, [ITERATION_ID_2])
    );

    await waitFor(() => {
      expect(result.current.downloadStates[ITERATION_ID_2]?.status).toBe('error');
    });

    expect(result.current.isApplyReady).toBe(false);
  });

  // ─── reset on close ───────────────────────────────────────────────────────────

  test('resets transient state when modal closes', async () => {
    global.fetch
      .mockImplementationOnce(() => resolvedResponse(mockIterationsResponse))
      .mockImplementationOnce(() => resolvedResponse(mockCacheStatusResponse))
      .mockImplementationOnce(() => resolvedResponse({})); // prefetch

    const { result, rerender } = renderHook(
      ({ isOpen, selectedIds }) => useIterationFetching(isOpen, selectedIds),
      { initialProps: { isOpen: true, selectedIds: [ITERATION_ID_2] } }
    );

    // Wait for prefetch to complete so downloadStates is populated
    await waitFor(() => {
      expect(result.current.downloadStates[ITERATION_ID_2]?.status).toBe('complete');
    });

    // Close the modal
    rerender({ isOpen: false, selectedIds: [ITERATION_ID_2] });

    await waitFor(() => {
      expect(result.current.downloadStates).toEqual({});
      expect(result.current.cachedIterationIds).toEqual(new Set());
    });
  });

  // ─── progressStats ────────────────────────────────────────────────────────────

  test('progressStats returns zeros when no ids are selected', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useIterationFetching(true, []));

    expect(result.current.progressStats).toEqual({
      cachedCount: 0,
      downloadingCount: 0,
      notDownloadedCount: 0,
      failedCount: 0,
      totalProgress: 0
    });
  });

  test('progressStats counts cached and downloading correctly', async () => {
    global.fetch
      .mockImplementationOnce(() => resolvedResponse(mockIterationsResponse))
      .mockImplementationOnce(() =>
        resolvedResponse({ iterations: [{ iterationId: ITERATION_ID_1 }] })
      )
      // prefetch for ITERATION_ID_2 — never resolves so stays "downloading"
      .mockImplementationOnce(() => new Promise(() => {}));

    const { result } = renderHook(() =>
      useIterationFetching(true, [ITERATION_ID_1, ITERATION_ID_2])
    );

    // Wait for cache status to be set (ITERATION_ID_1 is cached)
    await waitFor(() => {
      expect(result.current.cachedIterationIds.size).toBeGreaterThan(0);
    });

    // Wait for the prefetch to start (ITERATION_ID_2 should be 'downloading')
    await waitFor(() => {
      const state = result.current.downloadStates[ITERATION_ID_2];
      expect(state?.status).toBe('downloading');
    });

    const stats = result.current.progressStats;
    expect(stats.cachedCount).toBe(1);
    expect(stats.downloadingCount).toBe(1);
    expect(stats.totalProgress).toBe(50);
  });
});
