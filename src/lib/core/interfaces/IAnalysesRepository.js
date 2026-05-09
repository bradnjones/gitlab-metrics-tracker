/**
 * Repository interface for analyses persistence.
 * Infrastructure layer must implement this contract.
 *
 * @module core/interfaces/IAnalysesRepository
 */

/**
 * IAnalysesRepository — abstract port for analysis run persistence.
 */
export class IAnalysesRepository {
  /**
   * Persist an analysis (insert or overwrite by id).
   *
   * @param {import('../entities/Analysis.js').Analysis} analysis
   * @returns {Promise<void>}
   */
  async save(analysis) {
    throw new Error('IAnalysesRepository.save() must be implemented');
  }

  /**
   * Find a single analysis by id.
   *
   * @param {string} id
   * @returns {Promise<import('../entities/Analysis.js').Analysis|null>}
   */
  async findById(id) {
    throw new Error('IAnalysesRepository.findById() must be implemented');
  }

  /**
   * Return all analyses sorted by createdAt descending (newest first).
   *
   * @returns {Promise<import('../entities/Analysis.js').Analysis[]>}
   */
  async findAll() {
    throw new Error('IAnalysesRepository.findAll() must be implemented');
  }
}
