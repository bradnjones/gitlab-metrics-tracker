import { GraphQLClient } from 'graphql-request';
import { ErrorTransformer } from './ErrorTransformer.js';

/**
 * GraphQLExecutor
 * Handles GraphQL query execution with error transformation.
 * Abstracts the underlying GraphQL client implementation.
 *
 * Responsibilities:
 * - Execute GraphQL queries against GitLab API
 * - Transform errors using ErrorTransformer
 * - Centralize GraphQL client configuration
 * - Log query execution (debug level)
 *
 * @class GraphQLExecutor
 */
export class GraphQLExecutor {
  /**
   * Creates a GraphQLExecutor instance.
   *
   * @param {Object} config - Configuration object
   * @param {string} config.url - GitLab instance URL (e.g., 'https://gitlab.com')
   * @param {string} config.token - GitLab personal access token
   * @param {string} config.projectPath - GitLab project path (for context in errors)
   * @param {import('../../../core/interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional)
   */
  constructor(config, logger = null) {
    this.url = config.url;
    this.token = config.token;
    this.projectPath = config.projectPath;
    this.logger = logger;

    // Initialize GraphQL client
    this.client = new GraphQLClient(`${this.url}/api/graphql`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });
  }

  /**
   * Executes a GraphQL query and returns the result.
   * Transforms errors using ErrorTransformer.
   *
   * @param {string} query - GraphQL query string
   * @param {Object} [variables={}] - Query variables
   * @param {string} [context='executing query'] - Context for error messages
   * @returns {Promise<Object>} Query result data
   * @throws {Error} Transformed error if query fails
   */
  async execute(query, variables = {}, context = 'executing query') {
    if (this.logger) {
      this.logger.debug('Executing GraphQL query', {
        queryPreview: query.substring(0, 100) + '...',
        variables
      });
    }

    try {
      const data = await this.client.request(query, variables);
      return data;
    } catch (error) {
      // Transform error with context
      const transformedError = ErrorTransformer.transform(error, context);

      if (this.logger) {
        this.logger.error('GraphQL query failed', transformedError, {
          context,
          variables
        });
      }

      throw transformedError;
    }
  }
}
