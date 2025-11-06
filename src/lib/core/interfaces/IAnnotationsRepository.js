/**
 * Repository interface for annotations persistence
 * Infrastructure layer must implement this contract
 *
 * @module core/interfaces/IAnnotationsRepository
 */

/**
 * IAnnotationsRepository interface
 * Defines the contract for annotations data persistence
 * Implementation lives in Infrastructure layer (e.g., FileAnnotationsRepository)
 */
export class IAnnotationsRepository {
  /**
   * Save or update annotation data
   *
   * @param {import('../entities/Annotation.js').Annotation} annotation - Annotation entity to persist
   * @returns {Promise<void>}
   * @throws {Error} If save operation fails
   */
  async save(annotation) {
    throw new Error('IAnnotationsRepository.save() must be implemented');
  }

  /**
   * Find annotation by unique identifier
   *
   * @param {string} id - Annotation identifier
   * @returns {Promise<import('../entities/Annotation.js').Annotation|null>} Annotation entity or null if not found
   * @throws {Error} If find operation fails
   */
  async findById(id) {
    throw new Error('IAnnotationsRepository.findById() must be implemented');
  }

  /**
   * Find annotations within a date range
   *
   * @param {string} startDate - ISO 8601 start date (inclusive)
   * @param {string} endDate - ISO 8601 end date (inclusive)
   * @returns {Promise<Array<import('../entities/Annotation.js').Annotation>>} Array of annotation entities
   * @throws {Error} If find operation fails
   */
  async findByDateRange(startDate, endDate) {
    throw new Error('IAnnotationsRepository.findByDateRange() must be implemented');
  }

  /**
   * Find all annotations
   *
   * @returns {Promise<Array<import('../entities/Annotation.js').Annotation>>} Array of all annotation entities
   * @throws {Error} If find operation fails
   */
  async findAll() {
    throw new Error('IAnnotationsRepository.findAll() must be implemented');
  }

  /**
   * Update an existing annotation
   * Updates the updatedAt timestamp automatically
   *
   * @param {string} id - Annotation identifier
   * @param {import('../entities/Annotation.js').Annotation} annotation - Updated annotation entity
   * @returns {Promise<boolean>} True if updated, false if not found
   * @throws {Error} If update operation fails
   */
  async update(id, annotation) {
    throw new Error('IAnnotationsRepository.update() must be implemented');
  }

  /**
   * Delete annotation by unique identifier
   *
   * @param {string} id - Annotation identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   * @throws {Error} If delete operation fails
   */
  async delete(id) {
    throw new Error('IAnnotationsRepository.delete() must be implemented');
  }

  /**
   * Delete all annotations (use with caution)
   *
   * @returns {Promise<number>} Number of records deleted
   * @throws {Error} If delete operation fails
   */
  async deleteAll() {
    throw new Error('IAnnotationsRepository.deleteAll() must be implemented');
  }
}
