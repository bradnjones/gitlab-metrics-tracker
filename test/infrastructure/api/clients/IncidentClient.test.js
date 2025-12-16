import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IncidentClient } from '../../../../src/lib/infrastructure/api/clients/IncidentClient.js';

describe('IncidentClient', () => {
  let client;
  let mockExecutor;
  let mockRateLimitManager;
  let mockMergeRequestClient;
  let mockLogger;

  beforeEach(() => {
    mockExecutor = {
      execute: async () => ({})
    };

    mockRateLimitManager = {
      delay: async () => {}
    };

    mockMergeRequestClient = {
      fetchMergeRequestDetails: async () => ({}),
      fetchCommitDetails: async () => ({})
    };

    mockLogger = {
      debug: () => {},
      warn: () => {},
      error: () => {}
    };

    client = new IncidentClient(
      mockExecutor,
      mockRateLimitManager,
      'group/project',
      mockMergeRequestClient,
      mockLogger
    );
  });

  describe('extractProjectPath', () => {
    it('should extract project path from GitLab URL', () => {
      const result = client.extractProjectPath('https://gitlab.com/group/project/-/issues/123');
      expect(result).toBe('group/project');
    });

    it('should extract nested project path', () => {
      const result = client.extractProjectPath('https://gitlab.com/group/subgroup/project/-/issues/123');
      expect(result).toBe('group/subgroup/project');
    });

    it('should return null for invalid URL', () => {
      const result = client.extractProjectPath('not-a-url');
      expect(result).toBeNull();
    });

    it('should return null for empty path', () => {
      const result = client.extractProjectPath('https://gitlab.com/-/issues/123');
      expect(result).toBeNull();
    });
  });

  describe('fetchIncidentTimelineEvents', () => {
    it('should fetch timeline events successfully', async () => {
      mockExecutor.execute = async () => ({
        project: {
          incidentManagementTimelineEvents: {
            nodes: [
              {
                id: '1',
                occurredAt: '2025-01-01T10:00:00Z',
                note: 'Incident started',
                timelineEventTags: { nodes: [{ name: 'start time' }] },
                author: { username: 'user1', name: 'User One' }
              },
              {
                id: '2',
                occurredAt: '2025-01-01T12:00:00Z',
                note: 'Incident resolved',
                timelineEventTags: { nodes: [{ name: 'end time' }] },
                author: { username: 'user1', name: 'User One' }
              }
            ]
          }
        }
      });

      const incident = {
        id: 'gid://gitlab/Issue/123',
        webUrl: 'https://gitlab.com/group/project/-/issues/123'
      };

      const result = await client.fetchIncidentTimelineEvents(incident);

      expect(result).toHaveLength(2);
      expect(result[0].note).toBe('Incident started');
    });

    it('should return empty array if project not found', async () => {
      mockExecutor.execute = async () => ({
        project: null
      });

      const incident = {
        id: 'gid://gitlab/Issue/123',
        webUrl: 'https://gitlab.com/group/project/-/issues/123'
      };

      const result = await client.fetchIncidentTimelineEvents(incident);

      expect(result).toEqual([]);
    });

    it('should return empty array if project path extraction fails', async () => {
      const incident = {
        id: 'gid://gitlab/Issue/123',
        webUrl: 'not-a-valid-url'
      };

      const result = await client.fetchIncidentTimelineEvents(incident);

      expect(result).toEqual([]);
    });

    it('should return empty array on GraphQL errors', async () => {
      mockExecutor.execute = async () => {
        const error = new Error('GraphQL error');
        error.response = {
          errors: [{ message: 'Timeline not accessible' }]
        };
        throw error;
      };

      let errorLogged = false;
      mockLogger.error = () => {
        errorLogged = true;
      };

      const incident = {
        id: 'gid://gitlab/Issue/123',
        webUrl: 'https://gitlab.com/group/project/-/issues/123'
      };

      const result = await client.fetchIncidentTimelineEvents(incident);

      expect(result).toEqual([]);
      expect(errorLogged).toBe(true);
    });

    it('should work without logger', async () => {
      const clientWithoutLogger = new IncidentClient(
        mockExecutor,
        mockRateLimitManager,
        'group/project',
        mockMergeRequestClient
      );

      mockExecutor.execute = async () => ({
        project: {
          incidentManagementTimelineEvents: {
            nodes: [{ id: '1', occurredAt: '2025-01-01T10:00:00Z' }]
          }
        }
      });

      const incident = {
        id: 'gid://gitlab/Issue/123',
        webUrl: 'https://gitlab.com/group/project/-/issues/123'
      };

      const result = await clientWithoutLogger.fetchIncidentTimelineEvents(incident);

      expect(result).toHaveLength(1);
    });
  });

  describe('fetchIncidents', () => {
    it('should fetch incidents successfully', async () => {
      mockExecutor.execute = async (query, variables, context) => {
        if (context === 'fetching incidents') {
          return {
            group: {
              id: 'gid://gitlab/Group/1',
              issues: {
                nodes: [
                  {
                    id: 'gid://gitlab/Issue/1',
                    iid: 1,
                    title: 'Incident 1',
                    state: 'closed',
                    createdAt: '2025-01-05T10:00:00Z',
                    closedAt: '2025-01-05T12:00:00Z',
                    updatedAt: '2025-01-05T12:00:00Z',
                    webUrl: 'https://gitlab.com/group/project/-/issues/1',
                    labels: { nodes: [] }
                  }
                ],
                pageInfo: { hasNextPage: false, endCursor: null }
              }
            }
          };
        }
        // Timeline events query
        return {
          project: {
            incidentManagementTimelineEvents: {
              nodes: [
                {
                  id: '1',
                  occurredAt: '2025-01-05T10:00:00Z',
                  note: 'Started',
                  timelineEventTags: { nodes: [{ name: 'start time' }] }
                }
              ]
            }
          }
        };
      };

      const result = await client.fetchIncidents('2025-01-01', '2025-01-10');

      expect(result).toHaveLength(1);
      expect(result[0].iid).toBe(1);
      expect(result[0].actualStartTime).toBeDefined();
    });

    it('should throw error if group not found', async () => {
      mockExecutor.execute = async () => ({
        group: null
      });

      await expect(client.fetchIncidents('2025-01-01', '2025-01-10')).rejects.toThrow(
        'Group not found: group/project'
      );
    });

    it('should handle GraphQL errors', async () => {
      mockExecutor.execute = async () => {
        const error = new Error('GraphQL error');
        error.response = {
          errors: [{ message: 'Insufficient permissions' }]
        };
        throw error;
      };

      await expect(client.fetchIncidents('2025-01-01', '2025-01-10')).rejects.toThrow(
        'Failed to fetch incidents: Insufficient permissions'
      );
    });

    it('should handle pagination', async () => {
      let callCount = 0;
      mockExecutor.execute = async (query, variables, context) => {
        if (context === 'fetching incidents') {
          callCount++;
          if (callCount === 1) {
            return {
              group: {
                issues: {
                  nodes: [{ id: '1', iid: 1, title: 'I1', state: 'closed', createdAt: '2025-01-05T10:00:00Z', closedAt: '2025-01-05T12:00:00Z', updatedAt: '2025-01-05T12:00:00Z', webUrl: 'https://gitlab.com/g/p/-/issues/1', labels: { nodes: [] } }],
                  pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
                }
              }
            };
          }
          return {
            group: {
              issues: {
                nodes: [{ id: '2', iid: 2, title: 'I2', state: 'closed', createdAt: '2025-01-06T10:00:00Z', closedAt: '2025-01-06T12:00:00Z', updatedAt: '2025-01-06T12:00:00Z', webUrl: 'https://gitlab.com/g/p/-/issues/2', labels: { nodes: [] } }],
                pageInfo: { hasNextPage: false, endCursor: null }
              }
            }
          };
        }
        // Timeline events query
        return { project: { incidentManagementTimelineEvents: { nodes: [] } } };
      };

      const delayCalls = [];
      mockRateLimitManager.delay = async (ms) => {
        delayCalls.push(ms);
      };

      const result = await client.fetchIncidents('2025-01-01', '2025-01-10');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(delayCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter incidents by date range', async () => {
      // Incident created OUTSIDE iteration but no timeline events
      mockExecutor.execute = async (query, variables, context) => {
        if (context === 'fetching incidents') {
          return {
            group: {
              issues: {
                nodes: [
                  {
                    id: 'gid://gitlab/Issue/1',
                    iid: 1,
                    title: 'Old Incident',
                    state: 'closed',
                    createdAt: '2024-11-15T10:00:00Z', // Before iteration
                    closedAt: '2024-11-15T12:00:00Z',   // Before iteration
                    updatedAt: '2024-11-15T12:00:00Z',  // Before iteration
                    webUrl: 'https://gitlab.com/g/p/-/issues/1',
                    labels: { nodes: [] }
                  }
                ],
                pageInfo: { hasNextPage: false, endCursor: null }
              }
            }
          };
        }
        // No timeline events
        return { project: { incidentManagementTimelineEvents: { nodes: [] } } };
      };

      const result = await client.fetchIncidents('2025-01-01', '2025-01-10');

      // Should be filtered out since no activity during iteration
      expect(result).toHaveLength(0);
    });

    it('should work without logger', async () => {
      const clientWithoutLogger = new IncidentClient(
        mockExecutor,
        mockRateLimitManager,
        'group/project',
        mockMergeRequestClient
      );

      mockExecutor.execute = async (query, variables, context) => {
        if (context === 'fetching incidents') {
          return {
            group: {
              issues: {
                nodes: [
                  {
                    id: '1',
                    iid: 1,
                    title: 'I1',
                    state: 'closed',
                    createdAt: '2025-01-05T10:00:00Z',
                    closedAt: '2025-01-05T12:00:00Z',
                    updatedAt: '2025-01-05T12:00:00Z',
                    webUrl: 'https://gitlab.com/g/p/-/issues/1',
                    labels: { nodes: [] }
                  }
                ],
                pageInfo: { hasNextPage: false, endCursor: null }
              }
            }
          };
        }
        return { project: { incidentManagementTimelineEvents: { nodes: [] } } };
      };

      const result = await clientWithoutLogger.fetchIncidents('2025-01-01', '2025-01-10');

      expect(result).toHaveLength(1);
    });
  });
});
