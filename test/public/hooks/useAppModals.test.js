/**
 * @jest-environment jsdom
 */
import { describe, test, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import useAppModals from '../../../src/public/hooks/useAppModals.js';

describe('useAppModals', () => {
  // ── Initial state ──────────────────────────────────────────────────────────

  test('all modals start closed', () => {
    const { result } = renderHook(() => useAppModals());
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.isDisplayFilterModalOpen).toBe(false);
    expect(result.current.isAnnotationModalOpen).toBe(false);
    expect(result.current.isManageAnnotationsModalOpen).toBe(false);
  });

  test('editingAnnotation starts as null', () => {
    const { result } = renderHook(() => useAppModals());
    expect(result.current.editingAnnotation).toBeNull();
  });

  // ── Iteration selection modal ──────────────────────────────────────────────

  test('openIterationModal opens the iteration modal', () => {
    const { result } = renderHook(() => useAppModals());
    act(() => result.current.openIterationModal());
    expect(result.current.isModalOpen).toBe(true);
  });

  test('closeIterationModal closes the iteration modal', () => {
    const { result } = renderHook(() => useAppModals());
    act(() => result.current.openIterationModal());
    act(() => result.current.closeIterationModal());
    expect(result.current.isModalOpen).toBe(false);
  });

  // ── Display filter modal ───────────────────────────────────────────────────

  test('openDisplayFilterModal opens the display filter modal', () => {
    const { result } = renderHook(() => useAppModals());
    act(() => result.current.openDisplayFilterModal());
    expect(result.current.isDisplayFilterModalOpen).toBe(true);
  });

  test('closeDisplayFilterModal closes the display filter modal', () => {
    const { result } = renderHook(() => useAppModals());
    act(() => result.current.openDisplayFilterModal());
    act(() => result.current.closeDisplayFilterModal());
    expect(result.current.isDisplayFilterModalOpen).toBe(false);
  });

  // ── Annotation modal ───────────────────────────────────────────────────────

  test('openAnnotationModal opens the annotation modal', () => {
    const { result } = renderHook(() => useAppModals());
    act(() => result.current.openAnnotationModal());
    expect(result.current.isAnnotationModalOpen).toBe(true);
  });

  test('closeAnnotationModal closes the annotation modal and clears editingAnnotation', () => {
    const { result } = renderHook(() => useAppModals());
    act(() => result.current.openAnnotationModal());
    act(() => result.current.closeAnnotationModal());
    expect(result.current.isAnnotationModalOpen).toBe(false);
    expect(result.current.editingAnnotation).toBeNull();
  });

  test('closeAnnotationModal clears a previously set editingAnnotation', () => {
    const { result } = renderHook(() => useAppModals());
    const annotation = { id: 'a1', title: 'Test' };
    act(() => result.current.startEditAnnotation(annotation));
    expect(result.current.editingAnnotation).toEqual(annotation);
    act(() => result.current.closeAnnotationModal());
    expect(result.current.editingAnnotation).toBeNull();
  });

  // ── Manage annotations modal ───────────────────────────────────────────────

  test('openManageAnnotationsModal opens the manage annotations modal', () => {
    const { result } = renderHook(() => useAppModals());
    act(() => result.current.openManageAnnotationsModal());
    expect(result.current.isManageAnnotationsModalOpen).toBe(true);
  });

  test('closeManageAnnotationsModal closes the manage annotations modal', () => {
    const { result } = renderHook(() => useAppModals());
    act(() => result.current.openManageAnnotationsModal());
    act(() => result.current.closeManageAnnotationsModal());
    expect(result.current.isManageAnnotationsModalOpen).toBe(false);
  });

  // ── Cross-modal flows ──────────────────────────────────────────────────────

  test('startEditAnnotation sets editingAnnotation, closes manage modal, opens annotation modal', () => {
    const { result } = renderHook(() => useAppModals());
    const annotation = { id: 'a1', title: 'Sprint retro' };
    act(() => result.current.openManageAnnotationsModal());
    act(() => result.current.startEditAnnotation(annotation));
    expect(result.current.editingAnnotation).toEqual(annotation);
    expect(result.current.isManageAnnotationsModalOpen).toBe(false);
    expect(result.current.isAnnotationModalOpen).toBe(true);
  });

  test('startCreateAnnotation clears editingAnnotation, closes manage modal, opens annotation modal', () => {
    const { result } = renderHook(() => useAppModals());
    const annotation = { id: 'a1', title: 'Old' };
    act(() => result.current.startEditAnnotation(annotation));
    act(() => result.current.openManageAnnotationsModal());
    act(() => result.current.startCreateAnnotation());
    expect(result.current.editingAnnotation).toBeNull();
    expect(result.current.isManageAnnotationsModalOpen).toBe(false);
    expect(result.current.isAnnotationModalOpen).toBe(true);
  });

  // ── Return shape ───────────────────────────────────────────────────────────

  test('returns all expected handler functions', () => {
    const { result } = renderHook(() => useAppModals());
    const expectedFns = [
      'openIterationModal',
      'closeIterationModal',
      'openDisplayFilterModal',
      'closeDisplayFilterModal',
      'openAnnotationModal',
      'closeAnnotationModal',
      'openManageAnnotationsModal',
      'closeManageAnnotationsModal',
      'startEditAnnotation',
      'startCreateAnnotation',
    ];
    expectedFns.forEach(fn => {
      expect(typeof result.current[fn]).toBe('function');
    });
  });

  // ── Modals are independent ─────────────────────────────────────────────────

  test('opening one modal does not affect others', () => {
    const { result } = renderHook(() => useAppModals());
    act(() => result.current.openIterationModal());
    expect(result.current.isDisplayFilterModalOpen).toBe(false);
    expect(result.current.isAnnotationModalOpen).toBe(false);
    expect(result.current.isManageAnnotationsModalOpen).toBe(false);
  });
});
