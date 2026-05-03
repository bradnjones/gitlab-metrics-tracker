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
    this.tmpPath = this.filePath + '.tmp';
    /**
     * Promise chain that serializes every mutating operation so concurrent
     * callers never interleave their read-modify-write cycles.
     *
     * @type {Promise<void>}
     */
    this._writeQueue = Promise.resolve();
  }

  /**
   * Save or update annotation data
   * If annotation.id exists, updates; otherwise creates new entry
   *
   * @param {Annotation} annotation - Annotation entity to persist
   * @returns {Promise<void>}
   * @throws {Error} If save operation fails
   */
  save(annotation) {
    return this._enqueueOperation(async () => {
      const allAnnotations = await this.loadFile();
      allAnnotations[annotation.id] = annotation.toJSON();
      await this._atomicWrite(allAnnotations);
    });
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
  update(id, annotation) {
    return this._enqueueOperation(async () => {
      const allAnnotations = await this.loadFile();

      if (allAnnotations[id]) {
        const updatedData = annotation.toJSON();
        updatedData.updatedAt = new Date().toISOString();
        allAnnotations[id] = updatedData;
        await this._atomicWrite(allAnnotations);
        return true;
      }

      return false;
    });
  }

  /**
   * Delete annotation by unique identifier
   *
   * @param {string} id - Annotation identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   * @throws {Error} If delete operation fails
   */
  delete(id) {
    return this._enqueueOperation(async () => {
      const allAnnotations = await this.loadFile();

      if (allAnnotations[id]) {
        delete allAnnotations[id];
        await this._atomicWrite(allAnnotations);
        return true;
      }

      return false;
    });
  }

  /**
   * Delete all annotations (use with caution)
   *
   * @returns {Promise<number>} Number of records deleted
   * @throws {Error} If delete operation fails
   */
  deleteAll() {
    return this._enqueueOperation(async () => {
      const allAnnotations = await this.loadFile();
      const count = Object.keys(allAnnotations).length;
      await this._atomicWrite({});
      return count;
    });
  }

  /**
   * Load annotations from file.
   * If a .tmp file exists and the main file is missing or empty, promotes the
   * .tmp file first (crash recovery for a previous interrupted atomic write).
   *
   * @returns {Promise<Object>} Annotations object (keyed by id)
   * @throws {Error} If file read or parse fails
   * @private
   */
  async loadFile() {
    await this._recoverFromTmp();

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
   * Enqueue an operation so it runs only after all previously enqueued
   * operations have settled. Errors propagate to the caller but do not
   * poison the queue for subsequent operations.
   *
   * @template T
   * @param {() => Promise<T>} fn - Async operation to serialize
   * @returns {Promise<T>}
   * @private
   */
  _enqueueOperation(fn) {
    const op = this._writeQueue.then(() => fn());
    // Catch on the queued chain only so a rejection does not block later ops
    this._writeQueue = op.catch(() => {});
    return op;
  }

  /**
   * Promote .tmp file to main file if the main file is absent or empty.
   * Called on every loadFile so any interrupted write is recovered on next read.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _recoverFromTmp() {
    let tmpExists = false;
    try {
      await fs.access(this.tmpPath);
      tmpExists = true;
    } catch {
      // No tmp file — nothing to recover
    }

    if (!tmpExists) return;

    let mainMissingOrEmpty = false;
    try {
      const stat = await fs.stat(this.filePath);
      mainMissingOrEmpty = stat.size === 0;
    } catch (err) {
      if (err.code === 'ENOENT') {
        mainMissingOrEmpty = true;
      } else {
        throw err;
      }
    }

    if (mainMissingOrEmpty) {
      await fs.rename(this.tmpPath, this.filePath);
    }
  }

  /**
   * Write annotations atomically: write to .tmp then rename over the main file.
   * On POSIX systems fs.rename is atomic, so readers never see a partial file.
   *
   * @param {Object} annotations - Annotations object to save
   * @returns {Promise<void>}
   * @throws {Error} If file write or rename fails
   * @private
   */
  async _atomicWrite(annotations) {
    const data = JSON.stringify(annotations, null, 2);
    await fs.writeFile(this.tmpPath, data, 'utf-8');
    await fs.rename(this.tmpPath, this.filePath);
  }
}
