import { useState, useEffect } from 'react';
import { fetchWithRetry } from '../utils/fetchWithRetry.js';

/**
 * Custom hook for fetching iterations from the API
 * Handles loading, error states, and data fetching with automatic retry logic
 *
 * @returns {{
 *   iterations: Array<Object>,
 *   loading: boolean,
 *   error: string|null
 * }}
 *
 * @example
 * const { iterations, loading, error } = useIterations();
 */
export function useIterations() {
  const [iterations, setIterations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIterations = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithRetry('/api/iterations', {}, 3, 500);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setIterations(data.iterations || []);
      } catch (err) {
        setError(`Error loading iterations: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchIterations();
  }, []);

  return { iterations, loading, error };
}
