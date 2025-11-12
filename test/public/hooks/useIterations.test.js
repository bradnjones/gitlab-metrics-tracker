/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';

// Mock fetchWithRetry before importing useIterations
jest.unstable_mockModule('../../../src/public/utils/fetchWithRetry.js', () => ({
  fetchWithRetry: jest.fn((url, options) => fetch(url, options))
}));

const { useIterations } = await import('../../../src/public/hooks/useIterations.js');

describe('useIterations', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('initializes with loading state', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useIterations());

    expect(result.current.loading).toBe(true);
    expect(result.current.iterations).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  test('fetches iterations successfully', async () => {
    const mockIterations = [
      {
        id: 'gid://gitlab/Iteration/1',
        title: 'Sprint 1',
        startDate: '2025-01-01',
        dueDate: '2025-01-14',
        state: 'closed'
      },
      {
        id: 'gid://gitlab/Iteration/2',
        title: 'Sprint 2',
        startDate: '2025-01-15',
        dueDate: '2025-01-28',
        state: 'current'
      }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: mockIterations })
    });

    const { result } = renderHook(() => useIterations());

    // Initial state
    expect(result.current.loading).toBe(true);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Final state
    expect(result.current.iterations).toEqual(mockIterations);
    expect(result.current.error).toBe(null);
    expect(global.fetch).toHaveBeenCalledWith('/api/iterations', {});
  });

  test('handles empty iterations array', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: [] })
    });

    const { result } = renderHook(() => useIterations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.iterations).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  test('handles missing iterations property in response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}) // No iterations property
    });

    const { result } = renderHook(() => useIterations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.iterations).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  test('handles HTTP error status', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    const { result } = renderHook(() => useIterations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.iterations).toEqual([]);
    expect(result.current.error).toBe('Error loading iterations: HTTP error! status: 404');
  });

  test('handles network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useIterations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.iterations).toEqual([]);
    expect(result.current.error).toBe('Error loading iterations: Network error');
  });

  test('handles fetch exception', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const { result } = renderHook(() => useIterations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.iterations).toEqual([]);
    expect(result.current.error).toBe('Error loading iterations: Failed to fetch');
  });

  test('only fetches once on mount', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ iterations: [] })
    });

    const { result, rerender } = renderHook(() => useIterations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Rerender the hook
    rerender();

    // Fetch should only be called once (on mount)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
