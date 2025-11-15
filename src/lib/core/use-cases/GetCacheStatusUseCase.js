/**
 * Use Case: Get Cache Status
 * Returns cache status with age calculations and status determination
 *
 * Business Logic:
 * - Calculate cache age for each iteration
 * - Determine status based on age and TTL
 * - Calculate aggregate status (priority: stale > aging > fresh)
 * - Return timestamp matching aggregate status (not most recent)
 *
 * Status Rules:
 * - fresh: ageHours < 1
 * - aging: 1 <= ageHours < cacheTTL
 * - stale: ageHours >= cacheTTL
 *
 * Timestamp Selection (globalLastUpdated):
 * - If stale: oldest stale iteration's timestamp (most concerning)
 * - If aging: oldest aging iteration's timestamp
 * - If fresh: most recent fresh iteration's timestamp
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
   * @returns {string|null} return.globalLastUpdated - Timestamp matching aggregate status (ISO 8601)
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

    // Business logic: Calculate aggregate status and matching timestamp
    const aggregateStatus = this._calculateAggregateStatus(iterations);
    const globalLastUpdated = this._calculateRelevantTimestamp(iterations, aggregateStatus);

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
   * Calculate aggregate status from iterations
   * Priority: stale > aging > fresh > none
   *
   * @private
   * @param {Array} iterations - Array of iterations with status
   * @returns {string} Aggregate status ('stale', 'aging', 'fresh', or 'none')
   */
  _calculateAggregateStatus(iterations) {
    if (!iterations || iterations.length === 0) {
      return 'none';
    }

    // Check for stale (highest priority)
    if (iterations.some(item => item.status === 'stale')) {
      return 'stale';
    }

    // Check for aging (medium priority)
    if (iterations.some(item => item.status === 'aging')) {
      return 'aging';
    }

    // All fresh (lowest priority)
    return 'fresh';
  }

  /**
   * Calculate timestamp that corresponds to the aggregate status
   * - If stale: return oldest stale iteration's timestamp
   * - If aging: return oldest aging iteration's timestamp
   * - If fresh: return most recent fresh iteration's timestamp
   *
   * @private
   * @param {Array} iterations - Array of iterations with lastFetched timestamps
   * @param {string} aggregateStatus - Aggregate status ('stale', 'aging', 'fresh', or 'none')
   * @returns {string|null} Relevant timestamp (ISO 8601) or null if no iterations
   */
  _calculateRelevantTimestamp(iterations, aggregateStatus) {
    if (iterations.length === 0) {
      return null;
    }

    // Filter iterations by the aggregate status
    const relevantIterations = iterations.filter(item => item.status === aggregateStatus);

    if (relevantIterations.length === 0) {
      return null;
    }

    // For stale/aging: return the OLDEST timestamp (most concerning)
    // For fresh: return the NEWEST timestamp (most recent)
    let selected;
    if (aggregateStatus === 'stale' || aggregateStatus === 'aging') {
      // Find oldest (earliest timestamp)
      selected = relevantIterations.reduce((oldest, current) => {
        return new Date(current.lastFetched) < new Date(oldest.lastFetched)
          ? current
          : oldest;
      });
    } else {
      // Find newest (latest timestamp)
      selected = relevantIterations.reduce((newest, current) => {
        return new Date(current.lastFetched) > new Date(newest.lastFetched)
          ? current
          : newest;
      });
    }

    return selected.lastFetched;
  }
}
