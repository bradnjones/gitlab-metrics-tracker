/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import MTTRChart from '../MTTRChart.jsx';

// Mock Chart.js Bar component
jest.mock('react-chartjs-2', () => ({
  Bar: jest.fn(({ data }) => (
    <div data-testid="mttr-chart">
      Chart with {data?.labels?.length || 0} data points
    </div>
  ))
}));

// Mock fetchWithRetry
jest.mock('../../utils/fetchWithRetry.js', () => ({
  fetchWithRetry: jest.fn()
}));

// Import the mocked module AFTER jest.mock() so we get the mocked version
import { fetchWithRetry } from '../../utils/fetchWithRetry.js';

describe('MTTRChart', () => {
  beforeEach(() => {
    // Reset mock before each test
    fetchWithRetry.mockReset();
  });
  /**
   * Test 1: Empty state rendering
   * Drives: Basic component structure and prop handling
   */
  it('renders empty state when no iterations are selected', () => {
    render(<MTTRChart iterationIds={[]} />);

    expect(screen.getByText(/select iterations to view mttr metrics/i))
      .toBeInTheDocument();
  });

  /**
   * Test 2: Loading state
   * Drives: useState for loading state and useEffect hook setup
   */
  it('displays loading state while fetching MTTR data', () => {
    render(<MTTRChart iterationIds={['gid://gitlab/Iteration/123']} />);

    expect(screen.getByText(/loading mttr data/i))
      .toBeInTheDocument();
  });

  /**
   * Test 3: Success state - API integration and chart rendering
   * Drives: API call, data transformation, chart display with Chart.js
   */
  it('fetches and displays MTTR data successfully', async () => {
    // Mock successful API response (fetchWithRetry returns a Response object)
    fetchWithRetry.mockResolvedValue({
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

    render(<MTTRChart iterationIds={['gid://gitlab/Iteration/123', 'gid://gitlab/Iteration/124']} />);

    // Wait for data to load and chart to render
    await waitFor(() => {
      expect(screen.getByTestId('mttr-chart')).toBeInTheDocument();
    });

    // Verify chart has correct number of data points
    expect(screen.getByText(/Chart with 2 data points/i)).toBeInTheDocument();

    // Verify API was called with correct URL
    expect(fetchWithRetry).toHaveBeenCalledWith(
      '/api/metrics/mttr?iterations=gid://gitlab/Iteration/123,gid://gitlab/Iteration/124'
    );
  });

  /**
   * Test 4: Error state - API failure handling
   * Drives: Error handling, error state display
   */
  it('displays error message when API fails', async () => {
    // Mock failed API response (fetchWithRetry throws error)
    fetchWithRetry.mockRejectedValue(new Error('Failed to fetch MTTR data after 4 attempts'));

    render(<MTTRChart iterationIds={['gid://gitlab/Iteration/123']} />);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Error loading MTTR data/i)).toBeInTheDocument();
    });

    // Verify error message is shown
    expect(screen.getByText(/Failed to fetch MTTR data after 4 attempts/i)).toBeInTheDocument();
  });
});
