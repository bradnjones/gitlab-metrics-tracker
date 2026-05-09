import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Declare the mock fn before jest.unstable_mockModule so the factory closure captures it.
const mockCreate = jest.fn();

jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

// Import AFTER mocking so the module under test picks up the stub.
const { AnthropicLLMClient, LLMNotConfiguredError } = await import(
  '../../../src/lib/infrastructure/llm/AnthropicLLMClient.js'
);

/** Minimal valid Anthropic API success response. */
function makeSuccessResponse(text = 'Analysis complete.', model = 'claude-sonnet-4-6') {
  return {
    content: [{ type: 'text', text }],
    model,
    usage: { input_tokens: 1000, output_tokens: 500 },
  };
}

describe('AnthropicLLMClient', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.AI_REVIEW_ENABLED;
  });

  describe('constructor / LLMNotConfiguredError', () => {
    it('throws LLMNotConfiguredError when ANTHROPIC_API_KEY is missing', () => {
      expect(() => new AnthropicLLMClient()).toThrow(LLMNotConfiguredError);
    });

    it('throws LLMNotConfiguredError when AI_REVIEW_ENABLED is not "true"', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      expect(() => new AnthropicLLMClient()).toThrow(LLMNotConfiguredError);
    });

    it('constructs successfully when both flags are set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      process.env.AI_REVIEW_ENABLED = 'true';
      expect(() => new AnthropicLLMClient()).not.toThrow();
    });
  });

  describe('generate()', () => {
    let client;

    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      process.env.AI_REVIEW_ENABLED = 'true';
      client = new AnthropicLLMClient();
    });

    it('uses claude-sonnet-4-6 as the default model', async () => {
      mockCreate.mockResolvedValue(makeSuccessResponse());

      await client.generate({ system: 'sys', user: 'usr' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-sonnet-4-6' })
      );
    });

    it('uses ANTHROPIC_MODEL env var when set', async () => {
      process.env.ANTHROPIC_MODEL = 'claude-opus-4-7';
      // Re-instantiate so constructor picks up the new env var
      const overrideClient = new AnthropicLLMClient();
      mockCreate.mockResolvedValue(makeSuccessResponse('ok', 'claude-opus-4-7'));

      await overrideClient.generate({ system: 'sys', user: 'usr' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-opus-4-7' })
      );
    });

    it('returns text, usage, model, and a non-negative latencyMs', async () => {
      mockCreate.mockResolvedValue(makeSuccessResponse('Report here.'));

      const result = await client.generate({ system: 'sys', user: 'usr' });

      expect(result.text).toBe('Report here.');
      expect(result.usage).toEqual({ input: 1000, output: 500 });
      expect(result.model).toBe('claude-sonnet-4-6');
      expect(typeof result.latencyMs).toBe('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('sends system prompt with cache_control ephemeral for prompt-cache discounts', async () => {
      mockCreate.mockResolvedValue(makeSuccessResponse());

      await client.generate({ system: 'My system prompt', user: 'My user prompt' });

      const call = mockCreate.mock.calls[0][0];
      expect(call.system).toEqual([
        {
          type: 'text',
          text: 'My system prompt',
          cache_control: { type: 'ephemeral' },
        },
      ]);
    });

    it('propagates network errors as-is', async () => {
      mockCreate.mockRejectedValue(new Error('Network timeout'));

      await expect(client.generate({ system: 'sys', user: 'usr' })).rejects.toThrow(
        'Network timeout'
      );
    });

    it('propagates 401 authentication errors', async () => {
      const authError = Object.assign(new Error('Authentication error'), { status: 401 });
      mockCreate.mockRejectedValue(authError);

      await expect(client.generate({ system: 'sys', user: 'usr' })).rejects.toThrow(
        'Authentication error'
      );
    });

    it('propagates 429 rate limit errors', async () => {
      const rateLimitError = Object.assign(new Error('Rate limit exceeded'), { status: 429 });
      mockCreate.mockRejectedValue(rateLimitError);

      await expect(client.generate({ system: 'sys', user: 'usr' })).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
  });
});
