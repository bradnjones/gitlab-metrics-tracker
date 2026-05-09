/**
 * useAIReview Hook
 * Manages AI metric review state: stream analysis, track loading/streaming/error, maintain history.
 *
 * @module hooks/useAIReview
 */

import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch.js';

/**
 * Hook for triggering and tracking AI metric reviews.
 *
 * @returns {{
 *   run: (iterationIds: string[]) => Promise<void>,
 *   chat: (analysisId: string, message: string) => Promise<void>,
 *   loading: boolean,
 *   error: string|null,
 *   lastAnalysis: Object|null,
 *   streamingText: string,
 *   chatLoading: boolean,
 *   chatStreamingText: string,
 *   history: Object[]
 * }}
 */
export function useAIReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStreamingText, setChatStreamingText] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  /**
   * Fetch the full analysis history from the server.
   *
   * @returns {Promise<void>}
   */
  async function loadHistory() {
    try {
      const response = await apiFetch('/api/analysis');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      // History load failures are silent — don't surface in error state
    }
  }

  /**
   * Run a new AI analysis over the given iteration IDs via SSE streaming.
   * No-ops if a request is already in flight.
   *
   * @param {string[]} iterationIds - IDs of iterations to analyse
   * @returns {Promise<void>}
   */
  async function run(iterationIds) {
    if (loading) return;

    setLoading(true);
    setError(null);
    setStreamingText('');

    try {
      const response = await apiFetch('/api/analysis/review/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iterationIds }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on SSE double-newline boundaries
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // Keep any trailing incomplete part

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'delta') {
              setStreamingText((prev) => prev + data.text);
            } else if (data.type === 'done') {
              setLastAnalysis(data.analysis);
              await loadHistory();
            } else if (data.type === 'error') {
              setError(data.message);
            }
          } catch (_) {
            // Ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Send a follow-up chat message against an existing analysis via SSE streaming.
   * No-ops if a chat request is already in flight.
   *
   * @param {string} analysisId
   * @param {string} message
   * @returns {Promise<void>}
   */
  async function chat(analysisId, message) {
    if (chatLoading) return;

    setChatLoading(true);
    setError(null);
    setChatStreamingText('');

    try {
      const response = await apiFetch(`/api/analysis/${analysisId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'delta') {
              setChatStreamingText((prev) => prev + data.text);
            } else if (data.type === 'done') {
              setLastAnalysis(data.analysis);
              setChatStreamingText('');
            } else if (data.type === 'error') {
              setError(data.message);
            }
          } catch (_) {
            // Ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setChatLoading(false);
    }
  }

  return { run, chat, loading, error, lastAnalysis, streamingText, chatLoading, chatStreamingText, history };
}
