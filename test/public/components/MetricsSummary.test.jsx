/**
 * Tests for MetricsSummary Component
 *
 * @jest-environment jsdom
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import MetricsSummary from '../../../src/public/components/MetricsSummary.jsx';

// Mock MetricSummaryCard component
jest.mock('../../../src/public/components/MetricSummaryCard.jsx', () => {
  return function MockMetricSummaryCard({ label, value }) {
    return <div data-testid="metric-card"><div>{label}</div><div>{value}</div></div>;
  };
});

// Mock utility functions
jest.mock('../../../src/public/utils/metricFormatters.js', () => ({
  getLastValue: jest.fn((arr, key) => {
    if (!arr || arr.length === 0) return null;
    const last = arr[arr.length - 1];
    return last[key] !== undefined ? last[key] : null;
  }),
  formatDays: jest.fn((value) => `${value} days`),
  formatHours: jest.fn((value) => `${value} hours`),
  formatFrequency: jest.fn((value) => `${value} per day`),
  formatPercentage: jest.fn((value) => `${value}%`)
}));

// Mock fetch globally
global.fetch = jest.fn();

// Define theme object
const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    bgSecondary: '#f9fafb',
    bgPrimary: '#ffffff',
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
  borderRadius: { sm: '4px', md: '6px', lg: '8px', xl: '12px' },
  breakpoints: { mobile: '640px', tablet: '768px', desktop: '1024px' },
  transitions: { fast: '150ms', normal: '200ms' },
};

// Helper to render component with theme
const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MetricsSummary', () => {
  const mockIterations = [
    { id: 'gid://gitlab/Iteration/123', title: 'Sprint 1', dueDate: '2024-01-10' },
    { id: 'gid://gitlab/Iteration/456', title: 'Sprint 2', dueDate: '2024-01-24' }
  ];

  const mockMetricsResponse = (metricName) => ({
    metrics: [
      {
        iterationId: 'gid://gitlab/Iteration/123',
        dueDate: '2024-01-10',
        completedPoints: 25,
        completedStories: 8,
        cycleTimeAvg: 3.5,
        deploymentFrequency: 2.5,
        leadTimeAvg: 4.2,
        mttrAvg: 12.5
      },
      {
        iterationId: 'gid://gitlab/Iteration/456',
        dueDate: '2024-01-24',
        completedPoints: 30,
        completedStories: 10,
        cycleTimeAvg: 2.8,
        deploymentFrequency: 3.0,
        leadTimeAvg: 3.5,
        mttrAvg: 10.0
      }
    ]
  });

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders null when loading', () => {
      global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { container } = renderWithTheme(
        <MetricsSummary selectedIterations={mockIterations} />
      );

      expect(container.firstChild).toBeNull();
    });

    test('renders null when no iterations selected', async () => {
      const { container } = renderWithTheme(
        <MetricsSummary selectedIterations={[]} />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('renders null when selectedIterations is null', async () => {
      const { container } = renderWithTheme(
        <MetricsSummary selectedIterations={null} />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('renders null when selectedIterations is undefined', async () => {
      const { container} = renderWithTheme(
        <MetricsSummary selectedIterations={undefined} />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Data Fetching', () => {
    test('fetches all 5 metrics in parallel when iterations selected', async () => {
      global.fetch.mockResolvedValue({
        json: async () => mockMetricsResponse()
      });

      renderWithTheme(<MetricsSummary selectedIterations={mockIterations} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(5);
      });

      // Verify all metric endpoints were called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/metrics/velocity?iterations=')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/metrics/cycle-time?iterations=')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/metrics/deployment-frequency?iterations=')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/metrics/lead-time?iterations=')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/metrics/mttr?iterations=')
      );
    });

    test('passes correct iteration IDs to API', async () => {
      global.fetch.mockResolvedValue({
        json: async () => mockMetricsResponse()
      });

      renderWithTheme(<MetricsSummary selectedIterations={mockIterations} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Check iteration IDs are comma-separated in query string
      const fetchCall = global.fetch.mock.calls[0][0];
      expect(fetchCall).toContain('gid://gitlab/Iteration/123,gid://gitlab/Iteration/456');
    });

    test('renders null and logs error when fetch fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      global.fetch.mockRejectedValue(new Error('Network error'));

      const { container } = renderWithTheme(
        <MetricsSummary selectedIterations={mockIterations} />
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching metrics:',
          expect.any(Error)
        );
      });

      expect(container.firstChild).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    test('handles API responses with empty metrics arrays', async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({ metrics: [] })
      });

      renderWithTheme(<MetricsSummary selectedIterations={mockIterations} />);

      await waitFor(() => {
        expect(screen.getByText('Last Sprint Velocity')).toBeInTheDocument();
      });

      // Should display N/A for all metrics when no data
      expect(screen.getAllByText('N/A')).toHaveLength(5);
    });

    test('handles API responses with missing metrics property', async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({}) // No metrics property
      });

      renderWithTheme(<MetricsSummary selectedIterations={mockIterations} />);

      await waitFor(() => {
        expect(screen.getByText('Last Sprint Velocity')).toBeInTheDocument();
      });

      // Should display N/A for all metrics
      expect(screen.getAllByText('N/A')).toHaveLength(5);
    });
  });

  describe('Metric Display', () => {
    beforeEach(() => {
      // Mock current date to 2024-02-01 (after all test sprints)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-02-01T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('displays all 5 metric summary cards', async () => {
      global.fetch.mockResolvedValue({
        json: async () => mockMetricsResponse()
      });

      renderWithTheme(<MetricsSummary selectedIterations={mockIterations} />);

      await waitFor(() => {
        expect(screen.getByText('Last Sprint Velocity')).toBeInTheDocument();
      });

      expect(screen.getByText('Last Sprint Cycle Time')).toBeInTheDocument();
      expect(screen.getByText('Last Sprint Deploy Freq')).toBeInTheDocument();
      expect(screen.getByText('Last Sprint Lead Time')).toBeInTheDocument();
      expect(screen.getByText('Last Sprint MTTR')).toBeInTheDocument();
    });

    test('displays formatted velocity value (points and stories)', async () => {
      global.fetch.mockResolvedValue({
        json: async () => mockMetricsResponse()
      });

      renderWithTheme(<MetricsSummary selectedIterations={mockIterations} />);

      await waitFor(() => {
        // Should show last sprint's velocity (Sprint 2: 30 pts / 10 stories)
        expect(screen.getByText('30 pts / 10 stories')).toBeInTheDocument();
      });
    });

    test('displays N/A for velocity when points or stories are null', async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({
          metrics: [{
            iterationId: 'gid://gitlab/Iteration/123',
            dueDate: '2024-01-10',
            completedPoints: null,
            completedStories: null
          }]
        })
      });

      renderWithTheme(<MetricsSummary selectedIterations={mockIterations} />);

      await waitFor(() => {
        expect(screen.getByText('Last Sprint Velocity')).toBeInTheDocument();
      });

      // Find the velocity card and check it has N/A
      const velocityCards = screen.getAllByText('N/A');
      expect(velocityCards.length).toBeGreaterThan(0);
    });

    test('filters out in-progress sprints (future due dates)', async () => {
      jest.setSystemTime(new Date('2024-01-15T00:00:00Z')); // Between sprint 1 and 2

      global.fetch.mockResolvedValue({
        json: async () => ({
          metrics: [
            {
              iterationId: 'gid://gitlab/Iteration/123',
              dueDate: '2024-01-10', // Completed
              completedPoints: 25,
              completedStories: 8,
              cycleTimeAvg: 3.5
            },
            {
              iterationId: 'gid://gitlab/Iteration/456',
              dueDate: '2024-01-24', // In progress (future)
              completedPoints: 30,
              completedStories: 10,
              cycleTimeAvg: 2.8
            }
          ]
        })
      });

      renderWithTheme(<MetricsSummary selectedIterations={mockIterations} />);

      await waitFor(() => {
        // Should show Sprint 1's values (25 pts / 8 stories), not Sprint 2
        expect(screen.getByText('25 pts / 8 stories')).toBeInTheDocument();
      });
    });

    test('shows most recent completed sprint when multiple completed', async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({
          metrics: [
            {
              iterationId: 'gid://gitlab/Iteration/123',
              dueDate: '2024-01-10',
              completedPoints: 25,
              completedStories: 8
            },
            {
              iterationId: 'gid://gitlab/Iteration/456',
              dueDate: '2024-01-24',
              completedPoints: 30,
              completedStories: 10
            }
          ]
        })
      });

      renderWithTheme(<MetricsSummary selectedIterations={mockIterations} />);

      await waitFor(() => {
        // Should show Sprint 2's values (most recent completed)
        expect(screen.getByText('30 pts / 10 stories')).toBeInTheDocument();
      });
    });
  });

  describe('Re-fetching on prop changes', () => {
    test('re-fetches metrics when selectedIterations changes', async () => {
      global.fetch.mockResolvedValue({
        json: async () => mockMetricsResponse()
      });

      const { rerender } = renderWithTheme(
        <MetricsSummary selectedIterations={mockIterations} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(5);
      });

      // Change selected iterations
      const newIterations = [
        { id: 'gid://gitlab/Iteration/789', title: 'Sprint 3', dueDate: '2024-02-07' }
      ];

      rerender(
        <ThemeProvider theme={theme}>
          <MetricsSummary selectedIterations={newIterations} />
        </ThemeProvider>
      );

      await waitFor(() => {
        // Should fetch again (total 10 calls: 5 initial + 5 new)
        expect(global.fetch).toHaveBeenCalledTimes(10);
      });

      // Verify new iteration ID is used
      const lastCall = global.fetch.mock.calls[5][0];
      expect(lastCall).toContain('gid://gitlab/Iteration/789');
    });
  });
});
