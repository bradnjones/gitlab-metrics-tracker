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
      // Fetch iteration list to get metadata (includes dates)
      const iterations = await this.gitlabClient.fetchIterations();
      const iterationMetadata = iterations.find(it => it.id === iterationId);

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
          id: iterationMetadata?.id || iterationId,
          title: iterationMetadata?.title || 'Unknown Sprint',
          startDate: iterationMetadata?.startDate || new Date().toISOString(),
          dueDate: iterationMetadata?.dueDate || new Date().toISOString(),
        },
      };
    } catch (error) {
      // Re-throw with context for Core layer
      throw new Error(`Failed to fetch iteration data: ${error.message}`);
    }
  }

  /**
   * Fetch data for multiple iterations efficiently in a single batch
   * Performance optimized: fetches iteration metadata once, then parallelizes details fetching
   *
   * @param {Array<string>} iterationIds - Array of GitLab iteration IDs
   * @returns {Promise<Array<IterationData>>} Array of iteration data in same order as input
   * @throws {Error} If fetch fails for any iteration
   */
  async fetchMultipleIterations(iterationIds) {
    try {
      // Validate input
      if (!Array.isArray(iterationIds) || iterationIds.length === 0) {
        throw new Error('iterationIds must be a non-empty array');
      }

      // Fetch iteration list ONCE to get all metadata (leverages 10-minute cache)
      const allIterations = await this.gitlabClient.fetchIterations();

      // Create lookup map for O(1) access
      const iterationMap = new Map(allIterations.map(it => [it.id, it]));

      // Fetch details for all iterations IN PARALLEL
      const detailsPromises = iterationIds.map(id =>
        this.gitlabClient.fetchIterationDetails(id)
      );
      const allDetails = await Promise.all(detailsPromises);

      // Combine metadata + details in original order
      return iterationIds.map((id, index) => {
        const metadata = iterationMap.get(id);
        const details = allDetails[index];

        return {
          issues: details.issues || [],
          mergeRequests: details.mergeRequests || [],
          pipelines: [], // TODO: Implement pipeline fetching
          incidents: [], // TODO: Implement incident fetching
          iteration: {
            id: metadata?.id || id,
            title: metadata?.title || 'Unknown Sprint',
            startDate: metadata?.startDate || new Date().toISOString(),
            dueDate: metadata?.dueDate || new Date().toISOString(),
          },
        };
      });
    } catch (error) {
      // Re-throw with context for Core layer
      throw new Error(`Failed to fetch multiple iterations: ${error.message}`);
    }
  }
}
