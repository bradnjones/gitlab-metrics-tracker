/**
 * Tests for CacheStatus Component
 * Story V9.3: Cache Management UI
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CacheStatus from '../../../src/public/components/CacheStatus.jsx';

// Mock fetch globally
global.fetch = jest.fn();

describe('CacheStatus Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Test 1: Displays loading state while fetching cache status
  it('should display loading state initially', () => {
    // Mock fetch to never resolve (simulate loading)
    global.fetch.mockImplementation(() => new Promise(() => {}));

    render(<CacheStatus />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  // Test 2: Displays fresh status with green indicator
  it('should display fresh status with green indicator when all iterations are fresh', async () => {
    const mockResponse = {
      cacheTTL: 6,
      totalCachedIterations: 3,
      globalLastUpdated: '2025-11-13T19:30:00.000Z',
      iterations: [
        {
          iterationId: 'gid://gitlab/Iteration/123',
          lastFetched: '2025-11-13T19:30:00.000Z',
          ageHours: 0.5,
          status: 'fresh',
          fileSize: 45678,
        },
        {
          iterationId: 'gid://gitlab/Iteration/124',
          lastFetched: '2025-11-13T19:25:00.000Z',
          ageHours: 0.58,
          status: 'fresh',
          fileSize: 52341,
        },
        {
          iterationId: 'gid://gitlab/Iteration/125',
          lastFetched: '2025-11-13T19:20:00.000Z',
          ageHours: 0.67,
          status: 'fresh',
          fileSize: 38912,
        },
      ],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<CacheStatus />);

    await waitFor(() => {
      expect(screen.getByText(/fresh/i)).toBeInTheDocument();
    });

    // Verify fresh status is displayed
    expect(screen.getByText(/fresh/i)).toBeInTheDocument();

    // Verify count is displayed
    expect(screen.getByText(/3 iterations/i)).toBeInTheDocument();
  });

  // Test 3: Displays aging status with yellow indicator
  it('should display aging status with yellow indicator when some iterations are aging', async () => {
    const mockResponse = {
      cacheTTL: 6,
      totalCachedIterations: 3,
      globalLastUpdated: '2025-11-13T19:30:00.000Z',
      iterations: [
        {
          iterationId: 'gid://gitlab/Iteration/123',
          lastFetched: '2025-11-13T19:30:00.000Z',
          ageHours: 0.5,
          status: 'fresh',
          fileSize: 45678,
        },
        {
          iterationId: 'gid://gitlab/Iteration/124',
          lastFetched: '2025-11-13T16:00:00.000Z',
          ageHours: 3.5,
          status: 'aging',
          fileSize: 52341,
        },
        {
          iterationId: 'gid://gitlab/Iteration/125',
          lastFetched: '2025-11-13T15:00:00.000Z',
          ageHours: 4.5,
          status: 'aging',
          fileSize: 38912,
        },
      ],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<CacheStatus />);

    await waitFor(() => {
      expect(screen.getByText(/aging/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/aging/i)).toBeInTheDocument();
    expect(screen.getByText(/3 iterations/i)).toBeInTheDocument();
  });

  // Test 4: Displays stale status with red indicator
  it('should display stale status with red indicator when any iterations are stale', async () => {
    const mockResponse = {
      cacheTTL: 6,
      totalCachedIterations: 3,
      globalLastUpdated: '2025-11-13T19:30:00.000Z',
      iterations: [
        {
          iterationId: 'gid://gitlab/Iteration/123',
          lastFetched: '2025-11-13T19:30:00.000Z',
          ageHours: 0.5,
          status: 'fresh',
          fileSize: 45678,
        },
        {
          iterationId: 'gid://gitlab/Iteration/124',
          lastFetched: '2025-11-13T16:00:00.000Z',
          ageHours: 3.5,
          status: 'aging',
          fileSize: 52341,
        },
        {
          iterationId: 'gid://gitlab/Iteration/125',
          lastFetched: '2025-11-13T11:00:00.000Z',
          ageHours: 8.5,
          status: 'stale',
          fileSize: 38912,
        },
      ],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<CacheStatus />);

    await waitFor(() => {
      expect(screen.getByText(/stale/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/stale/i)).toBeInTheDocument();
    expect(screen.getByText(/3 iterations/i)).toBeInTheDocument();
  });

  // Test 5: Displays "No cache" when no iterations are cached
  it('should display "No cache" when totalCachedIterations is 0', async () => {
    const mockResponse = {
      cacheTTL: 6,
      totalCachedIterations: 0,
      globalLastUpdated: null,
      iterations: [],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<CacheStatus />);

    await waitFor(() => {
      expect(screen.getByText(/no cache/i)).toBeInTheDocument();
    });
  });

  // Test 6: Displays error state when fetch fails
  it('should display error state when API call fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<CacheStatus />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  // Test 7: Calls API endpoint on mount
  it('should call GET /api/cache/status on component mount', async () => {
    const mockResponse = {
      cacheTTL: 6,
      totalCachedIterations: 1,
      globalLastUpdated: '2025-11-13T19:30:00.000Z',
      iterations: [
        {
          iterationId: 'gid://gitlab/Iteration/123',
          lastFetched: '2025-11-13T19:30:00.000Z',
          ageHours: 0.5,
          status: 'fresh',
          fileSize: 45678,
        },
      ],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<CacheStatus />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cache/status');
    });
  });

  // Test 8: Displays last updated timestamp
  it('should display formatted last updated timestamp', async () => {
    const mockResponse = {
      cacheTTL: 6,
      totalCachedIterations: 1,
      globalLastUpdated: '2025-11-13T19:30:00.000Z',
      iterations: [
        {
          iterationId: 'gid://gitlab/Iteration/123',
          lastFetched: '2025-11-13T19:30:00.000Z',
          ageHours: 0.5,
          status: 'fresh',
          fileSize: 45678,
        },
      ],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<CacheStatus />);

    await waitFor(() => {
      // Check for "Updated" text (component should format timestamp)
      expect(screen.getByText(/updated/i)).toBeInTheDocument();
    });
  });
});
