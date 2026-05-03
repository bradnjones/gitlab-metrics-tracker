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
const { GraphQLExecutor } = await import('../../../../src/lib/infrastructure/api/http/GraphQLExecutor.js');

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

  describe('retry behavior', () => {
    const testQuery = 'query { test }';
    const testVariables = { id: '123' };

    beforeEach(() => {
      // Suppress delays in all retry tests
      jest.spyOn(executor, '_sleep').mockResolvedValue(undefined);
    });

    it('should not retry non-retryable errors (e.g. 401)', async () => {
      const authError = { response: { status: 401, statusText: 'Unauthorized' } };
      mockRequest.mockRejectedValueOnce(authError);

      await expect(
        executor.execute(testQuery, testVariables, 'authenticating')
      ).rejects.toThrow('HTTP 401 (authenticating): Unauthorized');

      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(executor._sleep).not.toHaveBeenCalled();
    });

    it('should not retry non-retryable GraphQL errors', async () => {
      const graphQLError = { response: { errors: [{ message: 'Field not found' }] } };
      mockRequest.mockRejectedValueOnce(graphQLError);

      await expect(
        executor.execute(testQuery, testVariables, 'fetching')
      ).rejects.toThrow('GitLab API Error');

      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should retry a 5xx error and succeed on second attempt', async () => {
      const serverError = { response: { status: 500, statusText: 'Internal Server Error' } };
      const expectedData = { project: { name: 'Test' } };
      mockRequest
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(expectedData);

      const result = await executor.execute(testQuery, testVariables, 'fetching');

      expect(result).toEqual(expectedData);
      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(executor._sleep).toHaveBeenCalledTimes(1);
    });

    it('should retry up to 3 attempts total then throw transformed error', async () => {
      const serverError = { response: { status: 503, statusText: 'Service Unavailable' } };
      mockRequest
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError);

      await expect(
        executor.execute(testQuery, testVariables, 'retrying')
      ).rejects.toThrow('HTTP 503 (retrying): Service Unavailable');

      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    it('should not make a 4th attempt after 3 failures', async () => {
      const serverError = { response: { status: 503, statusText: 'Service Unavailable' } };
      mockRequest.mockRejectedValue(serverError);

      await expect(executor.execute(testQuery, testVariables)).rejects.toThrow();

      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff delays of 1s then 2s', async () => {
      const serverError = { response: { status: 503, statusText: 'Service Unavailable' } };
      mockRequest
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError);

      await expect(executor.execute(testQuery, testVariables)).rejects.toThrow();

      expect(executor._sleep).toHaveBeenCalledTimes(2);
      expect(executor._sleep).toHaveBeenNthCalledWith(1, 1000);
      expect(executor._sleep).toHaveBeenNthCalledWith(2, 2000);
    });

    it('should retry on ECONNRESET network errors', async () => {
      const networkError = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
      const expectedData = { project: { name: 'Recovered' } };
      mockRequest
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(expectedData);

      const result = await executor.execute(testQuery, testVariables, 'connecting');

      expect(result).toEqual(expectedData);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('should use Retry-After header duration on 429 responses', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'retry-after': '30' }
        }
      };
      const expectedData = { project: { name: 'Test' } };
      mockRequest
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(expectedData);

      const result = await executor.execute(testQuery, testVariables);

      expect(result).toEqual(expectedData);
      expect(executor._sleep).toHaveBeenCalledWith(30000);
    });

    it('should fall back to exponential backoff on 429 without Retry-After', async () => {
      const rateLimitError = {
        response: { status: 429, statusText: 'Too Many Requests' }
      };
      const expectedData = { data: 'ok' };
      mockRequest
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(expectedData);

      await executor.execute(testQuery, testVariables);

      expect(executor._sleep).toHaveBeenCalledWith(1000);
    });
  });
});
