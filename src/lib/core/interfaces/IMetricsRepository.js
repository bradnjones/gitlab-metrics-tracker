/**
 * Repository interface for metrics persistence
 * Infrastructure layer must implement this contract
 *
 * @module core/interfaces/IMetricsRepository
 */

/**
 * IMetricsRepository interface
 * Defines the contract for metrics data persistence
 * Implementation lives in Infrastructure layer (e.g., FileMetricsRepository)
 */
export class IMetricsRepository {
  /**
   * Save or update metrics data
   *
   * @param {import('../entities/Metric.js').Metric} metric - Metric entity to persist
   * @returns {Promise<void>}
   * @throws {Error} If save operation fails
   */
  async save(metric) {
    throw new Error('IMetricsRepository.save() must be implemented');
  }

  /**
   * Find metrics by unique identifier
   *
   * @param {string} id - Metric identifier
   * @returns {Promise<import('../entities/Metric.js').Metric|null>} Metric entity or null if not found
   * @throws {Error} If find operation fails
   */
  async findById(id) {
    throw new Error('IMetricsRepository.findById() must be implemented');
  }

  /**
   * Find metrics by iteration ID
   *
   * @param {string} iterationId - GitLab iteration identifier
   * @returns {Promise<import('../entities/Metric.js').Metric|null>} Metric entity or null if not found
   * @throws {Error} If find operation fails
   */
  async findByIterationId(iterationId) {
    throw new Error('IMetricsRepository.findByIterationId() must be implemented');
  }

  /**
   * Find metrics within a date range
   *
   * @param {string} startDate - ISO 8601 start date (inclusive)
   * @param {string} endDate - ISO 8601 end date (inclusive)
   * @returns {Promise<Array<import('../entities/Metric.js').Metric>>} Array of metric entities
   * @throws {Error} If find operation fails
   */
  async findByDateRange(startDate, endDate) {
    throw new Error('IMetricsRepository.findByDateRange() must be implemented');
  }

  /**
   * Find all metrics
   *
   * @returns {Promise<Array<import('../entities/Metric.js').Metric>>} Array of all metric entities
   * @throws {Error} If find operation fails
   */
  async findAll() {
    throw new Error('IMetricsRepository.findAll() must be implemented');
  }

  /**
   * Delete metrics by unique identifier
   *
   * @param {string} id - Metric identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   * @throws {Error} If delete operation fails
   */
  async delete(id) {
    throw new Error('IMetricsRepository.delete() must be implemented');
  }

  /**
   * Delete all metrics (use with caution)
   *
   * @returns {Promise<number>} Number of records deleted
   * @throws {Error} If delete operation fails
   */
  async deleteAll() {
    throw new Error('IMetricsRepository.deleteAll() must be implemented');
  }
}
