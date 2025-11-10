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
});
