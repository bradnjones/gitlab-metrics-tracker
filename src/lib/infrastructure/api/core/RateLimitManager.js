/**
 * RateLimitManager
 * Manages rate limiting delays to prevent hitting GitLab API rate limits.
 *
 * Responsibilities:
 * - Provide delay mechanism for rate limiting
 * - Centralize rate limiting configuration
 *
 * @class RateLimitManager
 */
export class RateLimitManager {
  /**
   * Creates a RateLimitManager instance.
   *
   * @param {import('../../../core/interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional)
   */
  constructor(logger = null) {
    this.logger = logger;
  }

  /**
   * Delays execution for the specified number of milliseconds.
   * Used to prevent hitting GitLab API rate limits.
   *
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>} Resolves after the delay
   */
  delay(ms) {
    if (this.logger) {
      this.logger.debug('Rate limit delay', { delayMs: ms });
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
