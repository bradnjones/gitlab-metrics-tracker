/**
 * @jest-environment jsdom
 */
import { describe, test, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useIterationFilters } from '../../../src/public/hooks/useIterationFilters.js';

describe('useIterationFilters', () => {
  const mockIterations = [
    {
      id: 'gid://gitlab/Iteration/1',
      title: 'Sprint 1',
      startDate: '2025-01-01',
      dueDate: '2025-01-14',
      state: 'closed',
      iid: 1,
      iterationCadence: { title: 'Team A Sprint' }
    },
    {
      id: 'gid://gitlab/Iteration/2',
      title: 'Sprint 2',
      startDate: '2025-01-15',
      dueDate: '2025-01-28',
      state: 'current',
      iid: 2,
      iterationCadence: { title: 'Team A Sprint' }
    },
    {
      id: 'gid://gitlab/Iteration/3',
      title: 'Sprint 3',
      startDate: '2025-02-01',
      dueDate: '2025-02-14',
      state: 'upcoming',
      iid: 3,
      iterationCadence: { title: 'Team B Sprint' }
    }
  ];

  const mockFormatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  test('initializes with empty filters', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    expect(result.current.stateFilter).toBe('');
    expect(result.current.cadenceFilter).toBe('');
    expect(result.current.searchQuery).toBe('');
  });

  test('returns all iterations when no filters applied', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    expect(result.current.filteredIterations).toHaveLength(3);
    expect(result.current.filteredIterations).toEqual(mockIterations);
  });

  test('extracts unique states from iterations', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    expect(result.current.uniqueStates).toHaveLength(3);
    expect(result.current.uniqueStates).toContain('closed');
    expect(result.current.uniqueStates).toContain('current');
    expect(result.current.uniqueStates).toContain('upcoming');
  });

  test('extracts unique cadences from iterations', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    expect(result.current.uniqueCadences).toHaveLength(2);
    expect(result.current.uniqueCadences).toContain('Team A Sprint');
    expect(result.current.uniqueCadences).toContain('Team B Sprint');
  });

  test('filters by state', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    act(() => {
      result.current.setStateFilter('closed');
    });

    expect(result.current.filteredIterations).toHaveLength(1);
    expect(result.current.filteredIterations[0].id).toBe('gid://gitlab/Iteration/1');
  });

  test('filters by cadence', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    act(() => {
      result.current.setCadenceFilter('Team B Sprint');
    });

    expect(result.current.filteredIterations).toHaveLength(1);
    expect(result.current.filteredIterations[0].id).toBe('gid://gitlab/Iteration/3');
  });

  test('filters by search query matching title', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    act(() => {
      result.current.setSearchQuery('Sprint 2');
    });

    expect(result.current.filteredIterations).toHaveLength(1);
    expect(result.current.filteredIterations[0].id).toBe('gid://gitlab/Iteration/2');
  });

  test('filters by search query matching date', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    act(() => {
      result.current.setSearchQuery('Feb');
    });

    expect(result.current.filteredIterations).toHaveLength(1);
    expect(result.current.filteredIterations[0].id).toBe('gid://gitlab/Iteration/3');
  });

  test('search is case-insensitive', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    act(() => {
      result.current.setSearchQuery('SPRINT 1');
    });

    expect(result.current.filteredIterations).toHaveLength(1);
    expect(result.current.filteredIterations[0].id).toBe('gid://gitlab/Iteration/1');
  });

  test('combines multiple filters (AND logic)', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    act(() => {
      result.current.setStateFilter('current');
      result.current.setCadenceFilter('Team A Sprint');
    });

    expect(result.current.filteredIterations).toHaveLength(1);
    expect(result.current.filteredIterations[0].id).toBe('gid://gitlab/Iteration/2');
  });

  test('returns empty array when no iterations match filters', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    act(() => {
      result.current.setStateFilter('closed');
      result.current.setCadenceFilter('Team B Sprint');
    });

    expect(result.current.filteredIterations).toHaveLength(0);
  });

  test('handles iterations without cadence', () => {
    const iterationsWithoutCadence = [
      {
        id: 'gid://gitlab/Iteration/1',
        title: 'Sprint 1',
        startDate: '2025-01-01',
        dueDate: '2025-01-14',
        state: 'closed',
        iid: 1
      }
    ];

    const { result } = renderHook(() => useIterationFilters(iterationsWithoutCadence, mockFormatDate));

    expect(result.current.uniqueCadences).toHaveLength(0);
    expect(result.current.filteredIterations).toHaveLength(1);
  });

  test('handles empty iterations array', () => {
    const { result } = renderHook(() => useIterationFilters([], mockFormatDate));

    expect(result.current.uniqueStates).toHaveLength(0);
    expect(result.current.uniqueCadences).toHaveLength(0);
    expect(result.current.filteredIterations).toHaveLength(0);
  });

  test('clears filters when set to empty string', () => {
    const { result } = renderHook(() => useIterationFilters(mockIterations, mockFormatDate));

    act(() => {
      result.current.setStateFilter('closed');
      result.current.setCadenceFilter('Team A Sprint');
      result.current.setSearchQuery('Sprint');
    });

    expect(result.current.filteredIterations).toHaveLength(1);

    act(() => {
      result.current.setStateFilter('');
      result.current.setCadenceFilter('');
      result.current.setSearchQuery('');
    });

    expect(result.current.filteredIterations).toHaveLength(3);
  });

  test('uses fallback title when iteration.title is missing', () => {
    const iterationsWithoutTitle = [
      {
        id: 'gid://gitlab/Iteration/1',
        startDate: '2025-01-01',
        dueDate: '2025-01-14',
        state: 'closed',
        iid: 5,
        iterationCadence: { title: 'Team Sprint' }
      }
    ];

    const { result } = renderHook(() => useIterationFilters(iterationsWithoutTitle, mockFormatDate));

    act(() => {
      result.current.setSearchQuery('Team Sprint');
    });

    expect(result.current.filteredIterations).toHaveLength(1);
  });

  test('uses iid fallback when both title and cadence title missing', () => {
    const iterationsWithoutTitles = [
      {
        id: 'gid://gitlab/Iteration/1',
        startDate: '2025-01-01',
        dueDate: '2025-01-14',
        state: 'closed',
        iid: 42
      }
    ];

    const { result } = renderHook(() => useIterationFilters(iterationsWithoutTitles, mockFormatDate));

    act(() => {
      result.current.setSearchQuery('Sprint 42');
    });

    expect(result.current.filteredIterations).toHaveLength(1);
  });
});
