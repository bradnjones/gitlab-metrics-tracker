import { describe, it, expect, beforeEach } from '@jest/globals';
import { MergeRequestClient } from '../../../../src/lib/infrastructure/api/clients/MergeRequestClient.js';

describe('MergeRequestClient', () => {
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
      warn: () => {}
    };

    client = new MergeRequestClient(
      mockExecutor,
      mockRateLimitManager,
      'group/project',
      mockLogger
    );
  });

  describe('fetchMergeRequestsForGroup', () => {
    it('should fetch merged MRs within date range', async () => {
      mockExecutor.execute = async () => ({
        group: {
          id: 'gid://gitlab/Group/1',
          mergeRequests: {
            nodes: [
              { id: '1', iid: '10', title: 'MR 1', state: 'merged', mergedAt: '2025-01-05' },
              { id: '2', iid: '11', title: 'MR 2', state: 'merged', mergedAt: '2025-01-10' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchMergeRequestsForGroup('2025-01-01', '2025-01-31');

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('MR 1');
      expect(result[1].title).toBe('MR 2');
    });

    it('should handle pagination', async () => {
      let callCount = 0;
      mockExecutor.execute = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            group: {
              mergeRequests: {
                nodes: [{ id: '1', title: 'MR 1' }],
                pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
              }
            }
          };
        } else {
          return {
            group: {
              mergeRequests: {
                nodes: [{ id: '2', title: 'MR 2' }],
                pageInfo: { hasNextPage: false, endCursor: null }
              }
            }
          };
        }
      };

      const result = await client.fetchMergeRequestsForGroup('2025-01-01', '2025-01-31');

      expect(result).toHaveLength(2);
    });

    it('should throw error if group not found', async () => {
      mockExecutor.execute = async () => ({
        group: null
      });

      await expect(
        client.fetchMergeRequestsForGroup('2025-01-01', '2025-01-31')
      ).rejects.toThrow('Group not found');
    });
  });

  describe('fetchMergeRequestDetails', () => {
    it('should fetch MR details successfully', async () => {
      mockExecutor.execute = async () => ({
        project: {
          mergeRequest: {
            id: '1',
            iid: '10',
            title: 'Test MR',
            state: 'merged',
            mergedAt: '2025-01-15',
            webUrl: 'https://gitlab.com/group/project/-/merge_requests/10'
          }
        }
      });

      const result = await client.fetchMergeRequestDetails('group/project', '10');

      expect(result.title).toBe('Test MR');
      expect(result.iid).toBe('10');
    });

    it('should throw error if MR not found', async () => {
      mockExecutor.execute = async () => ({
        project: {
          mergeRequest: null
        }
      });

      await expect(
        client.fetchMergeRequestDetails('group/project', '999')
      ).rejects.toThrow('not found');
    });
  });

  describe('fetchCommitDetails', () => {
    it('should fetch commit details successfully', async () => {
      mockExecutor.execute = async () => ({
        project: {
          repository: {
            commit: {
              id: 'commit1',
              sha: 'abc123',
              title: 'Test commit',
              committedDate: '2025-01-15T10:00:00Z',
              webUrl: 'https://gitlab.com/group/project/-/commit/abc123'
            }
          }
        }
      });

      const result = await client.fetchCommitDetails('group/project', 'abc123');

      expect(result.sha).toBe('abc123');
      expect(result.title).toBe('Test commit');
    });

    it('should throw error if commit not found', async () => {
      mockExecutor.execute = async () => ({
        project: {
          repository: {
            commit: null
          }
        }
      });

      await expect(
        client.fetchCommitDetails('group/project', 'invalid')
      ).rejects.toThrow('not found');
    });
  });
});
