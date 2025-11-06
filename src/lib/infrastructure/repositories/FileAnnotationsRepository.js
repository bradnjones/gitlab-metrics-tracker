/**
 * File system implementation of annotations repository
 * Stores annotations as JSON in a single file
 *
 * @module infrastructure/repositories/FileAnnotationsRepository
 */

import fs from 'fs/promises';
import path from 'path';
import { IAnnotationsRepository } from '../../core/interfaces/IAnnotationsRepository.js';
import { Annotation } from '../../core/entities/Annotation.js';

/**
 * FileAnnotationsRepository
 * Implements IAnnotationsRepository using JSON file storage
 * Dependencies: Infrastructure → Core (allowed by Clean Architecture)
 */
export class FileAnnotationsRepository extends IAnnotationsRepository {
  /**
   * Create FileAnnotationsRepository instance
   *
   * @param {string} dataDir - Directory path for data storage
   */
  constructor(dataDir) {
    super();
    this.filePath = path.join(dataDir, 'annotations.json');
  }

  /**
   * Save or update annotation data
   * If annotation.id exists, updates; otherwise creates new entry
   *
   * @param {Annotation} annotation - Annotation entity to persist
   * @returns {Promise<void>}
   * @throws {Error} If save operation fails
   */
  async save(annotation) {
    const allAnnotations = await this.loadFile();
    allAnnotations[annotation.id] = annotation.toJSON();
    await this.saveFile(allAnnotations);
  }

  /**
   * Find annotation by unique identifier
   *
   * @param {string} id - Annotation identifier
   * @returns {Promise<Annotation|null>} Annotation entity or null if not found
   * @throws {Error} If find operation fails
   */
  async findById(id) {
    const allAnnotations = await this.loadFile();
    const annotationData = allAnnotations[id];
    return annotationData ? Annotation.fromJSON(annotationData) : null;
  }

  /**
   * Find annotations within a date range
   * Matches annotations where date falls within the specified range
   *
   * @param {string} startDate - ISO 8601 start date (inclusive)
   * @param {string} endDate - ISO 8601 end date (inclusive)
   * @returns {Promise<Array<Annotation>>} Array of annotation entities
   * @throws {Error} If find operation fails
   */
  async findByDateRange(startDate, endDate) {
    const allAnnotations = await this.loadFile();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const matchingAnnotations = Object.values(allAnnotations).filter(a => {
      const annotationDate = new Date(a.date);
      return annotationDate >= start && annotationDate <= end;
    });

    return matchingAnnotations.map(a => Annotation.fromJSON(a));
  }

  /**
   * Find all annotations
   *
   * @returns {Promise<Array<Annotation>>} Array of all annotation entities
   * @throws {Error} If find operation fails
   */
  async findAll() {
    const allAnnotations = await this.loadFile();
    return Object.values(allAnnotations).map(a => Annotation.fromJSON(a));
  }

  /**
   * Update an existing annotation
   * Updates the updatedAt timestamp automatically
   *
   * @param {string} id - Annotation identifier
   * @param {Annotation} annotation - Updated annotation entity
   * @returns {Promise<boolean>} True if updated, false if not found
   * @throws {Error} If update operation fails
   */
  async update(id, annotation) {
    const allAnnotations = await this.loadFile();

    if (allAnnotations[id]) {
      // Update the updatedAt timestamp
      const updatedData = annotation.toJSON();
      updatedData.updatedAt = new Date().toISOString();
      allAnnotations[id] = updatedData;
      await this.saveFile(allAnnotations);
      return true;
    }

    return false;
  }

  /**
   * Delete annotation by unique identifier
   *
   * @param {string} id - Annotation identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   * @throws {Error} If delete operation fails
   */
  async delete(id) {
    const allAnnotations = await this.loadFile();

    if (allAnnotations[id]) {
      delete allAnnotations[id];
      await this.saveFile(allAnnotations);
      return true;
    }

    return false;
  }

  /**
   * Delete all annotations (use with caution)
   *
   * @returns {Promise<number>} Number of records deleted
   * @throws {Error} If delete operation fails
   */
  async deleteAll() {
    const allAnnotations = await this.loadFile();
    const count = Object.keys(allAnnotations).length;
    await this.saveFile({});
    return count;
  }

  /**
   * Load annotations from file
   * Returns empty object if file doesn't exist
   *
   * @returns {Promise<Object>} Annotations object (keyed by id)
   * @throws {Error} If file read or parse fails
   * @private
   */
  async loadFile() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet - return empty object
        return {};
      }
      // Re-throw other errors (e.g., JSON parse errors)
      throw error;
    }
  }

  /**
   * Save annotations to file
   * Writes JSON with 2-space indentation for readability
   *
   * @param {Object} annotations - Annotations object to save
   * @returns {Promise<void>}
   * @throws {Error} If file write fails
   * @private
   */
  async saveFile(annotations) {
    const data = JSON.stringify(annotations, null, 2);
    await fs.writeFile(this.filePath, data, 'utf-8');
  }
}
