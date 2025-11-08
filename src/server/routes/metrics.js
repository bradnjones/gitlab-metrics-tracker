/**
 * Metrics API routes
 *
 * @module server/routes/metrics
 */

import express from 'express';
import { ServiceFactory } from '../services/ServiceFactory.js';

const router = express.Router();

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

    // Calculate metrics for each iteration
    const metricsResults = [];

    for (const iterationId of iterationIds) {
      const metrics = await metricsService.calculateMetrics(iterationId);

      metricsResults.push({
        iterationId: metrics.iterationId,
        iterationTitle: metrics.iterationTitle,
        startDate: metrics.startDate,
        dueDate: metrics.endDate,
        totalPoints: metrics.velocityPoints + (metrics.rawData?.issues.filter(i => i.state !== 'closed').reduce((sum, i) => sum + (i.weight || 1), 0) || 0),
        completedPoints: metrics.velocityPoints,
        totalStories: metrics.issueCount,
        completedStories: metrics.velocityStories
      });
    }

    // Return results
    res.json({
      metrics: metricsResults,
      count: metricsResults.length
    });

  } catch (error) {
    // Log error for debugging
    console.error('Failed to calculate velocity metrics:', error.message);

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
