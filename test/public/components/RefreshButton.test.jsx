/**
 * Tests for RefreshButton Component
 * Story V9.3: Cache Management UI
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RefreshButton from '../../../src/public/components/RefreshButton.jsx';

// Mock fetch globally
global.fetch = jest.fn();

describe('RefreshButton Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Test 1: Renders button with refresh icon/text
  it('should render refresh button', () => {
    render(<RefreshButton />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText(/refresh/i)).toBeInTheDocument();
  });

  // Test 2: Calls DELETE /api/cache when clicked
  it('should call DELETE /api/cache when button is clicked', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    render(<RefreshButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cache', {
        method: 'DELETE',
      });
    });
  });

  // Test 3: Shows loading state during operation
  it('should show loading state while clearing cache', async () => {
    // Mock fetch to never resolve (simulate loading)
    global.fetch.mockImplementation(() => new Promise(() => {}));

    render(<RefreshButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/clearing/i)).toBeInTheDocument();
    });
  });

  // Test 4: Disables button during operation
  it('should disable button while clearing cache', async () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));

    render(<RefreshButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  // Test 5: Calls onRefreshComplete callback on success
  it('should call onRefreshComplete callback on successful clear', async () => {
    const mockOnRefreshComplete = jest.fn();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    render(<RefreshButton onRefreshComplete={mockOnRefreshComplete} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnRefreshComplete).toHaveBeenCalledTimes(1);
    });
  });

  // Test 6: Shows inline success message after clear
  it('should show inline success message after clearing cache', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    render(<RefreshButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/cleared/i)).toBeInTheDocument();
    });
  });

  // Test 7: Shows inline error message on failure
  it('should show inline error message when clear fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Failed to clear cache'));

    render(<RefreshButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  // Test 8: Resets to normal state after success message timeout
  it('should reset button to normal state after success message timeout', async () => {
    jest.useFakeTimers();

    // Mock window.location.reload to prevent jsdom error
    const mockReload = jest.fn();
    delete window.location;
    window.location = { reload: mockReload };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    render(<RefreshButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/cleared/i)).toBeInTheDocument();
    });

    // Fast-forward 1 second (to trigger reload)
    jest.advanceTimersByTime(1000);

    // window.location.reload should have been called
    await waitFor(() => {
      expect(mockReload).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  // Test 9: Does not call onRefreshComplete when no callback provided
  it('should not throw error when onRefreshComplete is not provided', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    render(<RefreshButton />);

    const button = screen.getByRole('button');

    expect(() => {
      fireEvent.click(button);
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByText(/cleared/i)).toBeInTheDocument();
    });
  });
});
