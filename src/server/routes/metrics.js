/**
 * Metrics API routes
 *
 * @module server/routes/metrics
 */

import express from 'express';
import { ServiceFactory } from '../services/ServiceFactory.js';
import { ConsoleLogger } from '../../lib/infrastructure/logging/ConsoleLogger.js';

const router = express.Router();
const logger = new ConsoleLogger({ serviceName: 'metrics-api' });

/**
 * GET /api/metrics/velocity
 * Calculate velocity metrics for one or more iterations
 *
 * Query params:
 *   iterations - Comma-separated iteration IDs (e.g., ?iterations=id1,id2,id3)
 *
 * Response:
 * {
 *   "metrics": [
 *     { "iteration_id": "...", "velocity_points": 42, "velocity_stories": 8 },
 *     ...
 *   ],
 *   "count": 2
 * }
 */
router.get('/velocity', async (req, res) => {
  try {
    // Validate query params
    const { iterations } = req.query;

    if (!iterations) {
      return res.status(400).json({
        error: {
          message: 'Missing required parameter: iterations',
          details: 'Provide comma-separated iteration IDs in query string (e.g., ?iterations=id1,id2)'
        }
      });
    }

    // Parse comma-separated iteration IDs
    const iterationIds = iterations.split(',').map(id => id.trim());

    // Create service (will use environment variables)
    const metricsService = ServiceFactory.createMetricsService();

    // Calculate metrics for all iterations using BATCH method (performance optimization)
    // This fetches iteration metadata ONCE and parallelizes issue fetching
    const allMetrics = await metricsService.calculateMultipleMetrics(iterationIds);

    // Transform results to response format
    const metricsResults = allMetrics.map(metrics => ({
      iterationId: metrics.iterationId,
      iterationTitle: metrics.iterationTitle,
      startDate: metrics.startDate,
      dueDate: metrics.endDate,
      totalPoints: metrics.velocityPoints + (metrics.rawData?.issues.filter(i => i.state !== 'closed').reduce((sum, i) => sum + (i.weight || 1), 0) || 0),
      completedPoints: metrics.velocityPoints,
      totalStories: metrics.issueCount,
      completedStories: metrics.velocityStories,
      rawData: metrics.rawData  // Include raw data for Data Explorer
    }));

    // Return results
    res.json({
      metrics: metricsResults,
      count: metricsResults.length
    });

  } catch (error) {
    // Log error for debugging (structured logging)
    logger.error('Failed to calculate velocity metrics', error, {
      route: '/api/metrics/velocity',
      iterations: req.query.iterations
    });

    // Return user-friendly error
    res.status(500).json({
      error: {
        message: 'Failed to calculate velocity metrics',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/metrics/cycle-time
 * Calculate cycle time metrics for one or more iterations
 *
 * Query params:
 *   iterations - Comma-separated iteration IDs (e.g., ?iterations=id1,id2,id3)
 *
 * Response:
 * {
 *   "metrics": [
 *     { "iterationId": "...", "cycleTimeAvg": 3.5, "cycleTimeP50": 3.0, "cycleTimeP90": 5.2 },
 *     ...
 *   ],
 *   "count": 2
 * }
 */
router.get('/cycle-time', async (req, res) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.debug('Cycle time request received', {
      requestId,
      query: req.query,
      url: req.url
    });

    // Validate query params
    const { iterations } = req.query;

    if (!iterations) {
      logger.warn('Missing iterations parameter', {
        requestId,
        route: '/api/metrics/cycle-time'
      });
      return res.status(400).json({
        error: {
          message: 'Missing required parameter: iterations',
          details: 'Provide comma-separated iteration IDs in query string (e.g., ?iterations=id1,id2)'
        }
      });
    }

    // Parse comma-separated iteration IDs
    const iterationIds = iterations.split(',').map(id => id.trim());
    logger.debug('Parsed iteration IDs', {
      requestId,
      count: iterationIds.length,
      iterationIds
    });

    // Create service (will use environment variables)
    logger.debug('Creating MetricsService', { requestId });
    const metricsService = ServiceFactory.createMetricsService();

    // Calculate metrics for all iterations using BATCH method (performance optimization)
    // This fetches iteration metadata ONCE and parallelizes issue fetching
    logger.debug('Calling calculateMultipleMetrics', { requestId });
    const allMetrics = await metricsService.calculateMultipleMetrics(iterationIds);
    logger.debug('Received metric results', {
      requestId,
      count: allMetrics.length
    });

    // Transform results to response format
    // Note: Cycle time is already calculated in MetricsService.calculateMultipleMetrics()
    const metricsResults = allMetrics.map(metrics => ({
      iterationId: metrics.iterationId,
      iterationTitle: metrics.iterationTitle,
      startDate: metrics.startDate,
      dueDate: metrics.endDate,
      cycleTimeAvg: metrics.cycleTimeAvg,
      cycleTimeP50: metrics.cycleTimeP50,
      cycleTimeP90: metrics.cycleTimeP90
    }));

    logger.debug('Sending cycle time response', {
      requestId,
      count: metricsResults.length,
      sampleMetric: metricsResults[0]
    });

    // Return results
    res.json({
      metrics: metricsResults,
      count: metricsResults.length
    });

  } catch (error) {
    // Log error for debugging (structured logging)
    logger.error('Failed to calculate cycle time metrics', error, {
      requestId,
      route: '/api/metrics/cycle-time',
      iterations: req.query.iterations
    });

    // Return user-friendly error
    res.status(500).json({
      error: {
        message: 'Failed to calculate cycle time metrics',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/metrics/deployment-frequency
 * Calculate deployment frequency metrics (DORA) for one or more iterations
 *
 * Query params:
 *   iterations - Comma-separated iteration IDs (e.g., ?iterations=id1,id2,id3)
 *
 * Response:
 * {
 *   "metrics": [
 *     { "iterationId": "...", "deploymentFrequency": 1.5, "deployments": 21, "sprintDays": 14 },
 *     ...
 *   ],
 *   "count": 2
 * }
 */
router.get('/deployment-frequency', async (req, res) => {
  try {
    // Validate query params
    const { iterations } = req.query;

    if (!iterations) {
      return res.status(400).json({
        error: {
          message: 'Missing required parameter: iterations',
          details: 'Provide comma-separated iteration IDs in query string (e.g., ?iterations=id1,id2)'
        }
      });
    }

    // Parse comma-separated iteration IDs
    const iterationIds = iterations.split(',').map(id => id.trim());

    // Create service
    const metricsService = ServiceFactory.createMetricsService();

    // Calculate metrics for all iterations using BATCH method
    const allMetrics = await metricsService.calculateMultipleMetrics(iterationIds);

    // Transform results to response format
    const metricsResults = allMetrics.map(metrics => ({
      iterationId: metrics.iterationId,
      iterationTitle: metrics.iterationTitle,
      startDate: metrics.startDate,
      dueDate: metrics.endDate,
      deploymentFrequency: metrics.deploymentFrequency,
      rawData: metrics.rawData  // Include raw data for Data Explorer
    }));

    // Return results
    res.json({
      metrics: metricsResults,
      count: metricsResults.length
    });

  } catch (error) {
    // Log error for debugging
    logger.error('Failed to calculate deployment frequency metrics', error, {
      route: '/api/metrics/deployment-frequency',
      iterations: req.query.iterations
    });

    // Return user-friendly error
    res.status(500).json({
      error: {
        message: 'Failed to calculate deployment frequency metrics',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/metrics/lead-time
 * Calculate lead time metrics (DORA) for one or more iterations
 *
 * Query params:
 *   iterations - Comma-separated iteration IDs (e.g., ?iterations=id1,id2,id3)
 *
 * Response:
 * {
 *   "metrics": [
 *     { "iterationId": "...", "leadTimeAvg": 2.5, "leadTimeP50": 2.0, "leadTimeP90": 4.0 },
 *     ...
 *   ],
 *   "count": 2
 * }
 */
router.get('/lead-time', async (req, res) => {
  try {
    // Validate query params
    const { iterations } = req.query;

    if (!iterations) {
      return res.status(400).json({
        error: {
          message: 'Missing required parameter: iterations',
          details: 'Provide comma-separated iteration IDs in query string (e.g., ?iterations=id1,id2)'
        }
      });
    }

    // Parse comma-separated iteration IDs
    const iterationIds = iterations.split(',').map(id => id.trim());

    // Create service
    const metricsService = ServiceFactory.createMetricsService();

    // Calculate metrics for all iterations using BATCH method
    const allMetrics = await metricsService.calculateMultipleMetrics(iterationIds);

    // Transform results to response format
    const metricsResults = allMetrics.map(metrics => ({
      iterationId: metrics.iterationId,
      iterationTitle: metrics.iterationTitle,
      startDate: metrics.startDate,
      dueDate: metrics.endDate,
      leadTimeAvg: metrics.leadTimeAvg,
      leadTimeP50: metrics.leadTimeP50,
      leadTimeP90: metrics.leadTimeP90,
      rawData: metrics.rawData  // Include raw data for Data Explorer
    }));

    // Return results
    res.json({
      metrics: metricsResults,
      count: metricsResults.length
    });

  } catch (error) {
    // Log error for debugging
    logger.error('Failed to calculate lead time metrics', error, {
      route: '/api/metrics/lead-time',
      iterations: req.query.iterations
    });

    // Return user-friendly error
    res.status(500).json({
      error: {
        message: 'Failed to calculate lead time metrics',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/metrics/mttr
 * Calculate MTTR (Mean Time To Recovery) metrics for one or more iterations
 *
 * Query params:
 *   iterations - Comma-separated iteration IDs (e.g., ?iterations=id1,id2,id3)
 *
 * Response:
 * {
 *   "metrics": [
 *     { "iterationId": "...", "mttrAvg": 24.5, "incidentCount": 3 },
 *     ...
 *   ],
 *   "count": 2
 * }
 */
router.get('/mttr', async (req, res) => {
  try {
    // Validate query params
    const { iterations } = req.query;

    if (!iterations) {
      return res.status(400).json({
        error: {
          message: 'Missing required parameter: iterations',
          details: 'Provide comma-separated iteration IDs in query string (e.g., ?iterations=id1,id2)'
        }
      });
    }

    // Parse comma-separated iteration IDs
    const iterationIds = iterations.split(',').map(id => id.trim());

    // Create service
    const metricsService = ServiceFactory.createMetricsService();

    // Calculate metrics for all iterations using BATCH method
    const allMetrics = await metricsService.calculateMultipleMetrics(iterationIds);

    // Transform results to response format
    const metricsResults = allMetrics.map(metrics => ({
      iterationId: metrics.iterationId,
      iterationTitle: metrics.iterationTitle,
      startDate: metrics.startDate,
      dueDate: metrics.endDate,
      mttrAvg: metrics.mttrAvg,
      incidentCount: metrics.incidentCount,
      rawData: metrics.rawData  // Include raw data for Data Explorer
    }));

    // Return results
    res.json({
      metrics: metricsResults,
      count: metricsResults.length
    });

  } catch (error) {
    // Log error for debugging
    logger.error('Failed to calculate MTTR metrics', error, {
      route: '/api/metrics/mttr',
      iterations: req.query.iterations
    });

    // Return user-friendly error
    res.status(500).json({
      error: {
        message: 'Failed to calculate MTTR metrics',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/metrics/change-failure-rate
 * Calculate change failure rate (CFR) for one or more iterations
 *
 * Query params:
 *   iterations - Comma-separated iteration IDs (e.g., ?iterations=id1,id2,id3)
 *
 * Response:
 * {
 *   "metrics": [
 *     {
 *       "iterationId": "...",
 *       "iterationTitle": "Sprint 1",
 *       "startDate": "2025-01-01",
 *       "dueDate": "2025-01-14",
 *       "changeFailureRate": 25.5,
 *       "deploymentCount": 10,
 *       "incidentCount": 2
 *     },
 *     ...
 *   ],
 *   "count": 2
 * }
 */
router.get('/change-failure-rate', async (req, res) => {
  try {
    // Validate query params
    const { iterations } = req.query;

    if (!iterations) {
      return res.status(400).json({
        error: {
          message: 'Missing required parameter: iterations',
          details: 'Provide comma-separated iteration IDs in query string (e.g., ?iterations=id1,id2)'
        }
      });
    }

    // Parse comma-separated iteration IDs
    const iterationIds = iterations.split(',').map(id => id.trim());

    // Create service (will use environment variables)
    const metricsService = ServiceFactory.createMetricsService();

    // Calculate metrics for all iterations using BATCH method
    const allMetrics = await metricsService.calculateMultipleMetrics(iterationIds);

    // Transform results to response format
    const metricsResults = allMetrics.map(metrics => ({
      iterationId: metrics.iterationId,
      iterationTitle: metrics.iterationTitle,
      startDate: metrics.startDate,
      dueDate: metrics.endDate,
      changeFailureRate: metrics.changeFailureRate,
      deploymentCount: metrics.deploymentCount,
      incidentCount: metrics.incidentCount
    }));

    // Return results
    res.json({
      metrics: metricsResults,
      count: metricsResults.length
    });

  } catch (error) {
    // Log error for debugging
    logger.error('Failed to calculate change failure rate metrics', error, {
      route: '/api/metrics/change-failure-rate',
      iterations: req.query.iterations
    });

    // Return user-friendly error
    res.status(500).json({
      error: {
        message: 'Failed to calculate change failure rate metrics',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/metrics/calculate
 * Calculate metrics for a given iteration
 *
 * Request body:
 * {
 *   "iterationId": "gid://gitlab/Iteration/123"
 * }
 *
 * Response:
 * {
 *   "velocityPoints": 42,
 *   "velocityStories": 5,
 *   ...
 * }
 */
router.post('/calculate', async (req, res, next) => {
  try {
    // Validate request body
    const { iterationId } = req.body;

    if (!iterationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'iterationId is required'
      });
    }

    // Create service (will use environment variables)
    const metricsService = ServiceFactory.createMetricsService();

    // Calculate metrics
    const metrics = await metricsService.calculateMetrics(iterationId);

    // Return results
    res.json({
      success: true,
      iterationId,
      metrics
    });

  } catch (error) {
    // Pass to error handler
    next(error);
  }
});

export default router;
