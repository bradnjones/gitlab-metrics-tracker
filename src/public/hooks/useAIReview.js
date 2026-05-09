/**
 * useAIReview Hook
 * Manages AI metric review state: run analysis, track loading/error, maintain history.
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
 *   loading: boolean,
 *   error: string|null,
 *   lastAnalysis: Object|null,
 *   history: Object[]
 * }}
 */
export function useAIReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastAnalysis, setLastAnalysis] = useState(null);
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
   * Run a new AI analysis over the given iteration IDs.
   * No-ops if a request is already in flight.
   *
   * @param {string[]} iterationIds - IDs of iterations to analyse
   * @returns {Promise<void>}
   */
  async function run(iterationIds) {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/analysis/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iterationIds }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setLastAnalysis(result);
      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { run, loading, error, lastAnalysis, history };
}
