/**
 * ErrorTransformer
 * Transforms and standardizes API errors for consistent error handling.
 *
 * Responsibilities:
 * - Transform GraphQL errors to application errors
 * - Transform HTTP errors to application errors
 * - Transform network errors to application errors
 * - Provide error context information
 *
 * @class ErrorTransformer
 */
export class ErrorTransformer {
  /**
   * Transforms an API error to a standardized application error with context.
   *
   * @param {Error} error - Original error from API call
   * @param {string} context - Context describing the operation (e.g., 'fetching iterations')
   * @returns {Error} Transformed error with context
   */
  static transform(error, context) {
    // GraphQL errors (error.response.errors array)
    if (error.response?.errors && Array.isArray(error.response.errors)) {
      const messages = error.response.errors
        .map(e => e.message)
        .join('; ');
      return new Error(`GitLab API Error (${context}): ${messages}`);
    }

    // HTTP errors (error.response.status)
    if (error.response?.status) {
      const status = error.response.status;
      const statusText = error.response.statusText || 'Unknown error';
      return new Error(`HTTP ${status} (${context}): ${statusText}`);
    }

    // Network or other errors - preserve original message with context
    return new Error(`Failed ${context}: ${error.message}`);
  }

  /**
   * Checks if an error is retryable (network issues, rate limits, server errors).
   *
   * @param {Error} error - Error to check
   * @returns {boolean} True if the error is retryable
   */
  static isRetryable(error) {
    // Network errors (connection reset, timeout)
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Rate limit errors (429 Too Many Requests)
    if (error.response?.status === 429) {
      return true;
    }

    // Server errors (5xx)
    if (error.response?.status >= 500 && error.response?.status < 600) {
      return true;
    }

    return false;
  }
}
