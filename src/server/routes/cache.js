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
 * GET /api/cache/status
 * Returns cache status metadata for all cached iterations
 *
 * @returns {200} Cache status with metadata
 * @returns {500} Internal Server Error on failure
 */
router.get('/status', async (req, res) => {
  try {
    // Get cache repository from ServiceFactory
    const cacheRepository = ServiceFactory.createIterationCacheRepository();

    // Get all cache metadata
    const metadata = await cacheRepository.getAllMetadata();

    // Calculate status for each iteration
    const iterations = metadata.map((item) => {
      const lastFetched = new Date(item.lastFetched);
      const ageMs = Date.now() - lastFetched.getTime();
      const ageHours = ageMs / (3600 * 1000);

      // Determine status based on age
      let status;
      if (ageHours < 1) {
        status = 'fresh';
      } else if (ageHours < cacheRepository.cacheTTL) {
        status = 'aging';
      } else {
        status = 'stale';
      }

      return {
        iterationId: item.iterationId,
        lastFetched: item.lastFetched,
        ageHours: parseFloat(ageHours.toFixed(2)),
        status,
        fileSize: item.fileSize,
      };
    });

    // Calculate global last updated (most recent timestamp)
    let globalLastUpdated = null;
    if (iterations.length > 0) {
      const mostRecent = iterations.reduce((latest, current) => {
        return new Date(current.lastFetched) > new Date(latest.lastFetched) ? current : latest;
      });
      globalLastUpdated = mostRecent.lastFetched;
    }

    // Return cache status
    res.status(200).json({
      cacheTTL: cacheRepository.cacheTTL,
      totalCachedIterations: iterations.length,
      globalLastUpdated,
      iterations,
    });
  } catch (error) {
    console.error('Failed to get cache status:', error.message);

    res.status(500).json({
      error: 'Failed to get cache status',
      message: error.message
    });
  }
});

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
