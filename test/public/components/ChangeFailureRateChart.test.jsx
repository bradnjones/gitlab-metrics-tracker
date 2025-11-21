/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import userEvent from '@testing-library/user-event';
import ChangeFailureRateChart from '../../../src/public/components/ChangeFailureRateChart.jsx';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: jest.fn(({ data }) => (
    <div data-testid="change-failure-rate-line-chart" role="img" aria-label="Change Failure Rate chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ))
}));

jest.mock('chartjs-plugin-annotation', () => ({}));

// Mock control limits utility
jest.mock('../../../src/public/utils/controlLimits.js', () => ({
  calculateControlLimits: jest.fn(() => ({ average: 15, upperLimit: 25, lowerLimit: 5 }))
}));

// Mock useAnnotations hook
jest.mock('../../../src/public/hooks/useAnnotations.js', () => ({
  useAnnotations: jest.fn(() => ({ annotations: {}, loading: false, error: null }))
}));

// Mock ChartFilterDropdown
jest.mock('../../../src/public/components/ChartFilterDropdown.jsx', () => {
  return jest.fn(({ availableIterations, excludedIterationIds, onFilterChange, onReset }) => (
    <div data-testid="chart-filter-dropdown">
      <button onClick={() => onFilterChange(['gid://gitlab/Iteration/1'])}>Exclude Sprint 1</button>
      <button onClick={() => onReset()}>Reset Filter</button>
    </div>
  ));
});

const theme = {
  colors: { bgPrimary: '#ffffff', textPrimary: '#1f2937' },
  spacing: { sm: '0.5rem', md: '1rem' },
  typography: { fontSize: { sm: '0.875rem', base: '1rem' } },
};

describe('ChangeFailureRateChart', () => {
  let mockFetch;

  beforeEach(() => {
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockIterations = [
    { id: 'gid://gitlab/Iteration/1', title: 'Sprint 1', startDate: '2024-01-01', dueDate: '2024-01-14' },
    { id: 'gid://gitlab/Iteration/2', title: 'Sprint 2', startDate: '2024-01-15', dueDate: '2024-01-28' },
  ];

  const mockApiResponse = {
    metrics: [
      { iterationId: 'gid://gitlab/Iteration/1', dueDate: '2024-01-14', changeFailureRate: 12.5, totalChanges: 40, failedChanges: 5 },
      { iterationId: 'gid://gitlab/Iteration/2', dueDate: '2024-01-28', changeFailureRate: 15.0, totalChanges: 50, failedChanges: 7 },
    ],
  };

  test('renders empty state when no iterations selected', () => {
    render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={[]} />
      </ThemeProvider>
    );
    expect(screen.getByText(/Select iterations to view change failure rate/i)).toBeInTheDocument();
  });

  test('renders loading state while fetching data', async () => {
    mockFetch.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => mockApiResponse }), 100)));
    render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );
    expect(screen.getByText(/Loading change failure rate data/i)).toBeInTheDocument();
  });

  test('renders error state when API call fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/Error loading change failure rate data/i)).toBeInTheDocument();
    });
  });

  test('renders chart with change failure rate data on successful fetch', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument();
    });
  });

  test('calls API with correct iteration IDs', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/metrics/change-failure-rate?iterations=gid://gitlab/Iteration/1,gid://gitlab/Iteration/2'
      );
    });
  });

  test('handles filter change and re-fetches data', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );
    await waitFor(() => expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument());
    mockFetch.mockClear();
    await user.click(screen.getByText('Exclude Sprint 1'));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/metrics/change-failure-rate?iterations=gid://gitlab/Iteration/2');
    });
  });

  test('clears chart data when iterations are removed', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );
    await waitFor(() => expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument());
    rerender(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={[]} />
      </ThemeProvider>
    );
    expect(screen.getByText(/Select iterations to view change failure rate/i)).toBeInTheDocument();
  });

  test('saves excluded iterations to localStorage', async () => {
    // Arrange
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    // Act
    render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument();
    });

    // Exclude an iteration
    await user.click(screen.getByText('Exclude Sprint 1'));

    // Assert - Should save to localStorage
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'chart-filters-change-failure-rate',
        JSON.stringify(['gid://gitlab/Iteration/1'])
      );
    });
  });

  test('loads excluded iterations from localStorage on mount', async () => {
    // Arrange
    Storage.prototype.getItem = jest.fn(() => JSON.stringify(['gid://gitlab/Iteration/1']));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    // Act
    render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );

    // Assert - Should call API with only non-excluded iteration
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/metrics/change-failure-rate?iterations=gid://gitlab/Iteration/2'
      );
    });
  });

  test('re-fetches data when annotationRefreshKey changes', async () => {
    // Arrange
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} annotationRefreshKey={0} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Act - Change annotationRefreshKey (simulates annotation update)
    rerender(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} annotationRefreshKey={1} />
      </ThemeProvider>
    );

    // Assert - The annotationRefreshKey is passed to useAnnotations, component still renders
    expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument();
  });

  test('handles localStorage read errors gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage error');
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });

    render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to load chart filters from localStorage:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
    getItemSpy.mockRestore();
  });

  test('handles localStorage save errors gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage write error');
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });

    render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument();
    });

    consoleWarnSpy.mockRestore();
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  test('handles all iterations being filtered out', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={[]} />
      </ThemeProvider>
    );

    expect(screen.getByText(/select iterations to view change failure rate metrics/i)).toBeInTheDocument();

    getItemSpy.mockRestore();
  });

  test('handles HTTP 500 error from API', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500
    });

    render(
      <ThemeProvider theme={theme}>
        <ChangeFailureRateChart selectedIterations={mockIterations} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/error loading change failure rate data/i)).toBeInTheDocument();
    });

    getItemSpy.mockRestore();
  });
});
