/**
 * Metrics Service - Orchestrates all metric calculators
 * Coordinates data fetching, calculation, and persistence
 *
 * @module core/services/MetricsService
 */

import { VelocityCalculator } from './VelocityCalculator.js';
import { CycleTimeCalculator } from './CycleTimeCalculator.js';
import { DeploymentFrequencyCalculator } from './DeploymentFrequencyCalculator.js';
import { LeadTimeCalculator } from './LeadTimeCalculator.js';
import { IncidentAnalyzer } from './IncidentAnalyzer.js';
import { ChangeFailureRateCalculator } from './ChangeFailureRateCalculator.js';
import { Metric } from '../entities/Metric.js';

/**
 * Calculated sprint metrics
 * @typedef {Object} CalculatedMetrics
 * @property {number} velocityPoints - Story points completed
 * @property {number} velocityStories - Stories completed
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
 * - Calculates metrics on-demand, does not persist (see ADR 001)
 * - Pure business logic orchestration
 */
export class MetricsService {
  /**
   * Create a MetricsService instance
   *
   * @param {Object} dataProvider - IIterationDataProvider implementation for data fetching
   * @param {import('../interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional, falls back to console)
   */
  constructor(dataProvider, logger = null) {
    this.dataProvider = dataProvider;
    this.logger = logger;
  }

  /**
   * Calculate sprint duration in days from start and end dates
   * @private
   *
   * @param {string} startDate - ISO date string (e.g., '2025-01-01')
   * @param {string} endDate - ISO date string (e.g., '2025-01-14')
   * @returns {number} Number of days (inclusive of start and end days)
   */
  _calculateSprintDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  }

  /**
   * Calculate deployment count from merge requests
   * Counts merged MRs to main or master branches
   * @private
   *
   * @param {Array<Object>} mergeRequests - Merge request data
   * @returns {number} Number of deployments
   */
  _calculateDeploymentCount(mergeRequests) {
    const deployments = (mergeRequests || []).filter((mr) => {
      const targetBranch = mr.targetBranch?.toLowerCase();
      return (
        mr.state === 'merged' &&
        (targetBranch === 'main' || targetBranch === 'master')
      );
    });
    return deployments.length;
  }

  /**
   * Calculate metrics from iteration data.
   * Shared logic used by both single and batch calculations.
   *
   * @private
   * @param {Object} iterationData - Iteration data with issues, MRs, pipelines, incidents
   * @param {string} iterationId - Iteration identifier
   * @returns {Object} Calculated metrics as plain object
   */
  _calculateMetricsFromData(iterationData, iterationId) {
    // Calculate velocity (points and stories)
    const velocity = VelocityCalculator.calculate(iterationData.issues);

    // Calculate cycle time (avg, p50, p90)
    const cycleTime = CycleTimeCalculator.calculate(iterationData.issues);

    // Calculate sprint duration in days (for DORA metrics)
    const sprintDays = this._calculateSprintDays(
      iterationData.iteration.startDate,
      iterationData.iteration.dueDate
    );

    // Calculate deployment frequency (DORA metric: deployments per day)
    const deploymentFrequency = DeploymentFrequencyCalculator.calculate(
      iterationData.mergeRequests,
      sprintDays
    );

    // Calculate lead time (DORA metric: commit to production)
    const leadTime = LeadTimeCalculator.calculate(iterationData.mergeRequests);

    // Calculate deployment count (merged MRs to main/master)
    const deploymentCount = this._calculateDeploymentCount(iterationData.mergeRequests);

    const iterationIncidents = iterationData.incidents || [];

    if (this.logger) {
      this.logger.debug('Incidents for iteration', {
        iterationTitle: iterationData.iteration.title,
        count: iterationIncidents.length
      });
    }

    // MTTR: mean resolution time across all closed incidents in the iteration window
    const mttr = IncidentAnalyzer.calculateMTTR(iterationIncidents);

    // CFR: incidents / deployments over the same period (standard DORA definition)
    const changeFailureRate = ChangeFailureRateCalculator.calculate(
      iterationIncidents,
      deploymentCount
    );

    // Create Metric entity
    const metric = new Metric({
      iterationId,
      iterationTitle: iterationData.iteration.title,
      startDate: iterationData.iteration.startDate,
      endDate: iterationData.iteration.dueDate,
      velocityPoints: velocity.points,
      velocityStories: velocity.stories,
      cycleTimeAvg: cycleTime.avg,
      cycleTimeP50: cycleTime.p50,
      cycleTimeP90: cycleTime.p90,
      deploymentFrequency,
      leadTimeAvg: leadTime.avg,
      leadTimeP50: leadTime.p50,
      leadTimeP90: leadTime.p90,
      mttrAvg: mttr,
      changeFailureRate,
      issueCount: iterationData.issues.length,
      mrCount: (iterationData.mergeRequests || []).filter(mr => mr.state === 'merged').length,
      deploymentCount,
      incidentCount: iterationIncidents.length,
      rawData: {
        issues: iterationData.issues,
        mergeRequests: iterationData.mergeRequests || [],
        incidents: iterationIncidents,
        pipelines: iterationData.pipelines || [],
        iteration: iterationData.iteration
      }
    });

    // Return plain object (not persisted per ADR 001)
    return metric.toJSON();
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

    // Delegate to shared calculation method
    return this._calculateMetricsFromData(iterationData, iterationId);
  }

  /**
   * Calculate metrics for multiple iterations efficiently in batch
   * Optimized for performance by using batch data fetching
   *
   * @param {Array<string>} iterationIds - Array of iteration identifiers
   * @returns {Promise<Array<CalculatedMetrics>>} Array of calculated metrics in same order
   * @throws {Error} If data fetching fails
   */
  async calculateMultipleMetrics(iterationIds) {
    // Fetch all iteration data in one efficient batch
    let allIterationData;
    try {
      allIterationData = await this.dataProvider.fetchMultipleIterations(iterationIds);
    } catch (error) {
      throw new Error(`Failed to fetch multiple iterations: ${error.message}`);
    }

    // Calculate metrics for each iteration using shared method
    // Map maintains same order as input iterationIds
    return allIterationData.map((iterationData, index) => {
      const iterationId = iterationIds[index];
      return this._calculateMetricsFromData(iterationData, iterationId);
    });
  }
}
