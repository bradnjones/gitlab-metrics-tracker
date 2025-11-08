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
      iterationId: 'gid://gitlab/Iteration/123',
      iterationTitle: 'Sprint 1',
      startDate: '2025-01-01',
      endDate: '2025-01-14',
      velocityPoints: 42,
      velocityStories: 8,
      issueCount: 10,
      rawData: {
        issues: [
          { state: 'closed', weight: 5 },
          { state: 'closed', weight: 3 },
          { state: 'opened', weight: 2 }
        ]
      }
    };

    mockMetricsService.calculateMetrics.mockResolvedValue(mockMetrics);

    const response = await request(app)
      .get('/api/metrics/velocity?iterations=gid://gitlab/Iteration/123')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify MetricsService was called with iteration ID
    expect(mockMetricsService.calculateMetrics).toHaveBeenCalledWith('gid://gitlab/Iteration/123');

    // Verify response structure matches new format
    expect(response.body.metrics[0]).toMatchObject({
      iterationId: 'gid://gitlab/Iteration/123',
      iterationTitle: 'Sprint 1',
      completedPoints: 42,
      completedStories: 8
    });
    expect(response.body.count).toBe(1);
  });

  it('should calculate velocity for multiple iterations (comma-separated IDs)', async () => {
    const mockMetrics1 = {
      iterationId: 'gid://gitlab/Iteration/123',
      iterationTitle: 'Sprint 1',
      velocityPoints: 42,
      velocityStories: 8,
      issueCount: 10,
      rawData: { issues: [] }
    };
    const mockMetrics2 = {
      iterationId: 'gid://gitlab/Iteration/124',
      iterationTitle: 'Sprint 2',
      velocityPoints: 38,
      velocityStories: 7,
      issueCount: 9,
      rawData: { issues: [] }
    };
    const mockMetrics3 = {
      iterationId: 'gid://gitlab/Iteration/125',
      iterationTitle: 'Sprint 3',
      velocityPoints: 45,
      velocityStories: 9,
      issueCount: 11,
      rawData: { issues: [] }
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

    // Verify response structure has all iterations
    expect(response.body.metrics).toHaveLength(3);
    expect(response.body.metrics[0].completedPoints).toBe(42);
    expect(response.body.metrics[1].completedPoints).toBe(38);
    expect(response.body.metrics[2].completedPoints).toBe(45);
    expect(response.body.count).toBe(3);
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
      .mockResolvedValueOnce({
        iterationId: 'gid://gitlab/Iteration/123',
        velocityPoints: 42,
        velocityStories: 8,
        rawData: { issues: [] }
      })
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
