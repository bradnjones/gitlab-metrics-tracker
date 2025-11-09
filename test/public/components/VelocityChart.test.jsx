/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import VelocityChart from '../../../src/public/components/VelocityChart.jsx';

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: jest.fn(({ data, options }) => (
    <div data-testid="velocity-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)} />
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

describe('VelocityChart', () => {
  const mockVelocityData = {
    metrics: [
      {
        iterationId: 'gid://gitlab/Iteration/1',
        iterationTitle: 'Sprint 1',
        startDate: '2025-01-01T00:00:00Z',
        dueDate: '2025-01-14T00:00:00Z',
        totalPoints: 21,
        completedPoints: 18,
        totalStories: 8,
        completedStories: 7
      },
      {
        iterationId: 'gid://gitlab/Iteration/2',
        iterationTitle: 'Sprint 2',
        startDate: '2025-01-15T00:00:00Z',
        dueDate: '2025-01-28T00:00:00Z',
        totalPoints: 25,
        completedPoints: 23,
        totalStories: 10,
        completedStories: 9
      }
    ]
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('fetches velocity data from API when iterations prop changes', async () => {
    const iterationIds = ['gid://gitlab/Iteration/1', 'gid://gitlab/Iteration/2'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockVelocityData
    });

    render(<VelocityChart iterationIds={iterationIds} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('velocity-chart')).toBeInTheDocument();
    });

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/velocity?iterations=gid://gitlab/Iteration/1,gid://gitlab/Iteration/2'
    );
  });

  test('transforms API response to Chart.js format correctly', async () => {
    const iterationIds = ['gid://gitlab/Iteration/1', 'gid://gitlab/Iteration/2'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockVelocityData
    });

    render(<VelocityChart iterationIds={iterationIds} />);

    // Wait for chart to render
    await waitFor(() => {
      expect(screen.getByTestId('velocity-chart')).toBeInTheDocument();
    });

    const chartElement = screen.getByTestId('velocity-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data'));

    // Verify chart labels use formatted due dates
    expect(chartData.labels).toEqual(['Jan 13, 2025', 'Jan 27, 2025']);

    // Verify datasets for story points and story count
    expect(chartData.datasets).toHaveLength(2);
    expect(chartData.datasets[0].label).toBe('Story Points');
    expect(chartData.datasets[0].data).toEqual([18, 23]);
    expect(chartData.datasets[1].label).toBe('Stories Completed');
    expect(chartData.datasets[1].data).toEqual([7, 9]);
  });

  test('displays empty state when no iterations are selected', () => {
    render(<VelocityChart iterationIds={[]} />);

    expect(screen.getByText(/select iterations to view velocity/i)).toBeInTheDocument();
    expect(screen.queryByTestId('velocity-chart')).not.toBeInTheDocument();
  });

  test('displays error message when API fetch fails', async () => {
    const iterationIds = ['gid://gitlab/Iteration/1'];

    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<VelocityChart iterationIds={iterationIds} />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/error.*loading velocity/i)).toBeInTheDocument();
    });
  });

  test('displays loading state while fetching data', () => {
    const iterationIds = ['gid://gitlab/Iteration/1'];

    // Mock a promise that never resolves to keep loading state
    global.fetch.mockReturnValueOnce(new Promise(() => {}));

    render(<VelocityChart iterationIds={iterationIds} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
