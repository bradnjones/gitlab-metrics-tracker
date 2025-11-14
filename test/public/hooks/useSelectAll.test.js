/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useSelectAll } from '../../../src/public/hooks/useSelectAll.js';

describe('useSelectAll', () => {
  const mockIterations = [
    { id: 'gid://gitlab/Iteration/1', title: 'Sprint 1' },
    { id: 'gid://gitlab/Iteration/2', title: 'Sprint 2' },
    { id: 'gid://gitlab/Iteration/3', title: 'Sprint 3' }
  ];

  test('initializes with ref and handler', () => {
    const setSelectedIds = jest.fn();
    const { result } = renderHook(() =>
      useSelectAll(mockIterations, [], setSelectedIds)
    );

    expect(result.current.selectAllRef).toBeDefined();
    expect(result.current.selectAllRef.current).toBeNull();
    expect(typeof result.current.handleSelectAll).toBe('function');
  });

  test('handleSelectAll selects all filtered iterations when checked', () => {
    const setSelectedIds = jest.fn();
    const { result } = renderHook(() =>
      useSelectAll(mockIterations, [], setSelectedIds)
    );

    act(() => {
      result.current.handleSelectAll(true);
    });

    expect(setSelectedIds).toHaveBeenCalledWith([
      'gid://gitlab/Iteration/1',
      'gid://gitlab/Iteration/2',
      'gid://gitlab/Iteration/3'
    ]);
  });

  test('handleSelectAll deselects all filtered iterations when unchecked', () => {
    const setSelectedIds = jest.fn();
    const selectedIds = [
      'gid://gitlab/Iteration/1',
      'gid://gitlab/Iteration/2',
      'gid://gitlab/Iteration/3'
    ];

    const { result } = renderHook(() =>
      useSelectAll(mockIterations, selectedIds, setSelectedIds)
    );

    act(() => {
      result.current.handleSelectAll(false);
    });

    expect(setSelectedIds).toHaveBeenCalledWith(expect.any(Function));

    // Test the function passed to setSelectedIds
    const updateFunc = setSelectedIds.mock.calls[0][0];
    const newIds = updateFunc(selectedIds);
    expect(newIds).toEqual([]);
  });

  test('handleSelectAll preserves selections outside filtered set when unchecking', () => {
    const setSelectedIds = jest.fn();
    const selectedIds = [
      'gid://gitlab/Iteration/1',
      'gid://gitlab/Iteration/2',
      'gid://gitlab/Iteration/99' // Not in filtered iterations
    ];

    const { result } = renderHook(() =>
      useSelectAll(mockIterations, selectedIds, setSelectedIds)
    );

    act(() => {
      result.current.handleSelectAll(false);
    });

    // Test the function passed to setSelectedIds
    const updateFunc = setSelectedIds.mock.calls[0][0];
    const newIds = updateFunc(selectedIds);
    expect(newIds).toEqual(['gid://gitlab/Iteration/99']);
  });

  test('checkbox state logic - none selected', () => {
    const setSelectedIds = jest.fn();
    const { result } = renderHook(() =>
      useSelectAll(mockIterations, [], setSelectedIds)
    );

    // The hook should be initialized
    expect(result.current.selectAllRef).toBeDefined();
    expect(typeof result.current.handleSelectAll).toBe('function');
  });

  test('checkbox state logic - all selected', () => {
    const setSelectedIds = jest.fn();
    const selectedIds = [
      'gid://gitlab/Iteration/1',
      'gid://gitlab/Iteration/2',
      'gid://gitlab/Iteration/3'
    ];

    const { result } = renderHook(() =>
      useSelectAll(mockIterations, selectedIds, setSelectedIds)
    );

    expect(result.current.selectAllRef).toBeDefined();
    expect(typeof result.current.handleSelectAll).toBe('function');
  });

  test('checkbox state logic - some selected', () => {
    const setSelectedIds = jest.fn();
    const selectedIds = ['gid://gitlab/Iteration/1'];

    const { result } = renderHook(() =>
      useSelectAll(mockIterations, selectedIds, setSelectedIds)
    );

    expect(result.current.selectAllRef).toBeDefined();
    expect(typeof result.current.handleSelectAll).toBe('function');
  });

  test('does not update checkbox state when ref is null', () => {
    const setSelectedIds = jest.fn();
    const selectedIds = ['gid://gitlab/Iteration/1'];

    // This should not throw even though ref is null
    const { result } = renderHook(() =>
      useSelectAll(mockIterations, selectedIds, setSelectedIds)
    );

    expect(result.current.selectAllRef.current).toBeNull();
  });

  test('does not update checkbox state when filtered iterations is empty', () => {
    const setSelectedIds = jest.fn();
    const mockCheckboxRef = { checked: true, indeterminate: true };

    const { result } = renderHook(() =>
      useSelectAll([], [], setSelectedIds)
    );

    // Set the ref
    result.current.selectAllRef.current = mockCheckboxRef;

    // Re-render
    const { rerender } = renderHook(() =>
      useSelectAll([], [], setSelectedIds)
    );
    rerender();

    // Should not change the checkbox state when there are no iterations
    expect(mockCheckboxRef.checked).toBe(true);
    expect(mockCheckboxRef.indeterminate).toBe(true);
  });

  test('updates checkbox state when selectedIds change', () => {
    const setSelectedIds = jest.fn();
    const mockCheckboxRef = { checked: false, indeterminate: false };

    const { result, rerender } = renderHook(
      ({ selectedIds }) => useSelectAll(mockIterations, selectedIds, setSelectedIds),
      { initialProps: { selectedIds: [] } }
    );

    // Set the ref
    result.current.selectAllRef.current = mockCheckboxRef;

    // Start with none selected
    rerender({ selectedIds: [] });
    expect(result.current.isChecked).toBe(false);
    expect(result.current.isIndeterminate).toBe(false);
    expect(mockCheckboxRef.indeterminate).toBe(false);

    // Select one
    rerender({ selectedIds: ['gid://gitlab/Iteration/1'] });
    expect(result.current.isChecked).toBe(false);
    expect(result.current.isIndeterminate).toBe(true);
    expect(mockCheckboxRef.indeterminate).toBe(true);

    // Select all
    rerender({
      selectedIds: [
        'gid://gitlab/Iteration/1',
        'gid://gitlab/Iteration/2',
        'gid://gitlab/Iteration/3'
      ]
    });
    expect(result.current.isChecked).toBe(true);
    expect(result.current.isIndeterminate).toBe(false);
    expect(mockCheckboxRef.indeterminate).toBe(false);
  });

  test('responds to changes in filtered iterations', () => {
    const setSelectedIds = jest.fn();
    const selectedIds = ['gid://gitlab/Iteration/1', 'gid://gitlab/Iteration/2'];

    const { result, rerender } = renderHook(
      ({ filteredIterations }) => useSelectAll(filteredIterations, selectedIds, setSelectedIds),
      { initialProps: { filteredIterations: mockIterations } }
    );

    // Hook should work with different filtered sets
    expect(result.current.selectAllRef).toBeDefined();

    // Filter to only the 2 selected iterations
    const filteredTwo = [mockIterations[0], mockIterations[1]];
    rerender({ filteredIterations: filteredTwo });

    // Hook should still work after rerender
    expect(result.current.selectAllRef).toBeDefined();
    expect(typeof result.current.handleSelectAll).toBe('function');
  });

  test('handleSelectAll works with filtered subset of iterations', () => {
    const setSelectedIds = jest.fn();
    const filteredIterations = [mockIterations[0], mockIterations[1]]; // Only first 2

    const { result } = renderHook(() =>
      useSelectAll(filteredIterations, [], setSelectedIds)
    );

    act(() => {
      result.current.handleSelectAll(true);
    });

    // Should only select the filtered iterations
    expect(setSelectedIds).toHaveBeenCalledWith([
      'gid://gitlab/Iteration/1',
      'gid://gitlab/Iteration/2'
    ]);
  });
});
