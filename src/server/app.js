/**
 * Express application setup
 * Minimal API server for GitLab Metrics Tracker
 *
 * @module server/app
 */

import express from 'express';
import metricsRoutes from './routes/metrics.js';

/**
 * Create and configure Express application
 *
 * @returns {express.Application} Configured Express app
 */
export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Routes
  app.use('/api/metrics', metricsRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'gitlab-metrics-tracker' });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err);
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
