import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock graphql-request before importing GitLabClient
const mockRequest = jest.fn();
const mockGraphQLClient = jest.fn(() => ({
  request: mockRequest
}));

jest.unstable_mockModule('graphql-request', () => ({
  GraphQLClient: mockGraphQLClient
}));

// Import after mocking
const { GitLabClient } = await import('../../../src/lib/infrastructure/api/GitLabClient.js');

describe('GitLabClient', () => {
  beforeEach(() => {
    mockGraphQLClient.mockClear();
    mockRequest.mockClear();
  });

  describe('Constructor and Configuration Validation', () => {
    it('should initialize with valid configuration', () => {
      const config = {
        url: 'https://gitlab.com',
        token: 'test-token',
        projectPath: 'group/project'
      };

      const client = new GitLabClient(config);

      expect(client).toBeDefined();
      expect(mockGraphQLClient).toHaveBeenCalledWith(
        'https://gitlab.com/api/graphql',
        {
          headers: {
            Authorization: 'Bearer test-token'
          }
        }
      );
    });

    it('should use default GitLab URL if not provided', () => {
      const config = {
        token: 'test-token',
        projectPath: 'group/project'
      };

      const client = new GitLabClient(config);

      expect(client).toBeDefined();
      expect(mockGraphQLClient).toHaveBeenCalledWith(
        'https://gitlab.com/api/graphql',
        expect.any(Object)
      );
    });

    it('should throw error if token is missing', () => {
      const config = {
        url: 'https://gitlab.com',
        projectPath: 'group/project'
      };

      expect(() => new GitLabClient(config)).toThrow('GITLAB_TOKEN is required');
    });

    it('should throw error if projectPath is missing', () => {
      const config = {
        url: 'https://gitlab.com',
        token: 'test-token'
      };

      expect(() => new GitLabClient(config)).toThrow('GITLAB_PROJECT_PATH is required');
    });

    it('should initialize cache properties', () => {
      const config = {
        token: 'test-token',
        projectPath: 'group/project'
      };

      const client = new GitLabClient(config);

      expect(client._projectsCache).toBeNull();
      expect(client._projectsCacheTime).toBeNull();
      expect(client._cacheTimeout).toBe(600000); // 10 minutes in milliseconds
    });
  });

  describe('fetchProject', () => {
    let client;

    beforeEach(() => {
      client = new GitLabClient({
        token: 'test-token',
        projectPath: 'group/project'
      });
    });

    it('should fetch project metadata from GraphQL API', async () => {
      const mockProjectData = {
        project: {
          id: 'gid://gitlab/Project/123',
          name: 'Test Project',
          nameWithNamespace: 'Group / Test Project',
          path: 'project',
          pathWithNamespace: 'group/project',
          webUrl: 'https://gitlab.com/group/project',
          description: 'A test project'
        }
      };

      mockRequest.mockResolvedValue(mockProjectData);

      const result = await client.fetchProject();

      expect(result).toEqual(mockProjectData.project);
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('query getProject'),
        { fullPath: 'group/project' }
      );
    });

    it('should handle GraphQL errors gracefully', async () => {
      const mockError = {
        response: {
          errors: [
            { message: 'Project not found' }
          ]
        }
      };

      mockRequest.mockRejectedValue(mockError);

      await expect(client.fetchProject()).rejects.toThrow('Project not found');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockRequest.mockRejectedValue(networkError);

      await expect(client.fetchProject()).rejects.toThrow('Network error');
    });
  });

  describe('fetchIterations', () => {
    let client;

    beforeEach(() => {
      client = new GitLabClient({
        token: 'test-token',
        projectPath: 'group/project'
      });
      // Mock the delay method to avoid actual delays in tests
      client.delay = jest.fn().mockResolvedValue(undefined);
    });

    it('should fetch iterations with pagination (multiple pages)', async () => {
      // Mock page 1 response
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          iterations: {
            nodes: [
              { id: '1', iid: '1', title: 'Sprint 1', state: 'opened' }
            ],
            pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
          }
        }
      });

      // Mock page 2 response
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          iterations: {
            nodes: [
              { id: '2', iid: '2', title: 'Sprint 2', state: 'closed' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchIterations();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Sprint 1');
      expect(result[1].title).toBe('Sprint 2');
      expect(mockRequest).toHaveBeenCalledTimes(2);

      // First call with no cursor
      expect(mockRequest).toHaveBeenNthCalledWith(1,
        expect.stringContaining('query getIterations'),
        { fullPath: 'group/project', after: null }
      );

      // Second call with cursor
      expect(mockRequest).toHaveBeenNthCalledWith(2,
        expect.stringContaining('query getIterations'),
        { fullPath: 'group/project', after: 'cursor1' }
      );

      // Delay called once (between pages)
      expect(client.delay).toHaveBeenCalledTimes(1);
      expect(client.delay).toHaveBeenCalledWith(100);
    });

    it('should handle single page response (no pagination needed)', async () => {
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          iterations: {
            nodes: [
              { id: '1', iid: '1', title: 'Sprint 1', state: 'opened' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchIterations();

      expect(result).toHaveLength(1);
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(client.delay).not.toHaveBeenCalled();
    });

    it('should fallback to parent group if group not found', async () => {
      // First attempt: project path fails
      mockRequest.mockResolvedValueOnce({
        group: null
      });

      // Second attempt: parent group succeeds
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          iterations: {
            nodes: [
              { id: '1', iid: '1', title: 'Sprint 1', state: 'opened' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchIterations();

      expect(result).toHaveLength(1);
      expect(mockRequest).toHaveBeenCalledTimes(2);

      // First call with full project path
      expect(mockRequest).toHaveBeenNthCalledWith(1,
        expect.stringContaining('query getIterations'),
        { fullPath: 'group/project', after: null }
      );

      // Second call with parent group
      expect(mockRequest).toHaveBeenNthCalledWith(2,
        expect.stringContaining('query getIterations'),
        { fullPath: 'group', after: null }
      );
    });

    it('should return empty array if iterations not configured', async () => {
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          iterations: null
        }
      });

      const result = await client.fetchIterations();

      expect(result).toEqual([]);
    });

    it('should throw error if group not found and no parent available', async () => {
      mockRequest.mockResolvedValueOnce({
        group: null
      });

      const clientSinglePath = new GitLabClient({
        token: 'test-token',
        projectPath: 'single-group'
      });
      clientSinglePath.delay = jest.fn().mockResolvedValue(undefined);

      await expect(clientSinglePath.fetchIterations()).rejects.toThrow(
        'Group not found: single-group'
      );
    });

    it('should handle GraphQL errors', async () => {
      const mockError = {
        response: {
          errors: [
            { message: 'Unauthorized' }
          ]
        }
      };

      mockRequest.mockRejectedValue(mockError);

      await expect(client.fetchIterations()).rejects.toThrow('GitLab API Error: Unauthorized');
    });
  });

  describe('fetchGroupProjects (with cache)', () => {
    let client;
    let dateNowSpy;

    beforeEach(() => {
      client = new GitLabClient({
        token: 'test-token',
        projectPath: 'group/project'
      });
      // Mock the delay method to avoid actual delays in tests
      client.delay = jest.fn().mockResolvedValue(undefined);

      // Mock Date.now() for cache time control
      dateNowSpy = jest.spyOn(Date, 'now');
    });

    afterEach(() => {
      dateNowSpy.mockRestore();
    });

    it('should fetch group projects on cache miss (first fetch)', async () => {
      const mockProjectsData = {
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          projects: {
            nodes: [
              { id: 'gid://gitlab/Project/1', fullPath: 'group/project1', name: 'Project 1' },
              { id: 'gid://gitlab/Project/2', fullPath: 'group/project2', name: 'Project 2' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      };

      dateNowSpy.mockReturnValue(1000000);
      mockRequest.mockResolvedValueOnce(mockProjectsData);

      const result = await client.fetchGroupProjects();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project 1');
      expect(result[1].name).toBe('Project 2');
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('query getGroupProjects'),
        { fullPath: 'group/project', after: null }
      );

      // Verify cache was populated
      expect(client._projectsCache).toEqual(result);
      expect(client._projectsCacheTime).toBe(1000000);
    });

    it('should return cached data on cache hit (data fresh, < 10 min)', async () => {
      const cachedProjects = [
        { id: 'gid://gitlab/Project/1', fullPath: 'group/project1', name: 'Cached Project 1' },
        { id: 'gid://gitlab/Project/2', fullPath: 'group/project2', name: 'Cached Project 2' }
      ];

      // Set up cache with data at time 1000000
      client._projectsCache = cachedProjects;
      client._projectsCacheTime = 1000000;

      // Current time is 5 minutes later (300000 ms = 5 min < 10 min timeout)
      dateNowSpy.mockReturnValue(1000000 + 300000);

      const result = await client.fetchGroupProjects();

      // Should return cached data
      expect(result).toEqual(cachedProjects);
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('should refetch when cache is stale (> 10 min)', async () => {
      const cachedProjects = [
        { id: 'gid://gitlab/Project/1', fullPath: 'group/project1', name: 'Cached Project 1' }
      ];

      const freshProjects = {
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          projects: {
            nodes: [
              { id: 'gid://gitlab/Project/3', fullPath: 'group/project3', name: 'Fresh Project 3' },
              { id: 'gid://gitlab/Project/4', fullPath: 'group/project4', name: 'Fresh Project 4' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      };

      // Set up stale cache at time 1000000
      client._projectsCache = cachedProjects;
      client._projectsCacheTime = 1000000;

      // Current time is 11 minutes later (660000 ms = 11 min > 10 min timeout)
      dateNowSpy.mockReturnValue(1000000 + 660000);
      mockRequest.mockResolvedValueOnce(freshProjects);

      const result = await client.fetchGroupProjects();

      // Should fetch fresh data
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Fresh Project 3');
      expect(result[1].name).toBe('Fresh Project 4');
      expect(mockRequest).toHaveBeenCalledTimes(1);

      // Verify cache was updated
      expect(client._projectsCache).toEqual(result);
      expect(client._projectsCacheTime).toBe(1000000 + 660000);
    });

    it('should bypass cache when useCache is false', async () => {
      const cachedProjects = [
        { id: 'gid://gitlab/Project/1', fullPath: 'group/project1', name: 'Cached Project 1' }
      ];

      const freshProjects = {
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          projects: {
            nodes: [
              { id: 'gid://gitlab/Project/5', fullPath: 'group/project5', name: 'Bypassed Cache Project' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      };

      // Set up fresh cache (only 1 minute old)
      client._projectsCache = cachedProjects;
      client._projectsCacheTime = 1000000;
      dateNowSpy.mockReturnValue(1000000 + 60000); // 1 minute later

      mockRequest.mockResolvedValueOnce(freshProjects);

      // Call with useCache = false
      const result = await client.fetchGroupProjects(false);

      // Should fetch fresh data despite valid cache
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bypassed Cache Project');
      expect(mockRequest).toHaveBeenCalledTimes(1);

      // Verify cache was still updated
      expect(client._projectsCache).toEqual(result);
      expect(client._projectsCacheTime).toBe(1000000 + 60000);
    });

    it('should handle pagination with multiple pages', async () => {
      // Mock page 1 response
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          projects: {
            nodes: [
              { id: 'gid://gitlab/Project/1', fullPath: 'group/project1', name: 'Project 1' }
            ],
            pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
          }
        }
      });

      // Mock page 2 response
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          projects: {
            nodes: [
              { id: 'gid://gitlab/Project/2', fullPath: 'group/project2', name: 'Project 2' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      dateNowSpy.mockReturnValue(1000000);

      const result = await client.fetchGroupProjects();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project 1');
      expect(result[1].name).toBe('Project 2');
      expect(mockRequest).toHaveBeenCalledTimes(2);

      // First call with no cursor
      expect(mockRequest).toHaveBeenNthCalledWith(1,
        expect.stringContaining('query getGroupProjects'),
        { fullPath: 'group/project', after: null }
      );

      // Second call with cursor
      expect(mockRequest).toHaveBeenNthCalledWith(2,
        expect.stringContaining('query getGroupProjects'),
        { fullPath: 'group/project', after: 'cursor1' }
      );

      // Delay called once (between pages)
      expect(client.delay).toHaveBeenCalledTimes(1);
      expect(client.delay).toHaveBeenCalledWith(100);
    });

    it('should return empty array if group not found', async () => {
      mockRequest.mockResolvedValueOnce({
        group: null
      });

      dateNowSpy.mockReturnValue(1000000);

      const result = await client.fetchGroupProjects();

      expect(result).toEqual([]);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should handle GraphQL errors and return empty array', async () => {
      const mockError = {
        response: {
          errors: [
            { message: 'Forbidden' }
          ]
        }
      };

      mockRequest.mockRejectedValue(mockError);
      dateNowSpy.mockReturnValue(1000000);

      const result = await client.fetchGroupProjects();

      expect(result).toEqual([]);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchIterationDetails', () => {
    let client;

    beforeEach(() => {
      client = new GitLabClient({
        token: 'test-token',
        projectPath: 'group/project'
      });
      // Mock the delay method to avoid actual delays in tests
      client.delay = jest.fn().mockResolvedValue(undefined);
    });

    it('should fetch issues for a specific iteration', async () => {
      const mockIterationData = {
        group: {
          id: 'gid://gitlab/Group/1',
          issues: {
            nodes: [
              {
                id: 'gid://gitlab/Issue/1',
                iid: '101',
                title: 'Issue 1',
                state: 'closed',
                createdAt: '2025-01-01T00:00:00Z',
                closedAt: '2025-01-05T00:00:00Z',
                weight: 3,
                labels: { nodes: [{ title: 'bug' }] },
                assignees: { nodes: [{ username: 'user1' }] }
              },
              {
                id: 'gid://gitlab/Issue/2',
                iid: '102',
                title: 'Issue 2',
                state: 'opened',
                createdAt: '2025-01-02T00:00:00Z',
                closedAt: null,
                weight: 5,
                labels: { nodes: [{ title: 'feature' }] },
                assignees: { nodes: [{ username: 'user2' }] }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      };

      mockRequest.mockResolvedValueOnce(mockIterationData);

      const result = await client.fetchIterationDetails('gid://gitlab/Iteration/123');

      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('mergeRequests');
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].title).toBe('Issue 1');
      expect(result.issues[1].title).toBe('Issue 2');
      expect(result.mergeRequests).toEqual([]);
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('query getIterationDetails'),
        {
          fullPath: 'group/project',
          iterationId: ['gid://gitlab/Iteration/123'],
          after: null
        }
      );
    });

    it('should handle pagination for iteration issues', async () => {
      // Mock page 1 response
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          issues: {
            nodes: [
              { id: 'gid://gitlab/Issue/1', iid: '101', title: 'Issue 1', state: 'closed', createdAt: '2025-01-01T00:00:00Z', closedAt: '2025-01-05T00:00:00Z', weight: 3, labels: { nodes: [] }, assignees: { nodes: [] } }
            ],
            pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
          }
        }
      });

      // Mock page 2 response
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          issues: {
            nodes: [
              { id: 'gid://gitlab/Issue/2', iid: '102', title: 'Issue 2', state: 'opened', createdAt: '2025-01-02T00:00:00Z', closedAt: null, weight: 5, labels: { nodes: [] }, assignees: { nodes: [] } }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchIterationDetails('gid://gitlab/Iteration/123');

      expect(result.issues).toHaveLength(2);
      expect(mockRequest).toHaveBeenCalledTimes(2);

      // First call with no cursor
      expect(mockRequest).toHaveBeenNthCalledWith(1,
        expect.stringContaining('query getIterationDetails'),
        { fullPath: 'group/project', iterationId: ['gid://gitlab/Iteration/123'], after: null }
      );

      // Second call with cursor
      expect(mockRequest).toHaveBeenNthCalledWith(2,
        expect.stringContaining('query getIterationDetails'),
        { fullPath: 'group/project', iterationId: ['gid://gitlab/Iteration/123'], after: 'cursor1' }
      );

      // Delay called once (between pages)
      expect(client.delay).toHaveBeenCalledTimes(1);
      expect(client.delay).toHaveBeenCalledWith(100);
    });

    it('should throw error if group not found', async () => {
      mockRequest.mockResolvedValueOnce({
        group: null
      });

      await expect(client.fetchIterationDetails('gid://gitlab/Iteration/123')).rejects.toThrow(
        'Group not found: group/project'
      );
    });

    it('should handle GraphQL errors', async () => {
      const mockError = {
        response: {
          errors: [
            { message: 'Invalid iteration ID' }
          ]
        }
      };

      mockRequest.mockRejectedValue(mockError);

      await expect(client.fetchIterationDetails('invalid-id')).rejects.toThrow(
        'Failed to fetch iteration details: Invalid iteration ID'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      mockRequest.mockRejectedValue(networkError);

      await expect(client.fetchIterationDetails('gid://gitlab/Iteration/123')).rejects.toThrow(
        'Failed to fetch iteration details: Network timeout'
      );
    });
  });

  describe('fetchMergeRequestsForGroup', () => {
    let client;

    beforeEach(() => {
      client = new GitLabClient({
        token: 'test-token',
        projectPath: 'group/project'
      });
      // Mock the delay method to avoid actual delays in tests
      client.delay = jest.fn().mockResolvedValue(undefined);
    });

    it('should fetch merged MRs within date range', async () => {
      const mockMRData = {
        group: {
          id: 'gid://gitlab/Group/1',
          mergeRequests: {
            nodes: [
              {
                id: 'gid://gitlab/MergeRequest/1',
                iid: '10',
                title: 'Feature A',
                state: 'merged',
                createdAt: '2025-01-01T00:00:00Z',
                mergedAt: '2025-01-02T00:00:00Z',
                targetBranch: 'main',
                sourceBranch: 'feature-a',
                project: { fullPath: 'group/project1', name: 'Project 1' },
                commits: {
                  nodes: [
                    { id: 'gid://gitlab/Commit/1', sha: 'abc123', committedDate: '2025-01-01T12:00:00Z' }
                  ]
                }
              },
              {
                id: 'gid://gitlab/MergeRequest/2',
                iid: '11',
                title: 'Feature B',
                state: 'merged',
                createdAt: '2025-01-03T00:00:00Z',
                mergedAt: '2025-01-04T00:00:00Z',
                targetBranch: 'main',
                sourceBranch: 'feature-b',
                project: { fullPath: 'group/project2', name: 'Project 2' },
                commits: {
                  nodes: [
                    { id: 'gid://gitlab/Commit/2', sha: 'def456', committedDate: '2025-01-03T12:00:00Z' }
                  ]
                }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      };

      mockRequest.mockResolvedValueOnce(mockMRData);

      const result = await client.fetchMergeRequestsForGroup('2025-01-01', '2025-01-10');

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Feature A');
      expect(result[0].targetBranch).toBe('main');
      expect(result[1].title).toBe('Feature B');
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('query getGroupMergeRequests'),
        {
          fullPath: 'group/project',
          after: null,
          mergedAfter: new Date('2025-01-01').toISOString(),
          mergedBefore: new Date('2025-01-10').toISOString()
        }
      );
    });

    it('should handle pagination for merge requests', async () => {
      // Mock page 1 response
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          mergeRequests: {
            nodes: [
              {
                id: 'gid://gitlab/MergeRequest/1',
                iid: '10',
                title: 'MR 1',
                state: 'merged',
                createdAt: '2025-01-01T00:00:00Z',
                mergedAt: '2025-01-02T00:00:00Z',
                targetBranch: 'main',
                sourceBranch: 'feature-1',
                project: { fullPath: 'group/project1', name: 'Project 1' },
                commits: { nodes: [] }
              }
            ],
            pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
          }
        }
      });

      // Mock page 2 response
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          mergeRequests: {
            nodes: [
              {
                id: 'gid://gitlab/MergeRequest/2',
                iid: '11',
                title: 'MR 2',
                state: 'merged',
                createdAt: '2025-01-03T00:00:00Z',
                mergedAt: '2025-01-04T00:00:00Z',
                targetBranch: 'main',
                sourceBranch: 'feature-2',
                project: { fullPath: 'group/project2', name: 'Project 2' },
                commits: { nodes: [] }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchMergeRequestsForGroup('2025-01-01', '2025-01-10');

      expect(result).toHaveLength(2);
      expect(mockRequest).toHaveBeenCalledTimes(2);

      // First call with no cursor
      expect(mockRequest).toHaveBeenNthCalledWith(1,
        expect.stringContaining('query getGroupMergeRequests'),
        expect.objectContaining({ after: null })
      );

      // Second call with cursor
      expect(mockRequest).toHaveBeenNthCalledWith(2,
        expect.stringContaining('query getGroupMergeRequests'),
        expect.objectContaining({ after: 'cursor1' })
      );

      // Delay called once (between pages)
      expect(client.delay).toHaveBeenCalledTimes(1);
      expect(client.delay).toHaveBeenCalledWith(100);
    });

    it('should throw error if group not found', async () => {
      mockRequest.mockResolvedValueOnce({
        group: null
      });

      await expect(client.fetchMergeRequestsForGroup('2025-01-01', '2025-01-10')).rejects.toThrow(
        'Group not found: group/project'
      );
    });

    it('should return empty array if mergeRequests is null', async () => {
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          mergeRequests: null
        }
      });

      const result = await client.fetchMergeRequestsForGroup('2025-01-01', '2025-01-10');

      expect(result).toEqual([]);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should handle GraphQL errors', async () => {
      const mockError = {
        response: {
          errors: [
            { message: 'Insufficient permissions' }
          ]
        }
      };

      mockRequest.mockRejectedValue(mockError);

      await expect(client.fetchMergeRequestsForGroup('2025-01-01', '2025-01-10')).rejects.toThrow(
        'Failed to fetch merge requests: Insufficient permissions'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Connection timeout');
      mockRequest.mockRejectedValue(networkError);

      await expect(client.fetchMergeRequestsForGroup('2025-01-01', '2025-01-10')).rejects.toThrow(
        'Failed to fetch merge requests: Connection timeout'
      );
    });
  });
});
