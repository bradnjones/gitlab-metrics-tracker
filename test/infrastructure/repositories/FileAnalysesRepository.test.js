import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileAnalysesRepository } from '../../../src/lib/infrastructure/repositories/FileAnalysesRepository.js';
import { Analysis } from '../../../src/lib/core/entities/Analysis.js';

const BASE_DATA = {
  iterationIds: ['iter-1'],
  iterationRange: { from: '2025-01-01', to: '2025-01-14' },
  annotationIds: [],
  inputsDigest: 'sha256:abc',
  signalPackage: { schemaVersion: 1 },
  model: 'claude-sonnet-4-6',
  systemPrompt: 'sys',
  userPrompt: 'usr',
  response: '## Report',
  usage: { input: 100, output: 50 },
  latencyMs: 1000,
  status: 'succeeded',
  errorMessage: null,
};

function makeAnalysis(overrides = {}) {
  return new Analysis({ ...BASE_DATA, ...overrides });
}

describe('FileAnalysesRepository', () => {
  let tempDir;
  let repo;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'analyses-test-'));
    repo = new FileAnalysesRepository(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('save() persists an analysis and findById() retrieves it', async () => {
    const analysis = makeAnalysis({ id: 'a1' });
    await repo.save(analysis);

    const found = await repo.findById('a1');
    expect(found).toBeInstanceOf(Analysis);
    expect(found.id).toBe('a1');
    expect(found.status).toBe('succeeded');
  });

  it('findById() returns null for an unknown id', async () => {
    const result = await repo.findById('does-not-exist');
    expect(result).toBeNull();
  });

  it('save() with same id overwrites the existing entry', async () => {
    const original = makeAnalysis({ id: 'a2', latencyMs: 1000 });
    await repo.save(original);

    const updated = makeAnalysis({ id: 'a2', latencyMs: 9999 });
    await repo.save(updated);

    const found = await repo.findById('a2');
    expect(found.latencyMs).toBe(9999);
  });

  it('findAll() returns empty array when no file exists yet', async () => {
    const results = await repo.findAll();
    expect(results).toEqual([]);
  });

  it('findAll() returns all analyses sorted by createdAt descending', async () => {
    const a1 = makeAnalysis({ id: 'a1', createdAt: '2025-01-01T00:00:00.000Z' });
    const a2 = makeAnalysis({ id: 'a2', createdAt: '2025-01-03T00:00:00.000Z' });
    const a3 = makeAnalysis({ id: 'a3', createdAt: '2025-01-02T00:00:00.000Z' });

    await repo.save(a1);
    await repo.save(a2);
    await repo.save(a3);

    const results = await repo.findAll();
    expect(results).toHaveLength(3);
    expect(results[0].id).toBe('a2'); // most recent first
    expect(results[1].id).toBe('a3');
    expect(results[2].id).toBe('a1');
  });

  it('persists a failed analysis with errorMessage', async () => {
    const failed = makeAnalysis({
      id: 'fail-1',
      status: 'failed',
      response: null,
      errorMessage: 'Rate limit exceeded',
    });
    await repo.save(failed);

    const found = await repo.findById('fail-1');
    expect(found.status).toBe('failed');
    expect(found.errorMessage).toBe('Rate limit exceeded');
  });

  it('recovers data from .tmp file when main file is missing (crash recovery)', async () => {
    const analysis = makeAnalysis({ id: 'a-recover' });

    // Simulate interrupted write: .tmp exists but main file does not
    const filePath = path.join(tempDir, 'analyses.json');
    const tmpPath = filePath + '.tmp';
    const data = { 'a-recover': analysis.toJSON() };
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    // Main file intentionally absent

    const found = await repo.findById('a-recover');
    expect(found).not.toBeNull();
    expect(found.id).toBe('a-recover');
  });

  it('writes atomically via .tmp → rename (no .tmp left after save)', async () => {
    const analysis = makeAnalysis({ id: 'a-atomic' });
    await repo.save(analysis);

    const tmpPath = path.join(tempDir, 'analyses.json.tmp');
    await expect(fs.access(tmpPath)).rejects.toThrow(); // .tmp must be gone
  });

  it('throws on corrupted (invalid JSON) analyses file', async () => {
    // Write invalid JSON to the main file — triggers the `throw err` branch in _loadFile
    await fs.writeFile(path.join(tempDir, 'analyses.json'), '{ broken json', 'utf-8');
    await expect(repo.findAll()).rejects.toThrow();
  });

  it('promotes .tmp to main when main file exists but is empty (size=0)', async () => {
    const analysis = makeAnalysis({ id: 'a-empty-main' });
    const filePath = path.join(tempDir, 'analyses.json');
    const tmpPath = filePath + '.tmp';

    // Write data to .tmp and an empty main file
    const data = { 'a-empty-main': analysis.toJSON() };
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.writeFile(filePath, '', 'utf-8'); // empty main file (size=0)

    const found = await repo.findById('a-empty-main');
    expect(found).not.toBeNull();
    expect(found.id).toBe('a-empty-main');
  });

  it('rethrows non-ENOENT errors from fs.stat during tmp recovery', async () => {
    const analysis = makeAnalysis({ id: 'a-stat-err' });
    const filePath = path.join(tempDir, 'analyses.json');
    const tmpPath = filePath + '.tmp';

    // Place a .tmp file so recovery is attempted
    await fs.writeFile(tmpPath, JSON.stringify({ 'a-stat-err': analysis.toJSON() }), 'utf-8');

    // Spy on fs.stat to throw a non-ENOENT error (e.g., permission denied)
    const permError = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    const statSpy = jest.spyOn(fs, 'stat').mockRejectedValueOnce(permError);

    await expect(repo.findById('a-stat-err')).rejects.toThrow('EACCES');
    statSpy.mockRestore();
  });

  it('serializes concurrent saves without corrupting the file', async () => {
    const analyses = Array.from({ length: 5 }, (_, i) =>
      makeAnalysis({ id: `concurrent-${i}` })
    );

    // Fire all saves at once
    await Promise.all(analyses.map((a) => repo.save(a)));

    const results = await repo.findAll();
    expect(results).toHaveLength(5);
  });
});
