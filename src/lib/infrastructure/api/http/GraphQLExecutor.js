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
    this.url = config.url || 'https://gitlab.com';
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
   * Retries up to 3 attempts with exponential backoff for retryable errors.
   * Transforms errors using ErrorTransformer.
   *
   * @param {string} query - GraphQL query string
   * @param {Object} [variables={}] - Query variables
   * @param {string} [context='executing query'] - Context for error messages
   * @returns {Promise<Object>} Query result data
   * @throws {Error} Transformed error if query fails after all attempts
   */
  async execute(query, variables = {}, context = 'executing query') {
    if (this.logger) {
      this.logger.debug('Executing GraphQL query', {
        queryPreview: query.substring(0, 100) + '...',
        variables
      });
    }

    const maxAttempts = 3;
    const backoffDelays = [1000, 2000, 4000];
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.client.request(query, variables);
      } catch (error) {
        lastError = error;

        const isLastAttempt = attempt === maxAttempts - 1;
        if (isLastAttempt || !ErrorTransformer.isRetryable(error)) {
          break;
        }

        const delay = this._retryDelay(error, backoffDelays[attempt]);
        await this._sleep(delay);
      }
    }

    const transformedError = ErrorTransformer.transform(lastError, context);

    if (this.logger) {
      this.logger.error('GraphQL query failed', transformedError, {
        context,
        variables
      });
    }

    throw transformedError;
  }

  /**
   * Returns the delay in ms before the next retry attempt.
   * Respects the Retry-After header on 429 responses; otherwise uses backoff.
   *
   * @param {Error} error - The caught error
   * @param {number} backoffMs - Default exponential backoff delay in ms
   * @returns {number} Delay in milliseconds
   */
  _retryDelay(error, backoffMs) {
    if (error.response?.status === 429) {
      const headers = error.response.headers;
      const retryAfterRaw = headers?.get?.('retry-after') ?? headers?.['retry-after'];
      const retryAfterSecs = parseInt(retryAfterRaw, 10);
      if (!isNaN(retryAfterSecs)) {
        return retryAfterSecs * 1000;
      }
    }
    return backoffMs;
  }

  /**
   * Sleeps for the given number of milliseconds.
   * Extracted so tests can spy on / replace it without real timers.
   *
   * @param {number} ms - Duration in milliseconds
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
