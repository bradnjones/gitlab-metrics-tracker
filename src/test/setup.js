/**
 * Jest Test Setup
 *
 * Sets up testing environment for Jest + React Testing Library
 */

import '@testing-library/jest-dom';

// Mock environment variables
process.env.GITLAB_URL = 'https://gitlab.test';
process.env.GITLAB_TOKEN = 'test-token';
process.env.GITLAB_PROJECT_PATH = 'test/project';
process.env.PORT = '3001';
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = './src/data/test';

// Suppress console errors in tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
