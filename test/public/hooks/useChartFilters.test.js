/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useChartFilters } from '../../../src/public/hooks/useChartFilters.js';

describe('useChartFilters', () => {
  beforeEach(() => {
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with empty excluded IDs when localStorage is empty', () => {
    const { result } = renderHook(() => useChartFilters('chart-filters-test'));

    expect(result.current[0]).toEqual([]);
  });

  test('loads excluded IDs from localStorage on mount', () => {
    Storage.prototype.getItem = jest.fn(() => JSON.stringify(['id-1', 'id-2']));

    const { result } = renderHook(() => useChartFilters('chart-filters-test'));

    expect(result.current[0]).toEqual(['id-1', 'id-2']);
    expect(localStorage.getItem).toHaveBeenCalledWith('chart-filters-test');
  });

  test('ignores malformed localStorage data', () => {
    Storage.prototype.getItem = jest.fn(() => 'not-valid-json');
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useChartFilters('chart-filters-test'));

    expect(result.current[0]).toEqual([]);
    consoleSpy.mockRestore();
  });

  test('ignores non-array localStorage data', () => {
    Storage.prototype.getItem = jest.fn(() => JSON.stringify({ foo: 'bar' }));

    const { result } = renderHook(() => useChartFilters('chart-filters-test'));

    expect(result.current[0]).toEqual([]);
  });

  test('saves excluded IDs to localStorage when they change', () => {
    const { result } = renderHook(() => useChartFilters('chart-filters-test'));

    act(() => {
      result.current[1](['id-1', 'id-2']);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'chart-filters-test',
      JSON.stringify(['id-1', 'id-2'])
    );
  });

  test('removes localStorage key when excluded IDs are cleared', () => {
    const { result } = renderHook(() => useChartFilters('chart-filters-test'));

    act(() => {
      result.current[1](['id-1']);
    });

    act(() => {
      result.current[1]([]);
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith('chart-filters-test');
  });

  test('uses the provided storageKey for all localStorage operations', () => {
    const { result } = renderHook(() => useChartFilters('chart-filters-velocity'));

    act(() => {
      result.current[1](['id-1']);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'chart-filters-velocity',
      expect.any(String)
    );
  });

  test('returns a setter function as the second element', () => {
    const { result } = renderHook(() => useChartFilters('chart-filters-test'));

    expect(typeof result.current[1]).toBe('function');
  });
});
