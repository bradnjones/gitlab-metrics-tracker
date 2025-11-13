/**
 * Tests for GetCacheStatusUseCase
 * Story V9.3: Cache Management UI - Use Case Tests
 *
 * @module test/core/use-cases/GetCacheStatusUseCase.test
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { GetCacheStatusUseCase } from '../../../src/lib/core/use-cases/GetCacheStatusUseCase.js';

describe('GetCacheStatusUseCase', () => {
  let mockCacheRepository;
  let useCase;

  beforeEach(() => {
    // Create mock cache repository
    mockCacheRepository = {
      getAllMetadata: jest.fn(),
      cacheTTL: 6, // Default 6 hours
    };

    // Create use case with mock repository
    useCase = new GetCacheStatusUseCase(mockCacheRepository);
  });

  // Test 1: Constructor requires cache repository
  test('constructor throws error when cacheRepository is not provided', () => {
    expect(() => {
      new GetCacheStatusUseCase(null);
    }).toThrow('cacheRepository is required');
  });

  // Test 2: Returns cache status with fresh iterations
  test('execute() returns cache status with fresh iterations', async () => {
    const now = Date.now();
    const mockMetadata = [
      {
        iterationId: 'gid://gitlab/Iteration/123',
        lastFetched: new Date(now - 0.5 * 3600 * 1000).toISOString(), // 0.5 hours ago
        fileSize: 45678,
      },
      {
        iterationId: 'gid://gitlab/Iteration/456',
        lastFetched: new Date(now - 0.3 * 3600 * 1000).toISOString(), // 0.3 hours ago
        fileSize: 52341,
      },
    ];

    mockCacheRepository.getAllMetadata.mockResolvedValue(mockMetadata);

    const result = await useCase.execute();

    // Verify structure
    expect(result).toHaveProperty('cacheTTL', 6);
    expect(result).toHaveProperty('totalCachedIterations', 2);
    expect(result).toHaveProperty('globalLastUpdated');
    expect(result).toHaveProperty('iterations');

    // Verify all iterations are fresh
    expect(result.iterations).toHaveLength(2);
    expect(result.iterations[0].status).toBe('fresh');
    expect(result.iterations[1].status).toBe('fresh');

    // Verify age calculations
    expect(result.iterations[0].ageHours).toBeCloseTo(0.5, 1);
    expect(result.iterations[1].ageHours).toBeCloseTo(0.3, 1);

    // Verify global last updated is most recent
    expect(result.globalLastUpdated).toBe(mockMetadata[1].lastFetched);
  });

  // Test 3: Returns cache status with aging iterations
  test('execute() returns cache status with aging iterations', async () => {
    const now = Date.now();
    const mockMetadata = [
      {
        iterationId: 'gid://gitlab/Iteration/123',
        lastFetched: new Date(now - 3 * 3600 * 1000).toISOString(), // 3 hours ago
        fileSize: 45678,
      },
      {
        iterationId: 'gid://gitlab/Iteration/456',
        lastFetched: new Date(now - 4.5 * 3600 * 1000).toISOString(), // 4.5 hours ago
        fileSize: 52341,
      },
    ];

    mockCacheRepository.getAllMetadata.mockResolvedValue(mockMetadata);

    const result = await useCase.execute();

    // Verify all iterations are aging
    expect(result.iterations[0].status).toBe('aging');
    expect(result.iterations[1].status).toBe('aging');

    // Verify age calculations
    expect(result.iterations[0].ageHours).toBeCloseTo(3, 1);
    expect(result.iterations[1].ageHours).toBeCloseTo(4.5, 1);
  });

  // Test 4: Returns cache status with stale iterations
  test('execute() returns cache status with stale iterations', async () => {
    const now = Date.now();
    const mockMetadata = [
      {
        iterationId: 'gid://gitlab/Iteration/123',
        lastFetched: new Date(now - 8 * 3600 * 1000).toISOString(), // 8 hours ago
        fileSize: 45678,
      },
      {
        iterationId: 'gid://gitlab/Iteration/456',
        lastFetched: new Date(now - 10 * 3600 * 1000).toISOString(), // 10 hours ago
        fileSize: 52341,
      },
    ];

    mockCacheRepository.getAllMetadata.mockResolvedValue(mockMetadata);

    const result = await useCase.execute();

    // Verify all iterations are stale
    expect(result.iterations[0].status).toBe('stale');
    expect(result.iterations[1].status).toBe('stale');

    // Verify age calculations
    expect(result.iterations[0].ageHours).toBeCloseTo(8, 1);
    expect(result.iterations[1].ageHours).toBeCloseTo(10, 1);
  });

  // Test 5: Returns cache status with mixed iteration statuses
  test('execute() returns cache status with mixed statuses', async () => {
    const now = Date.now();
    const mockMetadata = [
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
    ];

    mockCacheRepository.getAllMetadata.mockResolvedValue(mockMetadata);

    const result = await useCase.execute();

    // Verify mixed statuses
    expect(result.iterations[0].status).toBe('fresh');
    expect(result.iterations[1].status).toBe('aging');
    expect(result.iterations[2].status).toBe('stale');
  });

  // Test 6: Returns empty cache status when no iterations cached
  test('execute() returns empty cache status when no iterations exist', async () => {
    mockCacheRepository.getAllMetadata.mockResolvedValue([]);

    const result = await useCase.execute();

    // Verify empty state
    expect(result.cacheTTL).toBe(6);
    expect(result.totalCachedIterations).toBe(0);
    expect(result.globalLastUpdated).toBeNull();
    expect(result.iterations).toEqual([]);
  });

  // Test 7: Calculates globalLastUpdated correctly
  test('execute() calculates globalLastUpdated as most recent timestamp', async () => {
    const now = Date.now();
    const mostRecentTimestamp = new Date(now - 1 * 3600 * 1000).toISOString(); // 1 hour ago (most recent)

    const mockMetadata = [
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
    ];

    mockCacheRepository.getAllMetadata.mockResolvedValue(mockMetadata);

    const result = await useCase.execute();

    // Verify globalLastUpdated is the most recent
    expect(result.globalLastUpdated).toBe(mostRecentTimestamp);
  });

  // Test 8: Preserves iteration metadata (iterationId, fileSize)
  test('execute() preserves iteration metadata from repository', async () => {
    const now = Date.now();
    const mockMetadata = [
      {
        iterationId: 'gid://gitlab/Iteration/123',
        lastFetched: new Date(now - 0.5 * 3600 * 1000).toISOString(),
        fileSize: 45678,
      },
    ];

    mockCacheRepository.getAllMetadata.mockResolvedValue(mockMetadata);

    const result = await useCase.execute();

    // Verify metadata preserved
    expect(result.iterations[0].iterationId).toBe('gid://gitlab/Iteration/123');
    expect(result.iterations[0].lastFetched).toBe(mockMetadata[0].lastFetched);
    expect(result.iterations[0].fileSize).toBe(45678);
  });

  // Test 9: Status boundary condition (exactly 1 hour)
  test('execute() treats exactly 1 hour as aging (not fresh)', async () => {
    const now = Date.now();
    const mockMetadata = [
      {
        iterationId: 'gid://gitlab/Iteration/123',
        lastFetched: new Date(now - 1 * 3600 * 1000).toISOString(), // Exactly 1 hour ago
        fileSize: 45678,
      },
    ];

    mockCacheRepository.getAllMetadata.mockResolvedValue(mockMetadata);

    const result = await useCase.execute();

    // Verify exactly 1 hour is "aging" (not fresh)
    expect(result.iterations[0].ageHours).toBe(1.0);
    expect(result.iterations[0].status).toBe('aging');
  });

  // Test 10: Status boundary condition (exactly TTL)
  test('execute() treats exactly TTL age as stale (not aging)', async () => {
    const now = Date.now();
    const mockMetadata = [
      {
        iterationId: 'gid://gitlab/Iteration/123',
        lastFetched: new Date(now - 6 * 3600 * 1000).toISOString(), // Exactly 6 hours ago (TTL)
        fileSize: 45678,
      },
    ];

    mockCacheRepository.getAllMetadata.mockResolvedValue(mockMetadata);

    const result = await useCase.execute();

    // Verify exactly TTL is "stale" (not aging)
    expect(result.iterations[0].ageHours).toBe(6.0);
    expect(result.iterations[0].status).toBe('stale');
  });
});
