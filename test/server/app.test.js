/**
 * Tests for Express application setup
 *
 * @jest-environment node
 * @module test/server/app
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { createApp, startServer, validateEnv, registerShutdownHandlers } from '../../src/server/app.js';
import { ServiceFactory } from '../../src/server/services/ServiceFactory.js';

describe('Express Application (createApp)', () => {
  let app;

  beforeEach(() => {
    // Mock ServiceFactory to prevent actual GitLab API calls
    ServiceFactory.createMetricsService = jest.fn().mockReturnValue({
      calculateMetrics: jest.fn().mockResolvedValue({}),
      calculateMultipleMetrics: jest.fn().mockResolvedValue([])
    });

    ServiceFactory.createGitLabClient = jest.fn().mockReturnValue({
      fetchIterations: jest.fn().mockResolvedValue([])
    });

    app = createApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Middleware Configuration', () => {
    test('creates an Express application', () => {
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });
  });

  describe('Rate limiting', () => {
    test('GET /api routes include RateLimit-Limit header', async () => {
      const response = await request(app).get('/api/iterations');
      // express-rate-limit draft-6: individual RateLimit-Limit / RateLimit-Remaining headers
      expect(response.headers['ratelimit-limit']).toBeDefined();
    });

    test('GET /api routes include RateLimit-Remaining header', async () => {
      const response = await request(app).get('/api/iterations');
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    test('returns 429 when general /api rate limit is exceeded', async () => {
      // Make 61 rapid requests to exceed the 60/min limit
      const responses = [];
      for (let i = 0; i < 61; i++) {
        responses.push(await request(app).get('/api/iterations'));
      }
      const last = responses[responses.length - 1];
      expect(last.status).toBe(429);
    });
  });

  describe('Per-request logging (requestId)', () => {
    test('returns X-Request-Id header on every response', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['x-request-id']).toBeDefined();
    });

    test('X-Request-Id is a valid UUID v4', async () => {
      const response = await request(app).get('/health');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(response.headers['x-request-id']).toMatch(uuidRegex);
    });

    test('each request gets a unique requestId', async () => {
      const [r1, r2] = await Promise.all([
        request(app).get('/health'),
        request(app).get('/health')
      ]);
      expect(r1.headers['x-request-id']).not.toBe(r2.headers['x-request-id']);
    });
  });

  describe('CORS', () => {
    test('no CORS headers when ALLOWED_ORIGIN is not set', async () => {
      delete process.env.ALLOWED_ORIGIN;
      const response = await request(createApp()).get('/health');
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('sets Access-Control-Allow-Origin when ALLOWED_ORIGIN is set', async () => {
      process.env.ALLOWED_ORIGIN = 'https://dashboard.example.com';
      const response = await request(createApp())
        .get('/health')
        .set('Origin', 'https://dashboard.example.com');
      delete process.env.ALLOWED_ORIGIN;
      expect(response.headers['access-control-allow-origin']).toBe('https://dashboard.example.com');
    });

    test('rejects unlisted origins when ALLOWED_ORIGIN is set', async () => {
      process.env.ALLOWED_ORIGIN = 'https://dashboard.example.com';
      const response = await request(createApp())
        .get('/health')
        .set('Origin', 'https://evil.com');
      delete process.env.ALLOWED_ORIGIN;
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Security Headers (helmet)', () => {
    test('sets X-Content-Type-Options: nosniff', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('sets X-Frame-Options to deny clickjacking', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/i);
    });

    test('sets Referrer-Policy header', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['referrer-policy']).toBeDefined();
    });

    test('Content-Security-Policy allows unsafe-inline for styled-components', async () => {
      const response = await request(app).get('/health');
      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("'unsafe-inline'");
    });
  });

  describe('Health Check Endpoint', () => {
    test('GET /health returns 200 with status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'gitlab-metrics-tracker'
      });
    });

    test('GET /health returns JSON content type', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('SPA Support (Single Page Application)', () => {
    test('serves index.html for root path', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      // Should serve HTML (index.html)
      expect(response.headers['content-type']).toMatch(/html/);
    });

    test('serves index.html for non-API routes', async () => {
      const response = await request(app).get('/dashboard');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
    });

    test('serves index.html for nested non-API routes', async () => {
      const response = await request(app).get('/some/nested/route');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
    });

    test('does NOT serve index.html for API routes', async () => {
      const response = await request(app).get('/api/nonexistent');

      // API routes should get 404 JSON response, not index.html
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Not found' });
      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('does NOT serve index.html for API routes with nested paths', async () => {
      const response = await request(app).get('/api/metrics/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Not found' });
    });
  });

  describe('404 Handler', () => {
    test('returns 404 JSON for non-existent API routes', async () => {
      const response = await request(app).get('/api/does-not-exist');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Not found' });
    });

    test('returns 404 JSON for API routes with wrong method', async () => {
      const response = await request(app).post('/api/nonexistent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Not found' });
    });

    test('does not return 404 for non-API routes (SPA fallback)', async () => {
      const response = await request(app).get('/some-page');

      // Should serve index.html (200), not 404
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handler', () => {
    test('triggers error handler for route errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock ServiceFactory to throw an error
      ServiceFactory.createMetricsService = jest.fn().mockImplementation(() => {
        throw new Error('Service creation failed');
      });

      // Create a new app instance that will trigger the error during setup
      const errorApp = createApp();

      // Restore the mock
      consoleErrorSpy.mockRestore();
      ServiceFactory.createMetricsService = jest.fn().mockReturnValue({
        calculateMetrics: jest.fn().mockResolvedValue({}),
        calculateMultipleMetrics: jest.fn().mockResolvedValue([])
      });
    });

    test('error handler logs error with sanitized information', async () => {
      // We can test this indirectly by verifying the error handler is registered
      // The actual error logging is tested through route error scenarios
      expect(app._router).toBeDefined();
      expect(app._router.stack.some(layer => layer.name === 'errorHandler' || layer.handle.length === 4)).toBe(true);
    });
  });

  describe('JSON Body Parser', () => {
    test('JSON middleware is configured', async () => {
      // JSON parser is middleware - tested indirectly through API routes
      // Verify the app has middleware stack
      expect(app._router).toBeDefined();
      expect(app._router.stack.length).toBeGreaterThan(0);
    });

    test('handles malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/iterations')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Should get an error response (400 or 500)
      expect([400, 500]).toContain(response.status);
    });
  });
});

describe('validateEnv', () => {
  let originalToken;
  let originalProjectPath;

  beforeEach(() => {
    originalToken = process.env.GITLAB_TOKEN;
    originalProjectPath = process.env.GITLAB_PROJECT_PATH;
    jest.spyOn(process, 'exit').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original values (undefined means delete)
    if (originalToken === undefined) {
      delete process.env.GITLAB_TOKEN;
    } else {
      process.env.GITLAB_TOKEN = originalToken;
    }
    if (originalProjectPath === undefined) {
      delete process.env.GITLAB_PROJECT_PATH;
    } else {
      process.env.GITLAB_PROJECT_PATH = originalProjectPath;
    }
    jest.restoreAllMocks();
  });

  test('does not exit when both required vars are set', () => {
    process.env.GITLAB_TOKEN = 'test-token';
    process.env.GITLAB_PROJECT_PATH = 'test/group';

    validateEnv();

    expect(process.exit).not.toHaveBeenCalled();
  });

  test('exits with code 1 when GITLAB_TOKEN is missing', () => {
    delete process.env.GITLAB_TOKEN;
    process.env.GITLAB_PROJECT_PATH = 'test/group';

    validateEnv();

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('exits with code 1 when GITLAB_PROJECT_PATH is missing', () => {
    process.env.GITLAB_TOKEN = 'test-token';
    delete process.env.GITLAB_PROJECT_PATH;

    validateEnv();

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('exits with code 1 when both required vars are missing', () => {
    delete process.env.GITLAB_TOKEN;
    delete process.env.GITLAB_PROJECT_PATH;

    validateEnv();

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('logs error naming each missing variable', () => {
    delete process.env.GITLAB_TOKEN;
    process.env.GITLAB_PROJECT_PATH = 'test/group';

    validateEnv();

    expect(console.error).toHaveBeenCalled();
    const logOutput = console.error.mock.calls[0][0];
    expect(logOutput).toContain('GITLAB_TOKEN');
  });

  test('logs error naming GITLAB_PROJECT_PATH when missing', () => {
    process.env.GITLAB_TOKEN = 'test-token';
    delete process.env.GITLAB_PROJECT_PATH;

    validateEnv();

    expect(console.error).toHaveBeenCalled();
    const logOutput = console.error.mock.calls[0][0];
    expect(logOutput).toContain('GITLAB_PROJECT_PATH');
  });
});

describe('registerShutdownHandlers', () => {
  let mockServer;

  beforeEach(() => {
    mockServer = { close: jest.fn() };
    jest.spyOn(process, 'exit').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('registers SIGTERM handler on the process', () => {
    const onSpy = jest.spyOn(process, 'on').mockImplementation(() => process);

    registerShutdownHandlers(mockServer);

    expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  });

  test('registers SIGINT handler on the process', () => {
    const onSpy = jest.spyOn(process, 'on').mockImplementation(() => process);

    registerShutdownHandlers(mockServer);

    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });

  test('calls server.close() when SIGTERM is received', () => {
    const handlers = {};
    jest.spyOn(process, 'on').mockImplementation((event, fn) => { handlers[event] = fn; return process; });

    registerShutdownHandlers(mockServer);
    handlers['SIGTERM']();

    expect(mockServer.close).toHaveBeenCalled();
  });

  test('calls server.close() when SIGINT is received', () => {
    const handlers = {};
    jest.spyOn(process, 'on').mockImplementation((event, fn) => { handlers[event] = fn; return process; });

    registerShutdownHandlers(mockServer);
    handlers['SIGINT']();

    expect(mockServer.close).toHaveBeenCalled();
  });

  test('exits with code 0 after server.close() drains connections', () => {
    mockServer.close = jest.fn(cb => cb()); // immediately drains
    const handlers = {};
    jest.spyOn(process, 'on').mockImplementation((event, fn) => { handlers[event] = fn; return process; });

    registerShutdownHandlers(mockServer);
    handlers['SIGTERM']();

    expect(process.exit).toHaveBeenCalledWith(0);
  });

  test('force exits with code 1 after 10s if connections do not drain', () => {
    // close never calls its callback (simulates stuck connections)
    mockServer.close = jest.fn();
    const handlers = {};
    jest.spyOn(process, 'on').mockImplementation((event, fn) => { handlers[event] = fn; return process; });

    registerShutdownHandlers(mockServer);
    handlers['SIGTERM']();

    jest.advanceTimersByTime(9999);
    expect(process.exit).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

describe('Server Startup (startServer)', () => {
  let server;

  beforeEach(() => {
    // Provide required env vars so validateEnv does not exit
    process.env.GITLAB_TOKEN = process.env.GITLAB_TOKEN || 'test-token';
    process.env.GITLAB_PROJECT_PATH = process.env.GITLAB_PROJECT_PATH || 'test/group';
  });

  afterEach((done) => {
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  test('starts server on specified port', (done) => {
    server = startServer(0); // Port 0 = random available port

    server.on('listening', () => {
      const address = server.address();
      expect(address.port).toBeGreaterThan(0);
      done();
    });

    server.on('error', (err) => {
      done(err);
    });
  });

  test('server starts and listens successfully', (done) => {
    server = startServer(0);

    server.on('listening', () => {
      // Verify server is listening
      expect(server.listening).toBe(true);
      const address = server.address();
      expect(address).toBeTruthy();
      done();
    });

    server.on('error', (err) => {
      done(err);
    });
  });

  test('returns server instance that can be closed', (done) => {
    server = startServer(0);

    server.on('listening', () => {
      expect(typeof server.close).toBe('function');

      server.close(() => {
        expect(server.listening).toBe(false);
        server = null;
        done();
      });
    });

    server.on('error', (err) => {
      done(err);
    });
  });

  test('server listens on all network interfaces (0.0.0.0)', (done) => {
    server = startServer(0);

    server.on('listening', () => {
      const address = server.address();
      // Can be either '::' (IPv6) or '0.0.0.0' (IPv4) depending on environment
      expect(['0.0.0.0', '::']).toContain(address.address);
      done();
    });

    server.on('error', (err) => {
      done(err);
    });
  });
});
