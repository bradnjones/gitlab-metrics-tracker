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
});
