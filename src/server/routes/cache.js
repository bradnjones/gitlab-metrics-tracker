/**
 * Cache management API routes
 * Handles manual cache clearing operations
 *
 * @module server/routes/cache
 */

import express from 'express';
import { ServiceFactory } from '../services/ServiceFactory.js';

const router = express.Router();

/**
 * DELETE /api/cache
 * Clears all cached iteration data
 *
 * @returns {204} No Content on success
 * @returns {500} Internal Server Error on failure
 */
router.delete('/', async (req, res) => {
  try {
    // Get cache repository from ServiceFactory
    const cacheRepository = ServiceFactory.createIterationCacheRepository();

    // Clear all cache files
    await cacheRepository.clearAll();

    // Return 204 No Content (success, no body)
    res.status(204).end();
  } catch (error) {
    console.error('Failed to clear cache:', error.message);

    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

export default router;
