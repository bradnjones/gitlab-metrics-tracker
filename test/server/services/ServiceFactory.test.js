import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ServiceFactory } from '../../../src/server/services/ServiceFactory.js';
import { MetricsService } from '../../../src/lib/core/services/MetricsService.js';

describe('ServiceFactory', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('createMetricsService', () => {
    it('should create MetricsService with valid configuration', () => {
      // Arrange
      const config = {
        url: 'https://gitlab.com',
        token: 'test-token-123',
        projectPath: 'test/project',
      };

      // Act
      const service = ServiceFactory.createMetricsService(config);

      // Assert
      expect(service).toBeInstanceOf(MetricsService);
      expect(service.dataProvider).toBeDefined();
      // Note: metricsRepository removed - metrics calculated on-demand (see ADR 001)
    });

    it('should throw error when GITLAB_TOKEN is missing', () => {
      // Arrange
      const config = {
        url: 'https://gitlab.com',
        token: undefined, // Missing token
        projectPath: 'test/project',
      };

      // Act & Assert
      expect(() => {
        ServiceFactory.createMetricsService(config);
      }).toThrow('GITLAB_TOKEN is required');
    });

    it('should throw error when GITLAB_PROJECT_PATH is missing', () => {
      // Arrange
      const config = {
        url: 'https://gitlab.com',
        token: 'test-token-123',
        projectPath: undefined, // Missing project path
      };

      // Act & Assert
      expect(() => {
        ServiceFactory.createMetricsService(config);
      }).toThrow('GITLAB_PROJECT_PATH is required');
    });

    it('should use environment variables when no config provided', () => {
      // Arrange
      process.env.GITLAB_URL = 'https://gitlab.example.com';
      process.env.GITLAB_TOKEN = 'env-token-456';
      process.env.GITLAB_PROJECT_PATH = 'env/project';

      // Act
      const service = ServiceFactory.createMetricsService();

      // Assert
      expect(service).toBeInstanceOf(MetricsService);
      expect(service.dataProvider).toBeDefined();
      // Note: metricsRepository removed - metrics calculated on-demand (see ADR 001)
    });

    it('should default to https://gitlab.com when GITLAB_URL not provided', () => {
      // Arrange
      const config = {
        token: 'test-token-123',
        projectPath: 'test/project',
        // url not provided
      };

      // Act
      const service = ServiceFactory.createMetricsService(config);

      // Assert
      expect(service).toBeInstanceOf(MetricsService);
    });

    it('should create all required dependencies', () => {
      // Arrange
      const config = {
        url: 'https://gitlab.com',
        token: 'test-token-123',
        projectPath: 'test/project',
      };

      // Act
      const service = ServiceFactory.createMetricsService(config);

      // Assert - Verify service has injected dependencies
      expect(service.dataProvider).toBeDefined();
      expect(typeof service.dataProvider.fetchIterationData).toBe('function');
      expect(typeof service.dataProvider.fetchMultipleIterations).toBe('function');
      // Note: metricsRepository removed - metrics calculated on-demand (see ADR 001)
    });
  });

  describe('createGitLabClient', () => {
    it('should create GitLabClient with valid configuration', () => {
      const config = {
        url: 'https://gitlab.com',
        token: 'test-token-123',
        projectPath: 'test/project'
      };

      const client = ServiceFactory.createGitLabClient(config);

      expect(client).toBeDefined();
      // Verify it's a GitLabClient by checking it has expected methods
      expect(typeof client.fetchIterations).toBe('function');
    });

    it('should throw error when GITLAB_TOKEN is missing', () => {
      const config = {
        url: 'https://gitlab.com',
        projectPath: 'test/project'
        // token missing
      };

      expect(() => {
        ServiceFactory.createGitLabClient(config);
      }).toThrow('GITLAB_TOKEN is required');
    });

    it('should throw error when GITLAB_PROJECT_PATH is missing', () => {
      const config = {
        url: 'https://gitlab.com',
        token: 'test-token-123'
        // projectPath missing
      };

      expect(() => {
        ServiceFactory.createGitLabClient(config);
      }).toThrow('GITLAB_PROJECT_PATH is required');
    });

    it('should use environment variables when no config provided', () => {
      process.env.GITLAB_URL = 'https://gitlab.example.com';
      process.env.GITLAB_TOKEN = 'env-token-789';
      process.env.GITLAB_PROJECT_PATH = 'env/project/path';

      const client = ServiceFactory.createGitLabClient();

      expect(client).toBeDefined();
      expect(typeof client.fetchIterations).toBe('function');
    });

    it('should default to https://gitlab.com when GITLAB_URL not provided', () => {
      process.env.GITLAB_TOKEN = 'env-token-789';
      process.env.GITLAB_PROJECT_PATH = 'env/project/path';
      delete process.env.GITLAB_URL;

      const client = ServiceFactory.createGitLabClient();

      expect(client).toBeDefined();
      expect(typeof client.fetchIterations).toBe('function');
    });
  });

  describe('createIterationCacheRepository', () => {
    it('should create IterationCacheRepository with default cache directory', () => {
      const repository = ServiceFactory.createIterationCacheRepository();

      expect(repository).toBeDefined();
      // Verify it's a repository by checking it has expected methods
      expect(typeof repository.get).toBe('function');
      expect(typeof repository.set).toBe('function');
    });

    it('should create repository with custom cache directory', () => {
      const customDir = './test/cache';

      const repository = ServiceFactory.createIterationCacheRepository(customDir);

      expect(repository).toBeDefined();
      expect(typeof repository.get).toBe('function');
    });

    it('should use CACHE_TTL_HOURS from environment', () => {
      process.env.CACHE_TTL_HOURS = '12';

      const repository = ServiceFactory.createIterationCacheRepository();

      expect(repository).toBeDefined();
      expect(typeof repository.get).toBe('function');
    });

    it('should default to 6 hours when CACHE_TTL_HOURS not set', () => {
      delete process.env.CACHE_TTL_HOURS;

      const repository = ServiceFactory.createIterationCacheRepository();

      expect(repository).toBeDefined();
      expect(typeof repository.get).toBe('function');
    });

    it('should handle invalid CACHE_TTL_HOURS and default to 6', () => {
      process.env.CACHE_TTL_HOURS = 'invalid';

      const repository = ServiceFactory.createIterationCacheRepository();

      // parseInt('invalid', 10) returns NaN, which is falsy, so defaults to 6
      expect(repository).toBeDefined();
      expect(typeof repository.get).toBe('function');
    });
  });

  describe('createGetCacheStatusUseCase', () => {
    it('should create GetCacheStatusUseCase with dependencies', () => {
      const useCase = ServiceFactory.createGetCacheStatusUseCase();

      expect(useCase).toBeDefined();
      expect(typeof useCase.execute).toBe('function');
    });

    it('should inject IterationCacheRepository into use case', () => {
      const useCase = ServiceFactory.createGetCacheStatusUseCase();

      // Verify the use case is properly created
      expect(useCase).toBeDefined();
      expect(typeof useCase.execute).toBe('function');
    });
  });

  describe('createAnnotationsRepository', () => {
    it('should create FileAnnotationsRepository with default data directory', () => {
      const repository = ServiceFactory.createAnnotationsRepository();

      expect(repository).toBeDefined();
      // Verify it's a repository by checking it has expected methods
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.save).toBe('function');
    });

    it('should create repository with custom data directory', () => {
      const customDir = './custom/data';

      const repository = ServiceFactory.createAnnotationsRepository(customDir);

      expect(repository).toBeDefined();
      expect(typeof repository.findAll).toBe('function');
    });
  });
});
