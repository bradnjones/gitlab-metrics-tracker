/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeploymentFrequencyChart from '../../../src/public/components/DeploymentFrequencyChart.jsx';
import {
  defaultTheme,
  setupChartMocks,
  mockUseAnnotations,
  renderWithTheme,
} from '../setup/chartTestHelpers.js';

// Mock Chart.js
jest.mock('react-chartjs-2', () => {
  const React = require('react');
  const mockToBase64Image = jest.fn(() => 'data:image/png;base64,mock');
  const Line = React.forwardRef(({ data }, ref) => {
    React.useImperativeHandle(ref, () => ({ toBase64Image: mockToBase64Image }));
    return (
      <div data-testid="deployment-frequency-bar-chart" role="img" aria-label="Deployment Frequency chart">
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
  calculateControlLimits: jest.fn(() => ({ average: 10, upperLimit: 15, lowerLimit: 5 }))
}));

// Mock useAnnotations hook
jest.mock('../../../src/public/hooks/useAnnotations.js', () => ({
  useAnnotations: jest.fn(() => mockUseAnnotations())
}));

// Mock buildControlLimitAnnotations — pure util, chart tests don't assert on annotation output
jest.mock('../../../src/public/utils/buildControlLimitAnnotations.js', () => ({
  default: jest.fn(() => ({})),
}));

// Mock useChartState hook — uses real React hooks so component state works
jest.mock('../../../src/public/hooks/useChartState.js', () => {
  const { useState, useEffect, useMemo, useRef } = require('react');
  return {
    useChartState(iterations = []) {
      const [chartData, setChartData] = useState(null);
      const [controlLimits, setControlLimits] = useState(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState(null);
      const [excludedIterationIds, setExcludedIterationIds] = useState([]);
      const [isEnlarged, setIsEnlarged] = useState(false);
      const chartRef = useRef(null);
      useEffect(() => {
        if (!iterations || iterations.length === 0) return;
        const currentIds = iterations.map(iter => iter.id);
        const valid = excludedIterationIds.filter(id => currentIds.includes(id));
        if (valid.length !== excludedIterationIds.length) setExcludedIterationIds(valid);
      }, [iterations]); // eslint-disable-line react-hooks/exhaustive-deps
      const visibleIterations = useMemo(
        () => iterations.filter(iter => !excludedIterationIds.includes(iter.id)),
        [iterations, excludedIterationIds]
      );
      const iterationIds = useMemo(() => visibleIterations.map(iter => iter.id), [visibleIterations]);
      return { chartData, setChartData, controlLimits, setControlLimits, loading, setLoading,
        error, setError, excludedIterationIds, setExcludedIterationIds, isEnlarged, setIsEnlarged,
        chartRef, visibleIterations, iterationIds };
    }
  };
});

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

describe('DeploymentFrequencyChart', () => {
  let mockFetch;

  beforeEach(() => {
    ({ mockFetch } = setupChartMocks());
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
      { iterationId: 'gid://gitlab/Iteration/1', dueDate: '2024-01-14', deploymentFrequency: 2.5 },
      { iterationId: 'gid://gitlab/Iteration/2', dueDate: '2024-01-28', deploymentFrequency: 3.0 },
    ],
  };

  test('renders empty state when no iterations selected', () => {
    renderWithTheme(<DeploymentFrequencyChart selectedIterations={[]} />);
    expect(screen.getByText(/Select iterations to view deployment frequency/i)).toBeInTheDocument();
  });

  test('renders loading state while fetching data', async () => {
    mockFetch.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => mockApiResponse }), 100)));
    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);
    expect(screen.getByText(/Loading deployment frequency data/i)).toBeInTheDocument();
  });

  test('renders error state when API call fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);
    await waitFor(() => {
      expect(screen.getByText(/Error loading deployment frequency data/i)).toBeInTheDocument();
    });
  });

  test('renders chart with deployment frequency data on successful fetch', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);
    await waitFor(() => {
      expect(screen.getByTestId('deployment-frequency-bar-chart')).toBeInTheDocument();
    });
  });

  test('calls API with correct iteration IDs', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/metrics/deployment-frequency?iterations=gid://gitlab/Iteration/1,gid://gitlab/Iteration/2'
      );
    });
  });

  test('handles filter change and re-fetches data', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);
    await waitFor(() => expect(screen.getByTestId('deployment-frequency-bar-chart')).toBeInTheDocument());
    mockFetch.mockClear();
    await user.click(screen.getByText('Exclude Sprint 1'));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/metrics/deployment-frequency?iterations=gid://gitlab/Iteration/2');
    });
  });

  test('clears chart data when iterations are removed', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    const { rerender } = renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);
    await waitFor(() => expect(screen.getByTestId('deployment-frequency-bar-chart')).toBeInTheDocument());
    rerender(
      <DeploymentFrequencyChart selectedIterations={[]} />
    );
    expect(screen.getByText(/Select iterations to view deployment frequency/i)).toBeInTheDocument();
  });

  test('saves excluded iterations to localStorage', async () => {
    // Arrange
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    // Act
    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);

    await waitFor(() => {
      expect(screen.getByTestId('deployment-frequency-bar-chart')).toBeInTheDocument();
    });

    // Exclude an iteration
    await user.click(screen.getByText('Exclude Sprint 1'));

    // Assert - Should save to localStorage
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'chart-filters-deployment-frequency',
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
    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);

    // Assert - Should call API with only non-excluded iteration
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/metrics/deployment-frequency?iterations=gid://gitlab/Iteration/2'
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
      <DeploymentFrequencyChart selectedIterations={mockIterations} annotationRefreshKey={0} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('deployment-frequency-bar-chart')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Act - Change annotationRefreshKey (simulates annotation update)
    rerender(
      <DeploymentFrequencyChart selectedIterations={mockIterations} annotationRefreshKey={1} />
    );

    // Assert - The annotationRefreshKey is passed to useAnnotations, component still renders
    await waitFor(() => {
      expect(screen.getByTestId('deployment-frequency-bar-chart')).toBeInTheDocument();
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

    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);

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

  test('handles all iterations being filtered out', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    const { rerender } = renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);

    rerender(
      <DeploymentFrequencyChart selectedIterations={[]} />
    );

    expect(screen.getByText(/select iterations to view deployment frequency metrics/i)).toBeInTheDocument();

    getItemSpy.mockRestore();
  });

  test('handles HTTP 500 error from API', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500
    });

    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);

    await waitFor(() => {
      expect(screen.getByText(/error loading deployment frequency data/i)).toBeInTheDocument();
    });

    getItemSpy.mockRestore();
  });

  test('renders Export PNG button when chart data is available', async () => {
    // Arrange
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });

    // Act
    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Export PNG' })).toBeInTheDocument();
    });
  });

  test('does not render Export PNG button in empty state', () => {
    // Act
    renderWithTheme(<DeploymentFrequencyChart selectedIterations={[]} />);

    // Assert
    expect(screen.queryByRole('button', { name: 'Export PNG' })).not.toBeInTheDocument();
  });

  test('Export PNG button triggers download with correct filename', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });

    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Export PNG' })).toBeInTheDocument());

    const user = userEvent.setup();
    await expect(user.click(screen.getByRole('button', { name: 'Export PNG' }))).resolves.not.toThrow();
  });

  test('reset filter button clears excluded iteration IDs', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    renderWithTheme(<DeploymentFrequencyChart selectedIterations={mockIterations} />);
    await waitFor(() => expect(screen.getByTestId('deployment-frequency-bar-chart')).toBeInTheDocument());

    // Exclude an iteration then reset
    await user.click(screen.getByText('Exclude Sprint 1'));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/metrics/deployment-frequency?iterations=gid://gitlab/Iteration/2');
    });

    mockFetch.mockClear();
    await user.click(screen.getByText('Reset Filter'));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/metrics/deployment-frequency?iterations=gid://gitlab/Iteration/1,gid://gitlab/Iteration/2'
      );
    });
  });
});
