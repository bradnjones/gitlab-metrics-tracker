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
import os from 'os';
import metricsRoutes from './routes/metrics.js';
import iterationsRoutes from './routes/iterations.js';
import cacheRoutes from './routes/cache.js';
import annotationsRoutes from './routes/annotations.js';

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
  const app = createApp();

  // Listen on all network interfaces (0.0.0.0) to allow access from other devices
  const server = app.listen(port, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();

    console.log(`\n✓ Server running on:`);
    console.log(`  - Local:   http://localhost:${port}`);
    if (localIP) {
      console.log(`  - Network: http://${localIP}:${port}`);
      console.log(`\n  Use the Network URL to access from other devices on your local network`);
    }
    console.log(`\n✓ Health check: http://localhost:${port}/health`);
  });

  return server;
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000;
  startServer(port);
}
