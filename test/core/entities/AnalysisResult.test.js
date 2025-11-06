import { describe, test, expect } from '@jest/globals';
import { AnalysisResult } from '../../../src/lib/core/entities/AnalysisResult.js';

describe('AnalysisResult', () => {
  const validAnalysisData = {
    id: 'analysis-123',
    runDate: '2024-01-15T10:00:00Z',
    impactDetections: [
      {
        annotationId: 'annotation-1',
        metricName: 'velocity',
        beforeValue: 20,
        afterValue: 30,
        changePercent: 50,
        significant: true
      }
    ],
    patterns: [
      {
        eventType: 'Tooling',
        impact: 'Positive',
        affectedMetrics: ['deploymentFrequency', 'leadTime'],
        occurrences: 3,
        averageImpact: 25.5
      }
    ],
    recommendations: [
      'Continue investing in tooling improvements',
      'Monitor deployment frequency trends'
    ],
    correlations: [
      {
        metricA: 'deploymentFrequency',
        metricB: 'leadTime',
        correlation: -0.75,
        strength: 'strong'
      }
    ]
  };

  describe('constructor', () => {
    test('creates a valid AnalysisResult instance with all fields', () => {
      const result = new AnalysisResult(validAnalysisData);

      expect(result.id).toBe('analysis-123');
      expect(result.runDate).toBe('2024-01-15T10:00:00Z');
      expect(result.impactDetections).toEqual(validAnalysisData.impactDetections);
      expect(result.patterns).toEqual(validAnalysisData.patterns);
      expect(result.recommendations).toEqual(validAnalysisData.recommendations);
      expect(result.correlations).toEqual(validAnalysisData.correlations);
    });

    test('auto-generates id if not provided', () => {
      const { id, ...dataWithoutId } = validAnalysisData;
      const result = new AnalysisResult(dataWithoutId);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id.startsWith('analysis-')).toBe(true);
    });

    test('auto-generates runDate timestamp if not provided', () => {
      const { runDate, ...dataWithoutRunDate } = validAnalysisData;
      const result = new AnalysisResult(dataWithoutRunDate);

      expect(result.runDate).toBeDefined();
      expect(typeof result.runDate).toBe('string');
      expect(new Date(result.runDate).toISOString()).toBe(result.runDate);
    });

    test('initializes impactDetections as empty array if not provided', () => {
      const { impactDetections, ...dataWithoutImpacts } = validAnalysisData;
      const result = new AnalysisResult(dataWithoutImpacts);

      expect(result.impactDetections).toEqual([]);
    });

    test('initializes patterns as empty array if not provided', () => {
      const { patterns, ...dataWithoutPatterns } = validAnalysisData;
      const result = new AnalysisResult(dataWithoutPatterns);

      expect(result.patterns).toEqual([]);
    });

    test('initializes recommendations as empty array if not provided', () => {
      const { recommendations, ...dataWithoutRecs } = validAnalysisData;
      const result = new AnalysisResult(dataWithoutRecs);

      expect(result.recommendations).toEqual([]);
    });

    test('initializes correlations as empty array if not provided', () => {
      const { correlations, ...dataWithoutCorr } = validAnalysisData;
      const result = new AnalysisResult(dataWithoutCorr);

      expect(result.correlations).toEqual([]);
    });

    test('creates instance with minimal data', () => {
      const minimalData = {};
      const result = new AnalysisResult(minimalData);

      expect(result.id).toBeDefined();
      expect(result.runDate).toBeDefined();
      expect(result.impactDetections).toEqual([]);
      expect(result.patterns).toEqual([]);
      expect(result.recommendations).toEqual([]);
      expect(result.correlations).toEqual([]);
    });
  });

  describe('toJSON', () => {
    test('returns plain object representation', () => {
      const result = new AnalysisResult(validAnalysisData);
      const json = result.toJSON();

      expect(json).toEqual({
        id: result.id,
        runDate: result.runDate,
        impactDetections: result.impactDetections,
        patterns: result.patterns,
        recommendations: result.recommendations,
        correlations: result.correlations
      });
    });

    test('toJSON result can be serialized to JSON string', () => {
      const result = new AnalysisResult(validAnalysisData);
      const json = result.toJSON();

      expect(() => JSON.stringify(json)).not.toThrow();
    });
  });

  describe('fromJSON', () => {
    test('creates AnalysisResult instance from plain object', () => {
      const result = AnalysisResult.fromJSON(validAnalysisData);

      expect(result).toBeInstanceOf(AnalysisResult);
      expect(result.id).toBe(validAnalysisData.id);
      expect(result.impactDetections).toEqual(validAnalysisData.impactDetections);
    });

    test('round-trip conversion preserves data', () => {
      const original = new AnalysisResult(validAnalysisData);
      const json = original.toJSON();
      const restored = AnalysisResult.fromJSON(json);

      expect(restored.toJSON()).toEqual(json);
    });
  });
});
