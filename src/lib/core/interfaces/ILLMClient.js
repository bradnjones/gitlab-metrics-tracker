/**
 * Port interface for LLM text generation.
 * Infrastructure layer must implement this contract.
 *
 * @module core/interfaces/ILLMClient
 */

/**
 * @typedef {Object} LLMRequest
 * @property {string} system - System prompt text
 * @property {string} user - User prompt text
 * @property {string} [model] - Model identifier override
 * @property {number} [maxTokens] - Maximum tokens in the response
 */

/**
 * @typedef {Object} LLMResponse
 * @property {string} text - Generated text content
 * @property {{ input: number, output: number }} usage - Token counts
 * @property {string} model - Model that produced the response
 * @property {number} latencyMs - Wall-clock generation time in milliseconds
 */

/**
 * @typedef {{ type: 'delta', text: string } | { type: 'done', text: string, usage: { input: number, output: number }, model: string, latencyMs: number }} LLMStreamEvent
 */

/**
 * ILLMClient — abstract port for LLM text generation.
 * Keeps Core layer independent of Anthropic SDK.
 */
export class ILLMClient {
  /**
   * Generate text from the LLM.
   *
   * @param {LLMRequest} request
   * @returns {Promise<LLMResponse>}
   * @throws {Error} If not implemented by subclass
   */
  async generate(request) {
    throw new Error('ILLMClient.generate() must be implemented');
  }

  /**
   * Stream text from the LLM, yielding delta events as they arrive.
   * Final event is `{ type: 'done', text, usage, model, latencyMs }`.
   *
   * @param {LLMRequest} request
   * @returns {AsyncGenerator<LLMStreamEvent>}
   * @throws {Error} If not implemented by subclass
   */
  async *stream(request) {
    throw new Error('ILLMClient.stream() must be implemented');
  }
}
