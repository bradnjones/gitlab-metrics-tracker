/**
 * Service Factory - Composition Root
 * Wires up dependencies for Clean Architecture
 *
 * @module server/services/ServiceFactory
 */

import { GitLabClient } from '../../lib/infrastructure/api/GitLabClient.js';
import { GitLabIterationDataProvider } from '../../lib/infrastructure/adapters/GitLabIterationDataProvider.js';
import { IterationCacheRepository } from '../../lib/infrastructure/repositories/IterationCacheRepository.js';
import { MetricsService } from '../../lib/core/services/MetricsService.js';

/**
 * ServiceFactory
 * Creates and wires up services with their dependencies
 *
 * Following Clean Architecture:
 * - Infrastructure implementations created here
 * - Core services receive injected dependencies
 * - This is the ONLY place where concrete classes are instantiated
 */
export class ServiceFactory {
  /**
   * Create GitLabClient with configuration
   *
   * @param {Object} [config] - Optional configuration override
   * @returns {GitLabClient} Configured GitLabClient instance
   */
  static createGitLabClient(config = null) {
    // Use provided config or load from environment
    const gitlabConfig = config || {
      url: process.env.GITLAB_URL || 'https://gitlab.com',
      token: process.env.GITLAB_TOKEN,
      projectPath: process.env.GITLAB_PROJECT_PATH,
    };

    // Validate required config
    if (!gitlabConfig.token) {
      throw new Error('GITLAB_TOKEN is required');
    }
    if (!gitlabConfig.projectPath) {
      throw new Error('GITLAB_PROJECT_PATH is required');
    }

    return new GitLabClient(gitlabConfig);
  }

  /**
   * Create MetricsService with all dependencies
   *
   * @param {Object} [config] - Optional configuration override
   * @returns {MetricsService} Fully wired MetricsService instance
   */
  static createMetricsService(config = null) {
    // Use provided config or load from environment
    const gitlabConfig = config || {
      url: process.env.GITLAB_URL || 'https://gitlab.com',
      token: process.env.GITLAB_TOKEN,
      projectPath: process.env.GITLAB_PROJECT_PATH,
    };

    // Validate required config
    if (!gitlabConfig.token) {
      throw new Error('GITLAB_TOKEN is required');
    }
    if (!gitlabConfig.projectPath) {
      throw new Error('GITLAB_PROJECT_PATH is required');
    }

    // Create Infrastructure dependencies
    const gitlabClient = new GitLabClient(gitlabConfig);
    const cacheRepository = new IterationCacheRepository('./src/data/cache/iterations');
    const dataProvider = new GitLabIterationDataProvider(gitlabClient, cacheRepository);

    // Create and return Core service with injected dependencies
    // Note: Metrics are calculated on-demand, not persisted (see ADR 001)
    return new MetricsService(dataProvider);
  }
}
