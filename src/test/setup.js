// Jest setup file for test environment configuration
import '@testing-library/jest-dom';

// Suppress console output during tests to reduce noise
// Keep console.error since tests intentionally verify error logging
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  debug: () => {},
};
