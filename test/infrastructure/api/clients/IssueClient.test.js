import { describe, it, expect, beforeEach } from '@jest/globals';
import { IssueClient } from '../../../../src/lib/infrastructure/api/clients/IssueClient.js';

describe('IssueClient', () => {
  let client;
  let mockExecutor;
  let mockRateLimitManager;
  let mockLogger;

  beforeEach(() => {
    mockExecutor = {
      execute: async () => ({})
    };

    mockRateLimitManager = {
      delay: async () => {}
    };

    mockLogger = {
      debug: () => {},
      warn: () => {},
      error: () => {}
    };

    client = new IssueClient(
      mockExecutor,
      mockRateLimitManager,
      mockLogger
    );
  });

  describe('fetchAdditionalNotesForIssue', () => {
    it('should fetch additional notes successfully', async () => {
      mockExecutor.execute = async () => ({
        issue: {
          id: 'gid://gitlab/Issue/123',
          notes: {
            nodes: [
              { id: '1', body: 'Note 1', system: false, createdAt: '2025-01-01T00:00:00Z' },
              { id: '2', body: 'Note 2', system: true, createdAt: '2025-01-02T00:00:00Z' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchAdditionalNotesForIssue('gid://gitlab/Issue/123', 'cursor1');

      expect(result).toHaveLength(2);
      expect(result[0].body).toBe('Note 1');
    });

    it('should handle pagination for notes', async () => {
      let callCount = 0;
      mockExecutor.execute = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            issue: {
              id: 'gid://gitlab/Issue/123',
              notes: {
                nodes: [{ id: '1', body: 'Note 1', system: false, createdAt: '2025-01-01T00:00:00Z' }],
                pageInfo: { hasNextPage: true, endCursor: 'cursor2' }
              }
            }
          };
        } else {
          return {
            issue: {
              id: 'gid://gitlab/Issue/123',
              notes: {
                nodes: [{ id: '2', body: 'Note 2', system: false, createdAt: '2025-01-02T00:00:00Z' }],
                pageInfo: { hasNextPage: false, endCursor: null }
              }
            }
          };
        }
      };

      const delayCalls = [];
      mockRateLimitManager.delay = async (ms) => {
        delayCalls.push(ms);
      };

      const result = await client.fetchAdditionalNotesForIssue('gid://gitlab/Issue/123', 'cursor1');

      expect(result).toHaveLength(2);
      expect(delayCalls).toHaveLength(1);
      expect(delayCalls[0]).toBe(100);
    });

    it('should throw error if issue not found', async () => {
      mockExecutor.execute = async () => ({
        issue: null
      });

      await expect(
        client.fetchAdditionalNotesForIssue('gid://gitlab/Issue/999', 'cursor1')
      ).rejects.toThrow('Issue not found: gid://gitlab/Issue/999');
    });

    it('should throw error on GraphQL errors', async () => {
      mockExecutor.execute = async () => {
        const error = new Error('GraphQL error');
        error.response = {
          errors: [{ message: 'Insufficient permissions' }]
        };
        throw error;
      };

      await expect(
        client.fetchAdditionalNotesForIssue('gid://gitlab/Issue/123', 'cursor1')
      ).rejects.toThrow('Failed to fetch additional notes: Insufficient permissions');
    });

    it('should work without logger', async () => {
      const clientWithoutLogger = new IssueClient(
        mockExecutor,
        mockRateLimitManager
      );

      mockExecutor.execute = async () => ({
        issue: {
          id: 'gid://gitlab/Issue/123',
          notes: {
            nodes: [{ id: '1', body: 'Note 1', system: false, createdAt: '2025-01-01T00:00:00Z' }],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await clientWithoutLogger.fetchAdditionalNotesForIssue(
        'gid://gitlab/Issue/123',
        'cursor1'
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('extractInProgressTimestamp', () => {
    it('should extract InProgress timestamp from notes', () => {
      const notes = [
        {
          id: '1',
          body: 'set status to **Open**',
          system: true,
          systemNoteMetadata: { action: 'work_item_status' },
          createdAt: '2025-01-01T00:00:00Z'
        },
        {
          id: '2',
          body: 'set status to **In progress**',
          system: true,
          systemNoteMetadata: { action: 'work_item_status' },
          createdAt: '2025-01-02T10:00:00Z'
        }
      ];

      const result = client.extractInProgressTimestamp(notes);

      expect(result).toBe('2025-01-02T10:00:00Z');
    });

    it('should return null if no InProgress status found', () => {
      const notes = [
        {
          id: '1',
          body: 'set status to **Open**',
          system: true,
          systemNoteMetadata: { action: 'work_item_status' },
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];

      const result = client.extractInProgressTimestamp(notes);

      expect(result).toBeNull();
    });

    it('should return null for empty notes array', () => {
      const result = client.extractInProgressTimestamp([]);

      expect(result).toBeNull();
    });
  });

  describe('parseStatusChanges', () => {
    it('should parse status change notes', () => {
      const notes = [
        {
          id: '1',
          body: 'set status to **Open**',
          system: true,
          systemNoteMetadata: { action: 'work_item_status' },
          createdAt: '2025-01-01T00:00:00Z'
        },
        {
          id: '2',
          body: 'Some comment',
          system: false,
          systemNoteMetadata: null,
          createdAt: '2025-01-01T12:00:00Z'
        },
        {
          id: '3',
          body: 'set status to **In progress**',
          system: true,
          systemNoteMetadata: { action: 'work_item_status' },
          createdAt: '2025-01-02T00:00:00Z'
        }
      ];

      const result = client.parseStatusChanges(notes);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('Open');
      expect(result[1].status).toBe('In progress');
    });

    it('should sort status changes chronologically', () => {
      const notes = [
        {
          id: '2',
          body: 'set status to **Closed**',
          system: true,
          systemNoteMetadata: { action: 'work_item_status' },
          createdAt: '2025-01-03T00:00:00Z'
        },
        {
          id: '1',
          body: 'set status to **Open**',
          system: true,
          systemNoteMetadata: { action: 'work_item_status' },
          createdAt: '2025-01-01T00:00:00Z'
        }
      ];

      const result = client.parseStatusChanges(notes);

      expect(result[0].status).toBe('Open');
      expect(result[1].status).toBe('Closed');
    });
  });

  describe('isInProgressStatus', () => {
    it('should recognize "In progress" as in-progress', () => {
      expect(client.isInProgressStatus('In progress')).toBe(true);
    });

    it('should recognize "in progress" (lowercase) as in-progress', () => {
      expect(client.isInProgressStatus('in progress')).toBe(true);
    });

    it('should recognize "In-Progress" (hyphenated) as in-progress', () => {
      expect(client.isInProgressStatus('In-Progress')).toBe(true);
    });

    it('should recognize "WIP" as in-progress', () => {
      expect(client.isInProgressStatus('WIP')).toBe(true);
    });

    it('should recognize "Working" as in-progress', () => {
      expect(client.isInProgressStatus('Working')).toBe(true);
    });

    it('should not recognize "Open" as in-progress', () => {
      expect(client.isInProgressStatus('Open')).toBe(false);
    });

    it('should not recognize "Closed" as in-progress', () => {
      expect(client.isInProgressStatus('Closed')).toBe(false);
    });
  });
});
