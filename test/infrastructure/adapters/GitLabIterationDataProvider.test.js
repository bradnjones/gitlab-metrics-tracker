import { describe, it, expect, jest } from '@jest/globals';
import { GitLabIterationDataProvider } from '../../../src/lib/infrastructure/adapters/GitLabIterationDataProvider.js';

describe('GitLabIterationDataProvider', () => {
  describe('fetchIterationData', () => {
    it('should fetch iteration data from GitLab client', async () => {
      const mockGitLabClient = {
        fetchIterationDetails: jest.fn().mockResolvedValue({
          issues: [
            { id: '1', title: 'Issue 1', state: 'closed' },
            { id: '2', title: 'Issue 2', state: 'opened' },
          ],
          mergeRequests: [
            { id: '1', title: 'MR 1' },
          ],
        }),
      };

      const provider = new GitLabIterationDataProvider(mockGitLabClient);
      const iterationId = 'gid://gitlab/Iteration/123';

      const result = await provider.fetchIterationData(iterationId);

      // Verify GitLab client was called
      expect(mockGitLabClient.fetchIterationDetails).toHaveBeenCalledWith(iterationId);

      // Verify data structure
      expect(result).toEqual({
        issues: [
          { id: '1', title: 'Issue 1', state: 'closed' },
          { id: '2', title: 'Issue 2', state: 'opened' },
        ],
        mergeRequests: [
          { id: '1', title: 'MR 1' },
        ],
        pipelines: [],
        incidents: [],
        iteration: {
          id: iterationId,
          title: expect.any(String), // Placeholder value
          startDate: expect.any(String), // ISO date string
          dueDate: expect.any(String), // ISO date string
        },
      });
    });

    it('should handle missing issues and mergeRequests arrays', async () => {
      const mockGitLabClient = {
        fetchIterationDetails: jest.fn().mockResolvedValue({}),
      };

      const provider = new GitLabIterationDataProvider(mockGitLabClient);
      const iterationId = 'gid://gitlab/Iteration/456';

      const result = await provider.fetchIterationData(iterationId);

      // Should provide empty arrays
      expect(result.issues).toEqual([]);
      expect(result.mergeRequests).toEqual([]);
      expect(result.pipelines).toEqual([]);
      expect(result.incidents).toEqual([]);
    });

    it('should throw error with context when GitLab client fails', async () => {
      const mockGitLabClient = {
        fetchIterationDetails: jest.fn().mockRejectedValue(
          new Error('GraphQL API Error: 404 Not Found')
        ),
      };

      const provider = new GitLabIterationDataProvider(mockGitLabClient);
      const iterationId = 'gid://gitlab/Iteration/789';

      await expect(provider.fetchIterationData(iterationId)).rejects.toThrow(
        'Failed to fetch iteration data: GraphQL API Error: 404 Not Found'
      );
    });
  });
});
