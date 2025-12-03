/**
 * PipelineClient
 * Handles GitLab pipeline-related queries.
 *
 * Responsibilities:
 * - Fetch pipelines for projects (used for deployment frequency calculations)
 *
 * @class PipelineClient
 */
export class PipelineClient {
  /**
   * Creates a PipelineClient instance.
   *
   * @param {import('../core/GraphQLExecutor.js').GraphQLExecutor} executor - GraphQL query executor
   * @param {import('../core/RateLimitManager.js').RateLimitManager} rateLimitManager - Rate limit manager
   * @param {import('../../../core/interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional)
   */
  constructor(executor, rateLimitManager, logger = null) {
    this.executor = executor;
    this.rateLimitManager = rateLimitManager;
    this.logger = logger;
  }

  /**
   * Fetches pipelines for a specific project with date filtering.
   * Used for deployment frequency metric calculation.
   *
   * @param {string} projectPath - Project path (e.g., 'group/project')
   * @param {string} [ref='master'] - Git ref/branch to filter by
   * @param {string} [startDate] - Start date for filtering (ISO format)
   * @param {string} [endDate] - End date for filtering (ISO format)
   * @returns {Promise<Array>} Array of pipeline objects
   */
  async fetchPipelinesForProject(projectPath, ref = 'master', startDate, endDate) {
    // Use updatedAfter to filter at the API level for better performance
    const updatedAfter = startDate ? new Date(startDate).toISOString() : null;

    const query = `
      query getPipelines($fullPath: ID!, $ref: String, $after: String, $updatedAfter: Time) {
        project(fullPath: $fullPath) {
          pipelines(first: 100, ref: $ref, after: $after, updatedAfter: $updatedAfter) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              iid
              status
              ref
              createdAt
              updatedAt
              finishedAt
              sha
            }
          }
        }
      }
    `;

    let allPipelines = [];
    let hasNextPage = true;
    let after = null;

    try {
      while (hasNextPage) {
        const data = await this.executor.execute(
          query,
          { fullPath: projectPath, ref, after, updatedAfter },
          'fetching pipelines'
        );

        if (!data.project || !data.project.pipelines) {
          break;
        }

        const { nodes, pageInfo } = data.project.pipelines;
        allPipelines = allPipelines.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        // Only fetch first page if we have many results (performance optimization)
        if (nodes.length === 100 && hasNextPage) {
          if (this.logger) {
            this.logger.debug('Found 100+ pipelines, fetching more');
          }
        }

        if (hasNextPage) {
          await this.rateLimitManager.delay(50); // Reduced delay
        }
      }

      // Additional client-side filtering by end date
      if (endDate) {
        const end = new Date(endDate);
        allPipelines = allPipelines.filter((pipeline) => {
          const pipelineDate = new Date(pipeline.createdAt);
          return pipelineDate <= end;
        });
      }

      return allPipelines;
    } catch (error) {
      if (this.logger) {
        this.logger.warn('Failed to fetch pipelines for project', {
          projectPath,
          error: error.message
        });
      }
      return [];
    }
  }
}
