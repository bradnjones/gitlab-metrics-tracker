import { describe, it, expect, jest } from '@jest/globals';
import { GitLabIterationDataProvider } from '../../../src/lib/infrastructure/adapters/GitLabIterationDataProvider.js';

describe('GitLabIterationDataProvider', () => {
  describe('fetchIterationData', () => {
    it('should fetch iteration data from GitLab client', async () => {
      const mockGitLabClient = {
        fetchIterations: jest.fn().mockResolvedValue([
          { id: 'gid://gitlab/Iteration/123', title: 'Sprint 1', startDate: '2024-10-01', dueDate: '2024-10-14' },
        ]),
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
      expect(mockGitLabClient.fetchIterations).toHaveBeenCalled();
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
          title: 'Sprint 1',
          startDate: '2024-10-01',
          dueDate: '2024-10-14',
        },
      });
    });

    it('should handle missing issues and mergeRequests arrays', async () => {
      const mockGitLabClient = {
        fetchIterations: jest.fn().mockResolvedValue([
          { id: 'gid://gitlab/Iteration/456', title: 'Sprint 2', startDate: '2024-10-15', dueDate: '2024-10-28' },
        ]),
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
        fetchIterations: jest.fn().mockResolvedValue([]),
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
        fetchIterations: jest.fn().mockResolvedValue([mockIteration]),
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
        fetchIterations: jest.fn().mockResolvedValue([mockIteration]),
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

  describe('fetchMultipleIterations', () => {
    it('should fetch multiple iterations in parallel', async () => {
      const mockIterations = [
        { id: 'gid://gitlab/Iteration/123', title: 'Sprint 23', startDate: '2024-10-01', dueDate: '2024-10-14' },
        { id: 'gid://gitlab/Iteration/124', title: 'Sprint 24', startDate: '2024-10-15', dueDate: '2024-10-28' },
      ];

      const mockGitLabClient = {
        fetchIterations: jest.fn().mockResolvedValue(mockIterations),
        fetchIterationDetails: jest.fn()
          .mockResolvedValueOnce({
            issues: [{ id: '1', title: 'Issue 1', state: 'closed', weight: 3 }],
            mergeRequests: [],
          })
          .mockResolvedValueOnce({
            issues: [{ id: '2', title: 'Issue 2', state: 'opened', weight: 5 }],
            mergeRequests: [],
          }),
      };

      const provider = new GitLabIterationDataProvider(mockGitLabClient);
      const iterationIds = ['gid://gitlab/Iteration/123', 'gid://gitlab/Iteration/124'];

      const results = await provider.fetchMultipleIterations(iterationIds);

      // Verify fetchIterations called ONCE (not N times)
      expect(mockGitLabClient.fetchIterations).toHaveBeenCalledTimes(1);

      // Verify fetchIterationDetails called for each iteration
      expect(mockGitLabClient.fetchIterationDetails).toHaveBeenCalledTimes(2);
      expect(mockGitLabClient.fetchIterationDetails).toHaveBeenCalledWith('gid://gitlab/Iteration/123');
      expect(mockGitLabClient.fetchIterationDetails).toHaveBeenCalledWith('gid://gitlab/Iteration/124');

      // Verify results structure
      expect(results).toHaveLength(2);
      expect(results[0].iteration.title).toBe('Sprint 23');
      expect(results[0].issues).toHaveLength(1);
      expect(results[1].iteration.title).toBe('Sprint 24');
      expect(results[1].issues).toHaveLength(1);
    });

    it('should return results in same order as input iteration IDs', async () => {
      const mockIterations = [
        { id: 'gid://gitlab/Iteration/100', title: 'Sprint 100', startDate: '2024-01-01', dueDate: '2024-01-14' },
        { id: 'gid://gitlab/Iteration/200', title: 'Sprint 200', startDate: '2024-02-01', dueDate: '2024-02-14' },
        { id: 'gid://gitlab/Iteration/300', title: 'Sprint 300', startDate: '2024-03-01', dueDate: '2024-03-14' },
      ];

      const mockGitLabClient = {
        fetchIterations: jest.fn().mockResolvedValue(mockIterations),
        fetchIterationDetails: jest.fn()
          .mockResolvedValueOnce({ issues: [], mergeRequests: [] })
          .mockResolvedValueOnce({ issues: [], mergeRequests: [] })
          .mockResolvedValueOnce({ issues: [], mergeRequests: [] }),
      };

      const provider = new GitLabIterationDataProvider(mockGitLabClient);

      // Request in different order than mockIterations
      const iterationIds = [
        'gid://gitlab/Iteration/300',  // 3rd in mockIterations
        'gid://gitlab/Iteration/100',  // 1st in mockIterations
        'gid://gitlab/Iteration/200',  // 2nd in mockIterations
      ];

      const results = await provider.fetchMultipleIterations(iterationIds);

      // Verify order matches input order, not mockIterations order
      expect(results[0].iteration.title).toBe('Sprint 300');
      expect(results[1].iteration.title).toBe('Sprint 100');
      expect(results[2].iteration.title).toBe('Sprint 200');
    });

    it('should throw error if iterationIds is not an array', async () => {
      const mockGitLabClient = {
        fetchIterations: jest.fn(),
        fetchIterationDetails: jest.fn(),
      };

      const provider = new GitLabIterationDataProvider(mockGitLabClient);

      await expect(provider.fetchMultipleIterations(null)).rejects.toThrow(
        'iterationIds must be a non-empty array'
      );
      await expect(provider.fetchMultipleIterations('string')).rejects.toThrow(
        'iterationIds must be a non-empty array'
      );
    });

    it('should throw error if iterationIds is empty array', async () => {
      const mockGitLabClient = {
        fetchIterations: jest.fn(),
        fetchIterationDetails: jest.fn(),
      };

      const provider = new GitLabIterationDataProvider(mockGitLabClient);

      await expect(provider.fetchMultipleIterations([])).rejects.toThrow(
        'iterationIds must be a non-empty array'
      );
    });

    it('should throw error with context when any iteration fetch fails', async () => {
      const mockGitLabClient = {
        fetchIterations: jest.fn().mockResolvedValue([
          { id: 'gid://gitlab/Iteration/123', title: 'Sprint 23', startDate: '2024-10-01', dueDate: '2024-10-14' },
        ]),
        fetchIterationDetails: jest.fn().mockRejectedValue(
          new Error('GraphQL API Error: Rate limit exceeded')
        ),
      };

      const provider = new GitLabIterationDataProvider(mockGitLabClient);
      const iterationIds = ['gid://gitlab/Iteration/123'];

      await expect(provider.fetchMultipleIterations(iterationIds)).rejects.toThrow(
        'Failed to fetch multiple iterations: GraphQL API Error: Rate limit exceeded'
      );
    });

    it('should handle iterations with missing metadata gracefully', async () => {
      const mockIterations = [
        { id: 'gid://gitlab/Iteration/123', title: 'Sprint 23', startDate: '2024-10-01', dueDate: '2024-10-14' },
        // Iteration 999 missing from metadata list
      ];

      const mockGitLabClient = {
        fetchIterations: jest.fn().mockResolvedValue(mockIterations),
        fetchIterationDetails: jest.fn()
          .mockResolvedValueOnce({ issues: [], mergeRequests: [] })
          .mockResolvedValueOnce({ issues: [], mergeRequests: [] }),
      };

      const provider = new GitLabIterationDataProvider(mockGitLabClient);
      const iterationIds = ['gid://gitlab/Iteration/123', 'gid://gitlab/Iteration/999'];

      const results = await provider.fetchMultipleIterations(iterationIds);

      // First iteration has correct metadata
      expect(results[0].iteration.title).toBe('Sprint 23');
      expect(results[0].iteration.startDate).toBe('2024-10-01');

      // Second iteration uses fallback values
      expect(results[1].iteration.id).toBe('gid://gitlab/Iteration/999');
      expect(results[1].iteration.title).toBe('Unknown Sprint');
      expect(results[1].iteration.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date
    });
  });
});
