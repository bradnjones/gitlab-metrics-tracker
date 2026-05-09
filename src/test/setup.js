// Jest setup file for test environment configuration
import '@testing-library/jest-dom';

// jest-environment-jsdom does not expose TextEncoder/TextDecoder by default;
// add them from Node.js util so any code that uses the Web Encoding API works.
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

// Suppress console output during tests to reduce noise
// Keep console.error since tests intentionally verify error logging
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  debug: () => {},
};
