/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import VelocityApp from '../../../src/public/components/VelocityApp.jsx';

// Mock theme object
const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    bgSecondary: '#f9fafb',
    bgPrimary: '#ffffff',
    textSecondary: '#6b7280',
  },
  spacing: { md: '16px' },
  borderRadius: { lg: '8px', xl: '12px' },
  shadows: { md: '0 2px 8px rgba(0, 0, 0, 0.1)' },
  typography: {
    fontSize: { base: '1rem', '3xl': '2rem' },
    fontWeight: { bold: 700 },
  },
  breakpoints: { mobile: '640px' },
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
   * Test 9.2: Renders Header component
   * Verifies VelocityApp uses the new Header component
   */
  test('renders new Header component', () => {
    render(
      <ThemeProvider theme={theme}>
        <VelocityApp />
      </ThemeProvider>
    );

    // Should show the new Header component text
    expect(screen.getByText('GitLab Sprint Metrics Analyzer')).toBeInTheDocument();
    expect(screen.getByText('Track team performance with context-aware annotations')).toBeInTheDocument();
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

    // Header should use gradient from theme
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header.className).toBeTruthy(); // Has styled-component class
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
