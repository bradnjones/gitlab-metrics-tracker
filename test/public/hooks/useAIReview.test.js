/**
 * @jest-environment jsdom
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

const { useAIReview } = await import('../../../src/public/hooks/useAIReview.js');

describe('useAIReview', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes with loading=false, error=null, lastAnalysis=null, and loads history on mount', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'a1' }],
    });

    const { result } = renderHook(() => useAIReview());

    // Before the effect resolves, initial state should hold
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.lastAnalysis).toBe(null);

    await waitFor(() => {
      expect(result.current.history).toEqual([{ id: 'a1' }]);
    });
  });

  it('run() sets loading=true during flight and false when complete', async () => {
    // GET /api/analysis on mount
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useAIReview());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // POST for run() — resolve only when we let it
    let resolvePost;
    const postPromise = new Promise((res) => { resolvePost = res; });
    global.fetch.mockReturnValueOnce(postPromise);

    // GET for history reload after run() success
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    act(() => {
      result.current.run(['iter-1']);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Resolve the POST
    resolvePost({ ok: true, json: async () => ({ id: 'new-1', status: 'succeeded' }) });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('run() sets lastAnalysis and updates history on success', async () => {
    const analysis = { id: 'new-1', status: 'succeeded' };
    const updatedHistory = [analysis, { id: 'old-1' }];

    // Mount GET
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'old-1' }],
    });

    const { result } = renderHook(() => useAIReview());

    await waitFor(() => {
      expect(result.current.history).toEqual([{ id: 'old-1' }]);
    });

    // POST returns new analysis
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => analysis,
    });

    // History reload after success
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedHistory,
    });

    await act(async () => {
      await result.current.run(['iter-1', 'iter-2']);
    });

    expect(result.current.lastAnalysis).toEqual(analysis);
    expect(result.current.history).toEqual(updatedHistory);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  it('run() sets error and clears loading on fetch failure', async () => {
    // Mount GET
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useAIReview());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // POST rejects with network error
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.loading).toBe(false);
    expect(result.current.lastAnalysis).toBe(null);
  });

  it('run() does nothing if already loading (prevents double-submit)', async () => {
    // Mount GET
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useAIReview());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // POST that stays in flight
    let resolvePost;
    const postPromise = new Promise((res) => { resolvePost = res; });
    global.fetch.mockReturnValueOnce(postPromise);

    // History reload (for when it eventually resolves)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Start first run
    act(() => {
      result.current.run(['iter-1']);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Try second run while loading — should be ignored
    act(() => {
      result.current.run(['iter-2']);
    });

    // Only 1 POST fetch call (mount GET + 1 POST = 2 total so far)
    // The second run() call should not add another fetch
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Resolve so the hook can clean up
    resolvePost({ ok: true, json: async () => ({ id: 'r' }) });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('run() handles non-ok HTTP response from POST with error body', async () => {
    // Mount GET
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useAIReview());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // POST returns non-ok with structured error body
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'AI review not configured' }),
    });

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.error).toBe('AI review not configured');
    expect(result.current.loading).toBe(false);
  });

  it('run() handles non-ok HTTP response from POST without parseable body', async () => {
    // Mount GET
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useAIReview());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // POST returns non-ok and json() itself throws (e.g. empty body)
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => { throw new Error('no body'); },
    });

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.error).toBe('HTTP error! status: 503');
    expect(result.current.loading).toBe(false);
  });

  it('history load network failure is silent and does not affect error state', async () => {
    // Mount GET fails silently via network error
    global.fetch.mockRejectedValueOnce(new Error('History load failed'));

    const { result } = renderHook(() => useAIReview());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Error state should remain null — history load failures are silent
    expect(result.current.error).toBe(null);
    expect(result.current.history).toEqual([]);
  });

  it('history load non-ok HTTP response is silent', async () => {
    // Mount GET returns 500 — should be silently swallowed
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useAIReview());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // History load HTTP errors are silent — no error state, empty history
    expect(result.current.error).toBe(null);
    expect(result.current.history).toEqual([]);
  });

  it('run() clears previous error on new attempt', async () => {
    // Mount GET
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useAIReview());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // First run fails
    global.fetch.mockRejectedValueOnce(new Error('First error'));

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.error).toBe('First error');

    // Second run succeeds
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'ok' }),
    });
    // History reload
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'ok' }],
    });

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.error).toBe(null);
    expect(result.current.lastAnalysis).toEqual({ id: 'ok' });
  });
});
