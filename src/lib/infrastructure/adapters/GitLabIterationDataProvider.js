/**
 * GitLab implementation of IIterationDataProvider
 * Infrastructure layer adapter that implements Core interface
 *
 * @module infrastructure/adapters/GitLabIterationDataProvider
 */

import { IIterationDataProvider } from '../../core/interfaces/IIterationDataProvider.js';

/**
 * GitLabIterationDataProvider
 * Adapts GitLabClient to IIterationDataProvider interface
 *
 * Architecture:
 * - Implements IIterationDataProvider (Core interface)
 * - Depends on GitLabClient (Infrastructure implementation)
 * - Dependency: Infrastructure → Core (correct direction)
 */
export class GitLabIterationDataProvider extends IIterationDataProvider {
  /**
   * Create a GitLabIterationDataProvider instance
   *
   * @param {Object} gitlabClient - GitLabClient instance for API calls
   * @param {Object} [cacheRepository] - Optional cache repository (IIterationCacheRepository)
   */
  constructor(gitlabClient, cacheRepository) {
    super();
    this.gitlabClient = gitlabClient;
    this.cacheRepository = cacheRepository;
  }

  /**
   * Fetch all data for a given iteration from GitLab
   *
   * @param {string} iterationId - GitLab iteration ID (e.g., 'gid://gitlab/Iteration/123')
   * @returns {Promise<IterationData>} Complete iteration data
   * @throws {Error} If GitLab fetch fails
   */
  async fetchIterationData(iterationId) {
    // Try cache first if available
    if (this.cacheRepository) {
      try {
        const hasCache = await this.cacheRepository.has(iterationId);
        if (hasCache) {
          console.log('========================================');
          console.log(`CACHE HIT: ${iterationId}`);
          console.log('========================================');
          const cachedData = await this.cacheRepository.get(iterationId);
          return cachedData;
        } else {
          console.log('----------------------------------------');
          console.log(`CACHE MISS: ${iterationId} - Fetching from GitLab...`);
          console.log('----------------------------------------');
        }
      } catch (cacheError) {
        // Log cache error but continue with fresh fetch
        console.warn(`Cache read failed for iteration ${iterationId}:`, cacheError.message);
      }
    }

    // Cache miss or no cache - fetch from GitLab
    try {
      // Fetch iteration list to get metadata (includes dates)
      const iterations = await this.gitlabClient.fetchIterations();
      const iterationMetadata = iterations.find(it => it.id === iterationId);

      // Fetch iteration details (includes issues)
      const iterationDetails = await this.gitlabClient.fetchIterationDetails(iterationId);

      // Fetch incidents for this iteration's date range
      const incidents = await this.gitlabClient.fetchIncidents(
        iterationMetadata?.startDate || new Date().toISOString(),
        iterationMetadata?.dueDate || new Date().toISOString()
      );

      const iterationData = {
        issues: iterationDetails.issues || [],
        mergeRequests: iterationDetails.mergeRequests || [],
        pipelines: [], // TODO: Implement pipeline fetching
        incidents: incidents || [],
        iteration: {
          id: iterationMetadata?.id || iterationId,
          title: iterationMetadata?.title || 'Unknown Sprint',
          startDate: iterationMetadata?.startDate || new Date().toISOString(),
          dueDate: iterationMetadata?.dueDate || new Date().toISOString(),
        },
      };

      // Cache the result (fire-and-forget)
      if (this.cacheRepository) {
        this.cacheRepository.set(iterationId, iterationData).then(() => {
          console.log(`>>> CACHED: ${iterationId}`);
        }).catch(err => {
          console.warn(`Cache write failed for iteration ${iterationId}:`, err.message);
        });
      }

      return iterationData;
    } catch (error) {
      // Re-throw with context for Core layer
      throw new Error(`Failed to fetch iteration data: ${error.message}`);
    }
  }

