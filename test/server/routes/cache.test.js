/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';
import { ServiceFactory } from '../../../src/server/services/ServiceFactory.js';

describe('DELETE /api/cache', () => {
  let app;
  let mockCacheRepository;

  beforeEach(() => {
    // Create mock cache repository
    mockCacheRepository = {
      clearAll: jest.fn(),
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
});
