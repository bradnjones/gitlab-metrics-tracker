/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';
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

// Comprehensive tests for all GET metrics routes
describe('Metrics Routes - GET endpoints', () => {
  let app;
  let mockMetricsService;

  const mockMetricsData = [
    {
      iterationId: 'gid://gitlab/Iteration/123',
      iterationTitle: 'Sprint 1',
      startDate: '2025-01-01',
      endDate: '2025-01-14',
      velocityPoints: 42,
      velocityStories: 8,
      cycleTimeAvg: 3.5,
      cycleTimeP50: 3.0,
      cycleTimeP90: 5.0,
      deploymentFrequency: 2.5,
      leadTimeAvg: 2.0,
      leadTimeP50: 1.5,
      leadTimeP90: 3.0,
      mttrAvg: 12.5,
      changeFailureRate: 5.5,
      issueCount: 10,
      rawData: {
        issues: [
          { id: '1', state: 'closed', weight: 5 },
          { id: '2', state: 'opened', weight: 3 }
        ],
        mergeRequests: [],
        incidents: [],
        pipelines: [],
        iteration: { id: 'gid://gitlab/Iteration/123', title: 'Sprint 1' }
      }
    }
  ];

  beforeEach(() => {
    // Create mock MetricsService
    mockMetricsService = {
      calculateMultipleMetrics: jest.fn().mockResolvedValue(mockMetricsData)
    };

    // Mock ServiceFactory
    ServiceFactory.createMetricsService = jest.fn().mockReturnValue(mockMetricsService);

    // Create app
    app = createApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/metrics/velocity', () => {
    it('should return velocity metrics for valid iterations', async () => {
      const response = await request(app)
        .get('/api/metrics/velocity?iterations=gid://gitlab/Iteration/123')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.metrics).toHaveLength(1);
      expect(response.body.metrics[0]).toMatchObject({
        iterationId: 'gid://gitlab/Iteration/123',
        completedPoints: 42,
        completedStories: 8
      });
      expect(response.body.count).toBe(1);
    });

    it('should return 400 when iterations parameter is missing', async () => {
      const response = await request(app)
        .get('/api/metrics/velocity')
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body.error.message).toBe('Missing required parameter: iterations');
    });

    it('should return 500 when service throws error', async () => {
      mockMetricsService.calculateMultipleMetrics.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/api/metrics/velocity?iterations=invalid')
        .expect(500)
        .expect('Content-Type', /json/);

      expect(response.body.error.message).toBe('Failed to calculate velocity metrics');
    });
  });

  describe('GET /api/metrics/cycle-time', () => {
    it('should return cycle time metrics for valid iterations', async () => {
      const response = await request(app)
        .get('/api/metrics/cycle-time?iterations=gid://gitlab/Iteration/123')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.metrics).toHaveLength(1);
      expect(response.body.metrics[0]).toMatchObject({
        iterationId: 'gid://gitlab/Iteration/123',
        cycleTimeAvg: 3.5,
        cycleTimeP50: 3.0,
        cycleTimeP90: 5.0
      });
    });

    it('should return 400 when iterations parameter is missing', async () => {
      const response = await request(app)
        .get('/api/metrics/cycle-time')
        .expect(400);

      expect(response.body.error.message).toBe('Missing required parameter: iterations');
    });

    it('should return 500 when service throws error', async () => {
      mockMetricsService.calculateMultipleMetrics.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/api/metrics/cycle-time?iterations=invalid')
        .expect(500);

      expect(response.body.error.message).toBe('Failed to calculate cycle time metrics');
    });
  });

  describe('GET /api/metrics/deployment-frequency', () => {
    it('should return deployment frequency metrics for valid iterations', async () => {
      const response = await request(app)
        .get('/api/metrics/deployment-frequency?iterations=gid://gitlab/Iteration/123')
        .expect(200);

      expect(response.body.metrics).toHaveLength(1);
      expect(response.body.metrics[0]).toMatchObject({
        iterationId: 'gid://gitlab/Iteration/123',
        deploymentFrequency: 2.5
      });
    });

    it('should return 400 when iterations parameter is missing', async () => {
      const response = await request(app)
        .get('/api/metrics/deployment-frequency')
        .expect(400);

      expect(response.body.error.message).toBe('Missing required parameter: iterations');
    });

    it('should return 500 when service throws error', async () => {
      mockMetricsService.calculateMultipleMetrics.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/api/metrics/deployment-frequency?iterations=invalid')
        .expect(500);

      expect(response.body.error.message).toBe('Failed to calculate deployment frequency metrics');
    });
  });

  describe('GET /api/metrics/lead-time', () => {
    it('should return lead time metrics for valid iterations', async () => {
      const response = await request(app)
        .get('/api/metrics/lead-time?iterations=gid://gitlab/Iteration/123')
        .expect(200);

      expect(response.body.metrics).toHaveLength(1);
      expect(response.body.metrics[0]).toMatchObject({
        iterationId: 'gid://gitlab/Iteration/123',
        leadTimeAvg: 2.0,
        leadTimeP50: 1.5,
        leadTimeP90: 3.0
      });
    });

    it('should return 400 when iterations parameter is missing', async () => {
      const response = await request(app)
        .get('/api/metrics/lead-time')
        .expect(400);

      expect(response.body.error.message).toBe('Missing required parameter: iterations');
    });

    it('should return 500 when service throws error', async () => {
      mockMetricsService.calculateMultipleMetrics.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/api/metrics/lead-time?iterations=invalid')
        .expect(500);

      expect(response.body.error.message).toBe('Failed to calculate lead time metrics');
    });
  });

  describe('GET /api/metrics/mttr', () => {
    it('should return MTTR metrics for valid iterations', async () => {
      const response = await request(app)
        .get('/api/metrics/mttr?iterations=gid://gitlab/Iteration/123')
        .expect(200);

      expect(response.body.metrics).toHaveLength(1);
      expect(response.body.metrics[0]).toMatchObject({
        iterationId: 'gid://gitlab/Iteration/123',
        mttrAvg: 12.5
      });
    });

    it('should return 400 when iterations parameter is missing', async () => {
      const response = await request(app)
        .get('/api/metrics/mttr')
        .expect(400);

      expect(response.body.error.message).toBe('Missing required parameter: iterations');
    });

    it('should return 500 when service throws error', async () => {
      mockMetricsService.calculateMultipleMetrics.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/api/metrics/mttr?iterations=invalid')
        .expect(500);

      expect(response.body.error.message).toBe('Failed to calculate MTTR metrics');
    });
  });

  describe('GET /api/metrics/change-failure-rate', () => {
    it('should return change failure rate metrics for valid iterations', async () => {
      const response = await request(app)
        .get('/api/metrics/change-failure-rate?iterations=gid://gitlab/Iteration/123')
        .expect(200);

      expect(response.body.metrics).toHaveLength(1);
      expect(response.body.metrics[0]).toMatchObject({
        iterationId: 'gid://gitlab/Iteration/123',
        changeFailureRate: 5.5
      });
    });

    it('should return 400 when iterations parameter is missing', async () => {
      const response = await request(app)
        .get('/api/metrics/change-failure-rate')
        .expect(400);

      expect(response.body.error.message).toBe('Missing required parameter: iterations');
    });

    it('should return 500 when service throws error', async () => {
      mockMetricsService.calculateMultipleMetrics.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/api/metrics/change-failure-rate?iterations=invalid')
        .expect(500);

      expect(response.body.error.message).toBe('Failed to calculate change failure rate metrics');
    });
  });

  describe('Multiple iterations', () => {
    it('should handle comma-separated iteration IDs', async () => {
      mockMetricsService.calculateMultipleMetrics.mockResolvedValue([
        mockMetricsData[0],
        { ...mockMetricsData[0], iterationId: 'gid://gitlab/Iteration/124' }
      ]);

      const response = await request(app)
        .get('/api/metrics/velocity?iterations=gid://gitlab/Iteration/123,gid://gitlab/Iteration/124')
        .expect(200);

      expect(response.body.metrics).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(mockMetricsService.calculateMultipleMetrics).toHaveBeenCalledWith([
        'gid://gitlab/Iteration/123',
        'gid://gitlab/Iteration/124'
      ]);
    });
  });
});
