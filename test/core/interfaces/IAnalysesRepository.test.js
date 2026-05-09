import { describe, it, expect } from '@jest/globals';
import { IAnalysesRepository } from '../../../src/lib/core/interfaces/IAnalysesRepository.js';

describe('IAnalysesRepository', () => {
  const repo = new IAnalysesRepository();

  it('throws "not implemented" on save()', async () => {
    await expect(repo.save({})).rejects.toThrow('IAnalysesRepository.save() must be implemented');
  });

  it('throws "not implemented" on findById()', async () => {
    await expect(repo.findById('id')).rejects.toThrow('IAnalysesRepository.findById() must be implemented');
  });

  it('throws "not implemented" on findAll()', async () => {
    await expect(repo.findAll()).rejects.toThrow('IAnalysesRepository.findAll() must be implemented');
  });
});
