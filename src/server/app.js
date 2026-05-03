/**
 * Express application setup
 * Minimal API server for GitLab Metrics Tracker
 *
 * @module server/app
 */

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import os from 'os';
import metricsRoutes from './routes/metrics.js';
import iterationsRoutes from './routes/iterations.js';
import cacheRoutes from './routes/cache.js';
import annotationsRoutes from './routes/annotations.js';
import { ConsoleLogger } from '../lib/infrastructure/logging/ConsoleLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logger instance for server app
const logger = new ConsoleLogger({ serviceName: 'express-app' });

/**
 * Validate required environment variables.
 * Logs a clear error and exits with code 1 if any required variables are missing.
 * Must be called before the server begins listening so orchestrators observe
 * a failed start rather than a running-but-broken service.
 *
 * @returns {void}
 */
export function validateEnv() {
  const required = ['GITLAB_TOKEN', 'GITLAB_PROJECT_PATH'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error(
      'Missing required environment variables — server cannot start',
      null,
      { missing, hint: 'Set these variables in your .env file or environment before starting the server' }
    );
    process.exit(1);
  }
}

/**
 * Register SIGTERM and SIGINT handlers for graceful shutdown.
 * Stops accepting new connections and waits up to 10s for in-flight
 * requests to complete before exiting. Prevents mid-write file corruption
 * on deploy/restart.
 *
 * @param {import('http').Server} server - HTTP server instance to drain
 * @returns {void}
 */
export function registerShutdownHandlers(server) {
  function shutdown(signal) {
    logger.info(`Received ${signal}, starting graceful shutdown`);

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out after 10s, forcing exit');
      process.exit(1);
    }, 10_000);

    // Don't let the timeout keep the event loop alive if close() finishes first
    if (forceExit.unref) forceExit.unref();

    server.close(() => {
      logger.info('All connections drained, exiting cleanly');
      clearTimeout(forceExit);
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Create and configure Express application
 *
 * @returns {express.Application} Configured Express app
 */
export function createApp() {
  const app = express();

  // CORS — allow configurable origin; default is same-origin only.
  // Use callback form so unlisted origins receive no ACAO header at all.
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin) {
    app.use(cors({
      origin(requestOrigin, callback) {
        if (requestOrigin === allowedOrigin) {
          callback(null, requestOrigin);
        } else {
          callback(null, false);
        }
      }
    }));
  }

  // Security headers — must be first middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Allow inline styles for styled-components
        'style-src': ["'self'", "'unsafe-inline'"]
      }
    }
  }));

  // Per-request logging — assign a UUID to every request, log on finish
  app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    const startMs = Date.now();

    res.on('finish', () => {
      logger.info('Request completed', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - startMs
      });
    });

    next();
  });

  // Middleware
  app.use(express.json());

  // In production serve the Vite-built bundle; in dev Vite runs separately on port 5173
  const publicPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '..', '..', 'dist')
    : path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // Routes
  app.use('/api/iterations', iterationsRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/cache', cacheRoutes);
  app.use('/api/annotations', annotationsRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'gitlab-metrics-tracker' });
  });

  // Serve index.html for non-API routes (SPA support)
  app.get('*', (req, res, next) => {
    // Only serve index.html for non-API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // 404 handler for API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found' });
    } else {
      next();
    }
  });

  // Error handler
  app.use((err, req, res, next) => {
    // Log sanitized error (no stack trace exposure)
    logger.error('Error occurred', err, {
      path: req.path,
      method: req.method
    });

    res.status(500).json({
      error: 'Internal server error'
    });
  });

  return app;
}

/**
 * Get local network IP address
 * @returns {string|null} Local IP address or null if not found
 */
function getLocalIPAddress() {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

/**
 * Start the server
 *
 * @param {number} [port=3000] - Port to listen on
 * @returns {http.Server} HTTP server instance
 */
export function startServer(port = 3000) {
  validateEnv();
  const app = createApp();

  // Listen on all network interfaces (0.0.0.0) to allow access from other devices
  const server = app.listen(port, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();

    logger.info('Server running', {
      local: `http://localhost:${port}`,
      network: localIP ? `http://${localIP}:${port}` : null,
      health: `http://localhost:${port}/health`
    });
  });

  registerShutdownHandlers(server);

  return server;
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000;
  startServer(port);
}
