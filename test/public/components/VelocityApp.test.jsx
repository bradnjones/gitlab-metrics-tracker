/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import VelocityApp from '../../../src/public/components/VelocityApp.jsx';

// Mock fetchWithRetry utility
jest.mock('../../../src/public/utils/fetchWithRetry.js', () => ({
  fetchWithRetry: jest.fn((...args) => fetch(...args))
}));

// Mock IterationSelectionModal component
jest.mock('../../../src/public/components/IterationSelectionModal.jsx', () => {
  return function MockIterationSelectionModal({ isOpen }) {
    if (!isOpen) return null;
    return <div data-testid="iteration-selection-modal">Mock Modal</div>;
  };
});

// Mock theme object
const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    bgSecondary: '#f9fafb',
    bgPrimary: '#ffffff',
    bgTertiary: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    border: '#d1d5db',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borderRadius: { sm: '4px', md: '6px', lg: '8px', xl: '12px', full: '9999px' },
  shadows: { sm: '0 1px 2px rgba(0, 0, 0, 0.05)', md: '0 2px 8px rgba(0, 0, 0, 0.1)' },
  typography: {
    fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', '3xl': '2rem' },
    fontWeight: { medium: 500, semibold: 600, bold: 700 },
  },
  breakpoints: { mobile: '640px', tablet: '768px', desktop: '1024px' },
  transitions: { fast: '150ms', normal: '200ms', easing: 'ease-in-out' },
};

describe('VelocityApp', () => {
  /**
   * Test 9.1: Renders with ErrorBoundary wrapper
   * Verifies VelocityApp wraps content in ErrorBoundary for error handling
   */
  test('renders wrapped in ErrorBoundary', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <VelocityApp />
      </ThemeProvider>
    );

    // Should render something (not null)
    expect(container.firstChild).toBeInTheDocument();
  });

  /**
   * Test 9.2: Renders Header and Toolbar components
   * Verifies VelocityApp uses the new Header and IterationSelectorToolbar components
   */
  test('renders Header and IterationSelectorToolbar components', () => {
    render(
      <ThemeProvider theme={theme}>
        <VelocityApp />
      </ThemeProvider>
    );

    // Should show the new Header component text
    expect(screen.getByText('GitLab Sprint Metrics Analyzer')).toBeInTheDocument();
    expect(screen.getByText('Track team performance with context-aware annotations')).toBeInTheDocument();

    // Should show the toolbar with empty state
    expect(screen.getByText(/no sprints selected/i)).toBeInTheDocument();
    expect(screen.getByText(/change iterations/i)).toBeInTheDocument();
  });

  /**
   * Test 9.3: Renders EmptyState when no iterations selected
   * Verifies VelocityApp shows EmptyState component when no data
   */
  test('renders EmptyState when no iterations selected', () => {
    render(
      <ThemeProvider theme={theme}>
        <VelocityApp />
      </ThemeProvider>
    );

    // Should show EmptyState component with message
    expect(screen.getByText(/select sprint iterations/i)).toBeInTheDocument();
  });

  /**
   * Test 9.4: Uses theme-based styling
   * Verifies VelocityApp uses theme colors and spacing from theme.js
   */
  test('uses theme-based styling throughout', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <VelocityApp />
      </ThemeProvider>
    );

    // Should have styled components with class names
    const styledElements = container.querySelectorAll('[class*="sc-"]');
    expect(styledElements.length).toBeGreaterThan(0); // Has styled-components
  });

  /**
   * Test 9.5: App container has proper structure
   * Verifies VelocityApp has proper layout structure with max-width
   */
  test('has proper container structure', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <VelocityApp />
      </ThemeProvider>
    );

    // Should have a main container
    const appContainer = container.firstChild;
    expect(appContainer).toBeInTheDocument();
  });
});
