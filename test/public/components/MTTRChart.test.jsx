/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import MTTRChart from '../../../src/public/components/MTTRChart.jsx';

// Mock Chart.js Line component
jest.mock('react-chartjs-2', () => ({
  Line: jest.fn(({ data, options }) => (
    <div data-testid="mttr-chart">
      Chart with {data?.labels?.length || 0} data points
    </div>
  ))
}));

// Mock calculateControlLimits utility
jest.mock('../../../src/public/utils/controlLimits.js', () => ({
  calculateControlLimits: jest.fn((data) => ({
    average: 2.15,
    upperLimit: 5.72,
    lowerLimit: 0,
    mrBar: 1.34
  }))
}));

describe('MTTRChart', () => {
  // Store original fetch
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Mock global fetch
    global.fetch = jest.fn();
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  /**
   * Test 1: Empty state rendering
   * Drives: Basic component structure and prop handling
   */
  it('renders empty state when no iterations are selected', () => {
    render(<MTTRChart selectedIterations={[]} />);

    expect(screen.getByText(/select iterations to view mttr metrics/i))
      .toBeInTheDocument();
  });

  /**
   * Test 2: Loading state
   * Drives: useState for loading state and useEffect hook setup
   */
  it('displays loading state while fetching MTTR data', () => {
    render(<MTTRChart selectedIterations={[{id: 'gid://gitlab/Iteration/123', title: 'Sprint 1'}]} />);

    expect(screen.getByText(/loading mttr data/i))
      .toBeInTheDocument();
  });

  /**
   * Test 3: Success state - API integration and chart rendering
   * Drives: API call, data transformation, chart display with Chart.js
   */
  it('fetches and displays MTTR data successfully', async () => {
    // Mock successful API response (fetch returns a Response object)
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: [
          {
            iterationId: 'gid://gitlab/Iteration/123',
            iterationTitle: 'Sprint 23',
            startDate: '2024-10-01',
            dueDate: '2024-10-14',
            mttrAvg: 2.5,
            incidentCount: 4
          },
          {
            iterationId: 'gid://gitlab/Iteration/124',
            iterationTitle: 'Sprint 24',
            startDate: '2024-10-15',
            dueDate: '2024-10-28',
            mttrAvg: 1.8,
            incidentCount: 2
          }
        ],
        count: 2
      })
    });

    render(<MTTRChart selectedIterations={[{id: 'gid://gitlab/Iteration/123', title: 'Sprint 1'}, {id: 'gid://gitlab/Iteration/124', title: 'Sprint 2'}]} />);

    // Wait for data to load and chart to render
    await waitFor(() => {
      expect(screen.getByTestId('mttr-chart')).toBeInTheDocument();
    });

    // Verify chart has correct number of data points
    expect(screen.getByText(/Chart with 2 data points/i)).toBeInTheDocument();

    // Verify API was called with correct URL
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/mttr?iterations=gid://gitlab/Iteration/123,gid://gitlab/Iteration/124'
    );
  });

  /**
   * Test 4: Error state - API failure handling
   * Drives: Error handling, error state display
   */
  it('displays error message when API fails', async () => {
    // Mock failed API response (fetch throws error)
    global.fetch.mockRejectedValue(new Error('Failed to fetch MTTR data'));

    render(<MTTRChart selectedIterations={[{id: 'gid://gitlab/Iteration/123', title: 'Sprint 1'}]} />);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Error loading MTTR data/i)).toBeInTheDocument();
    });

    // Verify error message is shown (no retry attempts since we removed retry logic)
    expect(screen.getByText(/Failed to fetch MTTR data/i)).toBeInTheDocument();
  });

  /**
   * Test 5: Line chart with control limits - TDD Test 1
   * Drives: Line component usage and control limits calculation
   */
  it('renders Line chart with control limits annotations', async () => {
    // Import Line component mock to verify calls
    const { Line } = require('react-chartjs-2');

    // Mock successful API response
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: [
          {
            iterationId: 'gid://gitlab/Iteration/123',
            iterationTitle: 'Sprint 23',
            startDate: '2024-10-01',
            dueDate: '2024-10-14',
            mttrAvg: 2.5,
            incidentCount: 4
          },
          {
            iterationId: 'gid://gitlab/Iteration/124',
            iterationTitle: 'Sprint 24',
            startDate: '2024-10-15',
            dueDate: '2024-10-28',
            mttrAvg: 3.8,
            incidentCount: 3
          }
        ],
        count: 2
      })
    });

    render(<MTTRChart selectedIterations={[{id: 'gid://gitlab/Iteration/123', title: 'Sprint 1'}, {id: 'gid://gitlab/Iteration/124', title: 'Sprint 2'}]} />);

    // Wait for data to load and chart to render
    await waitFor(() => {
      expect(screen.getByTestId('mttr-chart')).toBeInTheDocument();
    });

    // Verify Line component was called (not Bar)
    expect(Line).toHaveBeenCalled();

    // Verify Line component receives annotation options with control limits
    const lineCall = Line.mock.calls[Line.mock.calls.length - 1][0];
    expect(lineCall.options).toBeDefined();
    expect(lineCall.options.plugins).toBeDefined();
    expect(lineCall.options.plugins.annotation).toBeDefined();

    // Verify control limit annotations exist with calculated values
    const annotations = lineCall.options.plugins.annotation.annotations;
    expect(annotations.upperLimit).toBeDefined();
    expect(annotations.upperLimit.yMin).toBeGreaterThan(0); // UCL should be positive
    expect(annotations.average).toBeDefined();
    expect(annotations.average.yMin).toBeGreaterThan(0); // Avg should be positive
    expect(annotations.lowerLimit).toBeDefined();
    expect(annotations.lowerLimit.yMin).toBeGreaterThanOrEqual(0); // LCL can be 0 or positive
  });

  /**
   * Test 6: Dataset configuration for Line chart - TDD Test 2
   * Drives: Line chart styling with tension, borderColor, and backgroundColor
   */
  it('configures dataset with line chart styling', async () => {
    const { Line } = require('react-chartjs-2');

    // Mock successful API response
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: [
          {
            iterationId: 'gid://gitlab/Iteration/123',
            iterationTitle: 'Sprint 23',
            startDate: '2024-10-01',
            dueDate: '2024-10-14',
            mttrAvg: 2.5,
            incidentCount: 4
          }
        ],
        count: 1
      })
    });

    render(<MTTRChart selectedIterations={[{id: 'gid://gitlab/Iteration/123', title: 'Sprint 1'}]} />);

    // Wait for chart to render
    await waitFor(() => {
      expect(Line).toHaveBeenCalled();
    });

    // Verify dataset configuration for line chart
    const lineCall = Line.mock.calls[Line.mock.calls.length - 1][0];
    const dataset = lineCall.data.datasets[0];

    expect(dataset.label).toBe('MTTR (hours)');
    expect(dataset.borderColor).toBe('rgba(255, 99, 132, 1)');
    expect(dataset.backgroundColor).toBe('rgba(255, 99, 132, 0.1)');
    expect(dataset.tension).toBe(0.4);
  });
});