  /**
   * Fetch data for multiple iterations efficiently in a single batch
   * Performance optimized: fetches iteration metadata once, then parallelizes details fetching
   * Cache-aware: checks cache for each iteration before fetching from GitLab
   *
   * @param {Array<string>} iterationIds - Array of GitLab iteration IDs
   * @returns {Promise<Array<IterationData>>} Array of iteration data in same order as input
   * @throws {Error} If fetch fails for any iteration
   */
  async fetchMultipleIterations(iterationIds) {
    try {
      // Validate input FIRST before logging
      if (!Array.isArray(iterationIds) || iterationIds.length === 0) {
        throw new Error('iterationIds must be a non-empty array');
      }

      console.log('='.repeat(60));
      console.log(`fetchMultipleIterations called with ${iterationIds.length} iterations`);
      console.log('='.repeat(60));

      // Check cache for all iterations in parallel
      console.log(`Checking cache for ${iterationIds.length} iterations...`);
      const cacheResults = await Promise.all(
        iterationIds.map(async (id) => {
          if (!this.cacheRepository) {
            console.log(`No cache repository configured for ${id}`);
            return { id, cached: false, data: null };
          }

          try {
            const hasCache = await this.cacheRepository.has(id);
            if (hasCache) {
              console.log(`CACHE HIT: ${id}`);
              const cachedData = await this.cacheRepository.get(id);
              return { id, cached: true, data: cachedData };
            }
            console.log(`CACHE MISS: ${id}`);
            return { id, cached: false, data: null };
          } catch (cacheError) {
            console.warn(`Cache read failed for iteration ${id}:`, cacheError.message);
            return { id, cached: false, data: null };
          }
        })
      );

      // Identify which iterations need fresh fetch
      const cacheMisses = cacheResults.filter(r => !r.cached).map(r => r.id);

      // If all cached, return early
      if (cacheMisses.length === 0) {
        return iterationIds.map(id => {
          const result = cacheResults.find(r => r.id === id);
          return result.data;
        });
      }

      // Fetch iteration list ONCE to get all metadata (leverages 10-minute cache)
      const allIterations = await this.gitlabClient.fetchIterations();

      // Create lookup map for O(1) access
      const iterationMap = new Map(allIterations.map(it => [it.id, it]));

      // Fetch details AND incidents ONLY for cache misses IN PARALLEL
      const fetchPromises = cacheMisses.map(async (id) => {
        const metadata = iterationMap.get(id);
        const [details, incidents] = await Promise.all([
          this.gitlabClient.fetchIterationDetails(id),
          this.gitlabClient.fetchIncidents(
            metadata?.startDate || new Date().toISOString(),
            metadata?.dueDate || new Date().toISOString()
          )
        ]);
        return { id, details, incidents, metadata };
      });
      const freshResults = await Promise.all(fetchPromises);

      // Build result map with both cached and fresh data
      const resultMap = new Map();

      // Add cached data to map
      cacheResults.filter(r => r.cached).forEach(r => {
        resultMap.set(r.id, r.data);
      });

      // Add fresh data to map and cache it
      for (const { id, details, incidents, metadata } of freshResults) {
        const iterationData = {
          issues: details.issues || [],
          mergeRequests: details.mergeRequests || [],
          pipelines: [], // TODO: Implement pipeline fetching
          incidents: incidents || [],
          iteration: {
            id: metadata?.id || id,
            title: metadata?.title || 'Unknown Sprint',
            startDate: metadata?.startDate || new Date().toISOString(),
            dueDate: metadata?.dueDate || new Date().toISOString(),
          },
        };

        resultMap.set(id, iterationData);

        // Cache the fresh data (fire-and-forget)
        if (this.cacheRepository) {
          this.cacheRepository.set(id, iterationData).catch(err => {
            console.warn(`Cache write failed for iteration ${id}:`, err.message);
          });
        }
      }

      // Return results in original order
      return iterationIds.map(id => resultMap.get(id));
    } catch (error) {
      // Re-throw with context for Core layer
      throw new Error(`Failed to fetch multiple iterations: ${error.message}`);
    }
  }
}
