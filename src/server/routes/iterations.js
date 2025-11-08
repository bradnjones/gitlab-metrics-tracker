/**
 * Iterations API routes
 * Handles fetching iteration (sprint) data from GitLab
 *
 * @module server/routes/iterations
 */

import express from 'express';
import { ServiceFactory } from '../services/ServiceFactory.js';

const router = express.Router();

/**
 * GET /api/iterations
 * Fetches all available iterations from GitLab
 *
 * @returns {Object} { iterations: Array, count: number }
 */
router.get('/', async (req, res) => {
  try {
    // Create GitLab client
    const gitlabClient = ServiceFactory.createGitLabClient();

    // Fetch iterations from GitLab
    const iterations = await gitlabClient.fetchIterations();

    // Return iterations with count
    res.json({
      iterations,
      count: iterations.length
    });
  } catch (error) {
    // Log error for debugging
    console.error('Failed to fetch iterations:', error.message);

    // Return user-friendly error
    res.status(500).json({
      error: {
        message: 'Failed to fetch iterations',
        details: error.message
      }
    });
  }
});

export default router;
