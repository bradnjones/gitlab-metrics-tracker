/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import LoadingOverlay from '../../../src/public/components/LoadingOverlay.jsx';

// Mock theme
const theme = {
  transitions: { normal: '0.2s' },
};

describe('LoadingOverlay', () => {
  /**
   * Test 4.1: Renders spinner
   * Verifies LoadingOverlay displays a spinner element
   */
  test('renders spinner', () => {
    render(
      <ThemeProvider theme={theme}>
        <LoadingOverlay />
      </ThemeProvider>
    );

    // Look for spinner by aria-label
    const spinner = screen.getByLabelText(/loading/i);
    expect(spinner).toBeInTheDocument();
  });

  /**
   * Test 4.2: Renders custom message
   * Verifies custom message prop is displayed
   */
  test('renders custom message when provided', () => {
    render(
      <ThemeProvider theme={theme}>
        <LoadingOverlay message="Fetching GitLab data..." />
      </ThemeProvider>
    );

    expect(screen.getByText('Fetching GitLab data...')).toBeInTheDocument();
  });

  /**
   * Test 4.3: Default message
   * Verifies default "Loading..." message when no message prop provided
   */
  test('renders default message when not provided', () => {
    render(
      <ThemeProvider theme={theme}>
        <LoadingOverlay />
      </ThemeProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
