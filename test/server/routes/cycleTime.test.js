/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';
import { ServiceFactory } from '../../../src/server/services/ServiceFactory.js';

describe('GET /api/metrics/cycle-time', () => {
  let app;
  let mockMetricsService;

  beforeEach(() => {
    // Create mock MetricsService
    mockMetricsService = {
      calculateMetrics: jest.fn(),
      calculateMultipleMetrics: jest.fn()
    };

    // Mock ServiceFactory to return our mock service
    ServiceFactory.createMetricsService = jest.fn().mockReturnValue(mockMetricsService);

    // Create app
    app = createApp();
  });

  it('should calculate cycle time for single iteration', async () => {
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
          {
            state: 'closed',
            weight: 5,
            createdAt: '2025-01-01T00:00:00Z',
            closedAt: '2025-01-03T00:00:00Z'
          },
          {
            state: 'closed',
            weight: 3,
            createdAt: '2025-01-01T00:00:00Z',
            closedAt: '2025-01-05T00:00:00Z'
          },
          {
            state: 'opened',
            weight: 2,
            createdAt: '2025-01-01T00:00:00Z',
            closedAt: null
          }
        ]
      }
    };

    mockMetricsService.calculateMultipleMetrics.mockResolvedValue([mockMetrics]);

    const response = await request(app)
      .get('/api/metrics/cycle-time?iterations=gid://gitlab/Iteration/123')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify MetricsService was called with iteration IDs array
    expect(mockMetricsService.calculateMultipleMetrics).toHaveBeenCalledWith(['gid://gitlab/Iteration/123']);

    // Verify response structure includes cycle time metrics
    expect(response.body.metrics[0]).toMatchObject({
      iterationId: 'gid://gitlab/Iteration/123',
      iterationTitle: 'Sprint 1',
      startDate: '2025-01-01',
      dueDate: '2025-01-14',
      cycleTimeAvg: expect.any(Number),
      cycleTimeP50: expect.any(Number),
      cycleTimeP90: expect.any(Number)
    });
    expect(response.body.count).toBe(1);

    // Verify cycle time values are calculated correctly
    // Issue 1: 2 days (Jan 1 -> Jan 3)
    // Issue 2: 4 days (Jan 1 -> Jan 5)
    // Avg: (2+4)/2 = 3 days
    expect(response.body.metrics[0].cycleTimeAvg).toBeCloseTo(3, 1);
    expect(response.body.metrics[0].cycleTimeP50).toBeCloseTo(3, 1);
    expect(response.body.metrics[0].cycleTimeP90).toBeCloseTo(4, 1);
  });

  it('should return 400 when iterations query param is missing', async () => {
    const response = await request(app)
      .get('/api/metrics/cycle-time')
      .expect('Content-Type', /json/)
      .expect(400);

    // Verify error structure
    expect(response.body.error).toMatchObject({
      message: 'Missing required parameter: iterations',
      details: expect.stringContaining('Provide comma-separated iteration IDs')
    });

    // Verify service was NOT called
    expect(mockMetricsService.calculateMultipleMetrics).not.toHaveBeenCalled();
  });

  it('should calculate cycle time for multiple iterations (comma-separated IDs)', async () => {
    const mockMetrics1 = {
      iterationId: 'gid://gitlab/Iteration/123',
      iterationTitle: 'Sprint 1',
      startDate: '2025-01-01',
      endDate: '2025-01-14',
      rawData: {
        issues: [
          {
            state: 'closed',
            createdAt: '2025-01-01T00:00:00Z',
            closedAt: '2025-01-03T00:00:00Z'
          },
          {
            state: 'closed',
            createdAt: '2025-01-01T00:00:00Z',
            closedAt: '2025-01-05T00:00:00Z'
          }
        ]
      }
    };
    const mockMetrics2 = {
      iterationId: 'gid://gitlab/Iteration/124',
      iterationTitle: 'Sprint 2',
      startDate: '2025-01-15',
      endDate: '2025-01-28',
      rawData: {
        issues: [
          {
            state: 'closed',
            createdAt: '2025-01-15T00:00:00Z',
            closedAt: '2025-01-17T00:00:00Z'
          }
        ]
      }
    };

    mockMetricsService.calculateMultipleMetrics.mockResolvedValue([mockMetrics1, mockMetrics2]);

    const response = await request(app)
      .get('/api/metrics/cycle-time?iterations=gid://gitlab/Iteration/123,gid://gitlab/Iteration/124')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify service was called with both IDs
    expect(mockMetricsService.calculateMultipleMetrics).toHaveBeenCalledWith([
      'gid://gitlab/Iteration/123',
      'gid://gitlab/Iteration/124'
    ]);

    // Verify response has both iterations
    expect(response.body.metrics).toHaveLength(2);
    expect(response.body.count).toBe(2);

    // Verify first iteration
    expect(response.body.metrics[0]).toMatchObject({
      iterationId: 'gid://gitlab/Iteration/123',
      cycleTimeAvg: expect.any(Number),
      cycleTimeP50: expect.any(Number),
      cycleTimeP90: expect.any(Number)
    });

    // Verify second iteration
    expect(response.body.metrics[1]).toMatchObject({
      iterationId: 'gid://gitlab/Iteration/124',
      cycleTimeAvg: 2,
      cycleTimeP50: 2,
      cycleTimeP90: 2
    });
  });

  it('should return 500 when MetricsService throws error', async () => {
    mockMetricsService.calculateMultipleMetrics.mockRejectedValue(
      new Error('Failed to fetch iteration data')
    );

    const response = await request(app)
      .get('/api/metrics/cycle-time?iterations=gid://gitlab/Iteration/123')
      .expect('Content-Type', /json/)
      .expect(500);

    // Verify error structure
    expect(response.body.error).toMatchObject({
      message: 'Failed to calculate cycle time metrics',
      details: 'Failed to fetch iteration data'
    });
  });
});
