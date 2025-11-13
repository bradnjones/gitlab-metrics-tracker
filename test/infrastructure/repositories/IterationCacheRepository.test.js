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
});
