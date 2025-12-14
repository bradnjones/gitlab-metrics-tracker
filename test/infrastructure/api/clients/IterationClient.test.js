import { describe, it, expect, beforeEach } from '@jest/globals';
import { IterationClient } from '../../../../src/lib/infrastructure/api/clients/IterationClient.js';

describe('IterationClient', () => {
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

    client = new IterationClient(
      mockExecutor,
      mockRateLimitManager,
      'group/project',
      mockLogger
    );
  });

  describe('fetchIterations', () => {
    it('should fetch iterations successfully', async () => {
      mockExecutor.execute = async () => ({
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          iterations: {
            nodes: [
              {
                id: 'gid://gitlab/Iteration/1',
                iid: '1',
                title: 'Sprint 1',
                state: 'closed',
                startDate: '2025-01-01',
                dueDate: '2025-01-14',
                iterationCadence: { id: '1', title: 'Dev Cadence' }
              },
              {
                id: 'gid://gitlab/Iteration/2',
                iid: '2',
                title: 'Sprint 2',
                state: 'current',
                startDate: '2025-01-15',
                dueDate: '2025-01-28',
                iterationCadence: { id: '1', title: 'Dev Cadence' }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchIterations();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Sprint 1');
      expect(result[1].title).toBe('Sprint 2');
    });

    it('should handle pagination for iterations', async () => {
      let callCount = 0;
      mockExecutor.execute = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            group: {
              id: 'gid://gitlab/Group/1',
              iterations: {
                nodes: [{ id: '1', title: 'Sprint 1', state: 'closed' }],
                pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
              }
            }
          };
        } else {
          return {
            group: {
              id: 'gid://gitlab/Group/1',
              iterations: {
                nodes: [{ id: '2', title: 'Sprint 2', state: 'closed' }],
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

      const result = await client.fetchIterations();

      expect(result).toHaveLength(2);
      expect(delayCalls).toHaveLength(1);
      expect(delayCalls[0]).toBe(100);
    });

    it('should try parent group if initial group not found', async () => {
      let callCount = 0;
      mockExecutor.execute = async (query, variables) => {
        callCount++;
        if (callCount === 1) {
          // First call with 'group/subgroup/project' returns null group
          return { group: null };
        } else {
          // Second call with 'group/subgroup' succeeds
          return {
            group: {
              id: 'gid://gitlab/Group/1',
              iterations: {
                nodes: [{ id: '1', title: 'Sprint 1', state: 'closed' }],
                pageInfo: { hasNextPage: false, endCursor: null }
              }
            }
          };
        }
      };

      // Use a deeper project path
      const deepClient = new IterationClient(
        mockExecutor,
        mockRateLimitManager,
        'group/subgroup/project',
        mockLogger
      );

      const result = await deepClient.fetchIterations();

      expect(result).toHaveLength(1);
      expect(callCount).toBe(2);
    });

    it('should throw error if group not found after exhausting paths', async () => {
      mockExecutor.execute = async () => ({
        group: null
      });

      // Single-segment path with no parent to try
      const singleClient = new IterationClient(
        mockExecutor,
        mockRateLimitManager,
        'single',
        mockLogger
      );

      await expect(singleClient.fetchIterations()).rejects.toThrow(
        'Group not found: single'
      );
    });

    it('should return empty array if group has no iterations configured', async () => {
      mockExecutor.execute = async () => ({
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          iterations: null
        }
      });

      let warnCalled = false;
      mockLogger.warn = () => {
        warnCalled = true;
      };

      const result = await client.fetchIterations();

      expect(result).toEqual([]);
      expect(warnCalled).toBe(true);
    });

    it('should throw transformed error on GraphQL errors', async () => {
      mockExecutor.execute = async () => {
        const error = new Error('GraphQL error');
        error.response = {
          errors: [{ message: 'Permission denied' }]
        };
        throw error;
      };

      await expect(client.fetchIterations()).rejects.toThrow(
        'GitLab API Error (fetching iterations): Permission denied'
      );
    });

    it('should work without logger', async () => {
      const clientWithoutLogger = new IterationClient(
        mockExecutor,
        mockRateLimitManager,
        'group/project'
      );

      mockExecutor.execute = async () => ({
        group: {
          id: 'gid://gitlab/Group/1',
          iterations: {
            nodes: [{ id: '1', title: 'Sprint 1', state: 'closed' }],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await clientWithoutLogger.fetchIterations();

      expect(result).toHaveLength(1);
    });
  });
});
