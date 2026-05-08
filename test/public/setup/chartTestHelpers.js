/**
 * Shared test helpers for chart component tests.
 *
 * These utilities eliminate the copy-paste boilerplate in every chart's test
 * file: localStorage/fetch setup, mock return value factories, a themed render
 * wrapper, and realistic iteration fixtures.
 *
 * USAGE IN TEST FILES
 * -------------------
 * 1. Mock react-chartjs-2 at the module level (jest.mock is hoisted):
 *
 *   jest.mock('react-chartjs-2', () => {
 *     const React = require('react');
 *     const mockToBase64Image = jest.fn(() => 'data:image/png;base64,mock');
 *     const Line = React.forwardRef(({ data }, ref) => {
 *       React.useImperativeHandle(ref, () => ({ toBase64Image: mockToBase64Image }));
 *       return React.createElement('div', { 'data-testid': 'line-chart', role: 'img' },
 *         React.createElement('div', { 'data-testid': 'chart-data' }, JSON.stringify(data))
 *       );
 *     });
 *     Line.displayName = 'Line';
 *     return { Line };
 *   });
 *
 * 2. Call setupChartMocks() inside beforeEach to stub localStorage and fetch.
 *
 * 3. Use mockUseAnnotations / mockUseChartFilters to get default return values
 *    for inline jest.mock factory functions.
 *
 * 4. Use renderWithTheme(ui) instead of render(ui) for components that need
 *    a ThemeProvider wrapper.
 *
 * @module test/public/setup/chartTestHelpers
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { jest } from '@jest/globals';

// ── Theme ──────────────────────────────────────────────────────────────────

/**
 * Default theme object used in all chart component tests.
 * Mirrors the minimal theme required by styled-components in the project.
 *
 * @type {Object}
 */
export const defaultTheme = {
  colors: {
    bgPrimary: '#ffffff',
    textPrimary: '#1f2937',
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
  },
  typography: {
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
    },
  },
};

// ── Fixtures ───────────────────────────────────────────────────────────────

/**
 * Realistic iteration objects for chart component tests.
 * Contains four sprints covering a two-month window.
 *
 * @type {Array<{id: string, title: string, startDate: string, dueDate: string}>}
 */
export const sampleIterations = [
  {
    id: 'gid://gitlab/Iteration/1',
    title: 'Sprint 1',
    startDate: '2024-01-01',
    dueDate: '2024-01-14',
  },
  {
    id: 'gid://gitlab/Iteration/2',
    title: 'Sprint 2',
    startDate: '2024-01-15',
    dueDate: '2024-01-28',
  },
  {
    id: 'gid://gitlab/Iteration/3',
    title: 'Sprint 3',
    startDate: '2024-01-29',
    dueDate: '2024-02-11',
  },
  {
    id: 'gid://gitlab/Iteration/4',
    title: 'Sprint 4',
    startDate: '2024-02-12',
    dueDate: '2024-02-25',
  },
];

// ── Mock setup ─────────────────────────────────────────────────────────────

/**
 * Set up chart test doubles for localStorage and global fetch.
 *
 * Call this inside beforeEach to ensure a clean slate between tests:
 *
 *   beforeEach(() => {
 *     setupChartMocks();
 *   });
 *
 * Stubs:
 * - `Storage.prototype.getItem`  → jest.fn returning null
 * - `Storage.prototype.setItem`  → jest.fn (no-op)
 * - `Storage.prototype.removeItem` → jest.fn (no-op)
 * - `global.fetch`               → jest.fn (no-op, tests override as needed)
 *
 * @returns {{ mockFetch: jest.Mock }} The fetch mock so tests can configure it.
 */
export function setupChartMocks() {
  Storage.prototype.getItem = jest.fn(() => null);
  Storage.prototype.setItem = jest.fn();
  Storage.prototype.removeItem = jest.fn();

  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  return { mockFetch };
}

// ── Mock return value factories ────────────────────────────────────────────

/**
 * Build a default useAnnotations mock return value, optionally overriding
 * specific fields.
 *
 * Designed to be used as the return value inside a jest.mock factory:
 *
 *   jest.mock('../../../src/public/hooks/useAnnotations.js', () => ({
 *     useAnnotations: jest.fn(() => mockUseAnnotations()),
 *   }));
 *
 * @param {Partial<{annotations: Object, loading: boolean, error: string|null}>} [overrides={}]
 * @returns {{ annotations: Object, loading: boolean, error: string|null }}
 */
export function mockUseAnnotations(overrides = {}) {
  return {
    annotations: {},
    loading: false,
    error: null,
    ...overrides,
  };
}

/**
 * Build a default useChartFilters mock return value, optionally overriding
 * specific fields.
 *
 * Designed to be used as the return value inside a jest.mock factory:
 *
 *   jest.mock('../../../src/public/hooks/useChartFilters.js', () => ({
 *     useChartFilters: jest.fn(() => mockUseChartFilters()),
 *   }));
 *
 * @param {Partial<{excludedIds: string[], setter: jest.Mock}>} [overrides={}]
 * @returns {[string[], jest.Mock]} Tuple matching the real hook's return signature.
 */
export function mockUseChartFilters(overrides = {}) {
  const { excludedIds = [], setter = jest.fn() } = overrides;
  return [excludedIds, setter];
}

// ── Render helpers ─────────────────────────────────────────────────────────

/**
 * Render a React element wrapped in a ThemeProvider with the project's
 * default theme.  Drop-in replacement for RTL's `render` in chart tests.
 *
 * @param {React.ReactElement} ui - The element to render.
 * @param {Object} [theme=defaultTheme] - Optional theme override.
 * @returns {import('@testing-library/react').RenderResult}
 */
export function renderWithTheme(ui, theme = defaultTheme) {
  return render(React.createElement(ThemeProvider, { theme }, ui));
}
