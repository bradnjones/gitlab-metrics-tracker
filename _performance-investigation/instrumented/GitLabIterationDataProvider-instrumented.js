/**
 * Instrumented GitLab implementation of IIterationDataProvider
 * Includes detailed performance tracking for bottleneck analysis
 */

import { IIterationDataProvider } from '../../core/interfaces/IIterationDataProvider.js';

export class GitLabIterationDataProviderInstrumented extends IIterationDataProvider {
  constructor(gitlabClient) {
    super();
    this.gitlabClient = gitlabClient;
  }

  /**
   * Fetch all data for a given iteration with performance tracking
   */
  async fetchIterationData(iterationId) {
    const overallStart = Date.now();
    console.log(`\n[PROVIDER] fetchIterationData(${iterationId}) started`);

    try {
      // Fetch iteration list to get metadata
      const metadataStart = Date.now();
      const iterations = await this.gitlabClient.fetchIterations();
      const iterationMetadata = iterations.find(it => it.id === iterationId);
      const metadataDuration = Date.now() - metadataStart;
      console.log(`[PROVIDER]   - Iteration metadata: ${metadataDuration}ms`);

      // Fetch iteration details
      const detailsStart = Date.now();
      const iterationDetails = await this.gitlabClient.fetchIterationDetails(iterationId);
      const detailsDuration = Date.now() - detailsStart;
      console.log(`[PROVIDER]   - Iteration details: ${detailsDuration}ms`);

      // Fetch incidents
      const incidentsStart = Date.now();
      const incidents = await this.gitlabClient.fetchIncidents(
        iterationMetadata?.startDate || new Date().toISOString(),
        iterationMetadata?.dueDate || new Date().toISOString()
      );
      const incidentsDuration = Date.now() - incidentsStart;
      console.log(`[PROVIDER]   - Incidents: ${incidentsDuration}ms`);

      const totalDuration = Date.now() - overallStart;
      console.log(`[PROVIDER] fetchIterationData() completed - ${totalDuration}ms`);
      console.log(`[PROVIDER]   - Issues: ${iterationDetails.issues?.length || 0}`);
      console.log(`[PROVIDER]   - MRs: ${iterationDetails.mergeRequests?.length || 0}`);
      console.log(`[PROVIDER]   - Incidents: ${incidents?.length || 0}`);

      return {
        issues: iterationDetails.issues || [],
        mergeRequests: iterationDetails.mergeRequests || [],
        pipelines: [],
        incidents: incidents || [],
        iteration: {
          id: iterationMetadata?.id || iterationId,
          title: iterationMetadata?.title || 'Unknown Sprint',
          startDate: iterationMetadata?.startDate || new Date().toISOString(),
          dueDate: iterationMetadata?.dueDate || new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch iteration data: ${error.message}`);
    }
  }

  /**
   * Fetch data for multiple iterations with performance tracking
   */
  async fetchMultipleIterations(iterationIds) {
    const overallStart = Date.now();
    console.log(`\n[PROVIDER] fetchMultipleIterations() started - ${iterationIds.length} iterations`);

    try {
      if (!Array.isArray(iterationIds) || iterationIds.length === 0) {
        throw new Error('iterationIds must be a non-empty array');
      }

      // Fetch iteration list ONCE
      const metadataStart = Date.now();
      const allIterations = await this.gitlabClient.fetchIterations();
      const metadataDuration = Date.now() - metadataStart;
      console.log(`[PROVIDER]   - ALL iteration metadata: ${metadataDuration}ms (SINGLE CALL)`);

      // Create lookup map
      const iterationMap = new Map(allIterations.map(it => [it.id, it]));

      // Fetch details AND incidents for all iterations IN PARALLEL
      console.log(`[PROVIDER]   - Starting PARALLEL fetch for ${iterationIds.length} iterations...`);
      const parallelStart = Date.now();

      const fetchPromises = iterationIds.map(async (id, index) => {
        const iterStart = Date.now();
        console.log(`[PROVIDER]     [${index + 1}/${iterationIds.length}] Fetching ${id}...`);

        const metadata = iterationMap.get(id);
        const [details, incidents] = await Promise.all([
          this.gitlabClient.fetchIterationDetails(id),
          this.gitlabClient.fetchIncidents(
            metadata?.startDate || new Date().toISOString(),
            metadata?.dueDate || new Date().toISOString()
          )
        ]);

        const iterDuration = Date.now() - iterStart;
        console.log(`[PROVIDER]     [${index + 1}/${iterationIds.length}] Completed ${id} - ${iterDuration}ms`);

        return { details, incidents };
      });

      const allResults = await Promise.all(fetchPromises);
      const parallelDuration = Date.now() - parallelStart;
      console.log(`[PROVIDER]   - PARALLEL fetch completed: ${parallelDuration}ms`);

      // Combine results
      const results = iterationIds.map((id, index) => {
        const metadata = iterationMap.get(id);
        const { details, incidents } = allResults[index];

        return {
          issues: details.issues || [],
          mergeRequests: details.mergeRequests || [],
          pipelines: [],
          incidents: incidents || [],
          iteration: {
            id: metadata?.id || id,
            title: metadata?.title || 'Unknown Sprint',
            startDate: metadata?.startDate || new Date().toISOString(),
            dueDate: metadata?.dueDate || new Date().toISOString(),
          },
        };
      });

      const totalDuration = Date.now() - overallStart;
      console.log(`[PROVIDER] fetchMultipleIterations() completed - ${totalDuration}ms`);
      console.log(`[PROVIDER]   - Metadata: ${metadataDuration}ms (1 call)`);
      console.log(`[PROVIDER]   - Parallel data: ${parallelDuration}ms (${iterationIds.length} iterations)`);
      console.log(`[PROVIDER]   - Avg per iteration: ${(parallelDuration / iterationIds.length).toFixed(2)}ms`);

      return results;
    } catch (error) {
      throw new Error(`Failed to fetch multiple iterations: ${error.message}`);
    }
  }
}
