/**
 * Repository interface for caching GitLab iteration data.
 *
 * Implementations should handle:
 * - Persistence strategy (file system, memory, database, etc.)
 * - Serialization/deserialization
 * - Error handling for cache operations
 * - Cache versioning and validation
 *
 * Clean Architecture:
 * - This interface lives in the Core layer (business rules)
 * - Infrastructure layer provides concrete implementations
 * - Adapters depend on this interface, not concrete implementations
 *
 * @interface
 */
export class IIterationCacheRepository {
  /**
   * Retrieve cached iteration data by iteration ID.
   *
   * @param {string} iterationId - GitLab iteration ID (e.g., 'gid://gitlab/Iteration/123')
   * @returns {Promise<Object|null>} Cached iteration data or null if not found/expired
   * @throws {Error} Only if cache corruption prevents operation (not for cache miss)
   */
  async get(iterationId) {
    throw new Error('Method not implemented: get');
  }

  /**
   * Store iteration data in cache.
   *
   * @param {string} iterationId - GitLab iteration ID
   * @param {Object} data - Iteration data to cache
   * @param {number} [ttl] - Optional time-to-live in milliseconds
   * @returns {Promise<void>}
   * @throws {Error} If cache write fails critically
   */
  async set(iterationId, data, ttl) {
    throw new Error('Method not implemented: set');
  }

  /**
   * Check if iteration data exists in cache (and is valid/not expired).
   *
   * @param {string} iterationId - GitLab iteration ID
   * @returns {Promise<boolean>} True if cached and valid
   */
  async has(iterationId) {
    throw new Error('Method not implemented: has');
  }

  /**
   * Remove specific iteration from cache.
   *
   * @param {string} iterationId - GitLab iteration ID
   * @returns {Promise<void>}
   */
  async clear(iterationId) {
    throw new Error('Method not implemented: clear');
  }

  /**
   * Remove all cached iterations.
   *
   * @returns {Promise<void>}
   */
  async clearAll() {
    throw new Error('Method not implemented: clearAll');
  }

  /**
   * Get metadata for all cached iterations.
   * Returns information about each cached iteration without loading the full data.
   * Useful for cache status/management UIs.
   *
   * @returns {Promise<Array<{iterationId: string, lastFetched: string, fileSize: number}>>}
   *   Array of cache metadata objects, or empty array if no cache exists
   */
  async getAllMetadata() {
    throw new Error('Method not implemented: getAllMetadata');
  }
}
