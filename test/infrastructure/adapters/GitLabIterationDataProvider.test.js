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

    it('should transform GitLab iteration metadata into domain iteration object', async () => {
      const mockIteration = {
        id: 'gid://gitlab/Iteration/123',
        iid: 42,
        title: 'Sprint 23',
        description: 'Q4 2024 Sprint',
        state: 'current',
        startDate: '2024-10-01',
        dueDate: '2024-10-14',
        createdAt: '2024-09-15T10:00:00Z',
        updatedAt: '2024-10-01T09:00:00Z',
        webUrl: 'https://gitlab.com/groups/my-group/-/cadences/5/iterations/123',
        iterationCadence: {
          id: 'gid://gitlab/Iterations::Cadence/5',
          title: 'Bi-weekly Sprints'
        }
      };

      const mockGitLabClient = {
        fetchIterationDetails: jest.fn().mockResolvedValue({
          iteration: mockIteration,
          issues: [
            { id: '1', title: 'Issue 1', state: 'closed', weight: 3 },
            { id: '2', title: 'Issue 2', state: 'opened', weight: 5 },
          ],
          mergeRequests: [],
        }),
      };

      const provider = new GitLabIterationDataProvider(mockGitLabClient);
      const iterationId = 'gid://gitlab/Iteration/123';

      const result = await provider.fetchIterationData(iterationId);

      // Verify iteration metadata is extracted correctly
      expect(result.iteration).toEqual({
        id: 'gid://gitlab/Iteration/123',
        title: 'Sprint 23',
        startDate: '2024-10-01',
        dueDate: '2024-10-14',
      });

      // Verify issues are still passed through
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].weight).toBe(3);
    });

    it('should handle iteration with only closed issues (velocity calculation)', async () => {
      const mockIteration = {
        id: 'gid://gitlab/Iteration/456',
        title: 'Sprint 24',
        startDate: '2024-10-15',
        dueDate: '2024-10-28',
      };

      const mockGitLabClient = {
        fetchIterationDetails: jest.fn().mockResolvedValue({
          iteration: mockIteration,
          issues: [
            { id: '1', title: 'Closed Issue 1', state: 'closed', weight: 3 },
            { id: '2', title: 'Closed Issue 2', state: 'closed', weight: 5 },
            { id: '3', title: 'Open Issue', state: 'opened', weight: 2 }, // Should be filtered by VelocityCalculator
          ],
          mergeRequests: [],
        }),
      };

      const provider = new GitLabIterationDataProvider(mockGitLabClient);
      const iterationId = 'gid://gitlab/Iteration/456';

      const result = await provider.fetchIterationData(iterationId);

      // Verify all issues are passed through (filtering happens in VelocityCalculator)
      expect(result.issues).toHaveLength(3);

      // Verify closed issues exist
      const closedIssues = result.issues.filter(i => i.state === 'closed');
      expect(closedIssues).toHaveLength(2);

      // Verify iteration metadata
      expect(result.iteration.title).toBe('Sprint 24');
    });
  });
});
