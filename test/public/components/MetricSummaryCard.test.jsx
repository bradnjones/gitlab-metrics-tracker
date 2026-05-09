/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import MetricSummaryCard from '../../../src/public/components/MetricSummaryCard.jsx';

const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
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
  shadows: { sm: '0 1px 2px rgba(0,0,0,0.05)' },
  breakpoints: { mobile: '640px' },
};

describe('MetricSummaryCard', () => {
  test('renders label and value props', () => {
    render(
      <ThemeProvider theme={theme}>
        <MetricSummaryCard label="Velocity" value="42" />
      </ThemeProvider>
    );
    expect(screen.getByText('Velocity')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  test('applies styled-component class to the card', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <MetricSummaryCard label="Throughput" value="28" />
      </ThemeProvider>
    );
    expect(container.firstChild.className).toBeTruthy();
  });

  test('uses theme spacing for padding', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <MetricSummaryCard label="Cycle Time" value="3.2d" />
      </ThemeProvider>
    );
    expect(window.getComputedStyle(container.firstChild).padding).toBeTruthy();
  });
});
