#!/usr/bin/env node

/**
 * Performance Test Script
 * Tests GitLab API performance with instrumentation
 *
 * Usage:
 *   node performance-test.js [num_iterations]
 *
 * Example:
 *   node performance-test.js 3    # Test with 3 iterations
 *   node performance-test.js      # Test with 6 iterations (default)
 */

import 'dotenv/config';
import { GitLabClientInstrumented } from './src/lib/infrastructure/api/GitLabClient-instrumented.js';
import { GitLabIterationDataProviderInstrumented } from './src/lib/infrastructure/adapters/GitLabIterationDataProvider-instrumented.js';
import { MetricsService } from './src/lib/core/services/MetricsService.js';
import { FileMetricsRepository } from './src/lib/infrastructure/repositories/FileMetricsRepository.js';

async function main() {
  console.log('========================================');
  console.log('GITLAB METRICS TRACKER - PERFORMANCE TEST');
  console.log('========================================\n');

  const numIterations = parseInt(process.argv[2]) || 6;

  // Create instrumented client
  const gitlabClient = new GitLabClientInstrumented({
    url: process.env.GITLAB_URL || 'https://gitlab.com',
    token: process.env.GITLAB_TOKEN,
    projectPath: process.env.GITLAB_PROJECT_PATH
  });

  console.log(`Testing with ${numIterations} iterations\n`);

  try {
    // PHASE 1: Fetch iterations list
    console.log('\n========== PHASE 1: FETCH ITERATIONS LIST ==========');
    const iterationsStart = Date.now();
    const iterations = await gitlabClient.fetchIterations();
    const iterationsDuration = Date.now() - iterationsStart;
    console.log(`\nFound ${iterations.length} total iterations in ${iterationsDuration}ms`);

    if (iterations.length === 0) {
      console.error('ERROR: No iterations found. Check your GITLAB_PROJECT_PATH');
      process.exit(1);
    }

    // Select recent iterations for testing
    const recentIterations = iterations
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
      .slice(0, numIterations);

    console.log(`\nSelected ${recentIterations.length} recent iterations for testing:`);
    recentIterations.forEach((iter, i) => {
      console.log(`  ${i + 1}. ${iter.title} (${iter.startDate} to ${iter.dueDate})`);
    });

    // PHASE 2: Test SEQUENTIAL fetching (current approach in some parts)
    console.log('\n\n========== PHASE 2: SEQUENTIAL FETCHING TEST ==========');
    const sequentialStart = Date.now();
    const sequentialResults = [];

    for (let i = 0; i < recentIterations.length; i++) {
      const iter = recentIterations[i];
      console.log(`\n[${i + 1}/${recentIterations.length}] Fetching ${iter.id}...`);
      const iterStart = Date.now();

      const details = await gitlabClient.fetchIterationDetails(iter.id);
      const incidents = await gitlabClient.fetchIncidents(iter.startDate, iter.dueDate);

      const iterDuration = Date.now() - iterStart;
      console.log(`  Completed in ${iterDuration}ms - ${details.issues.length} issues, ${details.mergeRequests.length} MRs, ${incidents.length} incidents`);

      sequentialResults.push({ details, incidents });
    }

    const sequentialDuration = Date.now() - sequentialStart;
    console.log(`\n[SEQUENTIAL] Total time: ${sequentialDuration}ms`);
    console.log(`[SEQUENTIAL] Avg per iteration: ${(sequentialDuration / recentIterations.length).toFixed(2)}ms`);

    // PHASE 3: Test PARALLEL fetching (optimized approach)
    console.log('\n\n========== PHASE 3: PARALLEL FETCHING TEST ==========');

    // Clear cache to ensure fair comparison
    gitlabClient._responseCache.clear();

    const parallelStart = Date.now();

    const parallelPromises = recentIterations.map(async (iter, index) => {
      console.log(`\n[PARALLEL ${index + 1}/${recentIterations.length}] Starting ${iter.id}...`);
      const iterStart = Date.now();

      const [details, incidents] = await Promise.all([
        gitlabClient.fetchIterationDetails(iter.id),
        gitlabClient.fetchIncidents(iter.startDate, iter.dueDate)
      ]);

      const iterDuration = Date.now() - iterStart;
      console.log(`[PARALLEL ${index + 1}/${recentIterations.length}] Completed in ${iterDuration}ms - ${details.issues.length} issues, ${details.mergeRequests.length} MRs, ${incidents.length} incidents`);

      return { details, incidents };
    });

    const parallelResults = await Promise.all(parallelPromises);
    const parallelDuration = Date.now() - parallelStart;

    console.log(`\n[PARALLEL] Total time: ${parallelDuration}ms`);
    console.log(`[PARALLEL] Avg per iteration: ${(parallelDuration / recentIterations.length).toFixed(2)}ms`);

    // PHASE 4: Test MetricsService (current production approach)
    console.log('\n\n========== PHASE 4: METRICS SERVICE TEST ==========');

    // Clear cache again
    gitlabClient._responseCache.clear();

    const dataProvider = new GitLabIterationDataProviderInstrumented(gitlabClient);
    const repository = new FileMetricsRepository('./src/data/metrics-perf-test.json');
    const metricsService = new MetricsService(dataProvider, repository);

    const iterationIds = recentIterations.map(iter => iter.id);

    const serviceStart = Date.now();
    const metrics = await metricsService.calculateMultipleMetrics(iterationIds);
    const serviceDuration = Date.now() - serviceStart;

    console.log(`\n[METRICS SERVICE] Total time: ${serviceDuration}ms`);
    console.log(`[METRICS SERVICE] Avg per iteration: ${(serviceDuration / iterationIds.length).toFixed(2)}ms`);
    console.log(`[METRICS SERVICE] Metrics calculated: ${metrics.length}`);

    // Print detailed metrics
    console.log('\nCalculated Metrics Summary:');
    metrics.forEach((m, i) => {
      console.log(`\n  ${i + 1}. ${m.iterationTitle}`);
      console.log(`     Velocity: ${m.velocityPoints} points, ${m.velocityStories} stories`);
      console.log(`     Cycle Time: avg=${m.cycleTimeAvg.toFixed(2)}d, p50=${m.cycleTimeP50.toFixed(2)}d, p90=${m.cycleTimeP90.toFixed(2)}d`);
      console.log(`     Deployment Frequency: ${m.deploymentFrequency.toFixed(2)} per day`);
      console.log(`     Lead Time: avg=${m.leadTimeAvg.toFixed(2)}d, p50=${m.leadTimeP50.toFixed(2)}d, p90=${m.leadTimeP90.toFixed(2)}d`);
      console.log(`     MTTR: ${m.mttrAvg.toFixed(2)}h (${m.incidentCount} incidents)`);
      console.log(`     Change Failure Rate: ${m.changeFailureRate.toFixed(2)}%`);
    });

    // PHASE 5: Performance comparison
    console.log('\n\n========== PERFORMANCE COMPARISON ==========');
    console.log(`Sequential approach: ${sequentialDuration}ms`);
    console.log(`Parallel approach:   ${parallelDuration}ms`);
    console.log(`MetricsService:      ${serviceDuration}ms`);

    const sequentialVsParallel = ((sequentialDuration - parallelDuration) / sequentialDuration * 100);
    const sequentialVsService = ((sequentialDuration - serviceDuration) / sequentialDuration * 100);

    console.log(`\nParallel is ${Math.abs(sequentialVsParallel).toFixed(1)}% ${sequentialVsParallel > 0 ? 'faster' : 'slower'} than sequential`);
    console.log(`MetricsService is ${Math.abs(sequentialVsService).toFixed(1)}% ${sequentialVsService > 0 ? 'faster' : 'slower'} than sequential`);

    // PHASE 6: Print client metrics
    console.log('\n');
    gitlabClient.printMetrics();

    // PHASE 7: Recommendations
    console.log('\n========== RECOMMENDATIONS ==========');

    const cacheHitRate = (gitlabClient.metrics.cacheHits / gitlabClient.metrics.totalQueries) * 100;

    console.log(`\n1. CACHING:`);
    console.log(`   Current hit rate: ${cacheHitRate.toFixed(1)}%`);
    if (cacheHitRate < 30) {
      console.log(`   ⚠️  LOW cache hit rate - consider increasing cache TTL or pre-warming cache`);
    } else if (cacheHitRate > 50) {
      console.log(`   ✅ GOOD cache hit rate - caching is effective`);
    }

    console.log(`\n2. PARALLELIZATION:`);
    if (parallelDuration < sequentialDuration) {
      console.log(`   ✅ Parallel fetching is ${sequentialVsParallel.toFixed(1)}% faster`);
      console.log(`   Recommendation: Ensure all production code uses parallel fetching`);
    } else {
      console.log(`   ⚠️  Parallel fetching is not faster (possible network overhead)`);
    }

    console.log(`\n3. QUERY OPTIMIZATION:`);
    const avgQueryTime = Object.values(gitlabClient.metrics.queryTimes)
      .flat()
      .reduce((a, b) => a + b, 0) / gitlabClient.metrics.totalQueries;
    console.log(`   Average query time: ${avgQueryTime.toFixed(2)}ms`);
    if (avgQueryTime > 1000) {
      console.log(`   ⚠️  HIGH average query time - consider:`);
      console.log(`      - Reducing fields fetched in queries`);
      console.log(`      - Using pagination more efficiently`);
      console.log(`      - Investigating network latency`);
    } else {
      console.log(`   ✅ Query times are reasonable`);
    }

    console.log(`\n4. BOTTLENECKS:`);
    const slowestQuery = Object.entries(gitlabClient.metrics.queryTimes)
      .map(([name, times]) => ({
        name,
        max: Math.max(...times),
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        count: times.length
      }))
      .sort((a, b) => b.avg - a.avg)[0];

    console.log(`   Slowest query: ${slowestQuery.name}`);
    console.log(`   - Average: ${slowestQuery.avg.toFixed(2)}ms`);
    console.log(`   - Max: ${slowestQuery.max.toFixed(2)}ms`);
    console.log(`   - Count: ${slowestQuery.count}`);

    console.log('\n========================================\n');

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
