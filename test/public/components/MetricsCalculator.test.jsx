/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetricsCalculator from '../../../src/public/components/MetricsCalculator.jsx';

// Mock fetch globally
global.fetch = jest.fn();

describe('MetricsCalculator', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  /**
   * Test 1: Renders form with iteration ID input and submit button
   *
   * TDD Approach: Write test FIRST to verify core UI structure
   * Expected Coverage: 25-30%
   */
  it('renders form with iteration ID input and submit button', () => {
    render(<MetricsCalculator />);

    // Verify heading and description
    expect(screen.getByText('GitLab Sprint Metrics Calculator')).toBeInTheDocument();
    expect(screen.getByText('Enter a GitLab iteration ID to calculate sprint metrics.')).toBeInTheDocument();

    // Verify input field
    const input = screen.getByLabelText(/Iteration ID/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('placeholder', 'gid://gitlab/Iteration/12345');

    // Verify submit button
    const submitButton = screen.getByRole('button', { name: 'Calculate Metrics' });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  /**
   * Test 2: Shows validation error when submitting empty iteration ID
   *
   * TDD Approach: Test validation logic before API call
   * Expected Coverage: +15-20% (total: 45-50%)
   */
  it('shows validation error when submitting empty iteration ID', async () => {
    render(<MetricsCalculator />);

    const submitButton = screen.getByRole('button', { name: 'Calculate Metrics' });

    // Submit form with empty input
    fireEvent.click(submitButton);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText('Please enter an iteration ID')).toBeInTheDocument();
    });

    // Verify fetch was NOT called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /**
   * Test 3: Displays loading state while fetching metrics
   *
   * TDD Approach: Test async state management
   * Expected Coverage: +15-20% (total: 65-70%)
   */
  it('displays loading state while fetching metrics', async () => {
    // Mock fetch to return a pending promise
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<MetricsCalculator />);

    const input = screen.getByLabelText(/Iteration ID/i);
    const submitButton = screen.getByRole('button', { name: 'Calculate Metrics' });

    // Enter valid iteration ID
    await userEvent.type(input, 'gid://gitlab/Iteration/12345');

    // Submit form
    fireEvent.click(submitButton);

    // Verify loading state appears
    await waitFor(() => {
      expect(screen.getByText('Calculating metrics...')).toBeInTheDocument();
    });

    // Verify button text changes
    expect(screen.getByRole('button', { name: 'Calculating...' })).toBeInTheDocument();

    // Verify button is disabled
    expect(submitButton).toBeDisabled();

    // Verify input is disabled
    expect(input).toBeDisabled();
  });

  /**
   * Test 4: Displays error message when API call fails
   *
   * TDD Approach: Test error handling path
   * Expected Coverage: +10-15% (total: 80-85%)
   */
  it('displays error message when API call fails', async () => {
    // Mock fetch to return an error response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid iteration ID format' })
    });

    render(<MetricsCalculator />);

    const input = screen.getByLabelText(/Iteration ID/i);
    const submitButton = screen.getByRole('button', { name: 'Calculate Metrics' });

    // Enter iteration ID
    await userEvent.type(input, 'invalid-id');

    // Submit form
    fireEvent.click(submitButton);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/Invalid iteration ID format/i)).toBeInTheDocument();
    });

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/calculate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iterationId: 'invalid-id',
        }),
      }
    );

    // Verify loading state is cleared
    expect(screen.queryByText('Calculating metrics...')).not.toBeInTheDocument();
  });

  /**
   * Test 5: Displays formatted metrics on successful API response
   *
   * TDD Approach: Test success path and data formatting
   * Expected Coverage: +10-15% (total: 90-95%)
   */
  it('displays formatted metrics on successful API response', async () => {
    // Mock successful API response
    const mockResponse = {
      metrics: {
        iterationTitle: 'Sprint 42',
        velocityPoints: 45.5,
        velocityStories: 12,
        throughput: 15,
        cycleTimeAvg: 3.25,
        cycleTimeP50: 2.5,
        cycleTimeP90: 6.8,
        issueCount: 18
      }
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<MetricsCalculator />);

    const input = screen.getByLabelText(/Iteration ID/i);
    const submitButton = screen.getByRole('button', { name: 'Calculate Metrics' });

    // Enter iteration ID
    await userEvent.type(input, 'gid://gitlab/Iteration/12345');

    // Submit form
    fireEvent.click(submitButton);

    // Verify results appear
    await waitFor(() => {
      expect(screen.getByText('Results')).toBeInTheDocument();
    });

    // Verify iteration title
    expect(screen.getByText('Sprint 42')).toBeInTheDocument();

    // Verify metric labels are rendered
    expect(screen.getByText('Velocity (Points)')).toBeInTheDocument();
    expect(screen.getByText('Velocity (Stories)')).toBeInTheDocument();
    expect(screen.getByText('Throughput')).toBeInTheDocument();
    expect(screen.getByText('Cycle Time (Avg)')).toBeInTheDocument();
    expect(screen.getByText('Cycle Time (P50)')).toBeInTheDocument();
    expect(screen.getByText('Cycle Time (P90)')).toBeInTheDocument();
    expect(screen.getByText('Issue Count')).toBeInTheDocument();

    // Verify full response is shown in JSON format with correct data
    expect(screen.getByText('Full Response:')).toBeInTheDocument();
    const jsonContent = screen.getByText(/"iterationTitle": "Sprint 42"/);
    expect(jsonContent).toBeInTheDocument();

    // Verify the JSON contains all expected metric values
    const preElement = jsonContent.closest('pre');
    expect(preElement.textContent).toContain('"velocityPoints": 45.5');
    expect(preElement.textContent).toContain('"velocityStories": 12');
    expect(preElement.textContent).toContain('"throughput": 15');
    expect(preElement.textContent).toContain('"cycleTimeAvg": 3.25');
    expect(preElement.textContent).toContain('"cycleTimeP50": 2.5');
    expect(preElement.textContent).toContain('"cycleTimeP90": 6.8');
    expect(preElement.textContent).toContain('"issueCount": 18');
  });

  /**
   * Bonus Test: Tests formatValue helper function indirectly through rendering
   */
  it('trims whitespace from iteration ID before submitting', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metrics: { iterationTitle: 'Test', velocityPoints: 0 } })
    });

    render(<MetricsCalculator />);

    const input = screen.getByLabelText(/Iteration ID/i);
    const submitButton = screen.getByRole('button', { name: 'Calculate Metrics' });

    // Enter iteration ID with leading/trailing whitespace
    await userEvent.type(input, '   gid://gitlab/Iteration/12345   ');

    // Submit form
    fireEvent.click(submitButton);

    // Verify fetch was called with trimmed ID
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/metrics/calculate',
        expect.objectContaining({
          body: JSON.stringify({
            iterationId: 'gid://gitlab/Iteration/12345', // Trimmed
          }),
        })
      );
    });
  });
});
