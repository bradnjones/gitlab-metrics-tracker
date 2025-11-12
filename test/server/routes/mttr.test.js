/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';
import { ServiceFactory } from '../../../src/server/services/ServiceFactory.js';

describe('GET /api/metrics/mttr', () => {
  let app;
  let mockMetricsService;

  beforeEach(() => {
    // Create mock MetricsService
    mockMetricsService = {
      calculateMultipleMetrics: jest.fn()
    };

    // Mock ServiceFactory to return our mock service
    ServiceFactory.createMetricsService = jest.fn().mockReturnValue(mockMetricsService);

    // Create app
    app = createApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 1: Happy path - single iteration with incidents
   * This drives the core functionality of the MTTR endpoint
   */
  it('should calculate MTTR for single iteration with closed incidents', async () => {
    const mockMetrics = {
      iterationId: 'gid://gitlab/Iteration/123',
      iterationTitle: 'Sprint 1',
      startDate: '2025-01-01',
      endDate: '2025-01-14',
      mttrAvg: 24.5,
      incidentCount: 3
    };

    mockMetricsService.calculateMultipleMetrics.mockResolvedValue([mockMetrics]);

    const response = await request(app)
      .get('/api/metrics/mttr?iterations=gid://gitlab/Iteration/123')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify MetricsService was called with iteration IDs array
    expect(mockMetricsService.calculateMultipleMetrics).toHaveBeenCalledWith(['gid://gitlab/Iteration/123']);

    // Verify response structure
    expect(response.body.metrics).toHaveLength(1);
    expect(response.body.metrics[0]).toMatchObject({
      iterationId: 'gid://gitlab/Iteration/123',
      iterationTitle: 'Sprint 1',
      mttrAvg: 24.5
    });
    expect(response.body.count).toBe(1);
  });

  /**
   * Test 2: Parameter validation
   * This drives input validation logic
   */
  it('should return 400 when iterations parameter is missing', async () => {
    const response = await request(app)
      .get('/api/metrics/mttr')
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
    expect(mockMetricsService.calculateMultipleMetrics).not.toHaveBeenCalled();
  });

  /**
   * Test 3: Multiple iterations aggregation
   * This drives multi-iteration logic
   */
  it('should calculate MTTR for multiple iterations', async () => {
    const mockMetrics1 = {
      iterationId: 'gid://gitlab/Iteration/123',
      iterationTitle: 'Sprint 1',
      startDate: '2025-01-01',
      endDate: '2025-01-14',
      mttrAvg: 24.5,
      incidentCount: 3
    };
    const mockMetrics2 = {
      iterationId: 'gid://gitlab/Iteration/124',
      iterationTitle: 'Sprint 2',
      startDate: '2025-01-15',
      endDate: '2025-01-28',
      mttrAvg: 18.3,
      incidentCount: 5
    };

    mockMetricsService.calculateMultipleMetrics.mockResolvedValue([mockMetrics1, mockMetrics2]);

    const response = await request(app)
      .get('/api/metrics/mttr?iterations=gid://gitlab/Iteration/123,gid://gitlab/Iteration/124')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify MetricsService was called once with all iteration IDs
    expect(mockMetricsService.calculateMultipleMetrics).toHaveBeenCalledTimes(1);
    expect(mockMetricsService.calculateMultipleMetrics).toHaveBeenCalledWith([
      'gid://gitlab/Iteration/123',
      'gid://gitlab/Iteration/124'
    ]);

    // Verify response structure
    expect(response.body.metrics).toHaveLength(2);
    expect(response.body.metrics[0].mttrAvg).toBe(24.5);
    expect(response.body.metrics[1].mttrAvg).toBe(18.3);
    expect(response.body.count).toBe(2);
  });

  /**
   * Test 4: Empty result handling
   * This drives graceful handling when no incidents exist
   */
  it('should handle iterations with no incidents (returns mttrAvg: 0)', async () => {
    const mockMetrics = {
      iterationId: 'gid://gitlab/Iteration/123',
      iterationTitle: 'Sprint 1',
      startDate: '2025-01-01',
      endDate: '2025-01-14',
      mttrAvg: 0,
      incidentCount: 0
    };

    mockMetricsService.calculateMultipleMetrics.mockResolvedValue([mockMetrics]);

    const response = await request(app)
      .get('/api/metrics/mttr?iterations=gid://gitlab/Iteration/123')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response with zero incidents
    expect(response.body.metrics[0].mttrAvg).toBe(0);
    expect(response.body.metrics[0].incidentCount).toBe(0);
  });

  /**
   * Test 5: Error handling
   * This drives error handling for external API failures
   */
  it('should return 500 when service throws error', async () => {
    mockMetricsService.calculateMultipleMetrics.mockRejectedValue(
      new Error('Failed to fetch incidents from GitLab')
    );

    const response = await request(app)
      .get('/api/metrics/mttr?iterations=gid://gitlab/Iteration/999')
      .expect('Content-Type', /json/)
      .expect(500);

    // Verify error response structure
    expect(response.body).toEqual({
      error: {
        message: 'Failed to calculate MTTR metrics',
        details: 'Failed to fetch incidents from GitLab'
      }
    });
  });
});
