/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import EmptyState from '../../../src/public/components/EmptyState.jsx';

// Mock theme object
const theme = {
  colors: {
    textSecondary: '#6b7280',
    primary: '#3b82f6',
  },
  borderRadius: { lg: '8px' },
  typography: {
    fontWeight: { medium: 500 },
  },
};

describe('EmptyState', () => {
  /**
   * Test 3.1: Basic rendering
   * Verifies EmptyState renders message prop
   */
  test('renders message text', () => {
    render(
      <ThemeProvider theme={theme}>
        <EmptyState message="No iterations selected. Choose sprint iterations above to analyze your team's metrics." />
      </ThemeProvider>
    );

    expect(screen.getByText(/No iterations selected/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose sprint iterations above/i)).toBeInTheDocument();
  });

  /**
   * Test 3.2: Optional icon
   * Verifies icon is rendered when provided
   */
  test('renders optional icon when provided', () => {
    render(
      <ThemeProvider theme={theme}>
        <EmptyState
          message="No data available"
          icon="📊"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  /**
   * Test 3.3: CTA button with callback
   * Verifies CTA button renders and calls onCTA when clicked
   */
  test('renders CTA button and calls onCTA when clicked', async () => {
    const mockOnCTA = jest.fn();
    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <EmptyState
          message="No iterations found"
          ctaText="Load from GitLab"
          onCTA={mockOnCTA}
        />
      </ThemeProvider>
    );

    const ctaButton = screen.getByRole('button', { name: /Load from GitLab/i });
    await user.click(ctaButton);

    expect(mockOnCTA).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 3.4: No CTA when not provided
   * Verifies CTA button is NOT rendered when ctaText or onCTA is undefined
   */
  test('does not render CTA button when ctaText or onCTA not provided', () => {
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <EmptyState message="No data" />
      </ThemeProvider>
    );

    // No CTA when both missing
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    // No CTA when only ctaText provided
    rerender(
      <ThemeProvider theme={theme}>
        <EmptyState message="No data" ctaText="Click me" />
      </ThemeProvider>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    // No CTA when only onCTA provided
    rerender(
      <ThemeProvider theme={theme}>
        <EmptyState message="No data" onCTA={() => {}} />
      </ThemeProvider>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
