import { describe, it, expect } from '@jest/globals';
import { Analysis } from '../../../src/lib/core/entities/Analysis.js';

const validData = {
  iterationIds: ['iter-1', 'iter-2'],
  iterationRange: { from: '2025-01-01', to: '2025-01-28' },
  annotationIds: ['ann-1'],
  inputsDigest: 'sha256:abc123',
  signalPackage: { schemaVersion: 1 },
  model: 'claude-sonnet-4-6',
  systemPrompt: 'You are an analyst.',
  userPrompt: 'Analyze these metrics.',
  response: '## Report\nAll good.',
  usage: { input: 1000, output: 500 },
  latencyMs: 4200,
  status: 'succeeded',
  errorMessage: null,
};

describe('Analysis', () => {
  describe('constructor', () => {
    it('creates a valid Analysis with all required fields', () => {
      const analysis = new Analysis(validData);

      expect(analysis.iterationIds).toEqual(['iter-1', 'iter-2']);
      expect(analysis.status).toBe('succeeded');
      expect(analysis.model).toBe('claude-sonnet-4-6');
      expect(analysis.usage).toEqual({ input: 1000, output: 500 });
      expect(analysis.latencyMs).toBe(4200);
    });

    it('auto-generates id if not provided', () => {
      const analysis = new Analysis(validData);
      expect(typeof analysis.id).toBe('string');
      expect(analysis.id.length).toBeGreaterThan(0);
    });

    it('preserves provided id', () => {
      const analysis = new Analysis({ ...validData, id: 'fixed-id-123' });
      expect(analysis.id).toBe('fixed-id-123');
    });

    it('auto-generates createdAt if not provided', () => {
      const analysis = new Analysis(validData);
      expect(typeof analysis.createdAt).toBe('string');
      expect(new Date(analysis.createdAt).toISOString()).toBe(analysis.createdAt);
    });

    it('defaults schemaVersion to 1', () => {
      const analysis = new Analysis(validData);
      expect(analysis.schemaVersion).toBe(1);
    });

    it('throws when status is not "succeeded" or "failed"', () => {
      expect(() => new Analysis({ ...validData, status: 'pending' })).toThrow(/status/);
    });

    it('throws when iterationIds is missing or not an array', () => {
      expect(() => new Analysis({ ...validData, iterationIds: undefined })).toThrow(/iterationIds/);
      expect(() => new Analysis({ ...validData, iterationIds: 'not-array' })).toThrow(/iterationIds/);
    });

    it('applies null/empty defaults for all optional fields when omitted', () => {
      const minimal = new Analysis({
        iterationIds: ['iter-1'],
        status: 'succeeded',
      });
      expect(minimal.annotationIds).toEqual([]);
      expect(minimal.inputsDigest).toBeNull();
      expect(minimal.signalPackage).toBeNull();
      expect(minimal.model).toBeNull();
      expect(minimal.systemPrompt).toBeNull();
      expect(minimal.userPrompt).toBeNull();
      expect(minimal.response).toBeNull();
      expect(minimal.usage).toBeNull();
      expect(minimal.latencyMs).toBeNull();
      expect(minimal.errorMessage).toBeNull();
      expect(minimal.schemaVersion).toBe(1);
    });
  });

  describe('toJSON / fromJSON', () => {
    it('round-trips all fields through toJSON and fromJSON', () => {
      const original = new Analysis({ ...validData, id: 'round-trip-id', createdAt: '2025-05-01T00:00:00.000Z' });
      const json = original.toJSON();
      const restored = Analysis.fromJSON(json);

      expect(restored.id).toBe('round-trip-id');
      expect(restored.createdAt).toBe('2025-05-01T00:00:00.000Z');
      expect(restored.iterationIds).toEqual(['iter-1', 'iter-2']);
      expect(restored.status).toBe('succeeded');
      expect(restored.response).toBe('## Report\nAll good.');
    });

    it('toJSON output is JSON-serializable', () => {
      const analysis = new Analysis(validData);
      expect(() => JSON.stringify(analysis.toJSON())).not.toThrow();
    });

    it('fromJSON preserves a failed analysis with errorMessage', () => {
      const data = {
        ...validData,
        status: 'failed',
        response: null,
        errorMessage: 'Rate limit exceeded',
      };
      const analysis = Analysis.fromJSON(data);
      expect(analysis.status).toBe('failed');
      expect(analysis.errorMessage).toBe('Rate limit exceeded');
    });

    it('round-trips conversationHistory through toJSON and fromJSON', () => {
      const history = [
        { role: 'user', content: 'What does this mean?' },
        { role: 'assistant', content: 'It means velocity is stable.' },
      ];
      const original = new Analysis({ ...validData, id: 'chat-id', conversationHistory: history });
      const restored = Analysis.fromJSON(original.toJSON());
      expect(restored.conversationHistory).toEqual(history);
    });
  });

  describe('conversationHistory', () => {
    it('defaults to empty array when not provided', () => {
      const analysis = new Analysis(validData);
      expect(analysis.conversationHistory).toEqual([]);
    });

    it('preserves provided conversationHistory', () => {
      const history = [{ role: 'user', content: 'hello' }];
      const analysis = new Analysis({ ...validData, conversationHistory: history });
      expect(analysis.conversationHistory).toEqual(history);
    });

    it('existing analyses without the field default to [] via fromJSON', () => {
      const json = { ...validData, id: 'old-id', createdAt: '2025-01-01T00:00:00.000Z' };
      delete json.conversationHistory;
      const analysis = Analysis.fromJSON(json);
      expect(analysis.conversationHistory).toEqual([]);
    });
  });
});
