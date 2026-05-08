import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../utils/apiFetch.js';

/**
 * @typedef {Object} DownloadState
 * @property {'downloading'|'complete'|'error'} status - Current download status
 * @property {number} progress - Progress percentage (0-100)
 * @property {string} [error] - Error message if status is 'error'
 */

/**
 * @typedef {Object} ProgressStats
 * @property {number} cachedCount - Number of selected iterations that are cached or download-complete
 * @property {number} downloadingCount - Number of selected iterations currently downloading
 * @property {number} notDownloadedCount - Number of selected iterations not yet started
 * @property {number} failedCount - Number of selected iterations that failed to download
 * @property {number} totalProgress - Aggregate progress percentage (0-100)
 */

/**
 * @typedef {Object} IterationFetchingResult
 * @property {Array<Object>} allIterations - Full list of iterations from the API
 * @property {Object.<string, DownloadState>} downloadStates - Per-iteration download state map
 * @property {Set<string>} cachedIterationIds - Iteration IDs already cached on the server
 * @property {boolean} isApplyReady - True when all selected iterations are ready to apply
 * @property {ProgressStats} progressStats - Aggregate download progress statistics
 */

/**
 * Hook that manages iteration data fetching, cache status, and background prefetching.
 *
 * When `isOpen` becomes true the hook:
 *  - Fetches the full iterations list from /api/iterations
 *  - Fetches cache status from /api/cache/status
 * When `isOpen` becomes false it resets all transient state.
 *
 * Whenever `selectedIds` changes while open, the hook fires a background prefetch
 * for each newly-selected iteration (calls /api/metrics/velocity to warm the cache).
 *
 * @param {boolean} isOpen - Whether the consumer (modal) is currently open
 * @param {Array<string>} selectedIds - Currently selected iteration IDs
 * @returns {IterationFetchingResult}
 *
 * @example
 * const { allIterations, downloadStates, cachedIterationIds, isApplyReady, progressStats }
 *   = useIterationFetching(isOpen, tempSelectedIds);
 */
export default function useIterationFetching(isOpen, selectedIds) {
  /** @type {[Array<Object>, Function]} */
  const [allIterations, setAllIterations] = useState([]);

  /**
   * Per-iteration download state map.
   * @type {[Object.<string, DownloadState>, Function]}
   */
  const [downloadStates, setDownloadStates] = useState({});

  /**
   * Set of iteration IDs that are already cached on the server.
   * @type {[Set<string>, Function]}
   */
  const [cachedIterationIds, setCachedIterationIds] = useState(new Set());

  /**
   * Set of iteration IDs for which a prefetch has been initiated
   * (to avoid duplicate in-flight requests).
   * @type {[Set<string>, Function]}
   */
  const [prefetchedIds, setPrefetchedIds] = useState(new Set());

  /**
   * True once the initial cache-status fetch has resolved so the prefetch
   * effect knows which IDs are already cached before it starts.
   * @type {[boolean, Function]}
   */
  const [cacheStatusLoaded, setCacheStatusLoaded] = useState(false);

  // Fetch iterations list and cache status whenever the modal opens; reset on close.
  useEffect(() => {
    if (!isOpen) {
      setPrefetchedIds(new Set());
      setDownloadStates({});
      setCachedIterationIds(new Set());
      setCacheStatusLoaded(false);
      return;
    }

    const fetchIterations = async () => {
      try {
        const response = await apiFetch('/api/iterations');
        const data = await response.json();
        setAllIterations(data.iterations || []);
      } catch (error) {
        console.error('Failed to fetch iterations:', error);
        setAllIterations([]);
      }
    };

    const fetchCacheStatus = async () => {
      try {
        const response = await apiFetch('/api/cache/status');
        const data = await response.json();
        const cachedIds = (data.iterations || []).map(iter => iter.iterationId);
        setCachedIterationIds(new Set(cachedIds));
      } catch (error) {
        console.error('Failed to fetch cache status:', error);
        setCachedIterationIds(new Set());
      } finally {
        setCacheStatusLoaded(true);
      }
    };

    fetchIterations();
    fetchCacheStatus();
  }, [isOpen]);

  // Background prefetch: fire a cache-warming request for each newly selected iteration.
  // Guard: wait until cache status is loaded so we don't prefetch already-cached IDs.
  useEffect(() => {
    if (!isOpen || !cacheStatusLoaded) return;

    const newlySelected = selectedIds.filter(
      id => !prefetchedIds.has(id) && !cachedIterationIds.has(id)
    );
    if (newlySelected.length === 0) return;

    newlySelected.forEach(async (iterationId) => {
      setPrefetchedIds(prev => new Set([...prev, iterationId]));
      setDownloadStates(prev => ({
        ...prev,
        [iterationId]: { status: 'downloading', progress: 0 }
      }));

      try {
        await apiFetch(`/api/metrics/velocity?iterations=${encodeURIComponent(iterationId)}`);
        setDownloadStates(prev => ({
          ...prev,
          [iterationId]: { status: 'complete', progress: 100 }
        }));
      } catch (error) {
        setDownloadStates(prev => ({
          ...prev,
          [iterationId]: { status: 'error', progress: 0, error: error.message }
        }));
        console.debug(`Background prefetch failed for ${iterationId}:`, error.message);
      }
    });
  }, [selectedIds, isOpen, prefetchedIds, cachedIterationIds, cacheStatusLoaded]);

  /**
   * Aggregate download progress statistics derived from selectedIds + downloadStates.
   * @type {ProgressStats}
   */
  const progressStats = useMemo(() => {
    if (selectedIds.length === 0) {
      return {
        cachedCount: 0,
        downloadingCount: 0,
        notDownloadedCount: 0,
        failedCount: 0,
        totalProgress: 0
      };
    }

    let cachedCount = 0;
    let downloadingCount = 0;
    let notDownloadedCount = 0;
    let failedCount = 0;

    selectedIds.forEach(id => {
      if (cachedIterationIds.has(id)) {
        cachedCount++;
      } else {
        const state = downloadStates[id];
        if (!state) {
          notDownloadedCount++;
        } else if (state.status === 'downloading') {
          downloadingCount++;
        } else if (state.status === 'complete') {
          cachedCount++;
        } else if (state.status === 'error') {
          failedCount++;
        } else {
          notDownloadedCount++;
        }
      }
    });

    return {
      cachedCount,
      downloadingCount,
      notDownloadedCount,
      failedCount,
      totalProgress: Math.round((cachedCount / selectedIds.length) * 100)
    };
  }, [selectedIds, downloadStates, cachedIterationIds]);

  /**
   * True when every selected iteration is either server-cached or download-complete.
   * @type {boolean}
   */
  const isApplyReady = useMemo(() => {
    if (selectedIds.length === 0) return true;

    return selectedIds.every(id => {
      if (cachedIterationIds.has(id)) return true;
      const state = downloadStates[id];
      return state != null && state.status === 'complete';
    });
  }, [selectedIds, downloadStates, cachedIterationIds]);

  return {
    allIterations,
    downloadStates,
    cachedIterationIds,
    isApplyReady,
    progressStats
  };
}
