/**
 * DeploymentClient
 * Handles GitLab deployment-related queries.
 *
 * Responsibilities:
 * - Fetch group projects (used for deployment frequency calculations)
 *
 * @class DeploymentClient
 */
export class DeploymentClient {
  /**
   * Creates a DeploymentClient instance.
   *
   * @param {import('../core/GraphQLExecutor.js').GraphQLExecutor} executor - GraphQL query executor
   * @param {import('../core/RateLimitManager.js').RateLimitManager} rateLimitManager - Rate limit manager
   * @param {string} projectPath - GitLab project path
   * @param {import('../../../core/interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional)
   */
  constructor(executor, rateLimitManager, projectPath, logger = null) {
    this.executor = executor;
    this.rateLimitManager = rateLimitManager;
    this.projectPath = projectPath;
    this.logger = logger;
  }

  /**
   * Fetches all projects in the group (including subgroups).
   * Used for deployment frequency calculations.
   *
   * @returns {Promise<Array>} Array of project objects
   */
  async fetchGroupProjects() {
    const query = `
      query getGroupProjects($fullPath: ID!, $after: String) {
        group(fullPath: $fullPath) {
          id
          name
          projects(first: 100, after: $after, includeSubgroups: true) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              fullPath
              name
            }
          }
        }
      }
    `;

    let allProjects = [];
    let hasNextPage = true;
    let after = null;

    try {
      while (hasNextPage) {
        const data = await this.executor.execute(
          query,
          { fullPath: this.projectPath, after },
          'fetching group projects'
        );

        if (!data.group) {
          if (this.logger) {
            this.logger.warn('Group not found', {
              groupPath: this.projectPath
            });
          }
          return [];
        }

        const { nodes, pageInfo } = data.group.projects;
        allProjects = allProjects.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        if (hasNextPage) {
          await this.rateLimitManager.delay(100);
        }
      }

      if (this.logger) {
        this.logger.debug('Found projects in group', {
          count: allProjects.length,
          groupPath: this.projectPath
        });
      }

      return allProjects;
    } catch (error) {
      if (this.logger) {
        this.logger.warn('Failed to fetch group projects', {
          error: error.message
        });
      }
      return [];
    }
  }
}
