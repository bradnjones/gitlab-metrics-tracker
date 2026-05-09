/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';
import { ServiceFactory } from '../../../src/server/services/ServiceFactory.js';
import { Analysis } from '../../../src/lib/core/entities/Analysis.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Analysis entity for mocking.
 * @param {Object} [overrides]
 * @returns {Analysis}
 */
function makeAnalysis(overrides = {}) {
  return new Analysis({
    id: 'test-analysis-id',
    createdAt: '2025-01-01T00:00:00.000Z',
    iterationIds: ['id1', 'id2'],
    iterationRange: { from: '2025-01-01', to: '2025-01-28', count: 2 },
    annotationIds: [],
    inputsDigest: 'sha256:abc123',
    signalPackage: { schemaVersion: 1 },
    model: 'claude-sonnet-4-6',
    systemPrompt: 'system',
    userPrompt: 'user',
    response: '## Report\n\nAll metrics stable.',
    usage: { input: 1000, output: 300 },
    latencyMs: 1500,
    status: 'succeeded',
    errorMessage: null,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Analysis API', () => {
  let app;
  let mockAnalysesRepository;
  let mockService;
  let mockLLMClient;

  beforeEach(() => {
    // Mock analyses repository
    mockAnalysesRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
    };

    // Mock LLM client (non-null = configured)
    mockLLMClient = { generate: jest.fn() };

    // Mock service with analyze method
    mockService = {
      analyze: jest.fn().mockResolvedValue(makeAnalysis()),
    };

    // Wire ServiceFactory mocks — route will call these
    ServiceFactory.createLLMClient = jest.fn().mockReturnValue(mockLLMClient);
    ServiceFactory.createAnalysesRepository = jest.fn().mockReturnValue(mockAnalysesRepository);
    ServiceFactory.createAnnotationsRepository = jest.fn().mockReturnValue({
      findAll: jest.fn().mockResolvedValue([]),
    });
    ServiceFactory.createMetricAnalysisService = jest.fn().mockReturnValue(mockService);

    // Set basic-auth env so middleware doesn't 401 in tests
    process.env.BASIC_AUTH_USER = 'test';
    process.env.BASIC_AUTH_PASS = 'test';

    app = createApp();
  });

  // ─── POST /api/analysis/review ─────────────────────────────────────────────

  describe('POST /api/analysis/review', () => {
    it('returns 200 with analysis JSON on happy path', async () => {
      const analysis = makeAnalysis();
      mockService.analyze.mockResolvedValue(analysis);

      const response = await request(app)
        .post('/api/analysis/review')
        .auth('test', 'test')
        .send({ iterationIds: ['id1', 'id2'] })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe('test-analysis-id');
      expect(response.body.status).toBe('succeeded');
      expect(response.body.response).toBe('## Report\n\nAll metrics stable.');
      expect(mockService.analyze).toHaveBeenCalledWith(['id1', 'id2']);
    });

    it('returns 503 when LLM client is not configured', async () => {
      ServiceFactory.createLLMClient = jest.fn().mockReturnValue(null);

      const response = await request(app)
        .post('/api/analysis/review')
        .auth('test', 'test')
        .send({ iterationIds: ['id1'] })
        .expect('Content-Type', /json/)
        .expect(503);

      expect(response.body.error).toMatch(/not configured/i);
      expect(mockService.analyze).not.toHaveBeenCalled();
    });

    it('returns 400 when iterationIds is not an array', async () => {
      const response = await request(app)
        .post('/api/analysis/review')
        .auth('test', 'test')
        .send({ iterationIds: 'not-an-array' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('iterationIds must be an array');
    });

    it('returns 400 when iterationIds exceeds 100 items', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `id${i}`);

      const response = await request(app)
        .post('/api/analysis/review')
        .auth('test', 'test')
        .send({ iterationIds: ids })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('iterationIds cannot exceed 100 items');
    });

    it('returns 500 when LLM call fails (analysis already persisted as failed)', async () => {
      mockService.analyze.mockRejectedValue(new Error('Anthropic rate limit'));

      const response = await request(app)
        .post('/api/analysis/review')
        .auth('test', 'test')
        .send({ iterationIds: ['id1'] })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body.error).toMatch(/analysis failed/i);
    });
  });

  // ─── GET /api/analysis ─────────────────────────────────────────────────────

  describe('GET /api/analysis', () => {
    it('returns all analyses as JSON array', async () => {
      const analyses = [makeAnalysis(), makeAnalysis({ id: 'second-id' })];
      mockAnalysesRepository.findAll.mockResolvedValue(analyses);

      const response = await request(app)
        .get('/api/analysis')
        .auth('test', 'test')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe('test-analysis-id');
    });

    it('returns empty array when no analyses exist', async () => {
      mockAnalysesRepository.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/analysis')
        .auth('test', 'test')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns 500 when repository fails', async () => {
      mockAnalysesRepository.findAll.mockRejectedValue(new Error('disk error'));

      const response = await request(app)
        .get('/api/analysis')
        .auth('test', 'test')
        .expect(500);

      expect(response.body.error).toMatch(/failed to list/i);
    });
  });

  // ─── GET /api/analysis/:id ─────────────────────────────────────────────────

  describe('GET /api/analysis/:id', () => {
    it('returns 200 with analysis when found', async () => {
      const analysis = makeAnalysis();
      mockAnalysesRepository.findById.mockResolvedValue(analysis);

      const response = await request(app)
        .get('/api/analysis/test-analysis-id')
        .auth('test', 'test')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe('test-analysis-id');
    });

    it('returns 404 for unknown id', async () => {
      mockAnalysesRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/analysis/nonexistent')
        .auth('test', 'test')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toMatch(/not found/i);
    });

    it('returns 500 when repository fails', async () => {
      mockAnalysesRepository.findById.mockRejectedValue(new Error('disk error'));

      const response = await request(app)
        .get('/api/analysis/some-id')
        .auth('test', 'test')
        .expect(500);

      expect(response.body.error).toMatch(/failed to fetch/i);
    });
  });
});
