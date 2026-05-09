import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Declare the mock fns before jest.unstable_mockModule so the factory closure captures them.
const mockCreate = jest.fn();
const mockStream = jest.fn();

jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate, stream: mockStream },
  })),
}));

/**
 * Build a mock Anthropic stream object — async-iterable events + finalMessage().
 * @param {Object[]} events - Raw SDK streaming events to yield
 * @param {Object} finalMsg - Partial final message fields
 */
function makeMockStream(events = [], finalMsg = {}) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
    finalMessage: jest.fn().mockResolvedValue({
      model: 'claude-sonnet-4-6',
      usage: { input_tokens: 100, output_tokens: 50 },
      ...finalMsg,
    }),
  };
}

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
    mockStream.mockReset();
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.AI_REVIEW_ENABLED;
  });

  describe('constructor / LLMNotConfiguredError', () => {
    it('throws LLMNotConfiguredError when no API key is provided', () => {
      process.env.AI_REVIEW_ENABLED = 'true';
      expect(() => new AnthropicLLMClient()).toThrow(LLMNotConfiguredError);
    });

    it('throws LLMNotConfiguredError when AI_REVIEW_ENABLED is not "true"', () => {
      expect(() => new AnthropicLLMClient('sk-test')).toThrow(LLMNotConfiguredError);
    });

    it('constructs successfully when API key is provided and AI_REVIEW_ENABLED is true', () => {
      process.env.AI_REVIEW_ENABLED = 'true';
      expect(() => new AnthropicLLMClient('sk-test')).not.toThrow();
    });
  });

  describe('generate()', () => {
    let client;

    beforeEach(() => {
      process.env.AI_REVIEW_ENABLED = 'true';
      client = new AnthropicLLMClient('sk-test');
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
      const overrideClient = new AnthropicLLMClient('sk-test');
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

  describe('stream()', () => {
    let client;

    beforeEach(() => {
      process.env.AI_REVIEW_ENABLED = 'true';
      client = new AnthropicLLMClient('sk-test');
    });

    it('yields delta events for each text chunk', async () => {
      const events = [
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello ' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'world' } },
        { type: 'message_stop' },
      ];
      mockStream.mockReturnValue(makeMockStream(events));

      const collected = [];
      for await (const event of client.stream({ system: 'sys', user: 'usr' })) {
        collected.push(event);
      }

      const deltas = collected.filter((e) => e.type === 'delta');
      expect(deltas).toHaveLength(2);
      expect(deltas[0]).toEqual({ type: 'delta', text: 'Hello ' });
      expect(deltas[1]).toEqual({ type: 'delta', text: 'world' });
    });

    it('yields a final done event with accumulated text, usage, model, and latencyMs', async () => {
      const events = [
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Done!' } },
      ];
      mockStream.mockReturnValue(
        makeMockStream(events, {
          model: 'claude-sonnet-4-6',
          usage: { input_tokens: 200, output_tokens: 80 },
        })
      );

      const collected = [];
      for await (const event of client.stream({ system: 'sys', user: 'usr' })) {
        collected.push(event);
      }

      const done = collected.find((e) => e.type === 'done');
      expect(done).toBeDefined();
      expect(done.text).toBe('Done!');
      expect(done.usage).toEqual({ input: 200, output: 80 });
      expect(done.model).toBe('claude-sonnet-4-6');
      expect(typeof done.latencyMs).toBe('number');
      expect(done.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('sends system prompt with cache_control ephemeral', async () => {
      mockStream.mockReturnValue(makeMockStream([]));

      for await (const _ of client.stream({ system: 'My system prompt', user: 'My user prompt' })) {}

      const call = mockStream.mock.calls[0][0];
      expect(call.system).toEqual([
        { type: 'text', text: 'My system prompt', cache_control: { type: 'ephemeral' } },
      ]);
    });

    it('non-text delta events are ignored and do not appear in output', async () => {
      const events = [
        { type: 'content_block_start', content_block: { type: 'text' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi' } },
        { type: 'message_delta', usage: { output_tokens: 10 } },
      ];
      mockStream.mockReturnValue(makeMockStream(events));

      const collected = [];
      for await (const event of client.stream({ system: 'sys', user: 'usr' })) {
        collected.push(event);
      }

      // Only one delta + one done
      expect(collected.filter((e) => e.type === 'delta')).toHaveLength(1);
      expect(collected.filter((e) => e.type === 'done')).toHaveLength(1);
    });

    it('propagates stream errors as-is', async () => {
      async function* failingGen() {
        throw new Error('Stream failure');
      }
      mockStream.mockReturnValue({
        [Symbol.asyncIterator]: failingGen,
        finalMessage: jest.fn(),
      });

      await expect(async () => {
        for await (const _ of client.stream({ system: 'sys', user: 'usr' })) {}
      }).rejects.toThrow('Stream failure');
    });
  });

  describe('streamConversation()', () => {
    let client;

    beforeEach(() => {
      process.env.AI_REVIEW_ENABLED = 'true';
      client = new AnthropicLLMClient('sk-test');
    });

    it('yields delta and done events for a multi-turn messages array', async () => {
      const events = [
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Chat ' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'reply' } },
      ];
      mockStream.mockReturnValue(makeMockStream(events));

      const messages = [
        { role: 'user', content: 'initial prompt' },
        { role: 'assistant', content: 'initial response' },
        { role: 'user', content: 'follow-up question' },
      ];

      const collected = [];
      for await (const event of client.streamConversation({ system: 'sys', messages })) {
        collected.push(event);
      }

      const deltas = collected.filter((e) => e.type === 'delta');
      expect(deltas).toHaveLength(2);
      expect(deltas[0]).toEqual({ type: 'delta', text: 'Chat ' });
      expect(deltas[1]).toEqual({ type: 'delta', text: 'reply' });

      const done = collected.find((e) => e.type === 'done');
      expect(done).toBeDefined();
      expect(done.text).toBe('Chat reply');
    });

    it('passes the messages array directly to the SDK (not wrapped in single user message)', async () => {
      mockStream.mockReturnValue(makeMockStream([]));

      const messages = [
        { role: 'user', content: 'q1' },
        { role: 'assistant', content: 'a1' },
        { role: 'user', content: 'q2' },
      ];
      for await (const _ of client.streamConversation({ system: 'sys', messages })) {}

      const call = mockStream.mock.calls[0][0];
      expect(call.messages).toEqual(messages);
      expect(call.system).toEqual([
        { type: 'text', text: 'sys', cache_control: { type: 'ephemeral' } },
      ]);
    });
  });
});
