/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import LeadTimeChart from '../../../src/public/components/LeadTimeChart.jsx';

// Mock fetchWithRetry utility
jest.mock('../../../src/public/utils/fetchWithRetry.js', () => ({
  fetchWithRetry: jest.fn((...args) => fetch(...args))
}));

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: jest.fn(({ data, options }) => (
    <div data-testid="lead-time-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)} />
  ))
}));

// Mock Chart.js registration
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn()
}));

describe('LeadTimeChart', () => {
  const mockLeadTimeData = {
    metrics: [
      {
        iterationId: 'gid://gitlab/Iteration/1',
        iterationTitle: 'Sprint 1',
        startDate: '2025-01-01',
        dueDate: '2025-01-14',
        leadTimeAvg: 2.5,
        leadTimeP50: 2.0,
        leadTimeP90: 4.0
      },
      {
        iterationId: 'gid://gitlab/Iteration/2',
        iterationTitle: 'Sprint 2',
        startDate: '2025-01-15',
        dueDate: '2025-01-28',
        leadTimeAvg: 3.2,
        leadTimeP50: 3.0,
        leadTimeP90: 5.5
      }
    ]
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('fetches lead time data from API when iterations prop changes', async () => {
    const iterationIds = ['gid://gitlab/Iteration/1', 'gid://gitlab/Iteration/2'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadTimeData
    });

    render(<LeadTimeChart iterationIds={iterationIds} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('lead-time-chart')).toBeInTheDocument();
    });

    // Verify fetch was called with correct endpoint
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/lead-time?iterations=gid://gitlab/Iteration/1,gid://gitlab/Iteration/2'
    );
  });

  test('transforms API response to Chart.js format correctly', async () => {
    const iterationIds = ['gid://gitlab/Iteration/1', 'gid://gitlab/Iteration/2'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadTimeData
    });

    render(<LeadTimeChart iterationIds={iterationIds} />);

    // Wait for chart to render
    await waitFor(() => {
      expect(screen.getByTestId('lead-time-chart')).toBeInTheDocument();
    });

    const chartElement = screen.getByTestId('lead-time-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data'));

    // Verify chart labels use formatted due dates in MM/DD format
    expect(chartData.labels).toEqual(['1/13', '1/27']);

    // Verify three datasets for avg, P50, P90
    expect(chartData.datasets).toHaveLength(3);

    // Average dataset
    expect(chartData.datasets[0].label).toBe('Average');
    expect(chartData.datasets[0].data).toEqual([2.5, 3.2]);
    expect(chartData.datasets[0].borderColor).toBe('#3b82f6'); // Blue

    // P50 dataset
    expect(chartData.datasets[1].label).toBe('P50');
    expect(chartData.datasets[1].data).toEqual([2.0, 3.0]);
    expect(chartData.datasets[1].borderColor).toBe('#10b981'); // Green

    // P90 dataset (dashed line)
    expect(chartData.datasets[2].label).toBe('P90');
    expect(chartData.datasets[2].data).toEqual([4.0, 5.5]);
    expect(chartData.datasets[2].borderColor).toBe('#f59e0b'); // Orange
    expect(chartData.datasets[2].borderDash).toEqual([5, 5]); // Dashed
  });

  test('displays empty state when no iterations are selected', () => {
    render(<LeadTimeChart iterationIds={[]} />);

    expect(screen.getByText(/select iterations to view lead time/i)).toBeInTheDocument();
    expect(screen.queryByTestId('lead-time-chart')).not.toBeInTheDocument();
  });

  test('displays error message when API fetch fails', async () => {
    const iterationIds = ['gid://gitlab/Iteration/1'];

    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<LeadTimeChart iterationIds={iterationIds} />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/error.*loading lead time/i)).toBeInTheDocument();
    });
  });

  test('displays loading state while fetching data', () => {
    const iterationIds = ['gid://gitlab/Iteration/1'];

    // Mock a promise that never resolves to keep loading state
    global.fetch.mockReturnValueOnce(new Promise(() => {}));

    render(<LeadTimeChart iterationIds={iterationIds} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
