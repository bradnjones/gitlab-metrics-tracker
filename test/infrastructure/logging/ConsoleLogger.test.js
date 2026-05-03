import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConsoleLogger } from '../../../src/lib/infrastructure/logging/ConsoleLogger.js';

describe('ConsoleLogger', () => {
  let logger;

  beforeEach(() => {
    logger = new ConsoleLogger({ env: 'development', serviceName: 'test-service' });
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  describe('_sanitize — key-based redaction', () => {
    it('should redact sensitive keys', () => {
      const result = logger._sanitize({ token: 'abc123', name: 'test' });
      expect(result.token).toBe('[REDACTED]');
      expect(result.name).toBe('test');
    });

    it('should redact nested sensitive keys', () => {
      const result = logger._sanitize({ auth: { password: 'secret' } });
      expect(result.auth.password).toBe('[REDACTED]');
    });
  });

  describe('_sanitize — value-level token scrubbing', () => {
    it('should redact GitLab PAT tokens in string values', () => {
      const pat = 'glpat-abcdefghijklmnopqrst'; // 20-char suffix
      const result = logger._sanitize({ message: `token is ${pat}` });
      expect(result.message).not.toContain('glpat-');
      expect(result.message).toContain('[REDACTED]');
    });

    it('should redact Bearer tokens in string values', () => {
      const result = logger._sanitize({ header: 'Bearer abcdefghijklmnopqrstuvwxyz' });
      expect(result.header).not.toMatch(/Bearer [A-Za-z0-9]/);
      expect(result.header).toContain('Bearer [REDACTED]');
    });

    it('should be case-insensitive for Bearer scrubbing', () => {
      const result = logger._sanitize({ header: 'bearer abcdefghijklmnopqrstuvwxyz' });
      expect(result.header).toContain('[REDACTED]');
    });

    it('should not redact short tokens below 20 chars', () => {
      const result = logger._sanitize({ val: 'glpat-tooshort' }); // < 20 chars after prefix
      expect(result.val).toBe('glpat-tooshort');
    });

    it('should scrub tokens in nested string values', () => {
      const pat = 'glpat-aaaabbbbccccddddeeee'; // 24-char suffix
      const result = logger._sanitize({ outer: { inner: pat } });
      expect(result.outer.inner).not.toContain('glpat-');
    });

    it('should scrub multiple tokens in the same string', () => {
      const pat1 = 'glpat-aaaabbbbccccddddeeee';
      const pat2 = 'glpat-zzzzyyyyxxxxwwwwvvvv';
      const result = logger._sanitize({ val: `${pat1} and ${pat2}` });
      expect(result.val).not.toContain('glpat-');
      expect(result.val.match(/\[REDACTED\]/g)).toHaveLength(2);
    });
  });

  describe('log methods', () => {
    it('info should write JSON to console.info', () => {
      logger.info('hello world', { key: 'value' });
      expect(console.info).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(console.info.mock.calls[0][0]);
      expect(logged.level).toBe('INFO');
      expect(logged.message).toBe('hello world');
    });

    it('warn should write JSON to console.warn', () => {
      logger.warn('warning', {});
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('error should include error details', () => {
      const err = new Error('boom');
      logger.error('something failed', err, {});
      const logged = JSON.parse(console.error.mock.calls[0][0]);
      expect(logged.context.error.message).toBe('boom');
    });

    it('debug should not log in production', () => {
      const prodLogger = new ConsoleLogger({ env: 'production' });
      jest.spyOn(console, 'debug').mockImplementation(() => {});
      prodLogger.debug('debug msg', {});
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('debug should log in development', () => {
      logger.debug('debug msg', {});
      expect(console.debug).toHaveBeenCalledTimes(1);
    });
  });
});
