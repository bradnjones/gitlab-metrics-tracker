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
      expect(service.metricsRepository).toBeDefined();
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
      expect(service.metricsRepository).toBeDefined();
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

      expect(service.metricsRepository).toBeDefined();
      expect(typeof service.metricsRepository.save).toBe('function');
      expect(typeof service.metricsRepository.findById).toBe('function');
    });
  });
});
