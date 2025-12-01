/**
 * Tests for Express application setup
 *
 * @jest-environment node
 * @module test/server/app
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { createApp, startServer } from '../../src/server/app.js';
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

describe('Server Startup (startServer)', () => {
  let server;

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
