import { describe, test, expect } from '@jest/globals';
import { Annotation, EventType, ImpactLevel } from '../../../src/lib/core/entities/Annotation.js';

describe('Annotation', () => {
  const validAnnotationData = {
    id: 'annotation-123',
    date: '2024-01-10T00:00:00Z',
    title: 'New deployment pipeline',
    description: 'Implemented automated deployment pipeline',
    eventType: EventType.TOOLING,
    impact: ImpactLevel.POSITIVE,
    affectedMetrics: ['deploymentFrequency', 'leadTime'],
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z'
  };

  describe('EventType enum', () => {
    test('has all required event types', () => {
      expect(EventType.PROCESS).toBe('Process');
      expect(EventType.TEAM).toBe('Team');
      expect(EventType.TOOLING).toBe('Tooling');
      expect(EventType.EXTERNAL).toBe('External');
      expect(EventType.INCIDENT).toBe('Incident');
    });
  });

  describe('ImpactLevel enum', () => {
    test('has all required impact levels', () => {
      expect(ImpactLevel.POSITIVE).toBe('Positive');
      expect(ImpactLevel.NEGATIVE).toBe('Negative');
      expect(ImpactLevel.NEUTRAL).toBe('Neutral');
    });
  });

  describe('constructor', () => {
    test('creates a valid Annotation instance with all fields', () => {
      const annotation = new Annotation(validAnnotationData);

      expect(annotation.id).toBe('annotation-123');
      expect(annotation.date).toBe('2024-01-10T00:00:00Z');
      expect(annotation.title).toBe('New deployment pipeline');
      expect(annotation.description).toBe('Implemented automated deployment pipeline');
      expect(annotation.eventType).toBe(EventType.TOOLING);
      expect(annotation.impact).toBe(ImpactLevel.POSITIVE);
      expect(annotation.affectedMetrics).toEqual(['deploymentFrequency', 'leadTime']);
      expect(annotation.createdAt).toBe('2024-01-10T10:00:00Z');
      expect(annotation.updatedAt).toBe('2024-01-10T10:00:00Z');
    });

    test('auto-generates id if not provided', () => {
      const { id, ...dataWithoutId } = validAnnotationData;
      const annotation = new Annotation(dataWithoutId);

      expect(annotation.id).toBeDefined();
      expect(typeof annotation.id).toBe('string');
      expect(annotation.id.startsWith('annotation-')).toBe(true);
    });

    test('auto-generates createdAt timestamp if not provided', () => {
      const { createdAt, ...dataWithoutCreatedAt } = validAnnotationData;
      const annotation = new Annotation(dataWithoutCreatedAt);

      expect(annotation.createdAt).toBeDefined();
      expect(typeof annotation.createdAt).toBe('string');
      expect(new Date(annotation.createdAt).toISOString()).toBe(annotation.createdAt);
    });

    test('auto-generates updatedAt timestamp if not provided', () => {
      const { updatedAt, ...dataWithoutUpdatedAt } = validAnnotationData;
      const annotation = new Annotation(dataWithoutUpdatedAt);

      expect(annotation.updatedAt).toBeDefined();
      expect(typeof annotation.updatedAt).toBe('string');
    });

    test('initializes affectedMetrics as empty array if not provided', () => {
      const { affectedMetrics, ...dataWithoutMetrics } = validAnnotationData;
      const annotation = new Annotation(dataWithoutMetrics);

      expect(annotation.affectedMetrics).toEqual([]);
    });
  });

  describe('validation', () => {
    test('throws error when date is missing', () => {
      const { date, ...invalidData } = validAnnotationData;

      expect(() => new Annotation(invalidData)).toThrow('date is required');
    });

    test('throws error when title is missing', () => {
      const { title, ...invalidData } = validAnnotationData;

      expect(() => new Annotation(invalidData)).toThrow('title is required');
    });

    test('throws error when title is empty string', () => {
      const invalidData = { ...validAnnotationData, title: '' };

      expect(() => new Annotation(invalidData)).toThrow('title is required');
    });

    test('throws error when title is whitespace only', () => {
      const invalidData = { ...validAnnotationData, title: '   ' };

      expect(() => new Annotation(invalidData)).toThrow('title is required');
    });

    test('throws error when description is missing', () => {
      const { description, ...invalidData } = validAnnotationData;

      expect(() => new Annotation(invalidData)).toThrow('description is required');
    });

    test('throws error when description is empty string', () => {
      const invalidData = { ...validAnnotationData, description: '' };

      expect(() => new Annotation(invalidData)).toThrow('description is required');
    });

    test('throws error when eventType is invalid', () => {
      const invalidData = { ...validAnnotationData, eventType: 'InvalidType' };

      expect(() => new Annotation(invalidData)).toThrow('eventType must be one of: Process, Team, Tooling, External, Incident');
    });

    test('throws error when impact is invalid', () => {
      const invalidData = { ...validAnnotationData, impact: 'InvalidImpact' };

      expect(() => new Annotation(invalidData)).toThrow('impact must be one of: Positive, Negative, Neutral');
    });

    test('accepts all valid event types', () => {
      Object.values(EventType).forEach(eventType => {
        const annotation = new Annotation({ ...validAnnotationData, eventType });
        expect(annotation.eventType).toBe(eventType);
      });
    });

    test('accepts all valid impact levels', () => {
      Object.values(ImpactLevel).forEach(impact => {
        const annotation = new Annotation({ ...validAnnotationData, impact });
        expect(annotation.impact).toBe(impact);
      });
    });
  });

  describe('toJSON', () => {
    test('returns plain object representation', () => {
      const annotation = new Annotation(validAnnotationData);
      const json = annotation.toJSON();

      expect(json).toEqual({
        id: annotation.id,
        date: annotation.date,
        title: annotation.title,
        description: annotation.description,
        eventType: annotation.eventType,
        impact: annotation.impact,
        affectedMetrics: annotation.affectedMetrics,
        color: annotation.color,
        createdAt: annotation.createdAt,
        updatedAt: annotation.updatedAt
      });
    });

    test('toJSON result can be serialized to JSON string', () => {
      const annotation = new Annotation(validAnnotationData);
      const json = annotation.toJSON();

      expect(() => JSON.stringify(json)).not.toThrow();
    });
  });

  describe('fromJSON', () => {
    test('creates Annotation instance from plain object', () => {
      const annotation = Annotation.fromJSON(validAnnotationData);

      expect(annotation).toBeInstanceOf(Annotation);
      expect(annotation.id).toBe(validAnnotationData.id);
      expect(annotation.title).toBe(validAnnotationData.title);
    });

    test('round-trip conversion preserves data', () => {
      const original = new Annotation(validAnnotationData);
      const json = original.toJSON();
      const restored = Annotation.fromJSON(json);

      expect(restored.toJSON()).toEqual(json);
    });
  });
});
