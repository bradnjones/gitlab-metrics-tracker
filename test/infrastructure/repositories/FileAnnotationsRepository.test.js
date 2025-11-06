import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { FileAnnotationsRepository } from '../../../src/lib/infrastructure/repositories/FileAnnotationsRepository.js';
import { Annotation, EventType, ImpactLevel } from '../../../src/lib/core/entities/Annotation.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('FileAnnotationsRepository', () => {
  let tempDir;
  let repository;

  const validAnnotationData = {
    date: '2024-01-10T00:00:00Z',
    title: 'New deployment pipeline',
    description: 'Implemented automated deployment pipeline',
    eventType: EventType.TOOLING,
    impact: ImpactLevel.POSITIVE,
    affectedMetrics: ['deploymentFrequency', 'leadTime']
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'annotations-test-'));
    repository = new FileAnnotationsRepository(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('creates repository with data directory path', () => {
      expect(repository).toBeDefined();
      expect(repository.filePath).toBe(path.join(tempDir, 'annotations.json'));
    });
  });

  describe('save', () => {
    test('saves an annotation to file', async () => {
      const annotation = new Annotation(validAnnotationData);
      await repository.save(annotation);

      const fileContent = await fs.readFile(repository.filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      expect(data[annotation.id]).toBeDefined();
      expect(data[annotation.id].title).toBe('New deployment pipeline');
    });

    test('updates existing annotation if id already exists', async () => {
      const annotation = new Annotation(validAnnotationData);
      await repository.save(annotation);

      const updatedAnnotation = new Annotation({
        ...validAnnotationData,
        id: annotation.id,
        title: 'Updated pipeline'
      });
      await repository.save(updatedAnnotation);

      const retrieved = await repository.findById(annotation.id);
      expect(retrieved.title).toBe('Updated pipeline');
    });

    test('saves multiple annotations', async () => {
      const annotation1 = new Annotation(validAnnotationData);
      const annotation2 = new Annotation({
        ...validAnnotationData,
        title: 'Another event'
      });

      await repository.save(annotation1);
      await repository.save(annotation2);

      const all = await repository.findAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('findById', () => {
    test('finds annotation by id', async () => {
      const annotation = new Annotation(validAnnotationData);
      await repository.save(annotation);

      const found = await repository.findById(annotation.id);

      expect(found).toBeInstanceOf(Annotation);
      expect(found.id).toBe(annotation.id);
      expect(found.title).toBe('New deployment pipeline');
    });

    test('returns null if annotation not found', async () => {
      const found = await repository.findById('non-existent');
      expect(found).toBeNull();
    });

    test('returns null when file does not exist', async () => {
      const found = await repository.findById('any-id');
      expect(found).toBeNull();
    });
  });

  describe('findByDateRange', () => {
    test('finds annotations within date range', async () => {
      const annotation1 = new Annotation({
        ...validAnnotationData,
        date: '2024-01-05T00:00:00Z'
      });
      const annotation2 = new Annotation({
        ...validAnnotationData,
        date: '2024-01-15T00:00:00Z',
        title: 'Later event'
      });

      await repository.save(annotation1);
      await repository.save(annotation2);

      const found = await repository.findByDateRange('2024-01-01', '2024-01-10');

      expect(found).toHaveLength(1);
      expect(found[0].date).toBe('2024-01-05T00:00:00Z');
    });

    test('returns empty array if no annotations in range', async () => {
      const annotation = new Annotation(validAnnotationData);
      await repository.save(annotation);

      const found = await repository.findByDateRange('2025-01-01', '2025-01-31');

      expect(found).toEqual([]);
    });
  });

  describe('findAll', () => {
    test('returns all annotations', async () => {
      const annotation1 = new Annotation(validAnnotationData);
      const annotation2 = new Annotation({
        ...validAnnotationData,
        title: 'Another event'
      });

      await repository.save(annotation1);
      await repository.save(annotation2);

      const all = await repository.findAll();

      expect(all).toHaveLength(2);
      expect(all[0]).toBeInstanceOf(Annotation);
      expect(all[1]).toBeInstanceOf(Annotation);
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

  describe('update', () => {
    test('updates an existing annotation', async () => {
      const annotation = new Annotation(validAnnotationData);
      await repository.save(annotation);

      const updatedAnnotation = new Annotation({
        ...validAnnotationData,
        id: annotation.id,
        title: 'Updated title',
        description: 'Updated description'
      });

      const updated = await repository.update(annotation.id, updatedAnnotation);

      expect(updated).toBe(true);

      const found = await repository.findById(annotation.id);
      expect(found.title).toBe('Updated title');
      expect(found.description).toBe('Updated description');
    });

    test('updates updatedAt timestamp', async () => {
      const annotation = new Annotation(validAnnotationData);
      await repository.save(annotation);

      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedAnnotation = new Annotation({
        ...validAnnotationData,
        id: annotation.id,
        title: 'Updated title'
      });

      await repository.update(annotation.id, updatedAnnotation);

      const found = await repository.findById(annotation.id);
      expect(new Date(found.updatedAt).getTime()).toBeGreaterThan(
        new Date(annotation.createdAt).getTime()
      );
    });

    test('returns false when updating non-existent annotation', async () => {
      const annotation = new Annotation(validAnnotationData);
      const updated = await repository.update('non-existent', annotation);
      expect(updated).toBe(false);
    });

    test('returns false when file does not exist', async () => {
      const annotation = new Annotation(validAnnotationData);
      const updated = await repository.update('any-id', annotation);
      expect(updated).toBe(false);
    });
  });

  describe('delete', () => {
    test('deletes annotation by id', async () => {
      const annotation = new Annotation(validAnnotationData);
      await repository.save(annotation);

      const deleted = await repository.delete(annotation.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(annotation.id);
      expect(found).toBeNull();
    });

    test('returns false when deleting non-existent annotation', async () => {
      const deleted = await repository.delete('non-existent');
      expect(deleted).toBe(false);
    });

    test('returns false when file does not exist', async () => {
      const deleted = await repository.delete('any-id');
      expect(deleted).toBe(false);
    });
  });

  describe('deleteAll', () => {
    test('deletes all annotations', async () => {
      const annotation1 = new Annotation(validAnnotationData);
      const annotation2 = new Annotation({
        ...validAnnotationData,
        title: 'Another event'
      });

      await repository.save(annotation1);
      await repository.save(annotation2);

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
