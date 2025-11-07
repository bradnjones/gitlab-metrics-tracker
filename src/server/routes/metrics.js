/**
 * Metrics API routes
 *
 * @module server/routes/metrics
 */

import express from 'express';
import { ServiceFactory } from '../services/ServiceFactory.js';

const router = express.Router();

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
