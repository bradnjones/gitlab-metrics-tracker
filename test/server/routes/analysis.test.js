/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';
import { ServiceFactory } from '../../../src/server/services/ServiceFactory.js';
import { Analysis } from '../../../src/lib/core/entities/Analysis.js';
import { AnalysisNotFoundError } from '../../../src/lib/core/services/MetricAnalysisService.js';

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

    // Mock service with analyze, analyzeStream, and chatStream methods
    mockService = {
      analyze: jest.fn().mockResolvedValue(makeAnalysis()),
      analyzeStream: jest.fn().mockImplementation(async function* () {
        yield { type: 'delta', text: 'Hello ' };
        yield { type: 'done', analysis: makeAnalysis() };
      }),
      chatStream: jest.fn().mockImplementation(async function* () {
        yield { type: 'delta', text: 'Chat ' };
        yield { type: 'done', analysis: makeAnalysis({ conversationHistory: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Chat reply' }] }) };
      }),
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

  // ─── POST /api/analysis/review/stream ─────────────────────────────────────

  describe('POST /api/analysis/review/stream', () => {
    it('returns 200 SSE response with delta and done events on happy path', async () => {
      const analysis = makeAnalysis();
      mockService.analyzeStream = jest.fn().mockImplementation(async function* () {
        yield { type: 'delta', text: 'Hello ' };
        yield { type: 'done', analysis };
      });

      const response = await request(app)
        .post('/api/analysis/review/stream')
        .auth('test', 'test')
        .send({ iterationIds: ['id1', 'id2'] })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/event-stream/);
      expect(response.text).toContain('data: {"type":"delta","text":"Hello "}');
      expect(response.text).toContain('"type":"done"');
      expect(response.text).toContain('"id":"test-analysis-id"');
      expect(mockService.analyzeStream).toHaveBeenCalledWith(['id1', 'id2']);
    });

    it('returns 503 JSON when LLM client is not configured', async () => {
      ServiceFactory.createLLMClient = jest.fn().mockReturnValue(null);

      const response = await request(app)
        .post('/api/analysis/review/stream')
        .auth('test', 'test')
        .send({ iterationIds: ['id1'] })
        .expect('Content-Type', /json/)
        .expect(503);

      expect(response.body.error).toMatch(/not configured/i);
      expect(mockService.analyzeStream).not.toHaveBeenCalled();
    });

    it('returns 400 when iterationIds is not an array', async () => {
      const response = await request(app)
        .post('/api/analysis/review/stream')
        .auth('test', 'test')
        .send({ iterationIds: 'bad' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('iterationIds must be an array');
    });

    it('returns 400 when iterationIds exceeds 100 items', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `id${i}`);

      const response = await request(app)
        .post('/api/analysis/review/stream')
        .auth('test', 'test')
        .send({ iterationIds: ids })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toBe('iterationIds cannot exceed 100 items');
    });

    it('streams error event when analyzeStream yields { type:"error" }', async () => {
      mockService.analyzeStream = jest.fn().mockImplementation(async function* () {
        yield { type: 'error', message: 'Rate limit exceeded' };
      });

      const response = await request(app)
        .post('/api/analysis/review/stream')
        .auth('test', 'test')
        .send({ iterationIds: ['id1'] })
        .expect(200);

      expect(response.text).toContain('data: {"type":"error","message":"Rate limit exceeded"}');
    });

    it('streams error event when analyzeStream throws unexpectedly', async () => {
      mockService.analyzeStream = jest.fn().mockImplementation(async function* () {
        yield { type: 'delta', text: 'partial' };
        throw new Error('unexpected crash');
      });

      const response = await request(app)
        .post('/api/analysis/review/stream')
        .auth('test', 'test')
        .send({ iterationIds: ['id1'] })
        .expect(200);

      expect(response.text).toContain('"type":"error"');
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

  // ─── POST /api/analysis/:id/chat ──────────────────────────────────────────

  describe('POST /api/analysis/:id/chat', () => {
    it('returns 200 SSE response with delta and done events on happy path', async () => {
      const analysis = makeAnalysis();
      mockAnalysesRepository.findById.mockResolvedValue(analysis);
      mockService.chatStream = jest.fn().mockImplementation(async function* () {
        yield { type: 'delta', text: 'Answer ' };
        yield { type: 'done', analysis };
      });

      const response = await request(app)
        .post('/api/analysis/test-analysis-id/chat')
        .auth('test', 'test')
        .send({ message: 'What does velocity mean?' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/event-stream/);
      expect(response.text).toContain('data: {"type":"delta","text":"Answer "}');
      expect(response.text).toContain('"type":"done"');
      expect(response.text).toContain('"id":"test-analysis-id"');
      expect(mockService.chatStream).toHaveBeenCalledWith('test-analysis-id', 'What does velocity mean?');
    });

    it('returns 400 when message is missing', async () => {
      const response = await request(app)
        .post('/api/analysis/test-analysis-id/chat')
        .auth('test', 'test')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toMatch(/non-empty string/i);
    });

    it('returns 400 when message is an empty string', async () => {
      const response = await request(app)
        .post('/api/analysis/test-analysis-id/chat')
        .auth('test', 'test')
        .send({ message: '   ' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toMatch(/non-empty string/i);
    });

    it('returns 503 when LLM client is not configured', async () => {
      ServiceFactory.createLLMClient = jest.fn().mockReturnValue(null);

      const response = await request(app)
        .post('/api/analysis/test-analysis-id/chat')
        .auth('test', 'test')
        .send({ message: 'hello' })
        .expect('Content-Type', /json/)
        .expect(503);

      expect(response.body.error).toMatch(/not configured/i);
    });

    it('returns 404 when analysis is not found', async () => {
      mockAnalysesRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/analysis/nonexistent-id/chat')
        .auth('test', 'test')
        .send({ message: 'hello' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toMatch(/not found/i);
    });

    it('streams error event when chatStream yields { type:"error" }', async () => {
      const analysis = makeAnalysis();
      mockAnalysesRepository.findById.mockResolvedValue(analysis);
      mockService.chatStream = jest.fn().mockImplementation(async function* () {
        yield { type: 'error', message: 'LLM timeout' };
      });

      const response = await request(app)
        .post('/api/analysis/test-analysis-id/chat')
        .auth('test', 'test')
        .send({ message: 'hello' })
        .expect(200);

      expect(response.text).toContain('data: {"type":"error","message":"LLM timeout"}');
    });
  });
});
