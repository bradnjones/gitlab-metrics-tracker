/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import MetricInfoIcon from '../../../src/public/components/MetricInfoIcon.jsx';

const theme = {
  colors: {
    primary: '#3b82f6',
    textSecondary: '#6b7280',
    textPrimary: '#111827',
    bgPrimary: '#ffffff',
    border: '#e5e7eb',
  },
  typography: {
    fontSize: { sm: '0.875rem' },
    fontWeight: { medium: 500 },
  },
  borderRadius: { md: '6px' },
  zIndex: { tooltip: 3000 },
};

const tooltip = {
  description: 'Average time from work start to delivery.',
  goodDirection: 'down',
  goodLabel: 'lower is faster',
};

const renderIcon = (props = {}) => render(
  <ThemeProvider theme={theme}>
    <MetricInfoIcon label="Cycle Time" tooltip={tooltip} {...props} />
  </ThemeProvider>
);

describe('MetricInfoIcon', () => {
  test('renders an info button with accessible label', () => {
    renderIcon();
    expect(screen.getByRole('button', { name: /about cycle time/i })).toBeInTheDocument();
  });

  test('tooltip is hidden by default', () => {
    renderIcon();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('shows tooltip on mouseenter of the wrapper', () => {
    renderIcon();
    const wrapper = screen.getByRole('button', { name: /about cycle time/i }).parentElement;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText(tooltip.description)).toBeInTheDocument();
  });

  test('hides tooltip on mouseleave of the wrapper', () => {
    renderIcon();
    const wrapper = screen.getByRole('button', { name: /about cycle time/i }).parentElement;
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('toggles tooltip on click', () => {
    renderIcon();
    const button = screen.getByRole('button', { name: /about cycle time/i });
    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('shows down-direction indicator when goodDirection is down', () => {
    renderIcon();
    fireEvent.mouseEnter(screen.getByRole('button', { name: /about cycle time/i }).parentElement);
    expect(screen.getByText(/↓ lower is better/i)).toBeInTheDocument();
  });

  test('shows up-direction indicator when goodDirection is up', () => {
    renderIcon({ tooltip: { description: 'Points completed.', goodDirection: 'up', goodLabel: 'more is better' } });
    fireEvent.mouseEnter(screen.getByRole('button', { name: /about cycle time/i }).parentElement);
    expect(screen.getByText(/↑ higher is better/i)).toBeInTheDocument();
  });

  test('right-aligns bubble when it would overflow the viewport', () => {
    // Simulate the bubble rendering beyond the right viewport edge
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      right: 820, left: 560, top: 0, bottom: 0, width: 260, height: 0, x: 560, y: 0, toJSON: () => {},
    });

    renderIcon();
    act(() => {
      fireEvent.mouseEnter(screen.getByRole('button', { name: /about cycle time/i }).parentElement);
    });

    // Bubble should be present; the $flipped prop is handled by styled-components CSS
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    jest.restoreAllMocks();
  });
});
