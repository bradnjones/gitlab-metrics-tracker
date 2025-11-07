/**
 * GitLab implementation of IIterationDataProvider
 * Infrastructure layer adapter that implements Core interface
 *
 * @module infrastructure/adapters/GitLabIterationDataProvider
 */

import { IIterationDataProvider } from '../../core/interfaces/IIterationDataProvider.js';

/**
 * GitLabIterationDataProvider
 * Adapts GitLabClient to IIterationDataProvider interface
 *
 * Architecture:
 * - Implements IIterationDataProvider (Core interface)
 * - Depends on GitLabClient (Infrastructure implementation)
 * - Dependency: Infrastructure → Core (correct direction)
 */
export class GitLabIterationDataProvider extends IIterationDataProvider {
  /**
   * Create a GitLabIterationDataProvider instance
   *
   * @param {Object} gitlabClient - GitLabClient instance for API calls
   */
  constructor(gitlabClient) {
    super();
    this.gitlabClient = gitlabClient;
  }

  /**
   * Fetch all data for a given iteration from GitLab
   *
   * @param {string} iterationId - GitLab iteration ID (e.g., 'gid://gitlab/Iteration/123')
   * @returns {Promise<IterationData>} Complete iteration data
   * @throws {Error} If GitLab fetch fails
   */
  async fetchIterationData(iterationId) {
    try {
      // Fetch iteration details (includes issues)
      const iterationDetails = await this.gitlabClient.fetchIterationDetails(iterationId);

      // For now, return basic structure
      // TODO: Fetch additional data (MRs, pipelines, incidents) in future stories
      return {
        issues: iterationDetails.issues || [],
        mergeRequests: iterationDetails.mergeRequests || [],
        pipelines: [], // TODO: Implement pipeline fetching
        incidents: [], // TODO: Implement incident fetching
        iteration: {
          id: iterationId,
          // Additional metadata could be extracted from iterationDetails if available
        },
      };
    } catch (error) {
      // Re-throw with context for Core layer
      throw new Error(`Failed to fetch iteration data: ${error.message}`);
    }
  }
}
