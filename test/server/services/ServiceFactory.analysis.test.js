/**
 * Tests for ServiceFactory AI-review methods:
 * createLLMClient, createAnalysesRepository, createMetricAnalysisService.
 *
 * Uses jest.unstable_mockModule for @anthropic-ai/sdk because ServiceFactory
 * transitively imports AnthropicLLMClient which imports the SDK.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Declare mock fns before unstable_mockModule so the factory closure captures them.
const mockCreate = jest.fn();

jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

// Dynamic import AFTER mocking so the module graph picks up the stub.
const { ServiceFactory } = await import('../../../src/server/services/ServiceFactory.js');
const { FileAnalysesRepository } = await import(
  '../../../src/lib/infrastructure/repositories/FileAnalysesRepository.js'
);
const { MetricAnalysisService } = await import(
  '../../../src/lib/core/services/MetricAnalysisService.js'
);

describe('ServiceFactory — AI review methods', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.AI_REVIEW_ENABLED;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── createLLMClient ───────────────────────────────────────────────────────

  describe('createLLMClient', () => {
    it('returns null when ANTHROPIC_API_KEY is missing', () => {
      const client = ServiceFactory.createLLMClient();
      expect(client).toBeNull();
    });

    it('returns null when AI_REVIEW_ENABLED is not "true"', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      // AI_REVIEW_ENABLED not set
      const client = ServiceFactory.createLLMClient();
      expect(client).toBeNull();
    });

    it('returns an LLM client instance when both flags are set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      process.env.AI_REVIEW_ENABLED = 'true';
      const client = ServiceFactory.createLLMClient();
      expect(client).not.toBeNull();
      expect(typeof client.generate).toBe('function');
    });
  });

  // ─── createAnalysesRepository ──────────────────────────────────────────────

  describe('createAnalysesRepository', () => {
    it('returns a FileAnalysesRepository instance', () => {
      const repo = ServiceFactory.createAnalysesRepository();
      expect(repo).toBeInstanceOf(FileAnalysesRepository);
    });

    it('accepts a custom data directory', () => {
      const repo = ServiceFactory.createAnalysesRepository('./custom/data');
      expect(repo).toBeInstanceOf(FileAnalysesRepository);
      expect(repo.filePath).toContain('custom/data');
    });
  });

  // ─── createMetricAnalysisService ───────────────────────────────────────────

  describe('createMetricAnalysisService', () => {
    it('returns a MetricAnalysisService even when LLM is not configured', () => {
      // LLM not configured — createLLMClient returns null
      const service = ServiceFactory.createMetricAnalysisService({
        token: 'tok',
        projectPath: 'ns/proj',
        url: 'https://gitlab.com',
      });
      expect(service).toBeInstanceOf(MetricAnalysisService);
    });

    it('constructs service with null llmClient when LLM env vars absent', () => {
      const service = ServiceFactory.createMetricAnalysisService({
        token: 'tok',
        projectPath: 'ns/proj',
        url: 'https://gitlab.com',
      });
      // Service holds the null client; calling analyze() will throw LLMNotConfiguredError
      expect(service._llmClient).toBeNull();
    });
  });
});
