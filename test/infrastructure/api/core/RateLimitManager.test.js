import { RateLimitManager } from '../../../../src/lib/infrastructure/api/core/RateLimitManager.js';

describe('RateLimitManager', () => {
  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const manager = new RateLimitManager();
      const startTime = Date.now();

      await manager.delay(50);

      const elapsed = Date.now() - startTime;
      // Allow some margin for timing (at least 45ms, less than 150ms)
      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThan(150);
    });

    it('should log delay when logger is provided', async () => {
      let loggedMessage = null;
      let loggedContext = null;
      const mockLogger = {
        debug: (message, context) => {
          loggedMessage = message;
          loggedContext = context;
        }
      };
      const manager = new RateLimitManager(mockLogger);

      await manager.delay(100);

      expect(loggedMessage).toBe('Rate limit delay');
      expect(loggedContext).toEqual({ delayMs: 100 });
    });

    it('should not throw when logger is not provided', async () => {
      const manager = new RateLimitManager();

      await expect(manager.delay(10)).resolves.not.toThrow();
    });
  });
});
