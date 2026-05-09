/**
 * File system implementation of analyses repository.
 * Atomic write pattern copied from FileAnnotationsRepository.
 *
 * @module infrastructure/repositories/FileAnalysesRepository
 */

import fs from 'fs/promises';
import path from 'path';
import { IAnalysesRepository } from '../../core/interfaces/IAnalysesRepository.js';
import { Analysis } from '../../core/entities/Analysis.js';

export class FileAnalysesRepository extends IAnalysesRepository {
  /**
   * @param {string} dataDir - Directory path for data storage
   */
  constructor(dataDir) {
    super();
    this.filePath = path.join(dataDir, 'analyses.json');
    this.tmpPath = this.filePath + '.tmp';
    /** @type {Promise<void>} Serializes all mutating operations. */
    this._writeQueue = Promise.resolve();
  }

  /**
   * Persist an analysis (insert or overwrite by id).
   *
   * @param {Analysis} analysis
   * @returns {Promise<void>}
   */
  save(analysis) {
    return this._enqueueOperation(async () => {
      const all = await this._loadFile();
      all[analysis.id] = analysis.toJSON();
      await this._atomicWrite(all);
    });
  }

  /**
   * Find a single analysis by id.
   *
   * @param {string} id
   * @returns {Promise<Analysis|null>}
   */
  async findById(id) {
    const all = await this._loadFile();
    const data = all[id];
    return data ? Analysis.fromJSON(data) : null;
  }

  /**
   * Return all analyses sorted by createdAt descending (newest first).
   *
   * @returns {Promise<Analysis[]>}
   */
  async findAll() {
    const all = await this._loadFile();
    return Object.values(all)
      .map((data) => Analysis.fromJSON(data))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // ─── Private helpers (copied verbatim from FileAnnotationsRepository) ───────

  /** @private */
  _enqueueOperation(fn) {
    const op = this._writeQueue.then(() => fn());
    this._writeQueue = op.catch(() => {});
    return op;
  }

  /** @private */
  async _loadFile() {
    await this._recoverFromTmp();

    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') return {};
      throw err;
    }
  }

  /** @private */
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

  /** @private */
  async _atomicWrite(analyses) {
    const data = JSON.stringify(analyses, null, 2);
    await fs.writeFile(this.tmpPath, data, 'utf-8');
    await fs.rename(this.tmpPath, this.filePath);
  }
}
