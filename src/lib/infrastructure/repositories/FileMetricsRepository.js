/**
 * File system implementation of metrics repository
 * Stores metrics as JSON in a single file
 *
 * @module infrastructure/repositories/FileMetricsRepository
 */

import fs from 'fs/promises';
import path from 'path';
import { IMetricsRepository } from '../../core/interfaces/IMetricsRepository.js';
import { Metric } from '../../core/entities/Metric.js';

/**
 * FileMetricsRepository
 * Implements IMetricsRepository using JSON file storage
 * Dependencies: Infrastructure → Core (allowed by Clean Architecture)
 */
export class FileMetricsRepository extends IMetricsRepository {
  /**
   * Create FileMetricsRepository instance
   *
   * @param {string} dataDir - Directory path for data storage
   */
  constructor(dataDir) {
    super();
    this.filePath = path.join(dataDir, 'metrics.json');
  }

  /**
   * Save or update metrics data
   * If metric.id exists, updates; otherwise creates new entry
   *
   * @param {Metric} metric - Metric entity to persist
   * @returns {Promise<void>}
   * @throws {Error} If save operation fails
   */
  async save(metric) {
    const allMetrics = await this.loadFile();
    allMetrics[metric.id] = metric.toJSON();
    await this.saveFile(allMetrics);
  }

  /**
   * Find metrics by unique identifier
   *
   * @param {string} id - Metric identifier
   * @returns {Promise<Metric|null>} Metric entity or null if not found
   * @throws {Error} If find operation fails
   */
  async findById(id) {
    const allMetrics = await this.loadFile();
    const metricData = allMetrics[id];
    return metricData ? Metric.fromJSON(metricData) : null;
  }

  /**
   * Find metrics by iteration ID
   * Returns first match if multiple exist
   *
   * @param {string} iterationId - GitLab iteration identifier
   * @returns {Promise<Metric|null>} Metric entity or null if not found
   * @throws {Error} If find operation fails
   */
  async findByIterationId(iterationId) {
    const allMetrics = await this.loadFile();
    const metricData = Object.values(allMetrics).find(
      m => m.iterationId === iterationId
    );
    return metricData ? Metric.fromJSON(metricData) : null;
  }

  /**
   * Find metrics within a date range
   * Matches metrics where startDate falls within the specified range
   *
   * @param {string} startDate - ISO 8601 start date (inclusive)
   * @param {string} endDate - ISO 8601 end date (inclusive)
   * @returns {Promise<Array<Metric>>} Array of metric entities
   * @throws {Error} If find operation fails
   */
  async findByDateRange(startDate, endDate) {
    const allMetrics = await this.loadFile();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const matchingMetrics = Object.values(allMetrics).filter(m => {
      const metricStart = new Date(m.startDate);
      return metricStart >= start && metricStart <= end;
    });

    return matchingMetrics.map(m => Metric.fromJSON(m));
  }

  /**
   * Find all metrics
   *
   * @returns {Promise<Array<Metric>>} Array of all metric entities
   * @throws {Error} If find operation fails
   */
  async findAll() {
    const allMetrics = await this.loadFile();
    return Object.values(allMetrics).map(m => Metric.fromJSON(m));
  }

  /**
   * Delete metrics by unique identifier
   *
   * @param {string} id - Metric identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   * @throws {Error} If delete operation fails
   */
  async delete(id) {
    const allMetrics = await this.loadFile();

    if (allMetrics[id]) {
      delete allMetrics[id];
      await this.saveFile(allMetrics);
      return true;
    }

    return false;
  }

  /**
   * Delete all metrics (use with caution)
   *
   * @returns {Promise<number>} Number of records deleted
   * @throws {Error} If delete operation fails
   */
  async deleteAll() {
    const allMetrics = await this.loadFile();
    const count = Object.keys(allMetrics).length;
    await this.saveFile({});
    return count;
  }

  /**
   * Load metrics from file
   * Returns empty object if file doesn't exist
   *
   * @returns {Promise<Object>} Metrics object (keyed by id)
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
   * Save metrics to file
   * Writes JSON with 2-space indentation for readability
   *
   * @param {Object} metrics - Metrics object to save
   * @returns {Promise<void>}
   * @throws {Error} If file write fails
   * @private
   */
  async saveFile(metrics) {
    const data = JSON.stringify(metrics, null, 2);
    await fs.writeFile(this.filePath, data, 'utf-8');
  }
}
