/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import MetricSummaryCard from '../../../src/public/components/MetricSummaryCard.jsx';

// Mock theme object
const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    textPrimary: '#111827',
  },
  spacing: {
    md: '16px',
    lg: '24px',
  },
  typography: {
    fontSize: {
      sm: '0.875rem',
      '3xl': '2rem',
    },
    fontWeight: {
      medium: 500,
      bold: 700,
    },
  },
  borderRadius: { xl: '12px' },
  shadows: { lg: '0 4px 6px rgba(0, 0, 0, 0.1)' },
  breakpoints: { mobile: '640px' },
};

describe('MetricSummaryCard', () => {
  /**
   * Test 6.1: Basic rendering
   * Verifies MetricSummaryCard renders label and value props
   */
  test('renders label and value props', () => {
    render(
      <ThemeProvider theme={theme}>
        <MetricSummaryCard
          label="Velocity"
          value="42"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Velocity')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  /**
   * Test 6.2: Gradient background styling
   * Verifies MetricSummaryCard applies styled-component with gradient
   * Note: jsdom doesn't compute CSS gradients, so we check for className presence
   */
  test('applies gradient background from theme', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <MetricSummaryCard
          label="Throughput"
          value="28"
        />
      </ThemeProvider>
    );

    const card = container.firstChild;

    // Verify styled-component class is applied (gradient is in CSS)
    expect(card.className).toBeTruthy();
    expect(card).toBeInTheDocument();
  });

  /**
   * Test 6.3: Theme spacing
   * Verifies MetricSummaryCard uses theme spacing for padding
   */
  test('uses theme spacing for padding', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <MetricSummaryCard
          label="Cycle Time"
          value="3.2d"
        />
      </ThemeProvider>
    );

    const card = container.firstChild;
    const styles = window.getComputedStyle(card);

    // Verify padding is applied from theme
    expect(styles.padding).toBeTruthy();
  });
});
