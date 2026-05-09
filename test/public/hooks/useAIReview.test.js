/**
 * @jest-environment jsdom
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

const { useAIReview } = await import('../../../src/public/hooks/useAIReview.js');

// ---------------------------------------------------------------------------
// Helper — builds a mock response.body that yields SSE chunks
// ---------------------------------------------------------------------------

function makeSSEStream(events) {
  const encoder = new TextEncoder();
  const chunks = events.map((e) => `data: ${JSON.stringify(e)}\n\n`);
  let index = 0;
  return {
    getReader() {
      return {
        async read() {
          if (index >= chunks.length) return { done: true, value: undefined };
          return { done: false, value: encoder.encode(chunks[index++]) };
        },
      };
    },
  };
}

function makeSSEResponse(events) {
  return { ok: true, body: makeSSEStream(events) };
}

// ---------------------------------------------------------------------------

describe('useAIReview', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes with loading=false, error=null, lastAnalysis=null, streamingText="", and loads history on mount', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'a1' }],
    });

    const { result } = renderHook(() => useAIReview());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.lastAnalysis).toBe(null);
    expect(result.current.streamingText).toBe('');

    await waitFor(() => {
      expect(result.current.history).toEqual([{ id: 'a1' }]);
    });
  });

  it('run() sets loading=true during flight and false when complete', async () => {
    // GET /api/analysis on mount
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // POST streams — keep reader unresolved to hold the in-flight state
    let resolveRead;
    const inflight = {
      ok: true,
      body: {
        getReader() {
          return {
            async read() {
              return new Promise((res) => { resolveRead = res; });
            },
          };
        },
      },
    };
    global.fetch.mockReturnValueOnce(inflight);

    act(() => { result.current.run(['iter-1']); });

    // Wait for loading=true AND for read() to have been called (assigns resolveRead)
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
      expect(typeof resolveRead).toBe('function');
    });

    // Resolve the reader to end the stream
    resolveRead({ done: true, value: undefined });

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('run() accumulates streamingText from delta events', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const analysis = { id: 'new-1', status: 'succeeded', response: 'Hello world' };

    global.fetch.mockResolvedValueOnce(
      makeSSEResponse([
        { type: 'delta', text: 'Hello ' },
        { type: 'delta', text: 'world' },
        { type: 'done', analysis },
      ])
    );
    // History reload
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [analysis] });

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.lastAnalysis).toEqual(analysis);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('run() sets lastAnalysis and updates history on done event', async () => {
    const analysis = { id: 'new-1', status: 'succeeded' };
    const updatedHistory = [analysis, { id: 'old-1' }];

    // Mount GET
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'old-1' }] });

    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(result.current.history).toEqual([{ id: 'old-1' }]));

    // SSE stream with done event
    global.fetch.mockResolvedValueOnce(makeSSEResponse([{ type: 'done', analysis }]));

    // History reload after done
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => updatedHistory });

    await act(async () => {
      await result.current.run(['iter-1', 'iter-2']);
    });

    expect(result.current.lastAnalysis).toEqual(analysis);
    expect(result.current.history).toEqual(updatedHistory);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  it('run() sets error from SSE error event', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    global.fetch.mockResolvedValueOnce(
      makeSSEResponse([{ type: 'error', message: 'Rate limit exceeded' }])
    );

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.error).toBe('Rate limit exceeded');
    expect(result.current.loading).toBe(false);
    expect(result.current.lastAnalysis).toBe(null);
  });

  it('run() sets error and clears loading on fetch failure', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.loading).toBe(false);
    expect(result.current.lastAnalysis).toBe(null);
  });

  it('run() does nothing if already loading (prevents double-submit)', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    let resolveRead;
    const inflight = {
      ok: true,
      body: {
        getReader() {
          return {
            async read() {
              return new Promise((res) => { resolveRead = res; });
            },
          };
        },
      },
    };
    global.fetch.mockReturnValueOnce(inflight);

    act(() => { result.current.run(['iter-1']); });

    // Wait for loading=true AND for read() to have been called
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
      expect(typeof resolveRead).toBe('function');
    });

    // Second run() while loading — should be ignored
    act(() => { result.current.run(['iter-2']); });

    // loading should remain true (second run was ignored)
    expect(result.current.loading).toBe(true);

    resolveRead({ done: true, value: undefined });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('run() handles non-ok HTTP response with structured error body', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'AI review not configured' }),
    });

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.error).toBe('AI review not configured');
    expect(result.current.loading).toBe(false);
  });

  it('run() handles non-ok HTTP response without parseable body', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => { throw new Error('no body'); },
    });

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.error).toBe('HTTP error! status: 503');
    expect(result.current.loading).toBe(false);
  });

  it('history load network failure is silent and does not affect error state', async () => {
    global.fetch.mockRejectedValueOnce(new Error('History load failed'));

    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    expect(result.current.error).toBe(null);
    expect(result.current.history).toEqual([]);
  });

  it('history load non-ok HTTP response is silent', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    expect(result.current.error).toBe(null);
    expect(result.current.history).toEqual([]);
  });

  it('run() clears previous error on new attempt', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // First run fails
    global.fetch.mockRejectedValueOnce(new Error('First error'));

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.error).toBe('First error');

    // Second run succeeds via SSE
    const analysis = { id: 'ok' };
    global.fetch.mockResolvedValueOnce(makeSSEResponse([{ type: 'done', analysis }]));
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [analysis] });

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    expect(result.current.error).toBe(null);
    expect(result.current.lastAnalysis).toEqual(analysis);
  });

  it('run() resets streamingText to empty string at start of each new run', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const analysis = { id: 'a1' };
    global.fetch.mockResolvedValueOnce(
      makeSSEResponse([
        { type: 'delta', text: 'some text' },
        { type: 'done', analysis },
      ])
    );
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [analysis] });

    await act(async () => {
      await result.current.run(['iter-1']);
    });

    // streamingText is not exposed after done, but lastAnalysis should be set
    expect(result.current.lastAnalysis).toEqual(analysis);
    expect(result.current.loading).toBe(false);
  });

  // ─── chat() ────────────────────────────────────────────────────────────────

  it('hook exposes chat, chatLoading, and chatStreamingText', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    expect(typeof result.current.chat).toBe('function');
    expect(result.current.chatLoading).toBe(false);
    expect(result.current.chatStreamingText).toBe('');
  });

  it('chat() accumulates chatStreamingText from delta events', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const updatedAnalysis = { id: 'a1', conversationHistory: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Hello world' }] };
    global.fetch.mockResolvedValueOnce(
      makeSSEResponse([
        { type: 'delta', text: 'Hello ' },
        { type: 'delta', text: 'world' },
        { type: 'done', analysis: updatedAnalysis },
      ])
    );

    await act(async () => {
      await result.current.chat('analysis-id', 'hi');
    });

    expect(result.current.lastAnalysis).toEqual(updatedAnalysis);
    expect(result.current.chatLoading).toBe(false);
    expect(result.current.chatStreamingText).toBe('');
  });

  it('chat() calls the correct endpoint with POST and message body', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    global.fetch.mockResolvedValueOnce(makeSSEResponse([{ type: 'done', analysis: { id: 'a1' } }]));

    await act(async () => {
      await result.current.chat('the-analysis-id', 'What does velocity mean?');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/analysis/the-analysis-id/chat'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'What does velocity mean?' }),
      })
    );
  });

  it('chat() sets error on non-ok HTTP response', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Analysis not found' }),
    });

    await act(async () => {
      await result.current.chat('bad-id', 'hello');
    });

    expect(result.current.error).toBe('Analysis not found');
    expect(result.current.chatLoading).toBe(false);
  });

  it('chat() merges updated analysis into lastAnalysis on done event', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAIReview());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const originalAnalysis = { id: 'a1', response: 'original report', conversationHistory: [] };
    const updatedAnalysis = { id: 'a1', response: 'original report', conversationHistory: [{ role: 'user', content: 'q' }, { role: 'assistant', content: 'a' }] };

    // Set lastAnalysis via run first
    global.fetch.mockResolvedValueOnce(makeSSEResponse([{ type: 'done', analysis: originalAnalysis }]));
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [originalAnalysis] });

    await act(async () => {
      await result.current.run(['iter-1']);
    });
    expect(result.current.lastAnalysis).toEqual(originalAnalysis);

    // Now chat
    global.fetch.mockResolvedValueOnce(makeSSEResponse([{ type: 'done', analysis: updatedAnalysis }]));

    await act(async () => {
      await result.current.chat('a1', 'q');
    });

    expect(result.current.lastAnalysis).toEqual(updatedAnalysis);
    expect(result.current.chatStreamingText).toBe('');
  });
});
