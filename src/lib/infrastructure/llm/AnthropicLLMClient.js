/**
 * Anthropic SDK adapter for LLM text generation.
 * This is the ONLY file in the project that imports @anthropic-ai/sdk.
 * Core layer depends on ILLMClient, never on this file directly.
 *
 * @module infrastructure/llm/AnthropicLLMClient
 */

import Anthropic from '@anthropic-ai/sdk';
import { ILLMClient } from '../../core/interfaces/ILLMClient.js';

/** Default model when ANTHROPIC_MODEL env var is not set. */
const DEFAULT_MODEL = 'claude-sonnet-4-6';

/** Default max tokens for the response. */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Thrown when the Anthropic client is instantiated without the required
 * environment flags (ANTHROPIC_API_KEY and AI_REVIEW_ENABLED=true).
 */
export class LLMNotConfiguredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LLMNotConfiguredError';
  }
}

/**
 * AnthropicLLMClient — Infrastructure adapter implementing ILLMClient.
 * Wraps the Anthropic Messages API with prompt-cache headers on the system prompt.
 */
export class AnthropicLLMClient extends ILLMClient {
  /**
   * @throws {LLMNotConfiguredError} If ANTHROPIC_API_KEY or AI_REVIEW_ENABLED is missing
   */
  constructor() {
    super();

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new LLMNotConfiguredError(
        'ANTHROPIC_API_KEY is not set — AI review is unavailable'
      );
    }

    if (process.env.AI_REVIEW_ENABLED !== 'true') {
      throw new LLMNotConfiguredError(
        'AI_REVIEW_ENABLED is not set to "true" — opt-in required to send data to Anthropic'
      );
    }

    this._client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this._defaultModel = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  }

  /**
   * Generate text via the Anthropic Messages API.
   * The system prompt is sent with cache_control ephemeral for prompt-cache discounts
   * on repeat calls within the 5-minute TTL window.
   *
   * @param {import('../../core/interfaces/ILLMClient.js').LLMRequest} request
   * @returns {Promise<import('../../core/interfaces/ILLMClient.js').LLMResponse>}
   * @throws {Error} On network errors, auth failures, or rate limiting — callers handle
   */
  async generate({ system, user, model, maxTokens }) {
    const resolvedModel = model || this._defaultModel;
    const resolvedMaxTokens = maxTokens || DEFAULT_MAX_TOKENS;

    const start = Date.now();

    const response = await this._client.messages.create({
      model: resolvedModel,
      max_tokens: resolvedMaxTokens,
      system: [
        {
          type: 'text',
          text: system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: user }],
    });

    const latencyMs = Date.now() - start;

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      text,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      model: response.model,
      latencyMs,
    };
  }
}
