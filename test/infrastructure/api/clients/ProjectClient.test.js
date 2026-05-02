import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProjectClient } from '../../../../src/lib/infrastructure/api/clients/ProjectClient.js';

describe('ProjectClient', () => {
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

    client = new ProjectClient(
      mockExecutor,
      mockRateLimitManager,
      'group/project',
      mockLogger
    );
  });

  describe('fetchGroupProjects', () => {
    it('should fetch group projects successfully', async () => {
      mockExecutor.execute = async () => ({
        group: {
          id: 'gid://gitlab/Group/1',
          name: 'Test Group',
          projects: {
            nodes: [
              { id: '1', fullPath: 'group/project1', name: 'Project 1' },
              { id: '2', fullPath: 'group/project2', name: 'Project 2' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchGroupProjects();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project 1');
      expect(result[1].name).toBe('Project 2');
    });

    it('should handle pagination for group projects', async () => {
      let callCount = 0;
      mockExecutor.execute = async (query, variables) => {
        callCount++;
        if (callCount === 1) {
          return {
            group: {
              projects: {
                nodes: [{ id: '1', fullPath: 'group/p1', name: 'P1' }],
                pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
              }
            }
          };
        } else {
          return {
            group: {
              projects: {
                nodes: [{ id: '2', fullPath: 'group/p2', name: 'P2' }],
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

      const result = await client.fetchGroupProjects();

      expect(result).toHaveLength(2);
      expect(delayCalls).toHaveLength(1);
      expect(delayCalls[0]).toBe(100);
    });

    it('should return empty array if group not found', async () => {
      mockExecutor.execute = async () => ({
        group: null
      });

      const result = await client.fetchGroupProjects();

      expect(result).toEqual([]);
    });

    it('should return empty array and log warning on error', async () => {
      mockExecutor.execute = async () => {
        throw new Error('API Error');
      };

      let warnCalled = false;
      mockLogger.warn = () => {
        warnCalled = true;
      };

      const result = await client.fetchGroupProjects();

      expect(result).toEqual([]);
      expect(warnCalled).toBe(true);
    });

    it('should work without logger', async () => {
      const clientWithoutLogger = new ProjectClient(
        mockExecutor,
        mockRateLimitManager,
        'group/project'
      );

      mockExecutor.execute = async () => ({
        group: {
          projects: {
            nodes: [{ id: '1', fullPath: 'group/p1', name: 'P1' }],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await clientWithoutLogger.fetchGroupProjects();

      expect(result).toHaveLength(1);
    });

    it('should return empty array if group not found without logger', async () => {
      const clientWithoutLogger = new ProjectClient(mockExecutor, mockRateLimitManager, 'group/project');
      mockExecutor.execute = async () => ({ group: null });

      const result = await clientWithoutLogger.fetchGroupProjects();

      expect(result).toEqual([]);
    });

    it('should return empty array on error without logger', async () => {
      const clientWithoutLogger = new ProjectClient(mockExecutor, mockRateLimitManager, 'group/project');
      mockExecutor.execute = async () => { throw new Error('Network error'); };

      const result = await clientWithoutLogger.fetchGroupProjects();

      expect(result).toEqual([]);
    });
  });

  describe('fetchProject', () => {
    it('should fetch project successfully and return project data', async () => {
      mockExecutor.execute = jest.fn().mockResolvedValue({
        project: { id: '1', name: 'Test' }
      });

      const result = await client.fetchProject();

      expect(result).toEqual({ id: '1', name: 'Test' });
    });

    it('should call execute with query containing getProject and correct variables', async () => {
      mockExecutor.execute = jest.fn().mockResolvedValue({
        project: { id: '1', name: 'Test' }
      });

      await client.fetchProject();

      expect(mockExecutor.execute).toHaveBeenCalledWith(
        expect.stringContaining('getProject'),
        { fullPath: 'group/project' }
      );
    });

    it('should throw with context message when executor throws', async () => {
      mockExecutor.execute = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(client.fetchProject()).rejects.toThrow(
        'Failed to fetch project: Network error'
      );
    });
  });
});
