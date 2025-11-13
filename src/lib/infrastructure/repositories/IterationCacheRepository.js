/**
 * File-based cache repository for GitLab iteration data.
 *
 * Storage strategy:
 * - Directory: src/data/cache/iterations/
 * - File naming: {sanitized-iterationId}.json
 * - Format: { version: '1.0', iterationId, lastFetched, data }
 *
 * @implements {IIterationCacheRepository}
 * @module infrastructure/repositories/IterationCacheRepository
 */

import { IIterationCacheRepository } from '../../core/interfaces/IIterationCacheRepository.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * IterationCacheRepository
 * Concrete implementation of IIterationCacheRepository using file system storage
 *
 * Clean Architecture:
 * - Implements IIterationCacheRepository (Core interface)
 * - Lives in Infrastructure layer (file I/O concern)
 * - Dependency: Infrastructure → Core (correct direction)
 */
export class IterationCacheRepository extends IIterationCacheRepository {
  /**
   * Create an IterationCacheRepository instance
   *
   * @param {string} [cacheDir='./src/data/cache/iterations'] - Base directory for cache files
   * @param {number} [cacheTTL=6] - Time-to-live for cache entries in hours (0 = disabled)
   * @throws {Error} If cacheTTL is negative
   */
  constructor(cacheDir = './src/data/cache/iterations', cacheTTL = 6) {
    super();
    this.cacheDir = path.resolve(cacheDir);
    this.cacheTTL = cacheTTL;
  }

  /**
   * Ensure cache directory exists (lazy creation)
   *
   * @private
   * @returns {Promise<void>}
   */
  async _ensureDirectoryExists() {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  /**
   * Retrieve cached iteration data by iteration ID.
   *
   * @param {string} iterationId - GitLab iteration ID
   * @returns {Promise<Object|null>} Cached iteration data or null if not found/expired
   * @throws {Error} If cache is corrupted
   */
  async get(iterationId) {
    const filePath = this._getFilePath(iterationId);

    try {
      // Check if file exists
      await fs.access(filePath);

      // Read and parse cache file
      const content = await fs.readFile(filePath, 'utf-8');
      const cached = JSON.parse(content);

      // TTL validation (skip if TTL disabled with 0)
      if (this.cacheTTL > 0) {
        // Validate lastFetched exists and is valid
        const lastFetched = new Date(cached.lastFetched);
        if (isNaN(lastFetched.getTime())) {
          // Invalid timestamp - treat as expired
          return null;
        }

        // Calculate cache age in milliseconds
        const age = Date.now() - lastFetched.getTime();
        const ttlMs = this.cacheTTL * 3600 * 1000; // Convert hours to milliseconds

        if (age > ttlMs) {
          // Cache expired
          return null;
        }
      }

      // Return the data portion (valid cache or TTL disabled)
      return cached.data;
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist - cache miss (not an error)
        return null;
      }

      if (err instanceof SyntaxError) {
        // JSON parse error - corrupted cache
        throw new Error(`Cache file corrupted for iteration ${iterationId}: ${err.message}`);
      }

      // Other errors (permission, etc.)
      throw err;
    }
  }

  /**
   * Store iteration data in cache.
   *
   * @param {string} iterationId - GitLab iteration ID
   * @param {Object} data - Iteration data to cache
   * @param {number} [ttl] - Optional time-to-live in milliseconds (not used in V9.1)
   * @returns {Promise<void>}
   */
  async set(iterationId, data, ttl) {
    // Ensure cache directory exists
    await this._ensureDirectoryExists();

    // Get safe file path
    const filePath = this._getFilePath(iterationId);

    // Create cache entry with metadata
    const cacheEntry = {
      version: '1.0',
      iterationId,
      lastFetched: new Date().toISOString(),
      data
    };

    // Write to file
    await fs.writeFile(filePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
  }

  /**
   * Check if iteration data exists in cache (and is valid/not expired).
   *
   * @param {string} iterationId - GitLab iteration ID
   * @returns {Promise<boolean>} True if cached and valid
   */
  async has(iterationId) {
    const cached = await this.get(iterationId);
    return cached !== null;
  }

  /**
   * Remove specific iteration from cache.
   *
   * @param {string} iterationId - GitLab iteration ID
   * @returns {Promise<void>}
   */
  async clear(iterationId) {
    const filePath = this._getFilePath(iterationId);

    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        // Re-throw if not "file not found"
        throw err;
      }
      // Silently ignore if file doesn't exist
    }
  }

  /**
   * Remove all cached iterations.
   *
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      await Promise.all(
        jsonFiles.map(f => fs.unlink(path.join(this.cacheDir, f)))
      );
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      // Silently ignore if directory doesn't exist
    }
  }

  /**
   * Get file path for iteration cache (with sanitization).
   *
   * Security: Prevents path traversal attacks by sanitizing iteration IDs
   *
   * @private
   * @param {string} iterationId - GitLab iteration ID
   * @returns {string} Absolute file path
   */
  _getFilePath(iterationId) {
    // Sanitize iteration ID to create safe filename
    // Replace special characters (:/\, etc.) with dashes
    const sanitized = iterationId.replace(/[^a-zA-Z0-9-_]/g, '-');

    // Create absolute path within cache directory
    const filePath = path.join(this.cacheDir, `${sanitized}.json`);

    // Security check: ensure path stays within cache directory
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(this.cacheDir)) {
      throw new Error(`Invalid iteration ID: path traversal detected`);
    }

    return resolvedPath;
  }
}
