/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';

const { useAnnotations } = await import('../../../src/public/hooks/useAnnotations.js');

describe('useAnnotations', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    // Suppress console.error for expected error tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('initializes with empty state', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useAnnotations('velocity', []));

    expect(result.current.loading).toBe(true);
    expect(result.current.annotations).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  test('handles empty dateLabels without crashing', async () => {
    const mockAnnotations = [
      {
        id: '1',
        title: 'Sprint Planning Change',
        date: '2025-01-15',
        impact: 'positive',
        affectedMetrics: ['velocity'],
        description: 'Changed planning process'
      }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnnotations
    });

    const { result } = renderHook(() => useAnnotations('velocity', []));

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not crash - annotations should be empty object since no chart dates to position against
    expect(result.current.annotations).toBeDefined();
    // With empty dateLabels, should return empty config (no annotations can be positioned)
    expect(Object.keys(result.current.annotations).length).toBe(0);
    // Should not have an error - empty dateLabels is a valid state
    expect(result.current.error).toBe(null);
    // Console.error should not be called (no TypeError)
    expect(console.error).not.toHaveBeenCalled();
  });

  test('fetches and transforms annotations successfully with valid dateLabels', async () => {
    const mockAnnotations = [
      {
        id: '1',
        title: 'Sprint Planning Change',
        date: '2025-01-15',
        impact: 'positive',
        affectedMetrics: ['velocity'],
        description: 'Changed planning process'
      }
    ];

    const dateLabels = ['1/10', '1/15', '1/20', '1/25'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnnotations
    });

    const { result } = renderHook(() => useAnnotations('velocity', dateLabels));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have transformed annotations
    expect(result.current.annotations).toBeDefined();
    expect(result.current.annotations['annotation_1']).toBeDefined();
    expect(result.current.annotations['annotation_1'].type).toBe('line');
    expect(result.current.error).toBe(null);
  });

  test('filters annotations by affected metrics', async () => {
    const mockAnnotations = [
      {
        id: '1',
        title: 'Velocity Change',
        date: '2025-01-15',
        impact: 'positive',
        affectedMetrics: ['velocity'],
        description: 'Affects velocity only'
      },
      {
        id: '2',
        title: 'Cycle Time Change',
        date: '2025-01-20',
        impact: 'negative',
        affectedMetrics: ['cycle_time_avg'],
        description: 'Affects cycle time only'
      }
    ];

    const dateLabels = ['1/10', '1/15', '1/20', '1/25'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnnotations
    });

    const { result } = renderHook(() => useAnnotations('velocity', dateLabels));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should only include annotation 1 (velocity)
    expect(result.current.annotations['annotation_1']).toBeDefined();
    expect(result.current.annotations['annotation_2']).toBeUndefined();
  });

  test('handles HTTP error status', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    const { result } = renderHook(() => useAnnotations('velocity', ['1/10', '1/15']));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.annotations).toEqual([]);
    expect(result.current.error).toBe('HTTP error! status: 404');
  });

  test('handles network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAnnotations('velocity', ['1/10', '1/15']));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.annotations).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  test('does not fetch if metricKey is not provided', () => {
    const { result } = renderHook(() => useAnnotations('', ['1/10', '1/15']));

    expect(result.current.loading).toBe(false);
    expect(result.current.annotations).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('re-fetches when refreshKey changes', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });

    const { rerender } = renderHook(
      ({ refreshKey }) => useAnnotations('velocity', ['1/10', '1/15'], refreshKey),
      { initialProps: { refreshKey: 0 } }
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Change refreshKey
    rerender({ refreshKey: 1 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  test('applies correct impact colors to annotations', async () => {
    const mockAnnotations = [
      {
        id: '1',
        title: 'Positive Change',
        date: '2025-01-15',
        impact: 'positive',
        affectedMetrics: ['velocity'],
        description: 'Good change'
      },
      {
        id: '2',
        title: 'Negative Change',
        date: '2025-01-20',
        impact: 'negative',
        affectedMetrics: ['velocity'],
        description: 'Bad change'
      },
      {
        id: '3',
        title: 'Neutral Change',
        date: '2025-01-25',
        impact: 'neutral',
        affectedMetrics: ['velocity'],
        description: 'Neutral change'
      }
    ];

    const dateLabels = ['1/10', '1/15', '1/20', '1/25', '1/30'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnnotations
    });

    const { result } = renderHook(() => useAnnotations('velocity', dateLabels));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check colors
    expect(result.current.annotations['annotation_1'].borderColor).toBe('#10b981'); // Green
    expect(result.current.annotations['annotation_2'].borderColor).toBe('#ef4444'); // Red
    expect(result.current.annotations['annotation_3'].borderColor).toBe('#6b7280'); // Gray
  });

  test('uses custom color if provided', async () => {
    const mockAnnotations = [
      {
        id: '1',
        title: 'Custom Color Change',
        date: '2025-01-15',
        impact: 'positive',
        color: '#ff00ff', // Custom purple
        affectedMetrics: ['velocity'],
        description: 'Has custom color'
      }
    ];

    const dateLabels = ['1/10', '1/15', '1/20'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnnotations
    });

    const { result } = renderHook(() => useAnnotations('velocity', dateLabels));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should use custom color, not impact color
    expect(result.current.annotations['annotation_1'].borderColor).toBe('#ff00ff');
  });

  test('positions annotation between two data points with proportional positioning', async () => {
    // Annotation on 1/17 should fall between 1/15 (index 1) and 1/20 (index 2)
    const mockAnnotations = [
      {
        id: '1',
        title: 'Mid-Sprint Change',
        date: '2025-01-17', // Between 1/15 and 1/20
        impact: 'positive',
        affectedMetrics: ['velocity'],
        description: 'Falls between data points'
      }
    ];

    const dateLabels = ['1/10', '1/15', '1/20', '1/25'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnnotations
    });

    const { result } = renderHook(() => useAnnotations('velocity', dateLabels));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should position annotation between index 1 and 2 (proportionally)
    const annotation = result.current.annotations['annotation_1'];
    expect(annotation).toBeDefined();
    expect(annotation.xMin).toBeGreaterThan(1); // After 1/15 (index 1)
    expect(annotation.xMin).toBeLessThan(2); // Before 1/20 (index 2)
  });

  test('positions annotation before first data point at index 0', async () => {
    // Annotation on 1/5 is before first data point (1/10)
    const mockAnnotations = [
      {
        id: '1',
        title: 'Pre-Sprint Change',
        date: '2025-01-05', // Before first data point
        impact: 'negative',
        affectedMetrics: ['velocity'],
        description: 'Before chart start'
      }
    ];

    const dateLabels = ['1/10', '1/15', '1/20', '1/25'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnnotations
    });

    const { result } = renderHook(() => useAnnotations('velocity', dateLabels));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should position at index 0 (start of chart)
    const annotation = result.current.annotations['annotation_1'];
    expect(annotation).toBeDefined();
    expect(annotation.xMin).toBe(0);
    expect(annotation.xMax).toBe(0);
  });

  test('positions annotation after last data point at final index', async () => {
    // Annotation on 1/30 is after last data point (1/25)
    const mockAnnotations = [
      {
        id: '1',
        title: 'Post-Sprint Change',
        date: '2025-01-30', // After last data point
        impact: 'neutral',
        affectedMetrics: ['velocity'],
        description: 'After chart end'
      }
    ];

    const dateLabels = ['1/10', '1/15', '1/20', '1/25'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnnotations
    });

    const { result } = renderHook(() => useAnnotations('velocity', dateLabels));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should position at index 3 (end of chart, last data point)
    const annotation = result.current.annotations['annotation_1'];
    expect(annotation).toBeDefined();
    expect(annotation.xMin).toBe(3); // Index of last data point (1/25)
    expect(annotation.xMax).toBe(3);
  });

  test('handles annotation without id using index for key', async () => {
    // Annotation missing 'id' field - should use array index
    const mockAnnotations = [
      {
        // No id field
        title: 'No ID Annotation',
        date: '2025-01-15',
        impact: 'positive',
        affectedMetrics: ['velocity'],
        description: 'Missing id field'
      }
    ];

    const dateLabels = ['1/10', '1/15', '1/20'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnnotations
    });

    const { result } = renderHook(() => useAnnotations('velocity', dateLabels));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should use 'annotation_0' (index) instead of 'annotation_undefined'
    expect(result.current.annotations['annotation_0']).toBeDefined();
    expect(result.current.annotations['annotation_undefined']).toBeUndefined();
  });
});
