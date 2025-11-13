/**
 * Tests for IterationCacheRepository
 * File-based cache repository for GitLab iteration data
 *
 * @module test/infrastructure/repositories/IterationCacheRepository.test
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { IterationCacheRepository } from '../../../src/lib/infrastructure/repositories/IterationCacheRepository.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('IterationCacheRepository', () => {
  let tempDir;
  let repository;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
    repository = new IterationCacheRepository(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // Test 1 (RED): Directory is created when set() is called
  test('set() creates cache directory if it does not exist', async () => {
    // Use a different temp directory that doesn't exist yet
    const newTempDir = path.join(os.tmpdir(), `cache-test-${Date.now()}`);

    // Verify directory doesn't exist
    await expect(fs.access(newTempDir)).rejects.toThrow();

    // Create repository and call set
    const newRepository = new IterationCacheRepository(newTempDir);
    const mockData = {
      issues: [],
      mergeRequests: [],
      pipelines: [],
      incidents: [],
      iteration: { id: 'gid://gitlab/Iteration/123', title: 'Sprint 1' }
    };

    await newRepository.set('gid://gitlab/Iteration/123', mockData);

    // Directory should now exist
    const stats = await fs.stat(newTempDir);
    expect(stats.isDirectory()).toBe(true);

    // Clean up
    await fs.rm(newTempDir, { recursive: true, force: true });
  });

  // Test 2 (RED): set() stores iteration data with correct structure
  test('set() stores iteration data with correct cache structure', async () => {
    const iterationId = 'gid://gitlab/Iteration/123';
    const mockData = {
      issues: [{ id: '1', title: 'Issue 1' }],
      mergeRequests: [],
      pipelines: [],
      incidents: [],
      iteration: { id: iterationId, title: 'Sprint 1' }
    };

    await repository.set(iterationId, mockData);

    // Read the cache file directly
    const sanitizedId = iterationId.replace(/[^a-zA-Z0-9-_]/g, '-');
    const filePath = path.join(tempDir, `${sanitizedId}.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const cached = JSON.parse(fileContent);

    expect(cached.version).toBe('1.0');
    expect(cached.iterationId).toBe(iterationId);
    expect(cached.lastFetched).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(cached.data).toEqual(mockData);
  });

  // Test 3 (RED): has() detects existing cache
  test('has() returns true when cache file exists', async () => {
    const iterationId = 'gid://gitlab/Iteration/456';
    const mockData = { issues: [], mergeRequests: [], pipelines: [], incidents: [], iteration: {} };

    await repository.set(iterationId, mockData);
    const exists = await repository.has(iterationId);

    expect(exists).toBe(true);
  });

  // Test 4 (RED): get() retrieves cached data
  test('get() retrieves cached iteration data from file', async () => {
    const iterationId = 'gid://gitlab/Iteration/789';
    const mockData = {
      issues: [{ id: '1', title: 'Test Issue' }],
      mergeRequests: [{ id: '2', title: 'Test MR' }],
      pipelines: [],
      incidents: [],
      iteration: { id: iterationId, title: 'Sprint 2' }
    };

    await repository.set(iterationId, mockData);
    const result = await repository.get(iterationId);

    expect(result).toEqual(mockData);
    expect(result.issues).toHaveLength(1);
    expect(result.iteration.id).toBe(iterationId);
  });

  // Test 5 (RED): get() returns null for missing cache
  test('get() returns null when cache file does not exist', async () => {
    const result = await repository.get('gid://gitlab/Iteration/nonexistent');
    expect(result).toBeNull();
  });

  // Test 6 (RED): Path traversal prevention
  test('set() prevents path traversal attacks in iteration IDs', async () => {
    const maliciousId = '../../etc/passwd';
    const mockData = { issues: [], mergeRequests: [], pipelines: [], incidents: [], iteration: {} };

    await repository.set(maliciousId, mockData);

    // Should write to safe filename in cache directory, not /etc/passwd
    const files = await fs.readdir(tempDir);
    expect(files).toHaveLength(1);
    expect(files[0]).not.toContain('..');
    expect(files[0]).toMatch(/^[-a-zA-Z0-9_]+\.json$/);
  });

  // Test 7 (RED): Corrupted JSON handling
  test('get() throws error when cache file contains invalid JSON', async () => {
    const iterationId = 'gid://gitlab/Iteration/corrupted';
    const sanitizedId = iterationId.replace(/[^a-zA-Z0-9-_]/g, '-');
    const filePath = path.join(tempDir, `${sanitizedId}.json`);

    // Write corrupted JSON to file
    await fs.writeFile(filePath, '{ invalid json }', 'utf-8');

    // Should throw error
    await expect(repository.get(iterationId)).rejects.toThrow(/corrupted/i);
  });

  // Test 8 (RED): clear() deletes single cache file
  test('clear() deletes cache file for specific iteration', async () => {
    const iterationId = 'gid://gitlab/Iteration/999';
    const mockData = { issues: [], mergeRequests: [], pipelines: [], incidents: [], iteration: {} };

    await repository.set(iterationId, mockData);
    expect(await repository.has(iterationId)).toBe(true);

    await repository.clear(iterationId);
    expect(await repository.has(iterationId)).toBe(false);
  });

  // Test 9 (RED): clearAll() deletes all cache files
  test('clearAll() deletes all cache files in directory', async () => {
    // Create multiple cache files
    const ids = [
      'gid://gitlab/Iteration/100',
      'gid://gitlab/Iteration/200',
      'gid://gitlab/Iteration/300'
    ];
    const mockData = { issues: [], mergeRequests: [], pipelines: [], incidents: [], iteration: {} };

    for (const id of ids) {
      await repository.set(id, mockData);
    }

    // Verify all exist
    for (const id of ids) {
      expect(await repository.has(id)).toBe(true);
    }

    // Clear all
    await repository.clearAll();

    // Verify all deleted
    for (const id of ids) {
      expect(await repository.has(id)).toBe(false);
    }

    const files = await fs.readdir(tempDir);
    expect(files).toHaveLength(0);
  });
});
