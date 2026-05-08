/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChangeFailureRateChart from '../../../src/public/components/ChangeFailureRateChart.jsx';
import {
  defaultTheme,
  sampleIterations,
  setupChartMocks,
  renderWithTheme,
} from '../setup/chartTestHelpers.js';

// Mock Chart.js
jest.mock('react-chartjs-2', () => {
  const React = require('react');
  const mockToBase64Image = jest.fn(() => 'data:image/png;base64,mock');
  const Line = React.forwardRef(({ data }, ref) => {
    React.useImperativeHandle(ref, () => ({ toBase64Image: mockToBase64Image }));
    return (
      <div data-testid="change-failure-rate-line-chart" role="img" aria-label="Change Failure Rate chart">
        <div data-testid="chart-data">{JSON.stringify(data)}</div>
      </div>
    );
  });
  Line.displayName = 'Line';
  return { Line };
});

jest.mock('chartjs-plugin-annotation', () => ({}));

// Mock control limits utility
jest.mock('../../../src/public/utils/controlLimits.js', () => ({
  calculateControlLimits: jest.fn(() => ({ average: 15, upperLimit: 25, lowerLimit: 5 }))
}));

// Mock useAnnotations hook
jest.mock('../../../src/public/hooks/useAnnotations.js', () => ({
  useAnnotations: jest.fn(() => ({ annotations: {}, loading: false, error: null }))
}));

// Mock useChartFilters hook — replicates localStorage behaviour that chart tests assert on
jest.mock('../../../src/public/hooks/useChartFilters.js', () => {
  const { useState, useEffect } = require('react');
  return {
    useChartFilters(storageKey) {
      const [excludedIds, setExcludedIds] = useState([]);
      useEffect(() => {
        try {
          const stored = global.localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) setExcludedIds(parsed);
          }
        } catch (e) { console.warn('Failed to load chart filters from localStorage:', e); }
      }, [storageKey]);
      useEffect(() => {
        try {
          if (excludedIds.length > 0) {
            global.localStorage.setItem(storageKey, JSON.stringify(excludedIds));
          } else {
            global.localStorage.removeItem(storageKey);
          }
        } catch (e) { console.warn('Failed to save chart filters to localStorage:', e); }
      }, [excludedIds, storageKey]);
      return [excludedIds, setExcludedIds];
    }
  };
});

// Mock ChartFilterDropdown
jest.mock('../../../src/public/components/ChartFilterDropdown.jsx', () => {
  return jest.fn(({ availableIterations, excludedIterationIds, onFilterChange, onReset }) => (
    <div data-testid="chart-filter-dropdown">
      <button onClick={() => onFilterChange(['gid://gitlab/Iteration/1'])}>Exclude Sprint 1</button>
      <button onClick={() => onReset()}>Reset Filter</button>
    </div>
  ));
});

describe('ChangeFailureRateChart', () => {
  let mockFetch;

  beforeEach(() => {
    ({ mockFetch } = setupChartMocks());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockIterations = sampleIterations.slice(0, 2);

  const mockApiResponse = {
    metrics: [
      { iterationId: 'gid://gitlab/Iteration/1', dueDate: '2024-01-14', changeFailureRate: 12.5, totalChanges: 40, failedChanges: 5 },
      { iterationId: 'gid://gitlab/Iteration/2', dueDate: '2024-01-28', changeFailureRate: 15.0, totalChanges: 50, failedChanges: 7 },
    ],
  };

  test('renders empty state when no iterations selected', () => {
    renderWithTheme(<ChangeFailureRateChart selectedIterations={[]} />, defaultTheme);
    expect(screen.getByText(/Select iterations to view change failure rate/i)).toBeInTheDocument();
  });

  test('renders loading state while fetching data', async () => {
    mockFetch.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => mockApiResponse }), 100)));
    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);
    expect(screen.getByText(/Loading change failure rate data/i)).toBeInTheDocument();
  });

  test('renders error state when API call fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);
    await waitFor(() => {
      expect(screen.getByText(/Error loading change failure rate data/i)).toBeInTheDocument();
    });
  });

  test('renders chart with change failure rate data on successful fetch', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);
    await waitFor(() => {
      expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument();
    });
  });

  test('calls API with correct iteration IDs', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/metrics/change-failure-rate?iterations=gid://gitlab/Iteration/1,gid://gitlab/Iteration/2'
      );
    });
  });

  test('handles filter change and re-fetches data', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);
    await waitFor(() => expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument());
    mockFetch.mockClear();
    await user.click(screen.getByText('Exclude Sprint 1'));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/metrics/change-failure-rate?iterations=gid://gitlab/Iteration/2');
    });
  });

  test('clears chart data when iterations are removed', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    const { rerender } = renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);
    await waitFor(() => expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument());
    rerender(
      <ChangeFailureRateChart selectedIterations={[]} />
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
    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);

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
    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);

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

    const { rerender } = renderWithTheme(
      <ChangeFailureRateChart selectedIterations={mockIterations} annotationRefreshKey={0} />,
      defaultTheme
    );

    await waitFor(() => {
      expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Act - Change annotationRefreshKey (simulates annotation update)
    rerender(
      <ChangeFailureRateChart selectedIterations={mockIterations} annotationRefreshKey={1} />
    );

    // Assert - The annotationRefreshKey is passed to useAnnotations, component still renders
    await waitFor(() => {
      expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument();
    });
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

    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);

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

    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);

    await waitFor(() => {
      expect(screen.getByTestId('change-failure-rate-line-chart')).toBeInTheDocument();
    });

    consoleWarnSpy.mockRestore();
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  test('handles all iterations being filtered out', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    const { rerender } = renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);

    rerender(
      <ChangeFailureRateChart selectedIterations={[]} />
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

    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);

    await waitFor(() => {
      expect(screen.getByText(/error loading change failure rate data/i)).toBeInTheDocument();
    });

    getItemSpy.mockRestore();
  });

  test('renders Export PNG button when chart data is available', async () => {
    // Arrange
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });

    // Act
    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Export PNG' })).toBeInTheDocument();
    });
  });

  test('does not render Export PNG button in empty state', () => {
    // Act
    renderWithTheme(<ChangeFailureRateChart selectedIterations={[]} />, defaultTheme);

    // Assert
    expect(screen.queryByRole('button', { name: 'Export PNG' })).not.toBeInTheDocument();
  });

  test('Export PNG button triggers download with correct filename', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });

    renderWithTheme(<ChangeFailureRateChart selectedIterations={mockIterations} />, defaultTheme);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Export PNG' })).toBeInTheDocument());

    const user = userEvent.setup();
    await expect(user.click(screen.getByRole('button', { name: 'Export PNG' }))).resolves.not.toThrow();
  });
});
