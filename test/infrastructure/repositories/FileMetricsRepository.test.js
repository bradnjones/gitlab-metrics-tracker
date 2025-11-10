import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { FileMetricsRepository } from '../../../src/lib/infrastructure/repositories/FileMetricsRepository.js';
import { Metric } from '../../../src/lib/core/entities/Metric.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('FileMetricsRepository', () => {
  let tempDir;
  let repository;

  const validMetricData = {
    iterationId: 'iteration-1',
    iterationTitle: 'Sprint 1',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-14T23:59:59Z',
    velocityPoints: 25,
    velocityStories: 8,
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
    rawData: { issues: [], mergeRequests: [] }
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'metrics-test-'));
    repository = new FileMetricsRepository(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('creates repository with data directory path', () => {
      expect(repository).toBeDefined();
      expect(repository.filePath).toBe(path.join(tempDir, 'metrics.json'));
    });
  });

  describe('save', () => {
    test('saves a metric to file', async () => {
      const metric = new Metric(validMetricData);
      await repository.save(metric);

      const fileContent = await fs.readFile(repository.filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      expect(data[metric.id]).toBeDefined();
      expect(data[metric.id].iterationId).toBe('iteration-1');
    });

    test('updates existing metric if id already exists', async () => {
      const metric = new Metric(validMetricData);
      await repository.save(metric);

      const updatedMetric = new Metric({
        ...validMetricData,
        id: metric.id,
        velocityPoints: 30
      });
      await repository.save(updatedMetric);

      const retrieved = await repository.findById(metric.id);
      expect(retrieved.velocityPoints).toBe(30);
    });

    test('saves multiple metrics', async () => {
      const metric1 = new Metric(validMetricData);
      const metric2 = new Metric({
        ...validMetricData,
        iterationId: 'iteration-2'
      });

      await repository.save(metric1);
      await repository.save(metric2);

      const all = await repository.findAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('findById', () => {
    test('finds metric by id', async () => {
      const metric = new Metric(validMetricData);
      await repository.save(metric);

      const found = await repository.findById(metric.id);

      expect(found).toBeInstanceOf(Metric);
      expect(found.id).toBe(metric.id);
      expect(found.iterationId).toBe('iteration-1');
    });

    test('returns null if metric not found', async () => {
      const found = await repository.findById('non-existent');
      expect(found).toBeNull();
    });

    test('returns null when file does not exist', async () => {
      const found = await repository.findById('any-id');
      expect(found).toBeNull();
    });
  });

  describe('findByIterationId', () => {
    test('finds metric by iteration id', async () => {
      const metric = new Metric(validMetricData);
      await repository.save(metric);

      const found = await repository.findByIterationId('iteration-1');

      expect(found).toBeInstanceOf(Metric);
      expect(found.iterationId).toBe('iteration-1');
    });

    test('returns null if iteration not found', async () => {
      const found = await repository.findByIterationId('non-existent');
      expect(found).toBeNull();
    });

    test('returns first match if multiple metrics have same iteration id', async () => {
      const metric1 = new Metric(validMetricData);
      const metric2 = new Metric(validMetricData);
      await repository.save(metric1);
      await repository.save(metric2);

      const found = await repository.findByIterationId('iteration-1');
      expect(found).toBeDefined();
      expect(found.iterationId).toBe('iteration-1');
    });
  });

  describe('findByDateRange', () => {
    test('finds metrics within date range', async () => {
      const metric1 = new Metric({
        ...validMetricData,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-14T23:59:59Z'
      });
      const metric2 = new Metric({
        ...validMetricData,
        iterationId: 'iteration-2',
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-28T23:59:59Z'
      });

      await repository.save(metric1);
      await repository.save(metric2);

      const found = await repository.findByDateRange('2024-01-01', '2024-01-20');

      expect(found).toHaveLength(2);
    });

    test('returns empty array if no metrics in range', async () => {
      const metric = new Metric(validMetricData);
      await repository.save(metric);

      const found = await repository.findByDateRange('2025-01-01', '2025-01-31');

      expect(found).toEqual([]);
    });
  });

  describe('findAll', () => {
    test('returns all metrics', async () => {
      const metric1 = new Metric(validMetricData);
      const metric2 = new Metric({
        ...validMetricData,
        iterationId: 'iteration-2'
      });

      await repository.save(metric1);
      await repository.save(metric2);

      const all = await repository.findAll();

      expect(all).toHaveLength(2);
      expect(all[0]).toBeInstanceOf(Metric);
      expect(all[1]).toBeInstanceOf(Metric);
    });

    test('returns empty array when file does not exist', async () => {
      const all = await repository.findAll();
      expect(all).toEqual([]);
    });

    test('returns empty array when file is empty', async () => {
      await fs.writeFile(repository.filePath, '{}', 'utf-8');
      const all = await repository.findAll();
      expect(all).toEqual([]);
    });
  });

  describe('delete', () => {
    test('deletes metric by id', async () => {
      const metric = new Metric(validMetricData);
      await repository.save(metric);

      const deleted = await repository.delete(metric.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(metric.id);
      expect(found).toBeNull();
    });

    test('returns false when deleting non-existent metric', async () => {
      const deleted = await repository.delete('non-existent');
      expect(deleted).toBe(false);
    });

    test('returns false when file does not exist', async () => {
      const deleted = await repository.delete('any-id');
      expect(deleted).toBe(false);
    });
  });

  describe('deleteAll', () => {
    test('deletes all metrics', async () => {
      const metric1 = new Metric(validMetricData);
      const metric2 = new Metric({
        ...validMetricData,
        iterationId: 'iteration-2'
      });

      await repository.save(metric1);
      await repository.save(metric2);

      const count = await repository.deleteAll();

      expect(count).toBe(2);

      const all = await repository.findAll();
      expect(all).toEqual([]);
    });

    test('returns 0 when file does not exist', async () => {
      const count = await repository.deleteAll();
      expect(count).toBe(0);
    });
  });

  describe('error handling', () => {
    test('handles corrupted JSON file gracefully', async () => {
      await fs.writeFile(repository.filePath, 'invalid json', 'utf-8');

      await expect(repository.findAll()).rejects.toThrow();
    });
  });
});
