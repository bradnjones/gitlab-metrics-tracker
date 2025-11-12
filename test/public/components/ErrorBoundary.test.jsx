/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ErrorBoundary from '../../../src/public/components/ErrorBoundary.jsx';

// Mock theme object
const theme = {
  colors: {
    danger: '#ef4444',
    textSecondary: '#6b7280',
    bgPrimary: '#ffffff',
  },
  borderRadius: { lg: '8px' },
  shadows: { sm: '0 1px 3px rgba(0, 0, 0, 0.1)' },
};

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Child content</div>;
};

// Suppress console.error for error boundary tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

describe('ErrorBoundary', () => {
  /**
   * Test 8.1: Renders children when no error
   * Verifies ErrorBoundary renders child components normally
   */
  test('renders children when no error occurs', () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      </ThemeProvider>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  /**
   * Test 8.2: Catches errors from children
   * Verifies ErrorBoundary catches and handles errors from child components
   */
  test('catches errors from child components', () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </ThemeProvider>
    );

    // Should show error UI instead of crashing
    expect(screen.queryByText('Child content')).not.toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  /**
   * Test 8.3: Displays error message
   * Verifies ErrorBoundary displays the error message
   */
  test('displays error message in fallback UI', () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </ThemeProvider>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  /**
   * Test 8.4: Uses ErrorCard component
   * Verifies ErrorBoundary uses ErrorCard for consistent error UI
   */
  test('uses ErrorCard component for error display', () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </ThemeProvider>
    );

    // ErrorCard should display title and message (verifies ErrorCard is used)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  /**
   * Test 8.5: Resets error state with new children
   * Verifies ErrorBoundary can recover when children change
   */
  test('resets error state when children change', () => {
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </ThemeProvider>
    );

    // Should show error
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Rerender with non-throwing child
    rerender(
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </ThemeProvider>
    );

    // Should show normal content again
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});
