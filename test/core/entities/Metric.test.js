import { describe, test, expect } from '@jest/globals';
import { Metric } from '../../../src/lib/core/entities/Metric.js';

describe('Metric', () => {
  const validMetricData = {
    id: 'metric-123',
    iterationId: 'iteration-456',
    iterationTitle: 'Sprint 1',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-14T23:59:59Z',
    velocityPoints: 25,
    velocityStories: 8,
    throughput: 12,
    cycleTimeAvg: 3.5,
    cycleTimeP50: 3.0,
    cycleTimeP90: 7.0,
    deploymentFrequency: 0.5,
    leadTimeAvg: 2.1,
    leadTimeP50: 1.8,
    leadTimeP90: 4.5,
    mttrAvg: 4.2,
    changeFailureRate: 0.05,
    issueCount: 45,
    mrCount: 23,
    deploymentCount: 7,
    incidentCount: 2,
    rawData: {
      issues: [],
      mergeRequests: [],
      deployments: [],
      incidents: []
    }
  };

  describe('constructor', () => {
    test('creates a valid Metric instance with all required fields', () => {
      const metric = new Metric(validMetricData);

      expect(metric.id).toBe('metric-123');
      expect(metric.iterationId).toBe('iteration-456');
      expect(metric.iterationTitle).toBe('Sprint 1');
      expect(metric.startDate).toBe('2024-01-01T00:00:00Z');
      expect(metric.endDate).toBe('2024-01-14T23:59:59Z');
      expect(metric.velocityPoints).toBe(25);
      expect(metric.velocityStories).toBe(8);
      expect(metric.throughput).toBe(12);
      expect(metric.cycleTimeAvg).toBe(3.5);
      expect(metric.cycleTimeP50).toBe(3.0);
      expect(metric.cycleTimeP90).toBe(7.0);
      expect(metric.deploymentFrequency).toBe(0.5);
      expect(metric.leadTimeAvg).toBe(2.1);
      expect(metric.leadTimeP50).toBe(1.8);
      expect(metric.leadTimeP90).toBe(4.5);
      expect(metric.mttrAvg).toBe(4.2);
      expect(metric.changeFailureRate).toBe(0.05);
      expect(metric.issueCount).toBe(45);
      expect(metric.mrCount).toBe(23);
      expect(metric.deploymentCount).toBe(7);
      expect(metric.incidentCount).toBe(2);
      expect(metric.rawData).toEqual(validMetricData.rawData);
    });

    test('auto-generates createdAt timestamp if not provided', () => {
      const metric = new Metric(validMetricData);

      expect(metric.createdAt).toBeDefined();
      expect(typeof metric.createdAt).toBe('string');
      expect(new Date(metric.createdAt).toISOString()).toBe(metric.createdAt);
    });

    test('uses provided createdAt timestamp', () => {
      const timestamp = '2024-01-15T10:30:00Z';
      const metric = new Metric({ ...validMetricData, createdAt: timestamp });

      expect(metric.createdAt).toBe(timestamp);
    });

    test('auto-generates id if not provided', () => {
      const { id, ...dataWithoutId } = validMetricData;
      const metric = new Metric(dataWithoutId);

      expect(metric.id).toBeDefined();
      expect(typeof metric.id).toBe('string');
      expect(metric.id.length).toBeGreaterThan(0);
    });
  });

  describe('validation', () => {
    test('throws error when iterationId is missing', () => {
      const { iterationId, ...invalidData } = validMetricData;

      expect(() => new Metric(invalidData)).toThrow('iterationId is required');
    });

    test('throws error when iterationTitle is missing', () => {
      const { iterationTitle, ...invalidData } = validMetricData;

      expect(() => new Metric(invalidData)).toThrow('iterationTitle is required');
    });

    test('throws error when startDate is missing', () => {
      const { startDate, ...invalidData } = validMetricData;

      expect(() => new Metric(invalidData)).toThrow('startDate is required');
    });

    test('throws error when endDate is missing', () => {
      const { endDate, ...invalidData } = validMetricData;

      expect(() => new Metric(invalidData)).toThrow('endDate is required');
    });

    test('throws error when velocityPoints is negative', () => {
      const invalidData = { ...validMetricData, velocityPoints: -5 };

      expect(() => new Metric(invalidData)).toThrow('velocityPoints must be a non-negative number');
    });

    test('throws error when velocityPoints is not a number', () => {
      const invalidData = { ...validMetricData, velocityPoints: 'not-a-number' };

      expect(() => new Metric(invalidData)).toThrow('velocityPoints must be a non-negative number');
    });

    test('throws error when throughput is negative', () => {
      const invalidData = { ...validMetricData, throughput: -1 };

      expect(() => new Metric(invalidData)).toThrow('throughput must be a non-negative number');
    });

    test('throws error when cycleTimeAvg is negative', () => {
      const invalidData = { ...validMetricData, cycleTimeAvg: -1 };

      expect(() => new Metric(invalidData)).toThrow('cycleTimeAvg must be a non-negative number');
    });

    test('accepts zero values for numeric metrics', () => {
      const zeroMetrics = {
        ...validMetricData,
        velocityPoints: 0,
        velocityStories: 0,
        throughput: 0,
        cycleTimeAvg: 0,
        deploymentFrequency: 0
      };

      const metric = new Metric(zeroMetrics);

      expect(metric.velocityPoints).toBe(0);
      expect(metric.throughput).toBe(0);
    });
  });

  describe('toJSON', () => {
    test('returns plain object representation', () => {
      const metric = new Metric(validMetricData);
      const json = metric.toJSON();

      expect(json).toEqual({
        id: metric.id,
        iterationId: metric.iterationId,
        iterationTitle: metric.iterationTitle,
        startDate: metric.startDate,
        endDate: metric.endDate,
        velocityPoints: metric.velocityPoints,
        velocityStories: metric.velocityStories,
        throughput: metric.throughput,
        cycleTimeAvg: metric.cycleTimeAvg,
        cycleTimeP50: metric.cycleTimeP50,
        cycleTimeP90: metric.cycleTimeP90,
        deploymentFrequency: metric.deploymentFrequency,
        leadTimeAvg: metric.leadTimeAvg,
        leadTimeP50: metric.leadTimeP50,
        leadTimeP90: metric.leadTimeP90,
        mttrAvg: metric.mttrAvg,
        changeFailureRate: metric.changeFailureRate,
        issueCount: metric.issueCount,
        mrCount: metric.mrCount,
        deploymentCount: metric.deploymentCount,
        incidentCount: metric.incidentCount,
        rawData: metric.rawData,
        createdAt: metric.createdAt
      });
    });

    test('toJSON result can be serialized to JSON string', () => {
      const metric = new Metric(validMetricData);
      const json = metric.toJSON();

      expect(() => JSON.stringify(json)).not.toThrow();
    });
  });

  describe('fromJSON', () => {
    test('creates Metric instance from plain object', () => {
      const metric = Metric.fromJSON(validMetricData);

      expect(metric).toBeInstanceOf(Metric);
      expect(metric.iterationId).toBe(validMetricData.iterationId);
      expect(metric.velocityPoints).toBe(validMetricData.velocityPoints);
    });

    test('round-trip conversion preserves data', () => {
      const original = new Metric(validMetricData);
      const json = original.toJSON();
      const restored = Metric.fromJSON(json);

      expect(restored.toJSON()).toEqual(json);
    });
  });
});
