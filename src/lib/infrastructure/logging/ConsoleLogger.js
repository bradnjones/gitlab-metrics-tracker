import { ILogger } from '../../core/interfaces/ILogger.js';

/**
 * Console-based logger implementation.
 * Formats logs with timestamps and context.
 * Filters debug logs in production.
 *
 * Security: Sanitizes sensitive data before logging.
 *
 * @implements {ILogger}
 */
export class ConsoleLogger extends ILogger {
  constructor(options = {}) {
    super();
    this.env = options.env || process.env.NODE_ENV || 'development';
    this.serviceName = options.serviceName || 'gitlab-metrics-tracker';

    // List of keys to redact from logs (security)
    this.sensitiveKeys = [
      'token', 'password', 'secret', 'authorization',
      'api_key', 'apiKey', 'privateToken'
    ];
  }

  /**
   * Sanitize context to remove sensitive data.
   * Performs key-based redaction followed by value-level token scrubbing.
   *
   * @private
   * @param {Object} obj - Object to sanitize
   * @returns {Object} Sanitized copy
   */
  _sanitize(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this._sanitize(value);
      } else if (typeof value === 'string') {
        sanitized[key] = this._scrubTokens(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Scrubs credential patterns from a string value.
   * Handles GitLab PATs (glpat-...) and Bearer tokens.
   *
   * @private
   * @param {string} str - String to scrub
   * @returns {string} Scrubbed string
   */
  _scrubTokens(str) {
    return str
      .replace(/glpat-[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
      .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/gi, 'Bearer [REDACTED]');
  }

  /**
   * Format log message with timestamp and service name
   * @private
   */
  _format(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const sanitizedContext = this._sanitize(context);

    return {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...(Object.keys(sanitizedContext).length > 0 && { context: sanitizedContext })
    };
  }

  info(message, context = {}) {
    const log = this._format('INFO', message, context);
    console.info(JSON.stringify(log));
  }

  warn(message, context = {}) {
    const log = this._format('WARN', message, context);
    console.warn(JSON.stringify(log));
  }

  error(message, error = null, context = {}) {
    const log = this._format('ERROR', message, {
      ...context,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          ...(error.response && { response: error.response })
        }
      })
    });
    console.error(JSON.stringify(log));
  }

  debug(message, context = {}) {
    // Only log debug in development/test (not production)
    if (this.env !== 'production') {
      const log = this._format('DEBUG', message, context);
      console.debug(JSON.stringify(log));
    }
  }
}
