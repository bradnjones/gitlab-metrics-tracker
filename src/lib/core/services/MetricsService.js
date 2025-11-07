/**
 * Metrics Service - Orchestrates all metric calculators
 * Coordinates data fetching, calculation, and persistence
 *
 * @module core/services/MetricsService
 */

import { VelocityCalculator } from './VelocityCalculator.js';
import { ThroughputCalculator } from './ThroughputCalculator.js';
import { CycleTimeCalculator } from './CycleTimeCalculator.js';
import { DeploymentFrequencyCalculator } from './DeploymentFrequencyCalculator.js';
import { LeadTimeCalculator } from './LeadTimeCalculator.js';
import { IncidentAnalyzer } from './IncidentAnalyzer.js';

/**
 * Calculated sprint metrics
 * @typedef {Object} CalculatedMetrics
 * @property {number} velocityPoints - Story points completed
 * @property {number} velocityStories - Stories completed
 * @property {number} throughput - Issues closed
 * @property {number} cycleTimeAvg - Average cycle time (days)
 * @property {number} cycleTimeP50 - Median cycle time (days)
 * @property {number} cycleTimeP90 - 90th percentile cycle time (days)
 * @property {number} deploymentFrequency - Deployments per day
 * @property {number} leadTimeAvg - Average lead time (days)
 * @property {number} leadTimeP50 - Median lead time (days)
 * @property {number} leadTimeP90 - 90th percentile lead time (days)
 * @property {number} mttrAvg - Mean time to recovery (hours)
 */

/**
 * MetricsService - Orchestration service for sprint metrics calculation
 *
 * Following Clean Architecture:
 * - Depends on IIterationDataProvider (Core interface), not GitLabClient (Infrastructure)
 * - Depends on IMetricsRepository (Core interface)
 * - Pure business logic orchestration
 */
export class MetricsService {
  /**
   * Create a MetricsService instance
   *
   * @param {Object} dataProvider - IIterationDataProvider implementation for data fetching
   * @param {Object} metricsRepository - IMetricsRepository implementation for persistence
   */
  constructor(dataProvider, metricsRepository) {
    this.dataProvider = dataProvider;
    this.metricsRepository = metricsRepository;
  }

  /**
   * Calculate all metrics for a given iteration
   *
   * @param {string} iterationId - Iteration identifier
   * @returns {Promise<CalculatedMetrics>} Calculated metrics
   * @throws {Error} If data fetching fails
   */
  async calculateMetrics(iterationId) {
    // Fetch iteration data via abstraction (not directly from Infrastructure)
    let iterationData;
    try {
      iterationData = await this.dataProvider.fetchIterationData(iterationId);
    } catch (error) {
      throw new Error(`Failed to fetch iteration data for ${iterationId}: ${error.message}`);
    }

    // Calculate velocity (points and stories)
    const velocity = VelocityCalculator.calculate(iterationData.issues);

    // Calculate throughput (issues closed)
    const throughput = ThroughputCalculator.calculate(iterationData.issues);

    // Calculate cycle time (avg, p50, p90)
    const cycleTime = CycleTimeCalculator.calculate(iterationData.issues);

    // Calculate deployment frequency (requires pipelines - mock for now)
    const deploymentFrequency = DeploymentFrequencyCalculator.calculate([], 14);

    // Calculate lead time (avg, p50, p90) - requires merge requests
    const leadTime = LeadTimeCalculator.calculate([]);

    // Calculate MTTR (requires incidents)
    const mttr = IncidentAnalyzer.calculateMTTR([]);

    // Aggregate all results
    const results = {
      velocityPoints: velocity.points,
      velocityStories: velocity.stories,
      throughput,
      cycleTimeAvg: cycleTime.avg,
      cycleTimeP50: cycleTime.p50,
      cycleTimeP90: cycleTime.p90,
      deploymentFrequency,
      leadTimeAvg: leadTime.avg,
      leadTimeP50: leadTime.p50,
      leadTimeP90: leadTime.p90,
      mttrAvg: mttr,
    };

    // Persist results via repository
    await this.metricsRepository.save(results);

    return results;
  }
}
