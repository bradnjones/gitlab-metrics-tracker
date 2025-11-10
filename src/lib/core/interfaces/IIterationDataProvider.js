/**
 * Interface for fetching iteration data
 * Core layer defines the contract, Infrastructure implements it
 *
 * @module core/interfaces/IIterationDataProvider
 */

/**
 * Iteration data structure returned by providers
 * @typedef {Object} IterationData
 * @property {Array<Object>} issues - Array of issue objects from the iteration
 * @property {Array<Object>} mergeRequests - Array of merge request objects
 * @property {Array<Object>} pipelines - Array of pipeline/deployment objects
 * @property {Array<Object>} incidents - Array of incident objects
 * @property {Object} iteration - Iteration metadata (id, title, dates)
 */

/**
 * IIterationDataProvider interface
 * Abstraction for fetching sprint/iteration data from external systems
 *
 * Following the Dependency Inversion Principle:
 * - Core layer (MetricsService) depends on this interface
 * - Infrastructure layer (GitLabIterationDataProvider) implements this interface
 * - Dependencies point INWARD (Infrastructure → Core)
 */
export class IIterationDataProvider {
  /**
   * Fetch all data for a given iteration
   *
   * @param {string} iterationId - Iteration identifier (e.g., 'gid://gitlab/Iteration/123')
   * @returns {Promise<IterationData>} Complete iteration data with issues, MRs, pipelines, incidents
   * @throws {Error} If fetch fails or iteration not found
   *
   * @example
   * const data = await provider.fetchIterationData('gid://gitlab/Iteration/123');
   * // {
   * //   issues: [...],
   * //   mergeRequests: [...],
   * //   pipelines: [...],
   * //   incidents: [...],
   * //   iteration: { id, title, startDate, endDate }
   * // }
   */
  async fetchIterationData(iterationId) {
    throw new Error('IIterationDataProvider.fetchIterationData() must be implemented by subclass');
  }

  /**
   * Fetch data for multiple iterations efficiently in a single batch
   * Optimized for performance by fetching iteration metadata once and parallelizing details fetching
   *
   * @param {Array<string>} iterationIds - Array of iteration identifiers
   * @returns {Promise<Array<IterationData>>} Array of iteration data objects in same order as input
   * @throws {Error} If fetch fails for any iteration or iteration not found
   *
   * @example
   * const data = await provider.fetchMultipleIterations([
   *   'gid://gitlab/Iteration/123',
   *   'gid://gitlab/Iteration/124'
   * ]);
   * // [
   * //   { issues: [...], mergeRequests: [...], iteration: {...} },
   * //   { issues: [...], mergeRequests: [...], iteration: {...} }
   * // ]
   */
  async fetchMultipleIterations(iterationIds) {
    throw new Error('IIterationDataProvider.fetchMultipleIterations() must be implemented by subclass');
  }
}
