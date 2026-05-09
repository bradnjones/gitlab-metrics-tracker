/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import MetricSummaryCard from '../../../src/public/components/MetricSummaryCard.jsx';

const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    bgPrimary: '#ffffff',
    border: '#e5e7eb',
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
  borderRadius: { xl: '12px', md: '6px' },
  shadows: { sm: '0 1px 2px rgba(0,0,0,0.05)', lg: '0 4px 6px rgba(0, 0, 0, 0.1)' },
  breakpoints: { mobile: '640px' },
  zIndex: { tooltip: 3000 },
};

const sampleTooltip = {
  description: 'Average time from work start to delivery.',
  goodDirection: 'down',
  goodLabel: 'lower is faster',
};

const renderCard = (props = {}) => render(
  <ThemeProvider theme={theme}>
    <MetricSummaryCard label="Cycle Time" value="3.2d" {...props} />
  </ThemeProvider>
);

describe('MetricSummaryCard', () => {
  test('renders label and value props', () => {
    renderCard();
    expect(screen.getByText('Cycle Time')).toBeInTheDocument();
    expect(screen.getByText('3.2d')).toBeInTheDocument();
  });

  test('applies styled-component class to the card', () => {
    const { container } = renderCard();
    expect(container.firstChild.className).toBeTruthy();
  });

  test('uses theme spacing for padding', () => {
    const { container } = renderCard();
    expect(window.getComputedStyle(container.firstChild).padding).toBeTruthy();
  });

  test('does not render info button when no tooltip prop is given', () => {
    renderCard();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('renders info button when tooltip prop is provided', () => {
    renderCard({ tooltip: sampleTooltip });
    expect(screen.getByRole('button', { name: /about cycle time/i })).toBeInTheDocument();
  });

  test('tooltip is hidden by default', () => {
    renderCard({ tooltip: sampleTooltip });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('shows tooltip on mouseenter', () => {
    renderCard({ tooltip: sampleTooltip });
    fireEvent.mouseEnter(screen.getByRole('button', { name: /about cycle time/i }).parentElement);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText(sampleTooltip.description)).toBeInTheDocument();
  });

  test('hides tooltip on mouseleave', () => {
    renderCard({ tooltip: sampleTooltip });
    const wrapper = screen.getByRole('button', { name: /about cycle time/i }).parentElement;
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('toggles tooltip on click (without hover side-effects)', () => {
    renderCard({ tooltip: sampleTooltip });
    const button = screen.getByRole('button', { name: /about cycle time/i });
    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('shows down-direction indicator for metrics where lower is better', () => {
    renderCard({ tooltip: sampleTooltip });
    fireEvent.mouseEnter(screen.getByRole('button', { name: /about cycle time/i }).parentElement);
    expect(screen.getByText(/↓ lower is better/i)).toBeInTheDocument();
  });

  test('shows up-direction indicator for metrics where higher is better', () => {
    renderCard({
      tooltip: { description: 'Points completed.', goodDirection: 'up', goodLabel: 'more is better' },
    });
    fireEvent.mouseEnter(screen.getByRole('button', { name: /about cycle time/i }).parentElement);
    expect(screen.getByText(/↑ higher is better/i)).toBeInTheDocument();
  });
});
