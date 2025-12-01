/**
 * Cache management API routes
 * Handles manual cache clearing operations
 *
 * @module server/routes/cache
 */

import express from 'express';
import { ServiceFactory } from '../services/ServiceFactory.js';
import { ConsoleLogger } from '../../lib/infrastructure/logging/ConsoleLogger.js';

const router = express.Router();

// Logger instance for cache API
const logger = new ConsoleLogger({ serviceName: 'cache-api' });

/**
 * GET /api/cache/status
 * Returns cache status metadata for all cached iterations
 *
 * @returns {200} Cache status with metadata
 * @returns {500} Internal Server Error on failure
 */
router.get('/status', async (req, res) => {
  try {
    // Get use case from ServiceFactory (dependency injection)
    const useCase = ServiceFactory.createGetCacheStatusUseCase();

    // Execute use case (business logic)
    const status = await useCase.execute();

    // Return result (HTTP concern only)
    res.status(200).json(status);
  } catch (error) {
    logger.error('Failed to get cache status', error, {
      route: 'GET /api/cache/status'
    });

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
    logger.error('Failed to clear cache', error, {
      route: 'DELETE /api/cache'
    });

    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

export default router;
