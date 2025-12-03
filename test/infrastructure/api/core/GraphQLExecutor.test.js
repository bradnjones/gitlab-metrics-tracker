import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock graphql-request before importing GraphQLExecutor
const mockRequest = jest.fn();
const mockGraphQLClient = jest.fn(() => ({
  request: mockRequest
}));

jest.unstable_mockModule('graphql-request', () => ({
  GraphQLClient: mockGraphQLClient
}));

// Import after mocking
const { GraphQLExecutor } = await import('../../../../src/lib/infrastructure/api/core/GraphQLExecutor.js');

describe('GraphQLExecutor', () => {
  let executor;
  let mockLogger;

  beforeEach(() => {
    mockGraphQLClient.mockClear();
    mockRequest.mockClear();

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn()
    };

    executor = new GraphQLExecutor({
      url: 'https://gitlab.example.com',
      token: 'test-token',
      projectPath: 'group/project'
    }, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize GraphQL client with correct configuration', () => {
      expect(mockGraphQLClient).toHaveBeenCalledWith(
        'https://gitlab.example.com/api/graphql',
        {
          headers: {
            Authorization: 'Bearer test-token'
          }
        }
      );
    });

    it('should store configuration', () => {
      expect(executor.url).toBe('https://gitlab.example.com');
      expect(executor.token).toBe('test-token');
      expect(executor.projectPath).toBe('group/project');
      expect(executor.logger).toBe(mockLogger);
    });
  });

  describe('execute', () => {
    const testQuery = 'query { test }';
    const testVariables = { id: '123' };

    it('should execute query and return data', async () => {
      const expectedData = { project: { name: 'Test Project' } };
      mockRequest.mockResolvedValueOnce(expectedData);

      const result = await executor.execute(testQuery, testVariables, 'fetching project');

      expect(mockRequest).toHaveBeenCalledWith(testQuery, testVariables);
      expect(result).toEqual(expectedData);
    });

    it('should log query execution when logger is provided', async () => {
      mockRequest.mockResolvedValueOnce({ data: 'test' });

      await executor.execute(testQuery, testVariables);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Executing GraphQL query',
        expect.objectContaining({
          queryPreview: expect.stringContaining('query { test }'),
          variables: testVariables
        })
      );
    });

    it('should transform GraphQL errors with context', async () => {
      const graphQLError = {
        response: {
          errors: [{ message: 'Field not found' }]
        }
      };
      mockRequest.mockRejectedValueOnce(graphQLError);

      await expect(
        executor.execute(testQuery, testVariables, 'fetching iterations')
      ).rejects.toThrow('GitLab API Error (fetching iterations): Field not found');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should transform HTTP errors with context', async () => {
      const httpError = {
        response: {
          status: 401,
          statusText: 'Unauthorized'
        }
      };
      mockRequest.mockRejectedValueOnce(httpError);

      await expect(
        executor.execute(testQuery, testVariables, 'authenticating')
      ).rejects.toThrow('HTTP 401 (authenticating): Unauthorized');
    });

    it('should transform network errors with context', async () => {
      const networkError = new Error('Connection refused');
      mockRequest.mockRejectedValueOnce(networkError);

      await expect(
        executor.execute(testQuery, testVariables, 'connecting')
      ).rejects.toThrow('Failed connecting: Connection refused');
    });

    it('should work without logger', async () => {
      const executorWithoutLogger = new GraphQLExecutor({
        url: 'https://gitlab.com',
        token: 'token',
        projectPath: 'path'
      });

      mockRequest.mockResolvedValueOnce({ data: 'test' });

      await expect(
        executorWithoutLogger.execute(testQuery, testVariables)
      ).resolves.toBeDefined();
    });

    it('should use default context if not provided', async () => {
      const error = new Error('Failed');
      mockRequest.mockRejectedValueOnce(error);

      await expect(
        executor.execute(testQuery, testVariables)
      ).rejects.toThrow('Failed executing query');
    });
  });
});
