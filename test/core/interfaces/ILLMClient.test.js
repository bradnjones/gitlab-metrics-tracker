import { describe, it, expect } from '@jest/globals';
import { ILLMClient } from '../../../src/lib/core/interfaces/ILLMClient.js';

describe('ILLMClient', () => {
  it('throws "not implemented" error when generate() called on base class', async () => {
    const client = new ILLMClient();
    await expect(client.generate({ system: 'sys', user: 'usr' })).rejects.toThrow(
      'ILLMClient.generate() must be implemented'
    );
  });
});
