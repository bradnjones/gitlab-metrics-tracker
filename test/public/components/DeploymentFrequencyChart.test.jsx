/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import DeploymentFrequencyChart from '../../../src/public/components/DeploymentFrequencyChart.jsx';

// Mock fetchWithRetry utility
jest.mock('../../../src/public/utils/fetchWithRetry.js', () => ({
  fetchWithRetry: jest.fn((...args) => fetch(...args))
}));

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: jest.fn(({ data, options }) => (
    <div data-testid="deployment-frequency-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)} />
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

describe('DeploymentFrequencyChart', () => {
  const mockDeploymentData = {
    metrics: [
      {
        iterationId: 'gid://gitlab/Iteration/1',
        iterationTitle: 'Sprint 1',
        startDate: '2025-01-01',
        dueDate: '2025-01-14',
        deploymentFrequency: 1.5
      },
      {
        iterationId: 'gid://gitlab/Iteration/2',
        iterationTitle: 'Sprint 2',
        startDate: '2025-01-15',
        dueDate: '2025-01-28',
        deploymentFrequency: 2.1
      }
    ]
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('fetches deployment frequency data from API when iterations prop changes', async () => {
    const iterationIds = ['gid://gitlab/Iteration/1', 'gid://gitlab/Iteration/2'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDeploymentData
    });

    render(<DeploymentFrequencyChart iterationIds={iterationIds} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('deployment-frequency-chart')).toBeInTheDocument();
    });

    // Verify fetch was called with correct endpoint
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/deployment-frequency?iterations=gid://gitlab/Iteration/1,gid://gitlab/Iteration/2'
    );
  });

  test('transforms API response to Chart.js format correctly', async () => {
    const iterationIds = ['gid://gitlab/Iteration/1', 'gid://gitlab/Iteration/2'];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDeploymentData
    });

    render(<DeploymentFrequencyChart iterationIds={iterationIds} />);

    // Wait for chart to render
    await waitFor(() => {
      expect(screen.getByTestId('deployment-frequency-chart')).toBeInTheDocument();
    });

    const chartElement = screen.getByTestId('deployment-frequency-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data'));

    // Verify chart labels use formatted due dates in MM/DD format
    expect(chartData.labels).toEqual(['1/13', '1/27']);

    // Verify single dataset for deployment frequency
    expect(chartData.datasets).toHaveLength(1);
    expect(chartData.datasets[0].label).toBe('Deployments per Day');
    expect(chartData.datasets[0].data).toEqual([1.5, 2.1]);
    expect(chartData.datasets[0].borderColor).toBe('#1976d2'); // Blue like velocity
  });

  test('displays empty state when no iterations are selected', () => {
    render(<DeploymentFrequencyChart iterationIds={[]} />);

    expect(screen.getByText(/select iterations to view deployment frequency/i)).toBeInTheDocument();
    expect(screen.queryByTestId('deployment-frequency-chart')).not.toBeInTheDocument();
  });

  test('displays error message when API fetch fails', async () => {
    const iterationIds = ['gid://gitlab/Iteration/1'];

    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<DeploymentFrequencyChart iterationIds={iterationIds} />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/error.*loading deployment frequency/i)).toBeInTheDocument();
    });
  });

  test('displays loading state while fetching data', () => {
    const iterationIds = ['gid://gitlab/Iteration/1'];

    // Mock a promise that never resolves to keep loading state
    global.fetch.mockReturnValueOnce(new Promise(() => {}));

    render(<DeploymentFrequencyChart iterationIds={iterationIds} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
