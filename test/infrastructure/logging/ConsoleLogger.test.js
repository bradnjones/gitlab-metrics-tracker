import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConsoleLogger } from '../../../src/lib/infrastructure/logging/ConsoleLogger.js';

describe('ConsoleLogger', () => {
  let logger;
  let consoleInfoSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let consoleDebugSpy;

  beforeEach(() => {
    logger = new ConsoleLogger({ serviceName: 'test-service' });

    // Spy on console methods
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('TEST 1: JSON formatting with timestamp and service name', () => {
    it('formats info messages with JSON structure including timestamp, level, service, and message', () => {
      // Arrange
      const message = 'Test log message';
      const context = { userId: 123 };

      // Act
      logger.info(message, context);

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);

      const logOutput = consoleInfoSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logOutput);

      // Verify structure
      expect(parsedLog).toHaveProperty('timestamp');
      expect(parsedLog).toHaveProperty('level', 'INFO');
      expect(parsedLog).toHaveProperty('service', 'test-service');
      expect(parsedLog).toHaveProperty('message', message);
      expect(parsedLog).toHaveProperty('context', context);

      // Verify timestamp is valid ISO string
      expect(new Date(parsedLog.timestamp).toISOString()).toBe(parsedLog.timestamp);
    });
  });

  describe('TEST 2: All 4 log levels', () => {
    it('calls appropriate console methods for each log level (info, warn, error, debug)', () => {
      // Arrange
      const message = 'Test message';

      // Act - Test warn
      logger.warn(message);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const warnOutput = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(warnOutput.level).toBe('WARN');
      expect(warnOutput.message).toBe(message);

      // Act - Test error
      const testError = new Error('Test error');
      logger.error(message, testError);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(errorOutput.level).toBe('ERROR');
      expect(errorOutput.message).toBe(message);
      expect(errorOutput.context.error).toBeDefined();
      expect(errorOutput.context.error.message).toBe('Test error');

      // Act - Test debug
      logger.debug(message);
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      const debugOutput = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      expect(debugOutput.level).toBe('DEBUG');
      expect(debugOutput.message).toBe(message);
    });
  });

  describe('TEST 3: Sensitive data redaction', () => {
    it('redacts tokens, passwords, and API keys from context objects', () => {
      // Arrange
      const sensitiveContext = {
        token: 'glpat-abc123xyz',
        password: 'super-secret',
        apiKey: 'key-12345',
        authorization: 'Bearer token-here',
        privateToken: 'private-key',
        normalData: 'this should not be redacted'
      };

      // Act
      logger.info('Test message', sensitiveContext);

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleInfoSpy.mock.calls[0][0]);

      // Sensitive fields should be redacted
      expect(logOutput.context.token).toBe('[REDACTED]');
      expect(logOutput.context.password).toBe('[REDACTED]');
      expect(logOutput.context.apiKey).toBe('[REDACTED]');
      expect(logOutput.context.authorization).toBe('[REDACTED]');
      expect(logOutput.context.privateToken).toBe('[REDACTED]');

      // Normal fields should pass through
      expect(logOutput.context.normalData).toBe('this should not be redacted');
    });

    it('redacts sensitive data in nested objects', () => {
      // Arrange
      const nestedContext = {
        user: {
          name: 'John',
          password: 'secret123'
        },
        api: {
          token: 'api-token-here'
        }
      };

      // Act
      logger.info('Test message', nestedContext);

      // Assert
      const logOutput = JSON.parse(consoleInfoSpy.mock.calls[0][0]);

      // Sensitive nested fields should be redacted
      expect(logOutput.context.user.password).toBe('[REDACTED]');
      expect(logOutput.context.api.token).toBe('[REDACTED]');

      // Normal nested fields should pass through
      expect(logOutput.context.user.name).toBe('John');
    });
  });

  describe('TEST 4: Environment-based debug logging', () => {
    it('suppresses debug logs in production environment', () => {
      // Arrange
      const prodLogger = new ConsoleLogger({
        serviceName: 'test-service',
        env: 'production'
      });
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      // Act
      prodLogger.debug('Debug message');

      // Assert
      expect(debugSpy).not.toHaveBeenCalled();

      debugSpy.mockRestore();
    });

    it('allows debug logs in development environment', () => {
      // Arrange
      const devLogger = new ConsoleLogger({
        serviceName: 'test-service',
        env: 'development'
      });
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      // Act
      devLogger.debug('Debug message');

      // Assert
      expect(debugSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(debugSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('DEBUG');
      expect(logOutput.message).toBe('Debug message');

      debugSpy.mockRestore();
    });

    it('allows debug logs in test environment', () => {
      // Arrange
      const testLogger = new ConsoleLogger({
        serviceName: 'test-service',
        env: 'test'
      });
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      // Act
      testLogger.debug('Debug message');

      // Assert
      expect(debugSpy).toHaveBeenCalledTimes(1);

      debugSpy.mockRestore();
    });
  });
});
