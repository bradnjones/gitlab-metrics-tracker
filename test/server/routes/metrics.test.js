/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';

// Mock the ServiceFactory
jest.mock('../../../src/server/services/ServiceFactory.js');

import { ServiceFactory } from '../../../src/server/services/ServiceFactory.js';

describe('POST /api/metrics/calculate', () => {
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

  it('should calculate metrics for valid iteration', async () => {
    const mockMetrics = {
      velocityPoints: 42,
      velocityStories: 5,
      throughput: 15,
      cycleTimeAvg: 3.5,
      cycleTimeP50: 3.0,
      cycleTimeP90: 5.0,
      deploymentFrequency: 2.5,
      leadTimeAvg: 2.0,
      leadTimeP50: 1.5,
      leadTimeP90: 3.0,
      mttrAvg: 2.5,
    };

    mockMetricsService.calculateMetrics.mockResolvedValue(mockMetrics);

    const response = await request(app)
      .post('/api/metrics/calculate')
      .send({ iterationId: 'gid://gitlab/Iteration/123' })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({
      success: true,
      iterationId: 'gid://gitlab/Iteration/123',
      metrics: mockMetrics
    });

    expect(mockMetricsService.calculateMetrics).toHaveBeenCalledWith('gid://gitlab/Iteration/123');
  });

  it('should return 400 when iterationId is missing', async () => {
    const response = await request(app)
      .post('/api/metrics/calculate')
      .send({})
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({
      error: 'Bad Request',
      message: 'iterationId is required'
    });

    expect(mockMetricsService.calculateMetrics).not.toHaveBeenCalled();
  });

  it('should return 500 when service throws error', async () => {
    mockMetricsService.calculateMetrics.mockRejectedValue(
      new Error('Failed to fetch iteration data')
    );

    const response = await request(app)
      .post('/api/metrics/calculate')
      .send({ iterationId: 'gid://gitlab/Iteration/999' })
      .expect(500)
      .expect('Content-Type', /json/);

    expect(response.body.error).toBe('Internal server error');
    expect(response.body.message).toBe('Failed to fetch iteration data');
  });
});

describe('GET /health', () => {
  it('should return health status', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/health')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'gitlab-metrics-tracker'
    });
  });
});
