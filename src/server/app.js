/**
 * Express application setup
 * Minimal API server for GitLab Metrics Tracker
 *
 * @module server/app
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import metricsRoutes from './routes/metrics.js';
import iterationsRoutes from './routes/iterations.js';
import cacheRoutes from './routes/cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and configure Express application
 *
 * @returns {express.Application} Configured Express app
 */
export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Serve static files from public directory
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // Routes
  app.use('/api/iterations', iterationsRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/cache', cacheRoutes);

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
    console.error('Error occurred:', {
      message: err.message,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  });

  return app;
}

/**
 * Start the server
 *
 * @param {number} [port=3000] - Port to listen on
 * @returns {http.Server} HTTP server instance
 */
export function startServer(port = 3000) {
  const app = createApp();

  const server = app.listen(port, () => {
    console.log(`✓ Server running on http://localhost:${port}`);
    console.log(`✓ Health check: http://localhost:${port}/health`);
    console.log(`✓ API endpoint: POST http://localhost:${port}/api/metrics/calculate`);
  });

  return server;
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000;
  startServer(port);
}
