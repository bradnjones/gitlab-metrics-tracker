/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';

// Mock the ServiceFactory
jest.mock('../../../src/server/services/ServiceFactory.js');

import { ServiceFactory } from '../../../src/server/services/ServiceFactory.js';

describe('GET /api/metrics/velocity', () => {
  let app;
  let mockMetricsService;

  beforeEach(() => {
    // Create mock MetricsService
    mockMetricsService = {
      calculateMetrics: jest.fn()
    };

    // Mock ServiceFactory to return our mock service
    ServiceFactory.createMetricsService = jest.fn().mockReturnValue(mockMetricsService);

    // Create app
    app = createApp();
  });

  it('should calculate velocity for single iteration', async () => {
    const mockMetrics = {
      velocity: {
        points: 42,
        stories: 8
      },
      throughput: {
        issues_closed: 8
      },
      cycle_time: {
        average_days: 3.5,
        p50_days: 3.0,
        p90_days: 5.0
      }
    };

    mockMetricsService.calculateMetrics.mockResolvedValue(mockMetrics);

    const response = await request(app)
      .get('/api/metrics/velocity?iterations=gid://gitlab/Iteration/123')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify MetricsService was called with iteration ID
    expect(mockMetricsService.calculateMetrics).toHaveBeenCalledWith('gid://gitlab/Iteration/123');

    // Verify response structure
    expect(response.body).toEqual({
      metrics: [
        {
          iteration_id: 'gid://gitlab/Iteration/123',
          velocity_points: 42,
          velocity_stories: 8
        }
      ],
      count: 1
    });
  });

  it('should calculate velocity for multiple iterations (comma-separated IDs)', async () => {
    const mockMetrics1 = {
      velocity: { points: 42, stories: 8 }
    };
    const mockMetrics2 = {
      velocity: { points: 38, stories: 7 }
    };
    const mockMetrics3 = {
      velocity: { points: 45, stories: 9 }
    };

    mockMetricsService.calculateMetrics
      .mockResolvedValueOnce(mockMetrics1)
      .mockResolvedValueOnce(mockMetrics2)
      .mockResolvedValueOnce(mockMetrics3);

    const response = await request(app)
      .get('/api/metrics/velocity?iterations=gid://gitlab/Iteration/123,gid://gitlab/Iteration/124,gid://gitlab/Iteration/125')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify MetricsService was called for each iteration
    expect(mockMetricsService.calculateMetrics).toHaveBeenCalledTimes(3);
    expect(mockMetricsService.calculateMetrics).toHaveBeenNthCalledWith(1, 'gid://gitlab/Iteration/123');
    expect(mockMetricsService.calculateMetrics).toHaveBeenNthCalledWith(2, 'gid://gitlab/Iteration/124');
    expect(mockMetricsService.calculateMetrics).toHaveBeenNthCalledWith(3, 'gid://gitlab/Iteration/125');

    // Verify response structure
    expect(response.body).toEqual({
      metrics: [
        {
          iteration_id: 'gid://gitlab/Iteration/123',
          velocity_points: 42,
          velocity_stories: 8
        },
        {
          iteration_id: 'gid://gitlab/Iteration/124',
          velocity_points: 38,
          velocity_stories: 7
        },
        {
          iteration_id: 'gid://gitlab/Iteration/125',
          velocity_points: 45,
          velocity_stories: 9
        }
      ],
      count: 3
    });
  });

  it('should return 400 when iterations query param is missing', async () => {
    const response = await request(app)
      .get('/api/metrics/velocity')
      .expect('Content-Type', /json/)
      .expect(400);

    // Verify error response structure
    expect(response.body).toEqual({
      error: {
        message: 'Missing required parameter: iterations',
        details: 'Provide comma-separated iteration IDs in query string (e.g., ?iterations=id1,id2)'
      }
    });

    // Verify service was NOT called
    expect(mockMetricsService.calculateMetrics).not.toHaveBeenCalled();
  });

  it('should return 500 when MetricsService throws error for any iteration', async () => {
    mockMetricsService.calculateMetrics
      .mockResolvedValueOnce({ velocity: { points: 42, stories: 8 } })
      .mockRejectedValueOnce(new Error('Failed to fetch iteration data: Iteration not found'));

    const response = await request(app)
      .get('/api/metrics/velocity?iterations=gid://gitlab/Iteration/123,gid://gitlab/Iteration/999')
      .expect('Content-Type', /json/)
      .expect(500);

    // Verify error response structure
    expect(response.body).toEqual({
      error: {
        message: 'Failed to calculate velocity metrics',
        details: 'Failed to fetch iteration data: Iteration not found'
      }
    });
  });
});
