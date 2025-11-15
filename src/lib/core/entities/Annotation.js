/**
 * Annotation entity representing contextual events
 *
 * @module core/entities/Annotation
 */

/**
 * Valid event types for annotations
 * @enum {string}
 * @readonly
 */
export const EventType = {
  PROCESS: 'Process',
  TEAM: 'Team',
  TOOLING: 'Tooling',
  EXTERNAL: 'External',
  INCIDENT: 'Incident'
};

/**
 * Valid impact levels for annotations
 * @enum {string}
 * @readonly
 */
export const ImpactLevel = {
  POSITIVE: 'Positive',
  NEGATIVE: 'Negative',
  NEUTRAL: 'Neutral'
};

/**
 * Generate unique ID for annotation
 * @returns {string} Unique identifier
 * @private
 */
function generateId() {
  return `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Annotation entity representing contextual events
 * Used to correlate events with metric changes
 */
export class Annotation {
  /**
   * Create an Annotation instance
   *
   * @param {Object} data - Annotation data
   * @param {string} [data.id] - Unique identifier (auto-generated if not provided)
   * @param {string} data.date - ISO 8601 date of the event
   * @param {string} data.title - Short title for the annotation
   * @param {string} data.description - Detailed description of the event
   * @param {string} data.eventType - Event type (must be in EventType enum)
   * @param {string} data.impact - Impact level (must be in ImpactLevel enum)
   * @param {Array<string>} [data.affectedMetrics] - Metric names affected by this event
   * @param {string} [data.color] - Hex color code for annotation display (e.g., '#3b82f6')
   * @param {string} [data.createdAt] - ISO 8601 timestamp of creation
   * @param {string} [data.updatedAt] - ISO 8601 timestamp of last update
   */
  constructor(data) {
    this.id = data.id || generateId();
    this.date = data.date;
    this.title = data.title;
    this.description = data.description;
    this.eventType = data.eventType;
    this.impact = data.impact;
    this.affectedMetrics = data.affectedMetrics || [];
    this.color = data.color || null; // Optional custom color
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();

    this.validate();
  }

  /**
   * Validate annotation data
   * Enforces business rules and data integrity
   *
   * @throws {Error} If validation fails
   */
  validate() {
    // Required fields
    if (!this.date) {
      throw new Error('date is required');
    }
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('title is required');
    }
    if (!this.description || this.description.trim().length === 0) {
      throw new Error('description is required');
    }

    // Enum validations
    if (!Object.values(EventType).includes(this.eventType)) {
      throw new Error(
        `eventType must be one of: ${Object.values(EventType).join(', ')}`
      );
    }
    if (!Object.values(ImpactLevel).includes(this.impact)) {
      throw new Error(
        `impact must be one of: ${Object.values(ImpactLevel).join(', ')}`
      );
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
      date: this.date,
      title: this.title,
      description: this.description,
      eventType: this.eventType,
      impact: this.impact,
      affectedMetrics: this.affectedMetrics,
      color: this.color,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create Annotation instance from plain object
   * Used for deserialization from JSON storage
   *
   * @param {Object} obj - Plain object
   * @returns {Annotation} Annotation instance
   */
  static fromJSON(obj) {
    return new Annotation(obj);
  }
}
