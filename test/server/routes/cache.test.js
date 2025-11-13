/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';
import { ServiceFactory } from '../../../src/server/services/ServiceFactory.js';

describe('Cache API', () => {
  let app;
  let mockCacheRepository;

  beforeEach(() => {
    // Create mock cache repository
    mockCacheRepository = {
      clearAll: jest.fn(),
      getAllMetadata: jest.fn(),
      cacheTTL: 6, // Default 6 hours
    };

    // Mock ServiceFactory to return our mock cache repository
    ServiceFactory.createIterationCacheRepository = jest.fn().mockReturnValue(mockCacheRepository);

    // Create app
    app = createApp();
  });

  // Test 9: DELETE /api/cache clears all cache files and returns 204
  it('should clear all cache files and return 204 No Content', async () => {
    // Mock successful cache clear
    mockCacheRepository.clearAll.mockResolvedValue();

    const response = await request(app)
      .delete('/api/cache')
      .expect(204);

    // Verify cache repository clearAll was called
    expect(mockCacheRepository.clearAll).toHaveBeenCalledTimes(1);

    // Verify no body returned (204 No Content)
    expect(response.body).toEqual({});
    expect(response.text).toBe('');
  });

  // Test 10: DELETE /api/cache returns 500 on error
  it('should return 500 when cache clear fails', async () => {
    // Mock cache clear failure
    mockCacheRepository.clearAll.mockRejectedValue(new Error('Disk error'));

    const response = await request(app)
      .delete('/api/cache')
      .expect('Content-Type', /json/)
      .expect(500);

    // Verify error response structure
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Failed to clear cache');
    expect(response.body.message).toContain('Disk error');
  });

  // Test 11: GET /api/cache/status returns cache metadata with status indicators
  it('should return cache metadata with fresh/aging/stale status', async () => {
    const now = Date.now();

    // Mock cache metadata with different ages
    mockCacheRepository.getAllMetadata.mockResolvedValue([
      {
        iterationId: 'gid://gitlab/Iteration/123',
        lastFetched: new Date(now - 0.5 * 3600 * 1000).toISOString(), // 0.5 hours ago (fresh)
        fileSize: 45678,
      },
      {
        iterationId: 'gid://gitlab/Iteration/456',
        lastFetched: new Date(now - 3 * 3600 * 1000).toISOString(), // 3 hours ago (aging)
        fileSize: 52341,
      },
      {
        iterationId: 'gid://gitlab/Iteration/789',
        lastFetched: new Date(now - 8 * 3600 * 1000).toISOString(), // 8 hours ago (stale)
        fileSize: 38912,
      },
    ]);

    const response = await request(app)
      .get('/api/cache/status')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response structure
    expect(response.body).toHaveProperty('cacheTTL', 6);
    expect(response.body).toHaveProperty('totalCachedIterations', 3);
    expect(response.body).toHaveProperty('globalLastUpdated');
    expect(response.body).toHaveProperty('iterations');
    expect(response.body.iterations).toHaveLength(3);

    // Verify status calculations
    const [fresh, aging, stale] = response.body.iterations;

    expect(fresh.iterationId).toBe('gid://gitlab/Iteration/123');
    expect(fresh.status).toBe('fresh');
    expect(fresh.ageHours).toBeCloseTo(0.5, 1);

    expect(aging.iterationId).toBe('gid://gitlab/Iteration/456');
    expect(aging.status).toBe('aging');
    expect(aging.ageHours).toBeCloseTo(3, 1);

    expect(stale.iterationId).toBe('gid://gitlab/Iteration/789');
    expect(stale.status).toBe('stale');
    expect(stale.ageHours).toBeCloseTo(8, 1);

    // Verify repository method was called
    expect(mockCacheRepository.getAllMetadata).toHaveBeenCalledTimes(1);
  });

  // Test 12: GET /api/cache/status returns empty array when no cache exists
  it('should return empty iterations array when no cache exists', async () => {
    // Mock empty cache
    mockCacheRepository.getAllMetadata.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/cache/status')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify response structure
    expect(response.body).toHaveProperty('cacheTTL', 6);
    expect(response.body).toHaveProperty('totalCachedIterations', 0);
    expect(response.body).toHaveProperty('globalLastUpdated', null);
    expect(response.body).toHaveProperty('iterations');
    expect(response.body.iterations).toHaveLength(0);

    // Verify repository method was called
    expect(mockCacheRepository.getAllMetadata).toHaveBeenCalledTimes(1);
  });

  // Test 13: GET /api/cache/status calculates globalLastUpdated as most recent timestamp
  it('should calculate globalLastUpdated as most recent cache timestamp', async () => {
    const now = Date.now();
    const mostRecentTimestamp = new Date(now - 1 * 3600 * 1000).toISOString(); // 1 hour ago

    // Mock cache metadata
    mockCacheRepository.getAllMetadata.mockResolvedValue([
      {
        iterationId: 'gid://gitlab/Iteration/123',
        lastFetched: new Date(now - 5 * 3600 * 1000).toISOString(), // 5 hours ago
        fileSize: 45678,
      },
      {
        iterationId: 'gid://gitlab/Iteration/456',
        lastFetched: mostRecentTimestamp, // 1 hour ago (most recent)
        fileSize: 52341,
      },
      {
        iterationId: 'gid://gitlab/Iteration/789',
        lastFetched: new Date(now - 3 * 3600 * 1000).toISOString(), // 3 hours ago
        fileSize: 38912,
      },
    ]);

    const response = await request(app)
      .get('/api/cache/status')
      .expect(200);

    // Verify globalLastUpdated is the most recent timestamp
    expect(response.body.globalLastUpdated).toBe(mostRecentTimestamp);
  });

  // Test 14: GET /api/cache/status returns 500 on repository error
  it('should return 500 when getting cache metadata fails', async () => {
    // Mock repository error
    mockCacheRepository.getAllMetadata.mockRejectedValue(new Error('File system error'));

    const response = await request(app)
      .get('/api/cache/status')
      .expect('Content-Type', /json/)
      .expect(500);

    // Verify error response structure
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Failed to get cache status');
    expect(response.body.message).toContain('File system error');
  });
});
