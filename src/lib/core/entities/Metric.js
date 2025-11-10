/**
 * Metric entity representing sprint metrics data
 *
 * @module core/entities/Metric
 */

/**
 * Generate unique ID for entity
 * @returns {string} Unique identifier
 * @private
 */
function generateId() {
  return `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Metric entity representing sprint metrics data
 * Stores calculated metric values for a single iteration/sprint
 */
export class Metric {
  /**
   * Create a Metric instance
   *
   * @param {Object} data - Metric data
   * @param {string} [data.id] - Unique identifier (auto-generated if not provided)
   * @param {string} data.iterationId - Iteration/sprint identifier from GitLab
   * @param {string} data.iterationTitle - Human-readable iteration title
   * @param {string} data.startDate - ISO 8601 start date
   * @param {string} data.endDate - ISO 8601 end date
   * @param {number} data.velocityPoints - Story points completed
   * @param {number} data.velocityStories - Number of stories completed
   * @param {number} data.cycleTimeAvg - Average cycle time (days)
   * @param {number} data.cycleTimeP50 - Median cycle time (days)
   * @param {number} data.cycleTimeP90 - 90th percentile cycle time (days)
   * @param {number} data.deploymentFrequency - Deployments per day
   * @param {number} data.leadTimeAvg - Average lead time (days)
   * @param {number} data.leadTimeP50 - Median lead time (days)
   * @param {number} data.leadTimeP90 - 90th percentile lead time (days)
   * @param {number} data.mttrAvg - Mean time to recovery (hours)
   * @param {number} data.changeFailureRate - Deployment failure rate (0-1)
   * @param {number} data.issueCount - Total issues in iteration
   * @param {number} data.mrCount - Total merge requests
   * @param {number} data.deploymentCount - Total deployments
   * @param {number} data.incidentCount - Total incidents
   * @param {Object} data.rawData - Raw underlying data for audit/debugging
   * @param {string} [data.createdAt] - ISO 8601 timestamp of creation
   */
  constructor(data) {
    this.id = data.id || generateId();
    this.iterationId = data.iterationId;
    this.iterationTitle = data.iterationTitle;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.velocityPoints = data.velocityPoints;
    this.velocityStories = data.velocityStories;
    this.cycleTimeAvg = data.cycleTimeAvg;
    this.cycleTimeP50 = data.cycleTimeP50;
    this.cycleTimeP90 = data.cycleTimeP90;
    this.deploymentFrequency = data.deploymentFrequency;
    this.leadTimeAvg = data.leadTimeAvg;
    this.leadTimeP50 = data.leadTimeP50;
    this.leadTimeP90 = data.leadTimeP90;
    this.mttrAvg = data.mttrAvg;
    this.changeFailureRate = data.changeFailureRate;
    this.issueCount = data.issueCount;
    this.mrCount = data.mrCount;
    this.deploymentCount = data.deploymentCount;
    this.incidentCount = data.incidentCount;
    this.rawData = data.rawData;
    this.createdAt = data.createdAt || new Date().toISOString();

    this.validate();
  }

  /**
   * Validate metric data
   * Enforces business rules and data integrity
   *
   * @throws {Error} If validation fails
   */
  validate() {
    // Required fields
    if (!this.iterationId) {
      throw new Error('iterationId is required');
    }
    if (!this.iterationTitle) {
      throw new Error('iterationTitle is required');
    }
    if (!this.startDate) {
      throw new Error('startDate is required');
    }
    if (!this.endDate) {
      throw new Error('endDate is required');
    }

    // Numeric validations (must be non-negative numbers)
    if (typeof this.velocityPoints !== 'number' || this.velocityPoints < 0) {
      throw new Error('velocityPoints must be a non-negative number');
    }
    if (typeof this.cycleTimeAvg !== 'number' || this.cycleTimeAvg < 0) {
      throw new Error('cycleTimeAvg must be a non-negative number');
    }
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
      iterationId: this.iterationId,
      iterationTitle: this.iterationTitle,
      startDate: this.startDate,
      endDate: this.endDate,
      velocityPoints: this.velocityPoints,
      velocityStories: this.velocityStories,
      cycleTimeAvg: this.cycleTimeAvg,
      cycleTimeP50: this.cycleTimeP50,
      cycleTimeP90: this.cycleTimeP90,
      deploymentFrequency: this.deploymentFrequency,
      leadTimeAvg: this.leadTimeAvg,
      leadTimeP50: this.leadTimeP50,
      leadTimeP90: this.leadTimeP90,
      mttrAvg: this.mttrAvg,
      changeFailureRate: this.changeFailureRate,
      issueCount: this.issueCount,
      mrCount: this.mrCount,
      deploymentCount: this.deploymentCount,
      incidentCount: this.incidentCount,
      rawData: this.rawData,
      createdAt: this.createdAt
    };
  }

  /**
   * Create Metric instance from plain object
   * Used for deserialization from JSON storage
   *
   * @param {Object} obj - Plain object
   * @returns {Metric} Metric instance
   */
  static fromJSON(obj) {
    return new Metric(obj);
  }
}
