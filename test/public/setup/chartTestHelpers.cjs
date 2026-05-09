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
    bgSecondary: '#f9fafb',
    bgTertiary: '#e5e7eb',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    border: '#d1d5db',
    primary: '#3b82f6',
  },
  spacing: {
    xs: '4px',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  typography: {
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
    fontWeight: {
      medium: 500,
      semibold: 600,
    },
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  shadows: {
    md: '0 2px 8px rgba(0,0,0,0.1)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.1)',
  },
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
  },
  transitions: {
    fast: '150ms',
    normal: '200ms',
    easing: 'ease-in-out',
  },
  zIndex: {
    modal: 1000,
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
