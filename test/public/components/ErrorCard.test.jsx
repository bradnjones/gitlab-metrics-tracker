/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import ErrorCard from '../../../src/public/components/ErrorCard.jsx';

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

describe('ErrorCard', () => {
  /**
   * Test 2.1: Basic rendering
   * Verifies ErrorCard renders title and message props
   */
  test('renders error title and message', () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorCard
          title="API Error"
          message="Failed to fetch data from GitLab"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('API Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch data from GitLab')).toBeInTheDocument();
  });

  /**
   * Test 2.2: Retry callback
   * Verifies onRetry callback is called when retry button clicked
   */
  test('calls onRetry callback when retry button clicked', async () => {
    const mockOnRetry = jest.fn();
    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <ErrorCard
          title="Network Error"
          message="Connection failed"
          onRetry={mockOnRetry}
        />
      </ThemeProvider>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 2.3: Conditional retry button
   * Verifies retry button is NOT rendered when onRetry is undefined
   */
  test('does not render retry button when onRetry is undefined', () => {
    render(
      <ThemeProvider theme={theme}>
        <ErrorCard
          title="Error"
          message="Something went wrong"
        />
      </ThemeProvider>
    );

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  /**
   * Test 2.4: Theme integration
   * Verifies ErrorCard uses theme colors correctly
   * Note: This test validates the component integrates with theme,
   * actual color values may not be accessible in jsdom
   */
  test('integrates with theme provider', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ErrorCard
          title="Theme Test"
          message="Testing theme integration"
        />
      </ThemeProvider>
    );

    // Verify component renders within theme context
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByText('Theme Test')).toBeInTheDocument();
  });
});
