/**
 * @jest-environment node
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockReaddir = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  readdir: mockReaddir,
}));

const { getNotesDir, saveNote, loadPriorNotes } = await import('../../src/lib/analysis/notesManager.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getNotesDir', () => {
  test('returns a string ending in data/sprint-reviews', () => {
    const dir = getNotesDir();
    expect(typeof dir).toBe('string');
    expect(dir.endsWith('data/sprint-reviews')).toBe(true);
  });
});

describe('saveNote', () => {
  test('writes to correct file path and returns the path', async () => {
    mockWriteFile.mockResolvedValue(undefined);
    const result = await saveNote('2026-05-01', '# Sprint Review');
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    const [calledPath, calledContent, calledEncoding] = mockWriteFile.mock.calls[0];
    expect(calledPath).toMatch(/2026-05-01\.md$/);
    expect(calledContent).toBe('# Sprint Review');
    expect(calledEncoding).toBe('utf-8');
    expect(result).toBe(calledPath);
  });
});

describe('loadPriorNotes', () => {
  test('returns notes sorted newest first', async () => {
    mockReaddir.mockResolvedValue(['2026-04-01.md', '2026-05-01.md', '2026-03-01.md']);
    mockReadFile
      .mockResolvedValueOnce('May content')
      .mockResolvedValueOnce('April content')
      .mockResolvedValueOnce('March content');

    const notes = await loadPriorNotes(3);

    expect(notes).toHaveLength(3);
    expect(notes[0].date).toBe('2026-05-01');
    expect(notes[0].content).toBe('May content');
    expect(notes[0].filename).toBe('2026-05-01.md');
    expect(notes[1].date).toBe('2026-04-01');
    expect(notes[2].date).toBe('2026-03-01');
  });

  test('with n=1 returns only the most recent note', async () => {
    mockReaddir.mockResolvedValue(['2026-04-01.md', '2026-05-01.md', '2026-03-01.md']);
    mockReadFile.mockResolvedValueOnce('May content');

    const notes = await loadPriorNotes(1);

    expect(notes).toHaveLength(1);
    expect(notes[0].date).toBe('2026-05-01');
  });

  test('returns [] when readdir throws ENOENT', async () => {
    const err = new Error('ENOENT');
    err.code = 'ENOENT';
    mockReaddir.mockRejectedValue(err);

    const notes = await loadPriorNotes();

    expect(notes).toEqual([]);
  });
});
