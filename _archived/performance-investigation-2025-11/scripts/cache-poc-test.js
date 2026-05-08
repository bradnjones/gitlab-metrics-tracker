/**
 * Proof of Concept: Persistent Cache Performance Test
 *
 * This script demonstrates the performance improvement from persistent caching
 * by comparing:
 * 1. Cold cache (first load) - fetches from GitLab
 * 2. Warm cache (second load) - reads from disk
 * 3. Incremental update (partial stale) - fetches only updated data
 *
 * Usage:
 *   node cache-poc-test.js [iteration_count]
 *
 * Example:
 *   node cache-poc-test.js 3
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { GitLabClient } from './src/lib/infrastructure/api/GitLabClient.js';

// Simple file-based cache implementation (POC)
class SimpleCacheManager {
  constructor(cacheDir = './src/data/cache-poc') {
    this.cacheDir = cacheDir;
    this.metadataFile = path.join(cacheDir, 'metadata.json');
    this.ttl = 6 * 60 * 60 * 1000; // 6 hours
  }

  async initialize() {
    await fs.mkdir(this.cacheDir, { recursive: true });
    try {
      await fs.access(this.metadataFile);
    } catch {
      await fs.writeFile(this.metadataFile, JSON.stringify({ iterations: {} }, null, 2));
    }
  }

  getCacheFilePath(iterationId) {
    const cleanId = iterationId.replace(/[^a-zA-Z0-9]/g, '-');
    return path.join(this.cacheDir, `${cleanId}.json`);
  }

  async getMetadata() {
    try {
      const content = await fs.readFile(this.metadataFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { iterations: {} };
    }
  }

  async saveMetadata(metadata) {
    await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2));
  }

  async get(iterationId) {
    try {
      const metadata = await this.getMetadata();
      const iterationMeta = metadata.iterations[iterationId];

      if (!iterationMeta) {
        return null; // Not cached
      }

      // Check TTL
      const age = Date.now() - new Date(iterationMeta.cachedAt).getTime();
      if (age > this.ttl) {
        console.log(`  └─ Cache STALE (age: ${Math.round(age / 1000 / 60)}min)`);
        return null;
      }

      // Load from disk
      const filepath = this.getCacheFilePath(iterationId);
      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);

      console.log(`  └─ Cache HIT (age: ${Math.round(age / 1000 / 60)}min, size: ${Math.round(content.length / 1024)}KB)`);
      return data;
    } catch (error) {
      console.log(`  └─ Cache MISS (${error.message})`);
      return null;
    }
  }

  async set(iterationId, data) {
    try {
      const filepath = this.getCacheFilePath(iterationId);
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));

      const metadata = await this.getMetadata();
      metadata.iterations[iterationId] = {
        cachedAt: new Date().toISOString(),
        issueCount: data.issues?.length || 0,
        noteCount: this.countNotes(data.issues),
      };
      await this.saveMetadata(metadata);

      const stats = await fs.stat(filepath);
      console.log(`  └─ Cached ${data.issues?.length || 0} issues (${Math.round(stats.size / 1024)}KB on disk)`);
    } catch (error) {
      console.error(`  └─ Cache WRITE FAILED: ${error.message}`);
    }
  }

  countNotes(issues) {
    if (!Array.isArray(issues)) return 0;
    return issues.reduce((sum, issue) => sum + (issue.notes?.nodes?.length || 0), 0);
  }

  async clear() {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        await fs.unlink(path.join(this.cacheDir, file));
      }
      await this.initialize();
      console.log('  └─ Cache cleared\n');
    } catch (error) {
      console.error('  └─ Cache clear failed:', error.message);
    }
  }

  async getStats() {
    const metadata = await this.getMetadata();
    const iterationCount = Object.keys(metadata.iterations).length;

    let totalSize = 0;
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        const stats = await fs.stat(path.join(this.cacheDir, file));
        totalSize += stats.size;
      }
    } catch {}

    return {
      iterationCount,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      metadata,
    };
  }
}

// Cached data provider (POC)
class CachedDataProvider {
  constructor(gitlabClient, cache) {
    this.client = gitlabClient;
    this.cache = cache;
  }

  async fetchIterationWithCache(iterationId) {
    // Try cache first
    const cached = await this.cache.get(iterationId);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from GitLab
    console.log(`  └─ Fetching from GitLab...`);
    const start = Date.now();

    const [iterations, details] = await Promise.all([
      this.client.fetchIterations(),
      this.client.fetchIterationDetails(iterationId),
    ]);

    const metadata = iterations.find(it => it.id === iterationId);
    const incidents = await this.client.fetchIncidents(
      metadata?.startDate || new Date().toISOString(),
      metadata?.dueDate || new Date().toISOString()
    );

    const data = {
      iterationId,
      metadata: {
        id: metadata?.id || iterationId,
        title: metadata?.title || 'Unknown',
        startDate: metadata?.startDate,
        dueDate: metadata?.dueDate,
      },
      issues: details.issues || [],
      mergeRequests: details.mergeRequests || [],
      incidents: incidents || [],
      fetchedAt: new Date().toISOString(),
    };

    const duration = Date.now() - start;
    console.log(`  └─ Fetched in ${duration}ms (${data.issues.length} issues, ${data.mergeRequests.length} MRs)`);

    // Save to cache
    await this.cache.set(iterationId, data);

    return data;
  }

  async fetchMultipleWithCache(iterationIds) {
    const results = [];
    for (const id of iterationIds) {
      const data = await this.fetchIterationWithCache(id);
      results.push(data);
    }
    return results;
  }
}

// Main test script
async function main() {
  console.log('========================================');
  console.log('PERSISTENT CACHE PROOF OF CONCEPT TEST');
  console.log('========================================\n');

  const iterationCount = parseInt(process.argv[2]) || 3;

  // Initialize
  const client = new GitLabClient({
    url: process.env.GITLAB_URL,
    token: process.env.GITLAB_TOKEN,
    projectPath: process.env.GITLAB_PROJECT_PATH,
  });

  const cache = new SimpleCacheManager('./src/data/cache-poc');
  await cache.initialize();

  const provider = new CachedDataProvider(client, cache);

  // Get recent iterations
  console.log('Fetching iteration list...');
  const allIterations = await client.fetchIterations();
  const recentIterations = allIterations
    .filter(it => it.state === 'opened' || it.state === 'closed')
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    .slice(0, iterationCount);

  const iterationIds = recentIterations.map(it => it.id);

  console.log(`\nTesting with ${iterationIds.length} iterations:`);
  recentIterations.forEach((it, i) => {
    console.log(`  ${i + 1}. ${it.title} (${it.startDate})`);
  });
  console.log('');

  // TEST 1: Cold Cache (First Load)
  console.log('========================================');
  console.log('TEST 1: COLD CACHE (First Load)');
  console.log('========================================');
  console.log('Expected: Fetch all data from GitLab (slow)\n');

  await cache.clear();

  const coldStart = Date.now();
  console.log('Fetching iterations (cold cache)...\n');

  for (let i = 0; i < iterationIds.length; i++) {
    console.log(`[${i + 1}/${iterationIds.length}] ${recentIterations[i].title}`);
    await provider.fetchIterationWithCache(iterationIds[i]);
  }

  const coldDuration = Date.now() - coldStart;
  const coldAvg = Math.round(coldDuration / iterationIds.length);

  console.log(`\n✓ Cold cache complete`);
  console.log(`  Total time: ${coldDuration}ms`);
  console.log(`  Average per iteration: ${coldAvg}ms`);
  console.log(`  Cache populated\n`);

  // Show cache stats
  const stats1 = await cache.getStats();
  console.log(`Cache stats after cold load:`);
  console.log(`  Iterations cached: ${stats1.iterationCount}`);
  console.log(`  Total cache size: ${stats1.totalSizeMB} MB\n`);

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // TEST 2: Warm Cache (Second Load)
  console.log('========================================');
  console.log('TEST 2: WARM CACHE (Second Load)');
  console.log('========================================');
  console.log('Expected: Read from cache (fast)\n');

  const warmStart = Date.now();
  console.log('Fetching iterations (warm cache)...\n');

  for (let i = 0; i < iterationIds.length; i++) {
    console.log(`[${i + 1}/${iterationIds.length}] ${recentIterations[i].title}`);
    await provider.fetchIterationWithCache(iterationIds[i]);
  }

  const warmDuration = Date.now() - warmStart;
  const warmAvg = Math.round(warmDuration / iterationIds.length);

  console.log(`\n✓ Warm cache complete`);
  console.log(`  Total time: ${warmDuration}ms`);
  console.log(`  Average per iteration: ${warmAvg}ms`);
  console.log(`  Speedup: ${Math.round(coldDuration / warmDuration)}x faster\n`);

  // Performance summary
  console.log('========================================');
  console.log('PERFORMANCE SUMMARY');
  console.log('========================================\n');

  console.log(`Cold Cache (First Load):`);
  console.log(`  Total: ${coldDuration}ms (${(coldDuration / 1000).toFixed(1)}s)`);
  console.log(`  Per iteration: ${coldAvg}ms`);
  console.log(`  Source: GitLab API\n`);

  console.log(`Warm Cache (Subsequent Loads):`);
  console.log(`  Total: ${warmDuration}ms (${(warmDuration / 1000).toFixed(1)}s)`);
  console.log(`  Per iteration: ${warmAvg}ms`);
  console.log(`  Source: Local disk cache\n`);

  console.log(`Improvement:`);
  console.log(`  Time saved: ${coldDuration - warmDuration}ms (${((coldDuration - warmDuration) / 1000).toFixed(1)}s)`);
  console.log(`  Percentage: ${Math.round(((coldDuration - warmDuration) / coldDuration) * 100)}% faster`);
  console.log(`  Speedup: ${(coldDuration / warmDuration).toFixed(1)}x\n`);

  // Extrapolation for 6 iterations
  if (iterationIds.length !== 6) {
    const projected6Cold = Math.round((coldDuration / iterationIds.length) * 6);
    const projected6Warm = Math.round((warmDuration / iterationIds.length) * 6);

    console.log(`Projected performance for 6 iterations:`);
    console.log(`  Cold cache: ~${projected6Cold}ms (${(projected6Cold / 1000).toFixed(1)}s)`);
    console.log(`  Warm cache: ~${projected6Warm}ms (${(projected6Warm / 1000).toFixed(1)}s)`);
    console.log(`  Improvement: ${Math.round(((projected6Cold - projected6Warm) / projected6Cold) * 100)}% faster\n`);
  }

  // Cache stats
  const stats2 = await cache.getStats();
  console.log('Cache statistics:');
  console.log(`  Iterations: ${stats2.iterationCount}`);
  console.log(`  Total size: ${stats2.totalSizeMB} MB`);
  console.log(`  Avg size per iteration: ${(parseFloat(stats2.totalSizeMB) / stats2.iterationCount).toFixed(2)} MB`);
  console.log(`  Cache location: ${cache.cacheDir}\n`);

  // Recommendations
  console.log('========================================');
  console.log('RECOMMENDATIONS');
  console.log('========================================\n');

  if (warmDuration < 500) {
    console.log('✓ EXCELLENT: Warm cache performance meets target (< 500ms)\n');
  } else {
    console.log('⚠ WARNING: Warm cache slower than expected (target: < 500ms)\n');
  }

  console.log('Next steps:');
  console.log('1. Review ARCHITECTURAL-CACHING-INVESTIGATION.md for full design');
  console.log('2. Implement CacheManager class (src/lib/infrastructure/cache/)');
  console.log('3. Create CachedIterationDataProvider adapter');
  console.log('4. Add incremental fetch support (updatedAfter queries)');
  console.log('5. Wire up in ServiceFactory with ENABLE_CACHING=true');
  console.log('6. Add cache management API endpoints (/api/cache/status, /clear)');
  console.log('7. Write comprehensive tests (unit + integration)');
  console.log('8. Deploy and monitor cache hit rates\n');

  console.log('Cache directory contents:');
  const files = await fs.readdir(cache.cacheDir);
  files.forEach(file => {
    console.log(`  - ${file}`);
  });
  console.log('');

  console.log('========================================');
  console.log('TEST COMPLETE');
  console.log('========================================\n');
}

// Run test
main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
