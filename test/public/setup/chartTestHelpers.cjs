/**
 * Jest CJS shim for chartTestHelpers.js
 *
 * Re-exports all helpers in CommonJS format so the babel-jest transform
 * can require() this file from chart component test files.
 *
 * The real implementation lives in chartTestHelpers.js (ES Module).
 * This shim is referenced via moduleNameMapper in jest config.
 */
const React = require('react');
const { render } = require('@testing-library/react');
const { ThemeProvider } = require('styled-components');
// ── Theme ──────────────────────────────────────────────────────────────────

const defaultTheme = {
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

const sampleIterations = [
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

function setupChartMocks() {
  Storage.prototype.getItem = jest.fn(() => null);
  Storage.prototype.setItem = jest.fn();
  Storage.prototype.removeItem = jest.fn();

  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  return { mockFetch };
}

// ── Mock return value factories ────────────────────────────────────────────

function mockUseAnnotations(overrides) {
  return Object.assign(
    { annotations: {}, loading: false, error: null },
    overrides || {}
  );
}

function mockUseChartFilters(overrides) {
  const opts = overrides || {};
  const excludedIds = opts.excludedIds || [];
  const setter = opts.setter || jest.fn();
  return [excludedIds, setter];
}

// ── Render helpers ─────────────────────────────────────────────────────────

function renderWithTheme(ui, theme) {
  const t = theme || defaultTheme;
  return render(React.createElement(ThemeProvider, { theme: t }, ui));
}

module.exports = {
  defaultTheme,
  sampleIterations,
  setupChartMocks,
  mockUseAnnotations,
  mockUseChartFilters,
  renderWithTheme,
};
