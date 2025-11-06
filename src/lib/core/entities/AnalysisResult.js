/**
 * AnalysisResult entity representing correlation analysis results
 *
 * @module core/entities/AnalysisResult
 */

/**
 * Generate unique ID for analysis result
 * @returns {string} Unique identifier
 * @private
 */
function generateId() {
  return `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * AnalysisResult entity representing correlation analysis results
 * Stores impact detections, patterns, recommendations, and correlations
 */
export class AnalysisResult {
  /**
   * Create an AnalysisResult instance
   *
   * @param {Object} data - Analysis result data
   * @param {string} [data.id] - Unique identifier (auto-generated if not provided)
   * @param {string} [data.runDate] - ISO 8601 timestamp of analysis run
   * @param {Array<Object>} [data.impactDetections] - Before/after impact detections
   * @param {Array<Object>} [data.patterns] - Detected patterns by event type
   * @param {Array<string>} [data.recommendations] - Generated recommendations
   * @param {Array<Object>} [data.correlations] - Metric correlation data
   */
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.runDate = data.runDate || new Date().toISOString();
    this.impactDetections = data.impactDetections || [];
    this.patterns = data.patterns || [];
    this.recommendations = data.recommendations || [];
    this.correlations = data.correlations || [];
  }

  /**
   * Convert to plain object for serialization
   * Used for JSON storage and API responses
   *
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      runDate: this.runDate,
      impactDetections: this.impactDetections,
      patterns: this.patterns,
      recommendations: this.recommendations,
      correlations: this.correlations
    };
  }

  /**
   * Create AnalysisResult instance from plain object
   * Used for deserialization from JSON storage
   *
   * @param {Object} obj - Plain object
   * @returns {AnalysisResult} AnalysisResult instance
   */
  static fromJSON(obj) {
    return new AnalysisResult(obj);
  }
}
