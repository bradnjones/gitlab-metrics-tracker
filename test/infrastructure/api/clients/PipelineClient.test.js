import { describe, it, expect, beforeEach } from '@jest/globals';
import { PipelineClient } from '../../../../src/lib/infrastructure/api/clients/PipelineClient.js';

describe('PipelineClient', () => {
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

    client = new PipelineClient(mockExecutor, mockRateLimitManager, mockLogger);
  });

  describe('fetchPipelinesForProject', () => {
    it('should fetch pipelines for a project', async () => {
      mockExecutor.execute = async () => ({
        project: {
          pipelines: {
            nodes: [
              { id: '1', iid: '1', status: 'success', ref: 'main', createdAt: '2025-01-01' },
              { id: '2', iid: '2', status: 'failed', ref: 'main', createdAt: '2025-01-02' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchPipelinesForProject('group/project', 'main');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('success');
      expect(result[1].status).toBe('failed');
    });

    it('should handle pagination for pipelines', async () => {
      let callCount = 0;
      mockExecutor.execute = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            project: {
              pipelines: {
                nodes: [{ id: '1', status: 'success', createdAt: '2025-01-01' }],
                pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
              }
            }
          };
        } else {
          return {
            project: {
              pipelines: {
                nodes: [{ id: '2', status: 'failed', createdAt: '2025-01-02' }],
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

      const result = await client.fetchPipelinesForProject('group/project');

      expect(result).toHaveLength(2);
      expect(delayCalls).toHaveLength(1);
      expect(delayCalls[0]).toBe(50); // Reduced delay for pipelines
    });

    it('should filter pipelines by end date client-side', async () => {
      mockExecutor.execute = async () => ({
        project: {
          pipelines: {
            nodes: [
              { id: '1', createdAt: '2025-01-01T00:00:00Z' },
              { id: '2', createdAt: '2025-01-15T00:00:00Z' },
              { id: '3', createdAt: '2025-01-31T00:00:00Z' }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      const result = await client.fetchPipelinesForProject(
        'group/project',
        'main',
        '2025-01-01',
        '2025-01-20'
      );

      expect(result).toHaveLength(2); // Only pipelines before 2025-01-20
      expect(result.map(p => p.id)).toEqual(['1', '2']);
    });

    it('should return empty array if project not found', async () => {
      mockExecutor.execute = async () => ({
        project: null
      });

      const result = await client.fetchPipelinesForProject('group/nonexistent');

      expect(result).toEqual([]);
    });

    it('should return empty array if pipelines is null', async () => {
      mockExecutor.execute = async () => ({
        project: {
          pipelines: null
        }
      });

      const result = await client.fetchPipelinesForProject('group/project');

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

      const result = await client.fetchPipelinesForProject('group/project');

      expect(result).toEqual([]);
      expect(warnCalled).toBe(true);
    });

    it('should use default ref "master" if not provided', async () => {
      let capturedVariables = null;
      mockExecutor.execute = async (query, variables) => {
        capturedVariables = variables;
        return {
          project: {
            pipelines: {
              nodes: [],
              pageInfo: { hasNextPage: false, endCursor: null }
            }
          }
        };
      };

      await client.fetchPipelinesForProject('group/project');

      expect(capturedVariables.ref).toBe('master');
    });
  });
});
