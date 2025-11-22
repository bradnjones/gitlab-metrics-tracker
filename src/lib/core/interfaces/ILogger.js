/**
 * Logger interface for dependency injection.
 * Allows swapping logging implementations without changing business logic.
 *
 * @interface ILogger
 */
export class ILogger {
  /**
   * Log informational message
   * @param {string} message - The log message
   * @param {Object} [context={}] - Additional context data
   */
  info(message, context = {}) {
    throw new Error('ILogger.info() must be implemented');
  }

  /**
   * Log warning message
   * @param {string} message - The log message
   * @param {Object} [context={}] - Additional context data
   */
  warn(message, context = {}) {
    throw new Error('ILogger.warn() must be implemented');
  }

  /**
   * Log error message
   * @param {string} message - The log message
   * @param {Error} [error=null] - Error object
   * @param {Object} [context={}] - Additional context data
   */
  error(message, error = null, context = {}) {
    throw new Error('ILogger.error() must be implemented');
  }

  /**
   * Log debug message (only in development)
   * @param {string} message - The log message
   * @param {Object} [context={}] - Additional context data
   */
  debug(message, context = {}) {
    throw new Error('ILogger.debug() must be implemented');
  }
}
