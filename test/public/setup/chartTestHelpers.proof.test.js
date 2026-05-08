/**
 * @jest-environment jsdom
 *
 * Proof test — verifies that chartTestHelpers.js is syntactically valid,
 * all exports resolve, and helper functions behave as documented.
 * This file can be deleted once Phase 2 chart migrations begin consuming
 * the helpers directly.
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import React from 'react';
import {
  setupChartMocks,
  mockUseAnnotations,
  mockUseChartFilters,
  renderWithTheme,
  sampleIterations,
  defaultTheme,
} from './chartTestHelpers.js';

describe('chartTestHelpers', () => {
  beforeEach(() => {
    setupChartMocks();
  });

  // ── Export presence ────────────────────────────────────────────────────────

  test('setupChartMocks is a function', () => {
    expect(typeof setupChartMocks).toBe('function');
  });

  test('mockUseAnnotations is a function', () => {
    expect(typeof mockUseAnnotations).toBe('function');
  });

  test('mockUseChartFilters is a function', () => {
    expect(typeof mockUseChartFilters).toBe('function');
  });

  test('renderWithTheme is a function', () => {
    expect(typeof renderWithTheme).toBe('function');
  });

  test('sampleIterations is exported', () => {
    expect(Array.isArray(sampleIterations)).toBe(true);
  });

  test('defaultTheme is exported', () => {
    expect(typeof defaultTheme).toBe('object');
  });

  // ── sampleIterations ───────────────────────────────────────────────────────

  test('sampleIterations has 4 items', () => {
    expect(sampleIterations).toHaveLength(4);
  });

  test('each sampleIteration has id, title, startDate, dueDate', () => {
    sampleIterations.forEach(iter => {
      expect(iter.id).toBeDefined();
      expect(iter.title).toBeDefined();
      expect(iter.startDate).toBeDefined();
      expect(iter.dueDate).toBeDefined();
    });
  });

  test('sampleIteration ids are unique', () => {
    const ids = sampleIterations.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ── defaultTheme ───────────────────────────────────────────────────────────

  test('defaultTheme has colors.bgPrimary', () => {
    expect(defaultTheme.colors.bgPrimary).toBeDefined();
  });

  test('defaultTheme has spacing.sm and spacing.md', () => {
    expect(defaultTheme.spacing.sm).toBeDefined();
    expect(defaultTheme.spacing.md).toBeDefined();
  });

  test('defaultTheme has typography.fontSize', () => {
    expect(defaultTheme.typography.fontSize).toBeDefined();
  });

  // ── setupChartMocks ────────────────────────────────────────────────────────

  test('setupChartMocks stubs localStorage.getItem to return null', () => {
    expect(localStorage.getItem('anything')).toBeNull();
  });

  test('setupChartMocks stubs localStorage.setItem as a no-op', () => {
    expect(() => localStorage.setItem('k', 'v')).not.toThrow();
  });

  test('setupChartMocks returns a mockFetch function', () => {
    const { mockFetch } = setupChartMocks();
    expect(typeof mockFetch).toBe('function');
    expect(global.fetch).toBe(mockFetch);
  });

  // ── mockUseAnnotations ─────────────────────────────────────────────────────

  test('mockUseAnnotations returns default shape', () => {
    const result = mockUseAnnotations();
    expect(result).toEqual({ annotations: {}, loading: false, error: null });
  });

  test('mockUseAnnotations merges overrides', () => {
    const result = mockUseAnnotations({ loading: true, error: 'oops' });
    expect(result.loading).toBe(true);
    expect(result.error).toBe('oops');
    expect(result.annotations).toEqual({});
  });

  test('mockUseAnnotations can override annotations', () => {
    const annotations = { event_1: { type: 'line' } };
    const result = mockUseAnnotations({ annotations });
    expect(result.annotations).toBe(annotations);
  });

  // ── mockUseChartFilters ────────────────────────────────────────────────────

  test('mockUseChartFilters returns [[], fn] by default', () => {
    const result = mockUseChartFilters();
    expect(result[0]).toEqual([]);
    expect(typeof result[1]).toBe('function');
  });

  test('mockUseChartFilters respects excludedIds override', () => {
    const result = mockUseChartFilters({ excludedIds: ['gid://gitlab/Iteration/1'] });
    expect(result[0]).toEqual(['gid://gitlab/Iteration/1']);
  });

  test('mockUseChartFilters respects custom setter override', () => {
    const customSetter = () => {};
    const result = mockUseChartFilters({ setter: customSetter });
    expect(result[1]).toBe(customSetter);
  });

  // ── renderWithTheme ────────────────────────────────────────────────────────

  test('renderWithTheme renders children', () => {
    const { getByTestId } = renderWithTheme(
      React.createElement('div', { 'data-testid': 'child' }, 'hello')
    );
    expect(getByTestId('child')).toBeInTheDocument();
  });

  test('renderWithTheme uses defaultTheme when no theme is provided', () => {
    // Renders without throwing — ThemeProvider receives the default theme
    expect(() =>
      renderWithTheme(React.createElement('span', null, 'ok'))
    ).not.toThrow();
  });

  test('renderWithTheme accepts a custom theme override', () => {
    const customTheme = { ...defaultTheme, colors: { bgPrimary: '#000' } };
    expect(() =>
      renderWithTheme(React.createElement('span', null, 'ok'), customTheme)
    ).not.toThrow();
  });
});
