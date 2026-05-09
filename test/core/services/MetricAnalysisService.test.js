import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MetricAnalysisService, LLMNotConfiguredError, AnalysisNotFoundError } from '../../../src/lib/core/services/MetricAnalysisService.js';
import { Analysis } from '../../../src/lib/core/entities/Analysis.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMetric(overrides = {}) {
  return {
    iterationId: 'gid://gitlab/Iteration/1',
    iterationTitle: 'Sprint 1',
    endDate: '2025-01-14',
    velocityPoints: 38,
    velocityStories: 5,
    cycleTimeAvg: 3.2,
    deploymentFrequency: 0.5,
    leadTimeAvg: 1.5,
    mttrAvg: 2,
    changeFailureRate: 5,
    ...overrides,
  };
}

function makeAnnotation(overrides = {}) {
  return {
    id: 'ann-1',
    date: '2025-01-07',
    title: 'Process change',
    eventType: 'Process',
    impact: 'Positive',
    affectedMetrics: ['velocity'],
    ...overrides,
  };
}

function makeStoredAnalysis(overrides = {}) {
  return new Analysis({
    id: 'stored-analysis-id',
    createdAt: '2025-01-01T00:00:00.000Z',
    iterationIds: ['gid://gitlab/Iteration/1'],
    iterationRange: { from: '2025-01-01', to: '2025-01-14' },
    annotationIds: [],
    inputsDigest: 'sha256:abc',
    signalPackage: {},
    model: 'claude-sonnet-4-6',
    systemPrompt: 'You are an analyst.',
    userPrompt: 'Analyze these metrics.',
    response: '## Initial Report\n\nVelocity stable.',
    usage: { input: 1000, output: 300 },
    latencyMs: 1500,
    status: 'succeeded',
    errorMessage: null,
    conversationHistory: [],
    ...overrides,
  });
}

