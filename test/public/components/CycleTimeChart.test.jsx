/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import CycleTimeChart from '../../../src/public/components/CycleTimeChart.jsx';

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: jest.fn(({ data, options }) => (
    <div
      data-testid="cycle-time-chart"
      data-chart-data={JSON.stringify(data)}
      data-chart-options={JSON.stringify(options)}
    />
  ))
}));

// Mock Chart.js registration
jest.mock('chart.js', () => ({
  Chart: { register: jest.fn() },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn()
}));

describe('CycleTimeChart', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = jest.fn();
  });

  it('fetches cycle time data from API when iterations prop changes', async () => {
    const mockResponse = {
      metrics: [
        {
          iterationId: 'gid://gitlab/Iteration/123',
          iterationTitle: 'Sprint 1',
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-14T00:00:00Z',
          cycleTimeAvg: 3.5,
          cycleTimeP50: 3.0,
          cycleTimeP90: 5.2
        }
      ]
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    render(<CycleTimeChart iterationIds={['gid://gitlab/Iteration/123']} />);

    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/metrics/cycle-time?iterations=gid://gitlab/Iteration/123');
    });
  });

  it('transforms API response to Chart.js format correctly', async () => {
    const mockResponse = {
      metrics: [
        {
          iterationId: 'gid://gitlab/Iteration/123',
          iterationTitle: 'Sprint 1',
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-14T00:00:00Z',
          cycleTimeAvg: 3.5,
          cycleTimeP50: 3.0,
          cycleTimeP90: 5.2
        },
        {
          iterationId: 'gid://gitlab/Iteration/124',
          iterationTitle: 'Sprint 2',
          startDate: '2025-01-15T00:00:00Z',
          dueDate: '2025-01-28T00:00:00Z',
          cycleTimeAvg: 4.2,
          cycleTimeP50: 4.0,
          cycleTimeP90: 6.8
        }
      ]
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    render(<CycleTimeChart iterationIds={['gid://gitlab/Iteration/123', 'gid://gitlab/Iteration/124']} />);

    // Wait for chart to render
    await waitFor(() => {
      expect(screen.getByTestId('cycle-time-chart')).toBeInTheDocument();
    });

    const chartElement = screen.getByTestId('cycle-time-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data'));

    // Verify chart has 3 datasets (Avg, P50, P90)
    expect(chartData.datasets).toHaveLength(3);

    // Verify dataset labels
    expect(chartData.datasets[0].label).toBe('Average');
    expect(chartData.datasets[1].label).toBe('P50');
    expect(chartData.datasets[2].label).toBe('P90');

    // Verify data values
    expect(chartData.datasets[0].data).toEqual([3.5, 4.2]); // Avg
    expect(chartData.datasets[1].data).toEqual([3.0, 4.0]); // P50
    expect(chartData.datasets[2].data).toEqual([5.2, 6.8]); // P90

    // Verify labels (dates)
    expect(chartData.labels).toHaveLength(2);
  });

  it('displays empty state when no iterations are selected', () => {
    render(<CycleTimeChart iterationIds={[]} />);

    expect(screen.getByText('Select iterations to view cycle time metrics')).toBeInTheDocument();
    expect(screen.queryByTestId('cycle-time-chart')).not.toBeInTheDocument();
  });

  it('displays error message when API fetch fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    render(<CycleTimeChart iterationIds={['gid://gitlab/Iteration/123']} />);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Error loading cycle time data/)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('cycle-time-chart')).not.toBeInTheDocument();
  });

  it('displays loading state while fetching data', async () => {
    // Create a promise that we can control
    let resolvePromise;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    global.fetch.mockReturnValue(fetchPromise);

    render(<CycleTimeChart iterationIds={['gid://gitlab/Iteration/123']} />);

    // Verify loading state is shown
    expect(screen.getByText('Loading cycle time data...')).toBeInTheDocument();

    // Resolve the promise
    resolvePromise({
      ok: true,
      json: async () => ({
        metrics: [{
          iterationId: 'gid://gitlab/Iteration/123',
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-14T00:00:00Z',
          cycleTimeAvg: 3.5,
          cycleTimeP50: 3.0,
          cycleTimeP90: 5.2
        }]
      })
    });

    // Wait for loading to finish and chart to appear
    await waitFor(() => {
      expect(screen.getByTestId('cycle-time-chart')).toBeInTheDocument();
    });

    expect(screen.queryByText('Loading cycle time data...')).not.toBeInTheDocument();
  });
});
