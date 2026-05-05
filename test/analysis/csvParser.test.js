/**
 * @jest-environment node
 */

import { describe, test, expect, jest } from '@jest/globals';

const mockReadFile = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({
  readFile: mockReadFile,
}));

const { parseCSV, parseCSVFile } = await import('../../src/lib/analysis/csvParser.js');

const HEADER = 'iterationId,iterationTitle,startDate,dueDate,completedPoints,completedStories,cycleTimeAvg,cycleTimeP50,cycleTimeP90,deploymentFrequency,leadTimeAvg,leadTimeP50,leadTimeP90,mttrAvg,changeFailureRate';

describe('parseCSV', () => {
  test('happy path: parses 2 valid sprint rows with correct types', () => {
    const csv = [
      HEADER,
      '1,Sprint 1,2024-01-01,2024-01-14,42,10,3.5,3.0,5.0,1.2,24.0,20.0,36.0,2.5,0.05',
      '2,Sprint 2,2024-01-15,2024-01-28,35,8,2.8,2.5,4.2,0.9,18.0,16.0,28.0,1.8,0.03',
    ].join('\n');

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0].iterationId).toBe('1');
    expect(result[0].iterationTitle).toBe('Sprint 1');
    expect(result[0].startDate).toBe('2024-01-01');
    expect(result[0].dueDate).toBe('2024-01-14');
    expect(result[0].completedPoints).toBe(42);
    expect(result[0].completedStories).toBe(10);
    expect(result[0].cycleTimeAvg).toBe(3.5);
    expect(result[0].deploymentFrequency).toBe(1.2);
    expect(typeof result[0].completedPoints).toBe('number');
    expect(typeof result[0].cycleTimeP90).toBe('number');
  });

  test('filters out empty sprints (completedPoints=0, completedStories=0, deploymentFrequency=0)', () => {
    const csv = [
      HEADER,
      '1,Sprint 1,2024-01-01,2024-01-14,42,10,3.5,3.0,5.0,1.2,24.0,20.0,36.0,2.5,0.05',
      '2,Empty Sprint,2024-01-15,2024-01-28,0,0,0,0,0,0,0,0,0,0,0',
    ].join('\n');

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].iterationId).toBe('1');
  });

  test('filters out future sprints (dueDate > today)', () => {
    const csv = [
      HEADER,
      '1,Sprint 1,2024-01-01,2024-01-14,42,10,3.5,3.0,5.0,1.2,24.0,20.0,36.0,2.5,0.05',
      '2,Future Sprint,2099-01-01,2099-01-14,50,12,3.0,2.8,4.5,1.5,20.0,18.0,30.0,2.0,0.04',
    ].join('\n');

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].iterationId).toBe('1');
  });

  test('handles empty string values in numeric fields (becomes 0)', () => {
    const csv = [
      HEADER,
      '1,Sprint 1,2024-01-01,2024-01-14,42,10,,,,1.2,,,,,',
    ].join('\n');

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].cycleTimeAvg).toBe(0);
    expect(result[0].cycleTimeP50).toBe(0);
    expect(result[0].cycleTimeP90).toBe(0);
    expect(result[0].leadTimeAvg).toBe(0);
  });
});

describe('parseCSVFile', () => {
  test('reads a file and returns parsed sprints', async () => {
    const csv = [
      HEADER,
      '1,Sprint 1,2024-01-01,2024-01-14,42,10,3.5,3.0,5.0,1.2,24.0,20.0,36.0,2.5,0.05',
    ].join('\n');

    mockReadFile.mockResolvedValue(csv);

    const result = await parseCSVFile('/some/path/sprints.csv');

    expect(mockReadFile).toHaveBeenCalledWith('/some/path/sprints.csv', 'utf-8');
    expect(result).toHaveLength(1);
    expect(result[0].iterationId).toBe('1');
    expect(result[0].completedPoints).toBe(42);
  });
});
