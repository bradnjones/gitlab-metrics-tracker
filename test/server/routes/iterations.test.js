/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';

// Mock the ServiceFactory
jest.mock('../../../src/server/services/ServiceFactory.js');

import { ServiceFactory } from '../../../src/server/services/ServiceFactory.js';

describe('GET /api/iterations', () => {
  let app;
  let mockGitLabClient;

  beforeEach(() => {
    // Create mock GitLabClient
    mockGitLabClient = {
      fetchIterations: jest.fn(),
    };

    // Mock ServiceFactory to return our mock client
    ServiceFactory.createGitLabClient = jest.fn().mockReturnValue(mockGitLabClient);

    // Create app
    app = createApp();
  });

  it('should return list of available iterations from GitLab', async () => {
    const mockIterations = [
      {
        id: 'gid://gitlab/Iteration/123',
        iid: 1,
        title: 'Sprint 23',
        state: 'current',
        startDate: '2024-10-01',
        dueDate: '2024-10-14',
        iterationCadence: {
          id: 'gid://gitlab/Iterations::Cadence/5',
          title: 'Bi-weekly Sprints'
        }
      },
      {
        id: 'gid://gitlab/Iteration/122',
        iid: 2,
        title: 'Sprint 22',
        state: 'closed',
        startDate: '2024-09-17',
        dueDate: '2024-09-30',
        iterationCadence: {
          id: 'gid://gitlab/Iterations::Cadence/5',
          title: 'Bi-weekly Sprints'
        }
      }
    ];

    mockGitLabClient.fetchIterations.mockResolvedValue(mockIterations);

    const response = await request(app)
      .get('/api/iterations')
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify GitLab client was called
    expect(mockGitLabClient.fetchIterations).toHaveBeenCalledTimes(1);

    // Verify response structure
    expect(response.body).toEqual({
      iterations: mockIterations,
      count: 2
    });
  });

  it('should return 500 when GitLab API fails', async () => {
    mockGitLabClient.fetchIterations.mockRejectedValue(
      new Error('GitLab API Error: 401 Unauthorized')
    );

    const response = await request(app)
      .get('/api/iterations')
      .expect('Content-Type', /json/)
      .expect(500);

    // Verify error response structure
    expect(response.body).toEqual({
      error: {
        message: 'Failed to fetch iterations',
        details: 'GitLab API Error: 401 Unauthorized'
      }
    });
  });

  it('should return empty array when no iterations configured', async () => {
    mockGitLabClient.fetchIterations.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/iterations')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({
      iterations: [],
      count: 0
    });
  });

  it('should format iteration response with id, title, state, dates', async () => {
    const mockIterations = [
      {
        id: 'gid://gitlab/Iteration/123',
        iid: 1,
        title: 'Sprint 23',
        description: 'Q4 2024 Sprint',
        state: 'current',
        startDate: '2024-10-01',
        dueDate: '2024-10-14',
        createdAt: '2024-09-15T10:00:00Z',
        updatedAt: '2024-10-01T09:00:00Z',
        webUrl: 'https://gitlab.com/groups/my-group/-/cadences/5/iterations/123',
        iterationCadence: {
          id: 'gid://gitlab/Iterations::Cadence/5',
          title: 'Bi-weekly Sprints'
        }
      }
    ];

    mockGitLabClient.fetchIterations.mockResolvedValue(mockIterations);

    const response = await request(app)
      .get('/api/iterations')
      .expect(200);

    // Verify all expected fields are present
    expect(response.body.iterations[0]).toEqual(
      expect.objectContaining({
        id: 'gid://gitlab/Iteration/123',
        title: 'Sprint 23',
        state: 'current',
        startDate: '2024-10-01',
        dueDate: '2024-10-14',
      })
    );

    // Verify iteration cadence is preserved
    expect(response.body.iterations[0].iterationCadence).toEqual({
      id: 'gid://gitlab/Iterations::Cadence/5',
      title: 'Bi-weekly Sprints'
    });
  });
});
