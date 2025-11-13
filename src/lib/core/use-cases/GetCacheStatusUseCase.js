/**
 * Use Case: Get Cache Status
 * Returns cache status with age calculations and status determination
 *
 * Business Logic:
 * - Calculate cache age for each iteration
 * - Determine status based on age and TTL
 * - Calculate global last updated timestamp
 * - Aggregate cache metadata
 *
 * Status Rules:
 * - fresh: ageHours < 1
 * - aging: 1 <= ageHours < cacheTTL
 * - stale: ageHours >= cacheTTL
 *
 * Clean Architecture:
 * - Lives in Core layer (business rules)
 * - Depends only on Core interfaces (IIterationCacheRepository)
 * - No dependencies on Infrastructure or Presentation layers
 *
 * @module core/use-cases/GetCacheStatusUseCase
 */

/**
 * GetCacheStatusUseCase
 * Encapsulates the business logic for retrieving cache status
 */
export class GetCacheStatusUseCase {
  /**
   * Create a GetCacheStatusUseCase instance
   *
   * @param {IIterationCacheRepository} cacheRepository - Cache repository implementation
   */
  constructor(cacheRepository) {
    if (!cacheRepository) {
      throw new Error('cacheRepository is required');
    }
    this.cacheRepository = cacheRepository;
  }

  /**
   * Execute use case
   * Returns cache status with metadata and status indicators
   *
   * @returns {Promise<Object>} Cache status object
   * @returns {number} return.cacheTTL - Cache time-to-live in hours
   * @returns {number} return.totalCachedIterations - Total number of cached iterations
   * @returns {string|null} return.globalLastUpdated - Most recent cache timestamp (ISO 8601)
   * @returns {Array} return.iterations - Array of iteration metadata with status
   */
  async execute() {
    // Get all cache metadata from repository
    const metadata = await this.cacheRepository.getAllMetadata();
    const cacheTTL = this.cacheRepository.cacheTTL;

    // Business logic: Calculate status for each iteration
    const iterations = metadata.map((item) => {
      return this._calculateIterationStatus(item, cacheTTL);
    });

    // Business logic: Calculate global last updated (most recent timestamp)
    const globalLastUpdated = this._calculateGlobalLastUpdated(iterations);

    // Return cache status aggregate
    return {
      cacheTTL,
      totalCachedIterations: iterations.length,
      globalLastUpdated,
      iterations,
    };
  }

  /**
   * Calculate status for a single iteration
   * Encapsulates the business rule for status determination
   *
   * @private
   * @param {Object} metadata - Iteration cache metadata
   * @param {string} metadata.iterationId - Iteration ID
   * @param {string} metadata.lastFetched - ISO 8601 timestamp
   * @param {number} metadata.fileSize - Cache file size in bytes
   * @param {number} cacheTTL - Cache time-to-live in hours
   * @returns {Object} Iteration with calculated status
   */
  _calculateIterationStatus(metadata, cacheTTL) {
    const lastFetched = new Date(metadata.lastFetched);
    const ageMs = Date.now() - lastFetched.getTime();
    const ageHours = ageMs / (3600 * 1000);

    // Business rule: Status determination based on age
    let status;
    if (ageHours < 1) {
      status = 'fresh';
    } else if (ageHours < cacheTTL) {
      status = 'aging';
    } else {
      status = 'stale';
    }

    return {
      iterationId: metadata.iterationId,
      lastFetched: metadata.lastFetched,
      ageHours: parseFloat(ageHours.toFixed(2)),
      status,
      fileSize: metadata.fileSize,
    };
  }

  /**
   * Calculate global last updated timestamp
   * Returns the most recent cache timestamp across all iterations
   *
   * @private
   * @param {Array} iterations - Array of iterations with lastFetched timestamps
   * @returns {string|null} Most recent timestamp (ISO 8601) or null if no iterations
   */
  _calculateGlobalLastUpdated(iterations) {
    if (iterations.length === 0) {
      return null;
    }

    const mostRecent = iterations.reduce((latest, current) => {
      return new Date(current.lastFetched) > new Date(latest.lastFetched)
        ? current
        : latest;
    });

    return mostRecent.lastFetched;
  }
}
