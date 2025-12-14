/**
 * Client for fetching GitLab iteration data.
 * Handles iteration list retrieval with pagination and group path fallback.
 *
 * @module IterationClient
 */

/**
 * Client responsible for fetching iteration (sprint) data from GitLab.
 */
export class IterationClient {
  /**
   * Creates a new IterationClient instance.
   *
   * @param {import('../core/GraphQLExecutor.js').GraphQLExecutor} executor - GraphQL executor
   * @param {import('../core/RateLimitManager.js').RateLimitManager} rateLimitManager - Rate limit manager
   * @param {string} projectPath - GitLab project path (e.g., 'group/project')
   * @param {import('../../../../core/interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional)
   */
  constructor(executor, rateLimitManager, projectPath, logger = null) {
    this.executor = executor;
    this.rateLimitManager = rateLimitManager;
    this.projectPath = projectPath;
    this.logger = logger;
  }

  /**
   * Fetches all iterations (sprints) for the group.
   * Handles pagination and automatically falls back to parent group if needed.
   *
   * @returns {Promise<Array>} Array of iteration objects
   * @throws {Error} If the group is not found or request fails
   */
  async fetchIterations() {
    let groupPath = this.projectPath;

    const query = `
      query getIterations($fullPath: ID!, $after: String) {
        group(fullPath: $fullPath) {
          id
          name
          iterations(first: 100, after: $after, includeAncestors: false) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              iid
              title
              description
              state
              startDate
              dueDate
              createdAt
              updatedAt
              webUrl
              iterationCadence {
                id
                title
              }
            }
          }
        }
      }
    `;

    let allIterations = [];
    let hasNextPage = true;
    let after = null;

    try {
      while (hasNextPage) {
        const data = await this.executor.execute(
          query,
          { fullPath: groupPath, after },
          'fetching iterations'
        );

        // Check if group exists
        if (!data.group) {
          // Try removing last segment (might be a project path)
          const segments = this.projectPath.split('/');
          if (segments.length > 1) {
            groupPath = segments.slice(0, -1).join('/');
            if (this.logger) {
              this.logger.debug('Trying parent group', { groupPath });
            }
            continue; // Retry with parent group
          }
          throw new Error(`Group not found: ${groupPath}. Please check your GITLAB_PROJECT_PATH in .env`);
        }

        // Check if iterations are available
        if (!data.group.iterations || !data.group.iterations.nodes) {
          if (this.logger) {
            this.logger.warn('Group does not have iterations configured', {
              groupPath,
              suggestion: 'Enable iterations in Group Settings > Iterations'
            });
          }
          return [];
        }

        const { nodes, pageInfo } = data.group.iterations;
        allIterations = allIterations.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        // Small delay to avoid rate limiting
        if (hasNextPage) {
          await this.rateLimitManager.delay(100);
        }
      }

      if (this.logger) {
        this.logger.debug('Found iterations', {
          count: allIterations.length,
          groupPath
        });
      }

      return allIterations;
    } catch (error) {
      // Check if it's a GraphQL error
      if (error.response?.errors) {
        const errorMessages = error.response.errors.map(e => e.message).join(', ');
        throw new Error(`GitLab API Error (fetching iterations): ${errorMessages}`);
      }
      throw error;
    }
  }
}
