/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

const { useMetricsExport, toCSV, downloadCSV } = await import('../../../src/public/hooks/useMetricsExport.js');

describe('toCSV', () => {
  test('produces a header row and one data row', () => {
    const rows = [{ sprint: 'Sprint 1', points: 42 }];
    const csv = toCSV(rows);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('sprint,points');
    expect(lines[1]).toBe('Sprint 1,42');
  });

  test('returns empty string for empty array', () => {
    expect(toCSV([])).toBe('');
  });

  test('wraps values containing commas in double-quotes', () => {
    const rows = [{ name: 'Foo, Bar', count: 1 }];
    const csv = toCSV(rows);
    expect(csv).toContain('"Foo, Bar"');
  });

  test('wraps values containing double-quotes and escapes internal quotes', () => {
    const rows = [{ name: 'He said "hello"', count: 2 }];
    const csv = toCSV(rows);
    expect(csv).toContain('"He said ""hello"""');
  });

  test('wraps values containing newlines in double-quotes', () => {
    const rows = [{ name: 'line1\nline2', count: 3 }];
    const csv = toCSV(rows);
    expect(csv).toContain('"line1\nline2"');
  });

  test('handles null and undefined values as empty strings', () => {
    const rows = [{ a: null, b: undefined, c: 0 }];
    const csv = toCSV(rows);
    const lines = csv.split('\n');
    expect(lines[1]).toBe(',,0');
  });

  test('handles multiple rows', () => {
    const rows = [
      { sprint: 'Sprint 1', points: 10 },
      { sprint: 'Sprint 2', points: 20 },
    ];
    const csv = toCSV(rows);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe('Sprint 2,20');
  });
});

describe('downloadCSV', () => {
  let originalCreateObjectURL;
  let originalRevokeObjectURL;
  let clickSpy;
  let appendChildSpy;
  let removeChildSpy;
  let createElementSpy;
  let fakeLink;

  beforeEach(() => {
    clickSpy = jest.fn();
    fakeLink = {
      href: '',
      download: '',
      click: clickSpy,
      style: { display: '' },
    };

    createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return fakeLink;
      return document.createElement.wrappedMethod
        ? document.createElement.wrappedMethod(tag)
        : {};
    });

    appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    originalCreateObjectURL = global.URL.createObjectURL;
    originalRevokeObjectURL = global.URL.revokeObjectURL;
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    jest.restoreAllMocks();
  });

  test('sets download attribute and clicks the link', () => {
    downloadCSV('a,b\n1,2', 'test.csv');
    expect(fakeLink.download).toBe('test.csv');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  test('creates an object URL from a Blob', () => {
    downloadCSV('a,b\n1,2', 'test.csv');
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = global.URL.createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
  });
});

describe('useMetricsExport', () => {
  const mockIterations = [
    { id: 'gid://gitlab/Iteration/1', title: 'Sprint 1' },
    { id: 'gid://gitlab/Iteration/2', title: 'Sprint 2' },
  ];

  const makeMetricResponse = (overrides = {}) => ({
    metrics: [
      {
        iterationId: 'gid://gitlab/Iteration/1',
        iterationTitle: 'Sprint 1',
        startDate: '2025-01-01',
        dueDate: '2025-01-14',
        completedPoints: 42,
        completedStories: 8,
        cycleTimeAvg: 3.5,
        cycleTimeP50: 3.0,
        cycleTimeP90: 5.2,
        deploymentFrequency: 1.5,
        leadTimeAvg: 2.5,
        leadTimeP50: 2.0,
        leadTimeP90: 4.0,
        mttrAvg: 24.5,
        changeFailureRate: 10.0,
        ...overrides,
      },
    ],
  });

  let originalCreateObjectURL;
  let originalRevokeObjectURL;

  beforeEach(() => {
    originalCreateObjectURL = global.URL.createObjectURL;
    originalRevokeObjectURL = global.URL.revokeObjectURL;
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    jest.restoreAllMocks();
  });

  test('initializes with exporting=false', () => {
    const { result } = renderHook(() => useMetricsExport(mockIterations));
    expect(result.current.exporting).toBe(false);
    expect(typeof result.current.exportCSV).toBe('function');
  });

  test('sets exporting=true during fetch and false after completion', async () => {
    let resolveVelocity;
    const velocityPromise = new Promise(res => { resolveVelocity = res; });

    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('velocity')) return velocityPromise;
      return Promise.resolve({ ok: true, json: async () => makeMetricResponse() });
    });

    const { result } = renderHook(() => useMetricsExport(mockIterations));

    act(() => { result.current.exportCSV(); });

    expect(result.current.exporting).toBe(true);

    resolveVelocity({ ok: true, json: async () => makeMetricResponse() });

    await waitFor(() => expect(result.current.exporting).toBe(false));
  });

  test('calls fetch for all 5 metric endpoints', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => makeMetricResponse(),
    });

    const { result } = renderHook(() => useMetricsExport(mockIterations));

    await act(async () => { await result.current.exportCSV(); });

    const urls = global.fetch.mock.calls.map(([url]) => url);
    expect(urls.some(u => u.includes('velocity'))).toBe(true);
    expect(urls.some(u => u.includes('cycle-time'))).toBe(true);
    expect(urls.some(u => u.includes('deployment-frequency'))).toBe(true);
    expect(urls.some(u => u.includes('lead-time'))).toBe(true);
    expect(urls.some(u => u.includes('mttr'))).toBe(true);
  });

  test('includes all selected iteration IDs in query params', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => makeMetricResponse(),
    });

    const { result } = renderHook(() => useMetricsExport(mockIterations));

    await act(async () => { await result.current.exportCSV(); });

    const firstUrl = global.fetch.mock.calls[0][0];
    expect(firstUrl).toContain('gid%3A%2F%2Fgitlab%2FIteration%2F1');
    expect(firstUrl).toContain('gid%3A%2F%2Fgitlab%2FIteration%2F2');
  });

  test('triggers a CSV download on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => makeMetricResponse(),
    });

    // The beforeEach mock on createElement already stubs anchor tags.
    // We render the hook first (before any createElement spy change).
    const { result } = renderHook(() => useMetricsExport(mockIterations));

    await act(async () => { await result.current.exportCSV(); });

    // URL.createObjectURL is called to create the Blob URL for the download
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  test('logs error and resets exporting on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useMetricsExport(mockIterations));

    await act(async () => { await result.current.exportCSV(); });

    expect(result.current.exporting).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  test('does nothing when selectedIterations is empty', async () => {
    global.fetch = jest.fn();

    const { result } = renderHook(() => useMetricsExport([]));

    await act(async () => { await result.current.exportCSV(); });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
  });
});
