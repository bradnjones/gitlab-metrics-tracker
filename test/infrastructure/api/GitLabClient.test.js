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

  describe('fetchGroupProjects', () => {
    let client;

    beforeEach(() => {
      client = new GitLabClient({
        token: 'test-token',
        projectPath: 'group/project'
      });
      // Mock the delay method to avoid actual delays in tests
      client.delay = jest.fn().mockResolvedValue(undefined);
    });

    it('should fetch group projects', async () => {
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

      // Mock fetchIterations and fetchMergeRequestsForGroup (called by fetchIterationDetails)
      jest.spyOn(client, 'fetchIterations').mockResolvedValue([
        { id: 'gid://gitlab/Iteration/123', title: 'Sprint 1', startDate: '2025-01-01', dueDate: '2025-01-14' }
      ]);
      jest.spyOn(client, 'fetchMergeRequestsForGroup').mockResolvedValue([]);

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
          after: null,
          not: { types: ['INCIDENT'] }
        }
      );
    });

    it('should handle pagination for iteration issues', async () => {
      // Mock fetchIterations and fetchMergeRequestsForGroup (called by fetchIterationDetails)
      jest.spyOn(client, 'fetchIterations').mockResolvedValue([
        { id: 'gid://gitlab/Iteration/123', title: 'Sprint 1', startDate: '2025-01-01', dueDate: '2025-01-14' }
      ]);
      jest.spyOn(client, 'fetchMergeRequestsForGroup').mockResolvedValue([]);

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
        { fullPath: 'group/project', iterationId: ['gid://gitlab/Iteration/123'], after: null, not: { types: ['INCIDENT'] } }
      );

      // Second call with cursor
      expect(mockRequest).toHaveBeenNthCalledWith(2,
        expect.stringContaining('query getIterationDetails'),
        { fullPath: 'group/project', iterationId: ['gid://gitlab/Iteration/123'], after: 'cursor1', not: { types: ['INCIDENT'] } }
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

  describe('Status parsing from notes', () => {
    let client;

    beforeEach(() => {
      client = new GitLabClient({
        token: 'test-token',
        projectPath: 'group/project'
      });
    });

    describe('parseStatusChanges', () => {
      it('should parse status changes from system notes', () => {
        const notes = [
          {
            id: 'note-1',
            body: 'set status to **To Refine**',
            system: true,
            systemNoteMetadata: { action: 'work_item_status' },
            createdAt: '2025-10-30T21:14:41Z'
          },
          {
            id: 'note-2',
            body: 'set status to **In progress**',
            system: true,
            systemNoteMetadata: { action: 'work_item_status' },
            createdAt: '2025-11-03T15:27:49Z'
          },
          {
            id: 'note-3',
            body: 'This is a user comment',
            system: false,
            systemNoteMetadata: null,
            createdAt: '2025-11-03T16:00:00Z'
          }
        ];

        const result = client.parseStatusChanges(notes);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          status: 'To Refine',
          timestamp: '2025-10-30T21:14:41Z',
          body: 'set status to **To Refine**'
        });
        expect(result[1]).toEqual({
          status: 'In progress',
          timestamp: '2025-11-03T15:27:49Z',
          body: 'set status to **In progress**'
        });
      });

      it('should filter out non-system notes', () => {
        const notes = [
          {
            id: 'note-1',
            body: 'User comment',
            system: false,
            systemNoteMetadata: null,
            createdAt: '2025-11-03T16:00:00Z'
          }
        ];

        const result = client.parseStatusChanges(notes);

        expect(result).toHaveLength(0);
      });

      it('should filter out system notes that are not status changes', () => {
        const notes = [
          {
            id: 'note-1',
            body: 'changed title',
            system: true,
            systemNoteMetadata: { action: 'title' },
            createdAt: '2025-11-03T16:00:00Z'
          }
        ];

        const result = client.parseStatusChanges(notes);

        expect(result).toHaveLength(0);
      });

      it('should handle notes without systemNoteMetadata', () => {
        const notes = [
          {
            id: 'note-1',
            body: 'set status to **Done**',
            system: true,
            systemNoteMetadata: null,
            createdAt: '2025-11-03T16:00:00Z'
          }
        ];

        const result = client.parseStatusChanges(notes);

        expect(result).toHaveLength(0);
      });

      it('should sort status changes chronologically', () => {
        const notes = [
          {
            id: 'note-2',
            body: 'set status to **Done**',
            system: true,
            systemNoteMetadata: { action: 'work_item_status' },
            createdAt: '2025-11-05T10:00:00Z'
          },
          {
            id: 'note-1',
            body: 'set status to **In progress**',
            system: true,
            systemNoteMetadata: { action: 'work_item_status' },
            createdAt: '2025-11-03T15:27:49Z'
          }
        ];

        const result = client.parseStatusChanges(notes);

        expect(result).toHaveLength(2);
        expect(result[0].status).toBe('In progress');
        expect(result[1].status).toBe('Done');
      });
    });

    describe('isInProgressStatus', () => {
      it('should match "In progress" (case insensitive)', () => {
        expect(client.isInProgressStatus('In progress')).toBe(true);
        expect(client.isInProgressStatus('in progress')).toBe(true);
        expect(client.isInProgressStatus('IN PROGRESS')).toBe(true);
      });

      it('should match "In-progress" with hyphen', () => {
        expect(client.isInProgressStatus('In-progress')).toBe(true);
        expect(client.isInProgressStatus('in-progress')).toBe(true);
      });

      it('should match "WIP"', () => {
        expect(client.isInProgressStatus('WIP')).toBe(true);
        expect(client.isInProgressStatus('wip')).toBe(true);
      });

      it('should match "working"', () => {
        expect(client.isInProgressStatus('working')).toBe(true);
        expect(client.isInProgressStatus('Working')).toBe(true);
      });

      it('should not match other statuses', () => {
        expect(client.isInProgressStatus('Done')).toBe(false);
        expect(client.isInProgressStatus('To Refine')).toBe(false);
        expect(client.isInProgressStatus('Blocked')).toBe(false);
        expect(client.isInProgressStatus('Closed')).toBe(false);
      });
    });

    describe('extractInProgressTimestamp', () => {
      it('should extract first "In progress" timestamp', () => {
        const notes = [
          {
            id: 'note-1',
            body: 'set status to **To Refine**',
            system: true,
            systemNoteMetadata: { action: 'work_item_status' },
            createdAt: '2025-10-30T21:14:41Z'
          },
          {
            id: 'note-2',
            body: 'set status to **In progress**',
            system: true,
            systemNoteMetadata: { action: 'work_item_status' },
            createdAt: '2025-11-03T15:27:49Z'
          },
          {
            id: 'note-3',
            body: 'set status to **Blocked**',
            system: true,
            systemNoteMetadata: { action: 'work_item_status' },
            createdAt: '2025-11-03T17:23:06Z'
          },
          {
            id: 'note-4',
            body: 'set status to **In progress**',
            system: true,
            systemNoteMetadata: { action: 'work_item_status' },
            createdAt: '2025-11-03T22:03:04Z'
          }
        ];

        const result = client.extractInProgressTimestamp(notes);

        expect(result).toBe('2025-11-03T15:27:49Z');
      });

      it('should return null if no "In progress" status found', () => {
        const notes = [
          {
            id: 'note-1',
            body: 'set status to **To Refine**',
            system: true,
            systemNoteMetadata: { action: 'work_item_status' },
            createdAt: '2025-10-30T21:14:41Z'
          },
          {
            id: 'note-2',
            body: 'set status to **Done**',
            system: true,
            systemNoteMetadata: { action: 'work_item_status' },
            createdAt: '2025-11-07T17:12:44Z'
          }
        ];

        const result = client.extractInProgressTimestamp(notes);

        expect(result).toBeNull();
      });

      it('should return null for empty notes array', () => {
        const result = client.extractInProgressTimestamp([]);

        expect(result).toBeNull();
      });

      it('should handle case variations of "In progress"', () => {
        const notes = [
          {
            id: 'note-1',
            body: 'set status to **in progress**',
            system: true,
            systemNoteMetadata: { action: 'work_item_status' },
            createdAt: '2025-11-03T15:27:49Z'
          }
        ];

        const result = client.extractInProgressTimestamp(notes);

        expect(result).toBe('2025-11-03T15:27:49Z');
      });
    });

    describe('fetchIterationDetails with notes enrichment', () => {
      beforeEach(() => {
        client.delay = jest.fn().mockResolvedValue(undefined);
      });

      it('should enrich issues with inProgressAt timestamp', async () => {
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
                  closedAt: '2025-01-10T00:00:00Z',
                  weight: 3,
                  labels: { nodes: [] },
                  assignees: { nodes: [] },
                  notes: {
                    nodes: [
                      {
                        id: 'note-1',
                        body: 'set status to **In progress**',
                        system: true,
                        systemNoteMetadata: { action: 'work_item_status' },
                        createdAt: '2025-01-02T10:00:00Z'
                      }
                    ],
                    pageInfo: { hasNextPage: false, endCursor: null }
                  }
                },
                {
                  id: 'gid://gitlab/Issue/2',
                  iid: '102',
                  title: 'Issue 2',
                  state: 'opened',
                  createdAt: '2025-01-05T00:00:00Z',
                  closedAt: null,
                  weight: 5,
                  labels: { nodes: [] },
                  assignees: { nodes: [] },
                  notes: {
                    nodes: [],
                    pageInfo: { hasNextPage: false, endCursor: null }
                  }
                }
              ],
              pageInfo: { hasNextPage: false, endCursor: null }
            }
          }
        };

        // Mock fetchIterations and fetchMergeRequestsForGroup (called by fetchIterationDetails)
        jest.spyOn(client, 'fetchIterations').mockResolvedValue([
          { id: 'gid://gitlab/Iteration/123', title: 'Sprint 1', startDate: '2025-01-01', dueDate: '2025-01-14' }
        ]);
        jest.spyOn(client, 'fetchMergeRequestsForGroup').mockResolvedValue([]);

        mockRequest.mockResolvedValueOnce(mockIterationData);

        const result = await client.fetchIterationDetails('gid://gitlab/Iteration/123');

        expect(result.issues).toHaveLength(2);
        expect(result.issues[0].inProgressAt).toBe('2025-01-02T10:00:00Z');
        expect(result.issues[1].inProgressAt).toBeNull();
      });
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

  describe('fetchPipelinesForProject', () => {
    let client;

    beforeEach(() => {
      client = new GitLabClient({
        token: 'test-token',
        projectPath: 'group/project'
      });
      // Mock the delay method to avoid actual delays in tests
      client.delay = jest.fn().mockResolvedValue(undefined);
    });

    it('should fetch pipelines for a specific project and ref', async () => {
      const mockPipelineData = {
        project: {
          pipelines: {
            nodes: [
              {
                id: 'gid://gitlab/Ci::Pipeline/1',
                iid: '100',
                status: 'success',
                ref: 'main',
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:30:00Z',
                finishedAt: '2025-01-01T00:25:00Z',
                sha: 'abc123'
              },
              {
                id: 'gid://gitlab/Ci::Pipeline/2',
                iid: '101',
                status: 'failed',
                ref: 'main',
                createdAt: '2025-01-02T00:00:00Z',
                updatedAt: '2025-01-02T00:15:00Z',
                finishedAt: '2025-01-02T00:10:00Z',
                sha: 'def456'
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      };

      mockRequest.mockResolvedValueOnce(mockPipelineData);

      const result = await client.fetchPipelinesForProject('group/project1', 'main', '2025-01-01', '2025-01-10');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('success');
      expect(result[0].ref).toBe('main');
      expect(result[1].status).toBe('failed');
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('query getPipelines'),
        {
          fullPath: 'group/project1',
          ref: 'main',
          after: null,
          updatedAfter: new Date('2025-01-01').toISOString()
        }
      );
    });

    it('should filter pipelines by end date on client side', async () => {
      const mockPipelineData = {
        project: {
          pipelines: {
            nodes: [
              {
                id: 'gid://gitlab/Ci::Pipeline/1',
                iid: '100',
                status: 'success',
                ref: 'main',
                createdAt: '2025-01-05T00:00:00Z',
                updatedAt: '2025-01-05T00:30:00Z',
                finishedAt: '2025-01-05T00:25:00Z',
                sha: 'abc123'
              },
              {
                id: 'gid://gitlab/Ci::Pipeline/2',
                iid: '101',
                status: 'failed',
                ref: 'main',
                createdAt: '2025-01-15T00:00:00Z',
                updatedAt: '2025-01-15T00:15:00Z',
                finishedAt: '2025-01-15T00:10:00Z',
                sha: 'def456'
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      };

      mockRequest.mockResolvedValueOnce(mockPipelineData);

      // End date is 2025-01-10, so second pipeline (2025-01-15) should be filtered out
      const result = await client.fetchPipelinesForProject('group/project1', 'main', '2025-01-01', '2025-01-10');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('gid://gitlab/Ci::Pipeline/1');
    });

    it('should handle pagination for pipelines', async () => {
      // Mock page 1 response
      mockRequest.mockResolvedValueOnce({
        project: {
          pipelines: {
            nodes: [
              {
                id: 'gid://gitlab/Ci::Pipeline/1',
                iid: '100',
                status: 'success',
                ref: 'main',
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:30:00Z',
                finishedAt: '2025-01-01T00:25:00Z',
                sha: 'abc123'
              }
            ],
            pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
          }
        }
      });

      // Mock page 2 response
      mockRequest.mockResolvedValueOnce({
        project: {
          pipelines: {
            nodes: [
              {
                id: 'gid://gitlab/Ci::Pipeline/2',
                iid: '101',
                status: 'failed',
                ref: 'main',
                createdAt: '2025-01-02T00:00:00Z',
                updatedAt: '2025-01-02T00:15:00Z',
                finishedAt: '2025-01-02T00:10:00Z',
                sha: 'def456'
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchPipelinesForProject('group/project1', 'main', '2025-01-01', '2025-01-10');

      expect(result).toHaveLength(2);
      expect(mockRequest).toHaveBeenCalledTimes(2);

      // First call with no cursor
      expect(mockRequest).toHaveBeenNthCalledWith(1,
        expect.stringContaining('query getPipelines'),
        expect.objectContaining({ after: null })
      );

      // Second call with cursor
      expect(mockRequest).toHaveBeenNthCalledWith(2,
        expect.stringContaining('query getPipelines'),
        expect.objectContaining({ after: 'cursor1' })
      );

      // Delay called once (between pages) - reduced delay for pipelines
      expect(client.delay).toHaveBeenCalledTimes(1);
      expect(client.delay).toHaveBeenCalledWith(50);
    });

    it('should return empty array if project not found', async () => {
      mockRequest.mockResolvedValueOnce({
        project: null
      });

      const result = await client.fetchPipelinesForProject('invalid/project', 'main', '2025-01-01', '2025-01-10');

      expect(result).toEqual([]);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if pipelines is null', async () => {
      mockRequest.mockResolvedValueOnce({
        project: {
          pipelines: null
        }
      });

      const result = await client.fetchPipelinesForProject('group/project1', 'main', '2025-01-01', '2025-01-10');

      expect(result).toEqual([]);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should use default ref "master" if not provided', async () => {
      const mockPipelineData = {
        project: {
          pipelines: {
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      };

      mockRequest.mockResolvedValueOnce(mockPipelineData);

      await client.fetchPipelinesForProject('group/project1');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('query getPipelines'),
        expect.objectContaining({ ref: 'master' })
      );
    });

    it('should handle errors and return empty array', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValue(mockError);

      const result = await client.fetchPipelinesForProject('group/project1', 'main', '2025-01-01', '2025-01-10');

      expect(result).toEqual([]);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Optimizations', () => {
    describe('Optimization #1: Reduced Notes Limit', () => {
      let client;

      beforeEach(() => {
        client = new GitLabClient({
          token: 'test-token',
          projectPath: 'group/project'
        });
        client.delay = jest.fn().mockResolvedValue(undefined);
      });

      it('should fetch issues with notes limited to 20 entries', async () => {
        // Mock response with issue containing notes
        const mockIterationData = {
          group: {
            id: 'gid://gitlab/Group/1',
            issues: {
              nodes: [
                {
                  id: 'gid://gitlab/Issue/1',
                  iid: '101',
                  title: 'Test Issue',
                  state: 'closed',
                  createdAt: '2025-01-01T00:00:00Z',
                  closedAt: '2025-01-05T00:00:00Z',
                  weight: 3,
                  labels: { nodes: [] },
                  assignees: { nodes: [] },
                  notes: {
                    nodes: [
                      {
                        id: 'note-1',
                        body: 'set status to **In progress**',
                        system: true,
                        systemNoteMetadata: { action: 'work_item_status' },
                        createdAt: '2025-01-02T10:00:00Z'
                      }
                    ],
                    pageInfo: { hasNextPage: false, endCursor: null }
                  }
                }
              ],
              pageInfo: { hasNextPage: false, endCursor: null }
            }
          }
        };

        // Mock fetchIterations and fetchMergeRequestsForGroup (called by fetchIterationDetails)
        jest.spyOn(client, 'fetchIterations').mockResolvedValue([
          { id: 'gid://gitlab/Iteration/123', title: 'Sprint 1', startDate: '2025-01-01', dueDate: '2025-01-14' }
        ]);
        jest.spyOn(client, 'fetchMergeRequestsForGroup').mockResolvedValue([]);

        mockRequest.mockResolvedValueOnce(mockIterationData);

        await client.fetchIterationDetails('gid://gitlab/Iteration/123');

        // CRITICAL ASSERTION: Verify query contains "notes(first: 20"
        expect(mockRequest).toHaveBeenCalledWith(
          expect.stringContaining('notes(first: 20'),
          expect.any(Object)
        );
      });
    });
  });

  describe('fetchIncidents', () => {
    let client;

    beforeEach(() => {
      client = new GitLabClient({
        token: 'test-token',
        projectPath: 'group/project'
      });
      // Mock the delay method to avoid actual delays in tests
      client.delay = jest.fn().mockResolvedValue(undefined);
    });

    it('should fetch incidents within date range and calculate downtime', async () => {
      const mockIncidentData = {
        group: {
          id: 'gid://gitlab/Group/1',
          issues: {
            nodes: [
              {
                id: 'gid://gitlab/Issue/1',
                iid: '100',
                title: 'Production outage',
                state: 'closed',
                createdAt: '2025-01-01T00:00:00Z',
                closedAt: '2025-01-01T02:00:00Z', // 2 hours downtime
                updatedAt: '2025-01-01T02:00:00Z',
                webUrl: 'https://gitlab.com/group/project/-/issues/100',
                labels: { nodes: [{ title: 'incident::high' }] }
              },
              {
                id: 'gid://gitlab/Issue/2',
                iid: '101',
                title: 'Database issue',
                state: 'opened',
                createdAt: '2025-01-02T00:00:00Z',
                closedAt: null,
                updatedAt: '2025-01-02T01:00:00Z',
                webUrl: 'https://gitlab.com/group/project/-/issues/101',
                labels: { nodes: [{ title: 'incident::medium' }] }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      };

      mockRequest.mockResolvedValueOnce(mockIncidentData);

      const result = await client.fetchIncidents('2025-01-01', '2025-01-10');

      expect(result).toHaveLength(2);

      // First incident - closed
      expect(result[0].title).toBe('Production outage');
      expect(result[0].state).toBe('closed');
      expect(result[0].createdAt).toBe('2025-01-01T00:00:00Z');
      expect(result[0].closedAt).toBe('2025-01-01T02:00:00Z');
      expect(result[0]).toHaveProperty('labels');
      expect(result[0]).toHaveProperty('webUrl');
      expect(result[0]).not.toHaveProperty('downtimeHours'); // No calculation in Infrastructure

      // Second incident - still open
      expect(result[1].title).toBe('Database issue');
      expect(result[1].state).toBe('opened');
      expect(result[1].closedAt).toBeNull();

      expect(mockRequest).toHaveBeenCalledTimes(1);

      // Verify the GraphQL query was called
      const callArgs = mockRequest.mock.calls[0][1];
      expect(callArgs.fullPath).toBe('group/project');
      expect(callArgs.after).toBeNull();

      // NEW BEHAVIOR: createdAfter should be ~60 days before iteration start
      const createdAfterDate = new Date(callArgs.createdAfter);
      const iterationStartDate = new Date('2025-01-01');
      const daysDiff = Math.floor((iterationStartDate - createdAfterDate) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(55);
      expect(daysDiff).toBeLessThanOrEqual(65);

      // createdBefore should still be iteration end date
      expect(callArgs.createdBefore).toBe(new Date('2025-01-10').toISOString());
    });

    it('should handle pagination for incidents', async () => {
      // Mock page 1 response
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          issues: {
            nodes: [
              {
                id: 'gid://gitlab/Issue/1',
                iid: '100',
                title: 'Incident 1',
                state: 'closed',
                createdAt: '2025-01-01T00:00:00Z',
                closedAt: '2025-01-01T01:00:00Z',
                updatedAt: '2025-01-01T01:00:00Z',
                webUrl: 'https://gitlab.com/group/project/-/issues/100',
                labels: { nodes: [] }
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
          issues: {
            nodes: [
              {
                id: 'gid://gitlab/Issue/2',
                iid: '101',
                title: 'Incident 2',
                state: 'closed',
                createdAt: '2025-01-02T00:00:00Z',
                closedAt: '2025-01-02T03:00:00Z',
                updatedAt: '2025-01-02T03:00:00Z',
                webUrl: 'https://gitlab.com/group/project/-/issues/101',
                labels: { nodes: [] }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchIncidents('2025-01-01', '2025-01-10');

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Incident 1');
      expect(result[1].title).toBe('Incident 2');
      expect(mockRequest).toHaveBeenCalledTimes(2);

      // Delay called once (between pages)
      expect(client.delay).toHaveBeenCalledTimes(1);
      expect(client.delay).toHaveBeenCalledWith(100);
    });

    it('should throw error if group not found', async () => {
      mockRequest.mockResolvedValueOnce({
        group: null
      });

      await expect(client.fetchIncidents('2025-01-01', '2025-01-10')).rejects.toThrow(
        'Group not found: group/project'
      );
    });

    it('should return empty array if issues is null', async () => {
      mockRequest.mockResolvedValueOnce({
        group: {
          id: 'gid://gitlab/Group/1',
          issues: null
        }
      });

      const result = await client.fetchIncidents('2025-01-01', '2025-01-10');

      expect(result).toEqual([]);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should handle GraphQL errors', async () => {
      const mockError = {
        response: {
          errors: [
            { message: 'Insufficient permissions to query incidents' }
          ]
        }
      };

      mockRequest.mockRejectedValue(mockError);

      await expect(client.fetchIncidents('2025-01-01', '2025-01-10')).rejects.toThrow(
        'Failed to fetch incidents: Insufficient permissions to query incidents'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Connection timeout');
      mockRequest.mockRejectedValue(networkError);

      await expect(client.fetchIncidents('2025-01-01', '2025-01-10')).rejects.toThrow(
        'Failed to fetch incidents: Connection timeout'
      );
    });

    describe('Bug Fix: Include incidents created before iteration', () => {
      it('should include incidents created before iteration but closed during it', async () => {
        const mockIncidentData = {
          group: {
            id: 'gid://gitlab/Group/1',
            issues: {
              nodes: [
                {
                  id: 'gid://gitlab/Issue/1',
                  iid: '1',
                  title: 'Broken Digital Sharing Enrollment',
                  state: 'closed',
                  createdAt: '2024-12-20T00:00:00Z', // Created BEFORE iteration
                  closedAt: '2025-01-05T00:00:00Z', // Closed DURING iteration
                  updatedAt: '2025-01-05T00:00:00Z',
                  webUrl: 'https://gitlab.com/group/project/-/issues/1',
                  labels: { nodes: [] }
                }
              ],
              pageInfo: { hasNextPage: false, endCursor: null }
            }
          }
        };

        mockRequest.mockResolvedValueOnce(mockIncidentData);

        // Iteration: 2025-01-01 to 2025-01-10
        const result = await client.fetchIncidents('2025-01-01', '2025-01-10');

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Broken Digital Sharing Enrollment');
        expect(result[0].createdAt).toBe('2024-12-20T00:00:00Z');
        expect(result[0].closedAt).toBe('2025-01-05T00:00:00Z');
      });

      it('should include incidents created before iteration but updated during it', async () => {
        const mockIncidentData = {
          group: {
            id: 'gid://gitlab/Group/1',
            issues: {
              nodes: [
                {
                  id: 'gid://gitlab/Issue/2',
                  iid: '2',
                  title: 'Ongoing incident',
                  state: 'opened',
                  createdAt: '2024-12-15T00:00:00Z', // Created BEFORE iteration
                  closedAt: null,
                  updatedAt: '2025-01-08T00:00:00Z', // Updated DURING iteration
                  webUrl: 'https://gitlab.com/group/project/-/issues/2',
                  labels: { nodes: [] }
                }
              ],
              pageInfo: { hasNextPage: false, endCursor: null }
            }
          }
        };

        mockRequest.mockResolvedValueOnce(mockIncidentData);

        // Iteration: 2025-01-01 to 2025-01-10
        const result = await client.fetchIncidents('2025-01-01', '2025-01-10');

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Ongoing incident');
        expect(result[0].updatedAt).toBe('2025-01-08T00:00:00Z');
      });

      it('should include incidents created during iteration (existing behavior)', async () => {
        const mockIncidentData = {
          group: {
            id: 'gid://gitlab/Group/1',
            issues: {
              nodes: [
                {
                  id: 'gid://gitlab/Issue/3',
                  iid: '3',
                  title: 'New incident',
                  state: 'closed',
                  createdAt: '2025-01-03T00:00:00Z', // Created DURING iteration
                  closedAt: '2025-01-05T00:00:00Z',
                  updatedAt: '2025-01-05T00:00:00Z',
                  webUrl: 'https://gitlab.com/group/project/-/issues/3',
                  labels: { nodes: [] }
                }
              ],
              pageInfo: { hasNextPage: false, endCursor: null }
            }
          }
        };

        mockRequest.mockResolvedValueOnce(mockIncidentData);

        // Iteration: 2025-01-01 to 2025-01-10
        const result = await client.fetchIncidents('2025-01-01', '2025-01-10');

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('New incident');
      });

      it('should exclude incidents with no activity during iteration', async () => {
        const mockIncidentData = {
          group: {
            id: 'gid://gitlab/Group/1',
            issues: {
              nodes: [
                {
                  id: 'gid://gitlab/Issue/4',
                  iid: '4',
                  title: 'Old closed incident',
                  state: 'closed',
                  createdAt: '2024-12-01T00:00:00Z', // Created BEFORE
                  closedAt: '2024-12-15T00:00:00Z', // Closed BEFORE
                  updatedAt: '2024-12-15T00:00:00Z', // Updated BEFORE
                  webUrl: 'https://gitlab.com/group/project/-/issues/4',
                  labels: { nodes: [] }
                },
                {
                  id: 'gid://gitlab/Issue/5',
                  iid: '5',
                  title: 'Future incident',
                  state: 'closed',
                  createdAt: '2025-01-15T00:00:00Z', // Created AFTER
                  closedAt: '2025-01-20T00:00:00Z', // Closed AFTER
                  updatedAt: '2025-01-20T00:00:00Z', // Updated AFTER
                  webUrl: 'https://gitlab.com/group/project/-/issues/5',
                  labels: { nodes: [] }
                }
              ],
              pageInfo: { hasNextPage: false, endCursor: null }
            }
          }
        };

        mockRequest.mockResolvedValueOnce(mockIncidentData);

        // Iteration: 2025-01-01 to 2025-01-10
        const result = await client.fetchIncidents('2025-01-01', '2025-01-10');

        // Both should be excluded (no activity during iteration)
        expect(result).toHaveLength(0);
      });

      it('should fetch incidents with broader date range (60 days before iteration)', async () => {
        const mockIncidentData = {
          group: {
            id: 'gid://gitlab/Group/1',
            issues: {
              nodes: [],
              pageInfo: { hasNextPage: false, endCursor: null }
            }
          }
        };

        mockRequest.mockResolvedValueOnce(mockIncidentData);

        await client.fetchIncidents('2025-01-01', '2025-01-10');

        // Verify the GraphQL query uses a broader date range
        // The createdAfter should be ~60 days before iteration start
        const callArgs = mockRequest.mock.calls[0][1];
        const createdAfterDate = new Date(callArgs.createdAfter);
        const iterationStartDate = new Date('2025-01-01');

        // Calculate days difference
        const daysDiff = Math.floor((iterationStartDate - createdAfterDate) / (1000 * 60 * 60 * 24));

        // Should be approximately 60 days (allow 55-65 for some flexibility)
        expect(daysDiff).toBeGreaterThanOrEqual(55);
        expect(daysDiff).toBeLessThanOrEqual(65);

        // createdBefore should still be iteration end date
        expect(callArgs.createdBefore).toBe(new Date('2025-01-10').toISOString());
      });
    });
  });

  describe('fetchIncidentTimelineEvents', () => {
    let client;

    beforeEach(() => {
      client = new GitLabClient({
        token: 'test-token',
        projectPath: 'group/project'
      });
    });

    it('should fetch timeline events for an incident', async () => {
      const mockIncident = {
        id: 'gid://gitlab/Issue/123',
        webUrl: 'https://gitlab.com/group/project/-/issues/123'
      };

      const mockResponse = {
        project: {
          incidentManagementTimelineEvents: {
            nodes: [
              {
                id: 'gid://gitlab/IncidentManagement::TimelineEvent/1',
                occurredAt: '2025-01-15T10:00:00Z',
                createdAt: '2025-01-15T10:05:00Z',
                note: 'Incident started',
                timelineEventTags: {
                  nodes: [{ name: 'Start time' }]
                },
                author: {
                  username: 'testuser',
                  name: 'Test User'
                }
              },
              {
                id: 'gid://gitlab/IncidentManagement::TimelineEvent/2',
                occurredAt: '2025-01-15T12:00:00Z',
                createdAt: '2025-01-15T12:05:00Z',
                note: 'Incident resolved',
                timelineEventTags: {
                  nodes: [{ name: 'End time' }]
                },
                author: {
                  username: 'testuser',
                  name: 'Test User'
                }
              }
            ]
          }
        }
      };

      mockRequest.mockResolvedValue(mockResponse);

      const events = await client.fetchIncidentTimelineEvents(mockIncident);

      expect(events).toHaveLength(2);
      expect(events[0].occurredAt).toBe('2025-01-15T10:00:00Z');
      expect(events[0].timelineEventTags.nodes[0].name).toBe('Start time');
      expect(events[1].timelineEventTags.nodes[0].name).toBe('End time');

      // Verify the GraphQL query was called with correct parameters
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('incidentManagementTimelineEvents'),
        {
          fullPath: 'group/project',
          incidentId: 'gid://gitlab/Issue/123'
        }
      );
    });

    it('should return empty array when no timeline events exist', async () => {
      const mockIncident = {
        id: 'gid://gitlab/Issue/123',
        webUrl: 'https://gitlab.com/group/project/-/issues/123'
      };

      const mockResponse = {
        project: {
          incidentManagementTimelineEvents: {
            nodes: []
          }
        }
      };

      mockRequest.mockResolvedValue(mockResponse);

      const events = await client.fetchIncidentTimelineEvents(mockIncident);

      expect(events).toEqual([]);
    });

    it('should return empty array when project not found', async () => {
      const mockIncident = {
        id: 'gid://gitlab/Issue/123',
        webUrl: 'https://gitlab.com/group/project/-/issues/123'
      };

      const mockResponse = {
        project: null
      };

      mockRequest.mockResolvedValue(mockResponse);

      const events = await client.fetchIncidentTimelineEvents(mockIncident);

      expect(events).toEqual([]);
    });

    it('should handle GraphQL errors gracefully', async () => {
      const mockIncident = {
        id: 'gid://gitlab/Issue/123',
        webUrl: 'https://gitlab.com/group/project/-/issues/123'
      };

      const mockError = new Error('GraphQL Error');
      mockError.response = {
        errors: [{ message: 'Timeline events not available' }]
      };

      mockRequest.mockRejectedValue(mockError);

      const events = await client.fetchIncidentTimelineEvents(mockIncident);

      // Should return empty array instead of throwing
      expect(events).toEqual([]);
    });

    it('should extract project path from incident webUrl', async () => {
      const mockIncident = {
        id: 'gid://gitlab/Issue/456',
        webUrl: 'https://gitlab.com/my-group/my-project/-/issues/456'
      };

      const mockResponse = {
        project: {
          incidentManagementTimelineEvents: {
            nodes: []
          }
        }
      };

      mockRequest.mockResolvedValue(mockResponse);

      await client.fetchIncidentTimelineEvents(mockIncident);

      // Verify the project path was correctly extracted
      expect(mockRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          fullPath: 'my-group/my-project'
        })
      );
    });

    it('should return empty array if project path extraction fails', async () => {
      const mockIncident = {
        id: 'gid://gitlab/Issue/123',
        webUrl: 'invalid-url'
      };

      const events = await client.fetchIncidentTimelineEvents(mockIncident);

      expect(events).toEqual([]);
      // Should not make GraphQL request if URL is invalid
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('should handle timeline events without tags', async () => {
      const mockIncident = {
        id: 'gid://gitlab/Issue/123',
        webUrl: 'https://gitlab.com/group/project/-/issues/123'
      };

      const mockResponse = {
        project: {
          incidentManagementTimelineEvents: {
            nodes: [
              {
                id: 'gid://gitlab/IncidentManagement::TimelineEvent/1',
                occurredAt: '2025-01-15T10:00:00Z',
                createdAt: '2025-01-15T10:05:00Z',
                note: 'System generated event',
                timelineEventTags: {
                  nodes: []
                },
                author: {
                  username: 'system',
                  name: 'System'
                }
              }
            ]
          }
        }
      };

      mockRequest.mockResolvedValue(mockResponse);

      const events = await client.fetchIncidentTimelineEvents(mockIncident);

      expect(events).toHaveLength(1);
      expect(events[0].timelineEventTags.nodes).toHaveLength(0);
    });
  });

  describe('extractProjectPath', () => {
    let client;

    beforeEach(() => {
      client = new GitLabClient({
        token: 'test-token',
        projectPath: 'group/project'
      });
    });

    it('should extract project path from standard GitLab URL', () => {
      const url = 'https://gitlab.com/group/project/-/issues/123';
      const projectPath = client.extractProjectPath(url);

      expect(projectPath).toBe('group/project');
    });

    it('should extract project path from nested group structure', () => {
      const url = 'https://gitlab.com/parent/child/project/-/issues/456';
      const projectPath = client.extractProjectPath(url);

      expect(projectPath).toBe('parent/child/project');
    });

    it('should extract project path from merge request URL', () => {
      const url = 'https://gitlab.com/group/project/-/merge_requests/10';
      const projectPath = client.extractProjectPath(url);

      expect(projectPath).toBe('group/project');
    });

    it('should handle custom GitLab instance URLs', () => {
      const url = 'https://gitlab.company.com/engineering/backend/-/issues/1';
      const projectPath = client.extractProjectPath(url);

      expect(projectPath).toBe('engineering/backend');
    });

    it('should return null for invalid URLs', () => {
      const invalidUrl = 'not-a-valid-url';
      const projectPath = client.extractProjectPath(invalidUrl);

      expect(projectPath).toBeNull();
    });

    it('should return null for URLs without project path', () => {
      const url = 'https://gitlab.com/';
      const projectPath = client.extractProjectPath(url);

      expect(projectPath).toBeNull();
    });
  });
});