function makeDeps(overrides = {}) {
  const metrics = [makeMetric(), makeMetric({ iterationId: 'gid://gitlab/Iteration/2', iterationTitle: 'Sprint 2', endDate: '2025-01-28' })];
  const annotations = [makeAnnotation()];

  const metricsService = {
    calculateMultipleMetrics: jest.fn().mockResolvedValue(metrics),
  };
  const annotationsRepository = {
    findAll: jest.fn().mockResolvedValue(annotations),
  };
  const llmClient = {
    generate: jest.fn().mockResolvedValue({
      text: '## Analysis\n\nAll good.',
      usage: { input: 1000, output: 300 },
      model: 'claude-sonnet-4-6',
      latencyMs: 1500,
    }),
    stream: jest.fn().mockImplementation(async function* () {
      yield { type: 'delta', text: 'Hello ' };
      yield { type: 'delta', text: 'world' };
      yield { type: 'done', text: 'Hello world', usage: { input: 500, output: 200 }, model: 'claude-sonnet-4-6', latencyMs: 2000 };
    }),
    streamConversation: jest.fn().mockImplementation(async function* () {
      yield { type: 'delta', text: 'Chat ' };
      yield { type: 'delta', text: 'reply' };
      yield { type: 'done', text: 'Chat reply', usage: { input: 300, output: 100 }, model: 'claude-sonnet-4-6', latencyMs: 1200 };
    }),
  };
  const analysesRepository = {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(makeStoredAnalysis()),
  };

  return {
    metricsService,
    annotationsRepository,
    llmClient,
    analysesRepository,
    clock: () => new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MetricAnalysisService', () => {
  describe('throws LLMNotConfiguredError immediately when llmClient is null', () => {
    it('throws without calling any other dep', async () => {
      const deps = makeDeps({ llmClient: null });
      const service = new MetricAnalysisService(deps);

      await expect(service.analyze(['id1'])).rejects.toThrow(LLMNotConfiguredError);

      expect(deps.metricsService.calculateMultipleMetrics).not.toHaveBeenCalled();
      expect(deps.annotationsRepository.findAll).not.toHaveBeenCalled();
      expect(deps.analysesRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('calls deps in correct order on happy path', () => {
    it('calls metricsService, annotationsRepository, llmClient', async () => {
      const deps = makeDeps();
      const service = new MetricAnalysisService(deps);
      const callOrder = [];

      deps.metricsService.calculateMultipleMetrics.mockImplementation(async (...a) => {
        callOrder.push('metricsService');
        return [makeMetric()];
      });
      deps.annotationsRepository.findAll.mockImplementation(async () => {
        callOrder.push('annotationsRepository');
        return [];
      });
      deps.llmClient.generate.mockImplementation(async () => {
        callOrder.push('llmClient');
        return { text: 'ok', usage: { input: 10, output: 5 }, model: 'claude-sonnet-4-6', latencyMs: 100 };
      });

      await service.analyze(['id1', 'id2']);

      expect(callOrder).toEqual(['metricsService', 'annotationsRepository', 'llmClient']);
    });
  });

  describe('persists a succeeded Analysis with all fields populated on happy path', () => {
    it('saves Analysis entity with status succeeded and inputsDigest starting sha256:', async () => {
      const deps = makeDeps();
      const service = new MetricAnalysisService(deps);

      const result = await service.analyze(['id1', 'id2']);

      expect(deps.analysesRepository.save).toHaveBeenCalledTimes(1);
      const savedArg = deps.analysesRepository.save.mock.calls[0][0];
      expect(savedArg).toBeInstanceOf(Analysis);
      expect(savedArg.status).toBe('succeeded');
      expect(savedArg.inputsDigest).toMatch(/^sha256:/);
      expect(savedArg.response).toBe('## Analysis\n\nAll good.');
      expect(savedArg.usage).toEqual({ input: 1000, output: 300 });
      expect(savedArg.model).toBe('claude-sonnet-4-6');
      expect(savedArg.latencyMs).toBe(1500);
      expect(savedArg.errorMessage).toBeNull();
      expect(result).toBeInstanceOf(Analysis);
      expect(result.status).toBe('succeeded');
    });
  });

  describe('persists a failed Analysis and rethrows when llmClient.generate rejects', () => {
    it('saves Analysis with status failed before rethrowing', async () => {
      const boom = new Error('Rate limit exceeded');
      const deps = makeDeps({
        llmClient: { generate: jest.fn().mockRejectedValue(boom) },
      });
      const service = new MetricAnalysisService(deps);

      await expect(service.analyze(['id1'])).rejects.toThrow('Rate limit exceeded');

      expect(deps.analysesRepository.save).toHaveBeenCalledTimes(1);
      const savedArg = deps.analysesRepository.save.mock.calls[0][0];
      expect(savedArg).toBeInstanceOf(Analysis);
      expect(savedArg.status).toBe('failed');
      expect(savedArg.errorMessage).toBe('Rate limit exceeded');
      expect(savedArg.response).toBeNull();
      expect(savedArg.usage).toBeNull();
      expect(savedArg.latencyMs).toBeNull();
    });
  });

  describe('injects clock for stable createdAt timestamps', () => {
    it('uses injected clock date for analysis.createdAt', async () => {
      const fixedDate = new Date('2025-06-15T12:00:00.000Z');
      const deps = makeDeps({ clock: () => fixedDate });
      const service = new MetricAnalysisService(deps);

      const result = await service.analyze(['id1']);

      expect(result.createdAt).toBe(fixedDate.toISOString());
    });
  });

  describe('analyzeStream()', () => {
    it('throws LLMNotConfiguredError when llmClient is null', async () => {
      const deps = makeDeps({ llmClient: null });
      const service = new MetricAnalysisService(deps);

      const gen = service.analyzeStream(['id1']);
      await expect(gen.next()).rejects.toThrow(LLMNotConfiguredError);

      expect(deps.metricsService.calculateMultipleMetrics).not.toHaveBeenCalled();
      expect(deps.analysesRepository.save).not.toHaveBeenCalled();
    });

    it('yields delta events through from llmClient.stream()', async () => {
      const deps = makeDeps();
      const service = new MetricAnalysisService(deps);

      const collected = [];
      for await (const event of service.analyzeStream(['id1', 'id2'])) {
        collected.push(event);
      }

      const deltas = collected.filter((e) => e.type === 'delta');
      expect(deltas).toHaveLength(2);
      expect(deltas[0]).toEqual({ type: 'delta', text: 'Hello ' });
      expect(deltas[1]).toEqual({ type: 'delta', text: 'world' });
    });

    it('persists succeeded Analysis and yields { type:"done", analysis } on completion', async () => {
      const deps = makeDeps();
      const service = new MetricAnalysisService(deps);

      const collected = [];
      for await (const event of service.analyzeStream(['id1', 'id2'])) {
        collected.push(event);
      }

      expect(deps.analysesRepository.save).toHaveBeenCalledTimes(1);
      const savedArg = deps.analysesRepository.save.mock.calls[0][0];
      expect(savedArg).toBeInstanceOf(Analysis);
      expect(savedArg.status).toBe('succeeded');
      expect(savedArg.response).toBe('Hello world');
      expect(savedArg.usage).toEqual({ input: 500, output: 200 });
      expect(savedArg.model).toBe('claude-sonnet-4-6');
      expect(savedArg.latencyMs).toBe(2000);

      const doneEvent = collected.find((e) => e.type === 'done');
      expect(doneEvent).toBeDefined();
      expect(doneEvent.analysis).toBeInstanceOf(Analysis);
      expect(doneEvent.analysis.status).toBe('succeeded');
    });

    it('persists failed Analysis and yields { type:"error" } when llmClient.stream throws', async () => {
      const boom = new Error('Rate limit exceeded');
      const deps = makeDeps({
        llmClient: {
          generate: jest.fn(),
          stream: jest.fn().mockImplementation(async function* () {
            throw boom;
          }),
        },
      });
      const service = new MetricAnalysisService(deps);

      const collected = [];
      for await (const event of service.analyzeStream(['id1'])) {
        collected.push(event);
      }

      expect(deps.analysesRepository.save).toHaveBeenCalledTimes(1);
      const savedArg = deps.analysesRepository.save.mock.calls[0][0];
      expect(savedArg).toBeInstanceOf(Analysis);
      expect(savedArg.status).toBe('failed');
      expect(savedArg.errorMessage).toBe('Rate limit exceeded');

      const errorEvent = collected.find((e) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent.message).toBe('Rate limit exceeded');
    });

    it('uses injected clock date for streamed analysis.createdAt', async () => {
      const fixedDate = new Date('2025-06-15T12:00:00.000Z');
      const deps = makeDeps({ clock: () => fixedDate });
      const service = new MetricAnalysisService(deps);

      const collected = [];
      for await (const event of service.analyzeStream(['id1'])) {
        collected.push(event);
      }

      const doneEvent = collected.find((e) => e.type === 'done');
      expect(doneEvent.analysis.createdAt).toBe(fixedDate.toISOString());
    });
  });

  describe('chatStream()', () => {
    it('throws LLMNotConfiguredError when llmClient is null', async () => {
      const deps = makeDeps({ llmClient: null });
      const service = new MetricAnalysisService(deps);

      const gen = service.chatStream('stored-analysis-id', 'What does this mean?');
      await expect(gen.next()).rejects.toThrow(LLMNotConfiguredError);
    });

    it('throws AnalysisNotFoundError when analysis does not exist', async () => {
      const deps = makeDeps();
      deps.analysesRepository.findById.mockResolvedValue(null);
      const service = new MetricAnalysisService(deps);

      const gen = service.chatStream('nonexistent-id', 'Hello?');
      await expect(gen.next()).rejects.toThrow(AnalysisNotFoundError);
    });

    it('yields delta events from llmClient.streamConversation()', async () => {
      const deps = makeDeps();
      const service = new MetricAnalysisService(deps);

      const collected = [];
      for await (const event of service.chatStream('stored-analysis-id', 'What does velocity mean?')) {
        collected.push(event);
      }

      const deltas = collected.filter((e) => e.type === 'delta');
      expect(deltas).toHaveLength(2);
      expect(deltas[0]).toEqual({ type: 'delta', text: 'Chat ' });
      expect(deltas[1]).toEqual({ type: 'delta', text: 'reply' });
    });

    it('builds multi-turn messages array with original prompt, response, and new message', async () => {
      const deps = makeDeps();
      const service = new MetricAnalysisService(deps);

      for await (const _ of service.chatStream('stored-analysis-id', 'Follow-up question')) {}

      expect(deps.llmClient.streamConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'user', content: 'Analyze these metrics.' },
            { role: 'assistant', content: '## Initial Report\n\nVelocity stable.' },
            { role: 'user', content: 'Follow-up question' },
          ]),
        })
      );
    });

    it('appends user and assistant messages to conversationHistory and saves updated analysis', async () => {
      const deps = makeDeps();
      const service = new MetricAnalysisService(deps);

      const collected = [];
      for await (const event of service.chatStream('stored-analysis-id', 'What does this mean?')) {
        collected.push(event);
      }

      expect(deps.analysesRepository.save).toHaveBeenCalledTimes(1);
      const saved = deps.analysesRepository.save.mock.calls[0][0];
      expect(saved.conversationHistory).toEqual([
        { role: 'user', content: 'What does this mean?' },
        { role: 'assistant', content: 'Chat reply' },
      ]);
    });

    it('yields { type:"done", analysis } with updated conversationHistory', async () => {
      const deps = makeDeps();
      const service = new MetricAnalysisService(deps);

      const collected = [];
      for await (const event of service.chatStream('stored-analysis-id', 'Tell me more')) {
        collected.push(event);
      }

      const doneEvent = collected.find((e) => e.type === 'done');
      expect(doneEvent).toBeDefined();
      expect(doneEvent.analysis).toBeInstanceOf(Analysis);
      expect(doneEvent.analysis.conversationHistory).toHaveLength(2);
      expect(doneEvent.analysis.conversationHistory[0]).toEqual({ role: 'user', content: 'Tell me more' });
      expect(doneEvent.analysis.conversationHistory[1]).toEqual({ role: 'assistant', content: 'Chat reply' });
    });

    it('includes existing conversationHistory in the messages array when continuing a thread', async () => {
      const existingHistory = [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
      ];
      const storedAnalysis = makeStoredAnalysis({ conversationHistory: existingHistory });
      const deps = makeDeps();
      deps.analysesRepository.findById.mockResolvedValue(storedAnalysis);
      const service = new MetricAnalysisService(deps);

      for await (const _ of service.chatStream('stored-analysis-id', 'Second question')) {}

      const call = deps.llmClient.streamConversation.mock.calls[0][0];
      expect(call.messages).toEqual([
        { role: 'user', content: 'Analyze these metrics.' },
        { role: 'assistant', content: '## Initial Report\n\nVelocity stable.' },
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
        { role: 'user', content: 'Second question' },
      ]);
    });

    it('yields { type:"error" } and does not save when streamConversation throws', async () => {
      const deps = makeDeps({
        llmClient: {
          generate: jest.fn(),
          stream: jest.fn(),
          streamConversation: jest.fn().mockImplementation(async function* () {
            throw new Error('LLM timeout');
          }),
        },
      });
      const service = new MetricAnalysisService(deps);

      const collected = [];
      for await (const event of service.chatStream('stored-analysis-id', 'Hello?')) {
        collected.push(event);
      }

      expect(collected.find((e) => e.type === 'error')).toEqual({ type: 'error', message: 'LLM timeout' });
      expect(deps.analysesRepository.save).not.toHaveBeenCalled();
    });
  });
});
