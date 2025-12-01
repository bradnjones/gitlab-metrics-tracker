/**
 * Annotations API routes
 * CRUD endpoints for annotation management
 *
 * @module server/routes/annotations
 */

import express from 'express';
import { ServiceFactory } from '../services/ServiceFactory.js';
import { Annotation } from '../../lib/core/entities/Annotation.js';
import { ConsoleLogger } from '../../lib/infrastructure/logging/ConsoleLogger.js';

const router = express.Router();

// Logger instance for annotations API
const logger = new ConsoleLogger({ serviceName: 'annotations-api' });

/**
 * Valid annotation types (lowercase to match prototype)
 */
const VALID_TYPES = ['process', 'team', 'tooling', 'external', 'incident'];

/**
 * Valid annotation impacts (lowercase to match prototype)
 */
const VALID_IMPACTS = ['positive', 'negative', 'neutral'];

/**
 * Validate annotation data
 *
 * @param {Object} data - Annotation data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validateAnnotation(data, isUpdate = false) {
  // Required fields (for creation)
  if (!isUpdate) {
    if (!data.date) {
      return { valid: false, error: 'Required field "date" is missing' };
    }
    if (!data.title || data.title.trim().length === 0) {
      return { valid: false, error: 'Required field "title" is missing or empty' };
    }
    if (!data.type) {
      return { valid: false, error: 'Required field "type" is missing' };
    }
    if (!data.impact) {
      return { valid: false, error: 'Required field "impact" is missing' };
    }
  }

  // Validate type enum
  if (data.type && !VALID_TYPES.includes(data.type.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid type "${data.type}". Must be one of: ${VALID_TYPES.join(', ')}`,
    };
  }

  // Validate impact enum
  if (data.impact && !VALID_IMPACTS.includes(data.impact.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid impact "${data.impact}". Must be one of: ${VALID_IMPACTS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Transform annotation data to entity format (PascalCase)
 * Prototype uses lowercase, entity uses PascalCase
 *
 * @param {Object} data - Annotation data from request
 * @returns {Object} Transformed data for entity
 */
function transformToEntity(data) {
  const transformed = { ...data };

  // Transform type to PascalCase
  if (transformed.type) {
    transformed.eventType = transformed.type.charAt(0).toUpperCase() + transformed.type.slice(1);
    delete transformed.type;
  }

  // Transform impact to PascalCase
  if (transformed.impact) {
    transformed.impact = transformed.impact.charAt(0).toUpperCase() + transformed.impact.slice(1);
  }

  // Handle optional description (entity requires non-empty string)
  if (!transformed.description || (typeof transformed.description === 'string' && transformed.description.trim() === '')) {
    transformed.description = '-'; // Use dash as placeholder for empty descriptions
  }

  return transformed;
}

/**
 * Transform annotation entity to API format (lowercase)
 *
 * @param {Annotation} annotation - Annotation entity
 * @returns {Object} Transformed data for API response
 */
function transformFromEntity(annotation) {
  const json = annotation.toJSON();
  const trimmedDescription = json.description.trim();
  return {
    id: json.id,
    date: json.date,
    title: json.title,
    description: (trimmedDescription === '' || trimmedDescription === '-') ? null : json.description, // Return null if empty or placeholder
    type: json.eventType.toLowerCase(),
    impact: json.impact.toLowerCase(),
    affectedMetrics: json.affectedMetrics || [],
    color: json.color, // Custom annotation color
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
}

/**
 * GET /api/annotations
 * List all annotations sorted by date descending
 */
router.get('/', async (req, res) => {
  try {
    const repository = ServiceFactory.createAnnotationsRepository();
    const annotations = await repository.findAll();

    // Sort by date descending (newest first)
    const sorted = annotations.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });

    // Transform to API format
    const transformed = sorted.map(transformFromEntity);

    res.json(transformed);
  } catch (error) {
    logger.error('Failed to fetch annotations', error, {
      route: 'GET /api/annotations'
    });
    res.status(500).json({
      error: 'Failed to fetch annotations',
      message: error.message,
    });
  }
});

/**
 * POST /api/annotations
 * Create new annotation
 */
router.post('/', async (req, res) => {
  try {
    // Validate request data
    const validation = validateAnnotation(req.body, false);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Transform and create annotation entity
    const entityData = transformToEntity(req.body);
    const annotation = new Annotation(entityData);

    // Save to repository
    const repository = ServiceFactory.createAnnotationsRepository();
    await repository.save(annotation);

    // Return created annotation
    const transformed = transformFromEntity(annotation);
    res.status(201).json(transformed);
  } catch (error) {
    logger.error('Failed to create annotation', error, {
      route: 'POST /api/annotations'
    });
    res.status(500).json({
      error: 'Failed to create annotation',
      message: error.message,
    });
  }
});

/**
 * PUT /api/annotations/:id
 * Update existing annotation
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate request data
    const validation = validateAnnotation(req.body, true);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Get existing annotation
    const repository = ServiceFactory.createAnnotationsRepository();
    const existing = await repository.findById(id);

    if (!existing) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    // Merge existing data with updates
    const entityData = transformToEntity({
      ...existing.toJSON(),
      ...req.body,
      id, // Preserve ID
      createdAt: existing.createdAt, // Preserve creation timestamp
    });

    // Create updated annotation entity
    const annotation = new Annotation(entityData);

    // Update in repository
    const updated = await repository.update(id, annotation);

    if (!updated) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    // Fetch and return updated annotation
    const result = await repository.findById(id);
    const transformed = transformFromEntity(result);

    res.json(transformed);
  } catch (error) {
    logger.error('Failed to update annotation', error, {
      route: 'PUT /api/annotations/:id',
      annotationId: req.params.id
    });
    res.status(500).json({
      error: 'Failed to update annotation',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/annotations/:id
 * Delete annotation
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const repository = ServiceFactory.createAnnotationsRepository();
    const deleted = await repository.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    // Return 204 No Content on successful deletion
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete annotation', error, {
      route: 'DELETE /api/annotations/:id',
      annotationId: req.params.id
    });
    res.status(500).json({
      error: 'Failed to delete annotation',
      message: error.message,
    });
  }
});

export default router;
