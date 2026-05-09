/**
 * Analysis entity representing a persisted AI metric review run.
 *
 * @module core/entities/Analysis
 */

import { randomUUID } from 'crypto';

/** Valid status values for an analysis run. */
const VALID_STATUSES = ['succeeded', 'failed'];

/**
 * Analysis entity.
 * Immutable snapshot of one AI review run — inputs, outputs, and metadata.
 */
export class Analysis {
  /**
   * @param {Object} data
   * @param {string} [data.id] - Auto-generated UUID if omitted
   * @param {number} [data.schemaVersion=1]
   * @param {string} [data.createdAt] - ISO 8601; auto-generated if omitted
   * @param {string[]} data.iterationIds
   * @param {{ from: string, to: string }} data.iterationRange
   * @param {string[]} data.annotationIds
   * @param {string} data.inputsDigest - SHA-256 of canonicalized signal package
   * @param {Object} data.signalPackage
   * @param {string} data.model
   * @param {string} data.systemPrompt
   * @param {string} data.userPrompt
   * @param {string|null} data.response - Markdown text; null on failure
   * @param {{ input: number, output: number }} data.usage
   * @param {number} data.latencyMs
   * @param {'succeeded'|'failed'} data.status
   * @param {string|null} data.errorMessage
   */
  constructor(data) {
    this.id = data.id || randomUUID();
    this.schemaVersion = data.schemaVersion ?? 1;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.iterationIds = data.iterationIds;
    this.iterationRange = data.iterationRange;
    this.annotationIds = data.annotationIds ?? [];
    this.inputsDigest = data.inputsDigest ?? null;
    this.signalPackage = data.signalPackage ?? null;
    this.model = data.model ?? null;
    this.systemPrompt = data.systemPrompt ?? null;
    this.userPrompt = data.userPrompt ?? null;
    this.response = data.response ?? null;
    this.usage = data.usage ?? null;
    this.latencyMs = data.latencyMs ?? null;
    this.status = data.status;
    this.errorMessage = data.errorMessage ?? null;

    this._validate();
  }

  /** @private */
  _validate() {
    if (!Array.isArray(this.iterationIds)) {
      throw new Error('iterationIds must be an array');
    }
    if (!VALID_STATUSES.includes(this.status)) {
      throw new Error(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
  }

  /** @returns {Object} Plain object for JSON serialization */
  toJSON() {
    return {
      id: this.id,
      schemaVersion: this.schemaVersion,
      createdAt: this.createdAt,
      iterationIds: this.iterationIds,
      iterationRange: this.iterationRange,
      annotationIds: this.annotationIds,
      inputsDigest: this.inputsDigest,
      signalPackage: this.signalPackage,
      model: this.model,
      systemPrompt: this.systemPrompt,
      userPrompt: this.userPrompt,
      response: this.response,
      usage: this.usage,
      latencyMs: this.latencyMs,
      status: this.status,
      errorMessage: this.errorMessage,
    };
  }

  /**
   * @param {Object} obj
   * @returns {Analysis}
   */
  static fromJSON(obj) {
    return new Analysis(obj);
  }
}
