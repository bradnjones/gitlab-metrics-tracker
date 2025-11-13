import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MetricsService } from '../../../src/lib/core/services/MetricsService.js';
import { Metric } from '../../../src/lib/core/entities/Metric.js';
import { VelocityCalculator } from '../../../src/lib/core/services/VelocityCalculator.js';
import { CycleTimeCalculator } from '../../../src/lib/core/services/CycleTimeCalculator.js';
import { DeploymentFrequencyCalculator } from '../../../src/lib/core/services/DeploymentFrequencyCalculator.js';
import { LeadTimeCalculator } from '../../../src/lib/core/services/LeadTimeCalculator.js';
import { IncidentAnalyzer } from '../../../src/lib/core/services/IncidentAnalyzer.js';

// Mock all calculator modules

describe('MetricsService', () => {
  let service;
  let mockDataProvider;
  let mockIterationData;

  beforeEach(() => {
    // Setup mock iteration data
    mockIterationData = {
      issues: [
        {
          id: 'gid://gitlab/Issue/1',
          title: 'Test Issue',
          state: 'closed',
          createdAt: '2025-01-02',
          closedAt: '2025-01-10',
          weight: 5,
        },
      ],
      mergeRequests: [
        {
          id: 'gid://gitlab/MergeRequest/1',
          title: 'Test MR',
          mergedAt: '2025-01-09',
          commits: {
            nodes: [{ committedDate: '2025-01-08' }],
          },
        },
      ],
      pipelines: [],
      incidents: [],
      iteration: {
        id: 'gid://gitlab/Iteration/123',
        title: 'Sprint 2025-01',
        startDate: '2025-01-01',
        dueDate: '2025-01-14',
      },
    };

    // Setup data provider mock (Core interface, not Infrastructure)
    mockDataProvider = {
      fetchIterationData: jest.fn().mockResolvedValue(mockIterationData),
      fetchMultipleIterations: jest.fn().mockResolvedValue([mockIterationData]),
    };

    // Setup calculator mocks to return expected values
    VelocityCalculator.calculate = jest.fn().mockReturnValue({ points: 42, stories: 5 });
    CycleTimeCalculator.calculate = jest.fn().mockReturnValue({ avg: 3.5, p50: 3.0, p90: 5.0 });
    DeploymentFrequencyCalculator.calculate = jest.fn().mockReturnValue(2.5);
    LeadTimeCalculator.calculate = jest.fn().mockReturnValue({ avg: 2.0, p50: 1.5, p90: 3.0 });
    IncidentAnalyzer.calculateMTTR = jest.fn().mockReturnValue(2.5);

    // Create service instance with Core interface mock (no repository - see ADR 001)
    service = new MetricsService(mockDataProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateMetrics', () => {
    it('should orchestrate all calculators and return aggregated results', async () => {
      const iterationId = 'gid://gitlab/Iteration/123';

      const result = await service.calculateMetrics(iterationId);

      // Verify data provider called to fetch iteration data (Core interface, not Infrastructure)
      expect(mockDataProvider.fetchIterationData).toHaveBeenCalledWith(iterationId);

      // Verify all calculators called with correct data
      expect(VelocityCalculator.calculate).toHaveBeenCalledWith(mockIterationData.issues);
      expect(CycleTimeCalculator.calculate).toHaveBeenCalledWith(mockIterationData.issues);
      expect(LeadTimeCalculator.calculate).toHaveBeenCalled(); // Will verify MRs passed

      // Verify results structure contains all metrics (as JSON, not entity)
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          iterationId: expect.any(String),
          iterationTitle: expect.any(String),
          startDate: expect.any(String),
          endDate: expect.any(String),
          velocityPoints: 42,
          velocityStories: 5,
          cycleTimeAvg: 3.5,
          cycleTimeP50: 3.0,
          cycleTimeP90: 5.0,
          deploymentFrequency: 2.5,
          leadTimeAvg: 2.0,
          leadTimeP50: 1.5,
          leadTimeP90: 3.0,
          mttrAvg: 2.5,
          issueCount: expect.any(Number),
          createdAt: expect.any(String),
        })
      );
    });

    it('should throw descriptive error when data provider fails', async () => {
      const iterationId = 'gid://gitlab/Iteration/456';
      const dataError = new Error('Failed to fetch iteration data: 404 Not Found');

      // Mock data provider to throw error
      mockDataProvider.fetchIterationData.mockRejectedValue(dataError);

      // Expect method to throw with descriptive error message
      await expect(service.calculateMetrics(iterationId)).rejects.toThrow(
        `Failed to fetch iteration data for ${iterationId}`
      );

      // Verify calculators were NOT called when fetch fails
      expect(VelocityCalculator.calculate).not.toHaveBeenCalled();
      expect(CycleTimeCalculator.calculate).not.toHaveBeenCalled();
    });

    it('should handle empty iteration data gracefully', async () => {
      const iterationId = 'gid://gitlab/Iteration/789';

      // Mock data provider to return empty data
      mockDataProvider.fetchIterationData.mockResolvedValue({
        issues: [],
        mergeRequests: [],
        pipelines: [],
        incidents: [],
        iteration: {
          id: iterationId,
          title: 'Empty Sprint',
          startDate: '2025-01-01',
          dueDate: '2025-01-14',
        },
      });

      // Mock calculators to return zero/empty results for empty data
      VelocityCalculator.calculate.mockReturnValue({ points: 0, stories: 0 });
      CycleTimeCalculator.calculate.mockReturnValue({ avg: 0, p50: 0, p90: 0 });
      DeploymentFrequencyCalculator.calculate.mockReturnValue(0);
      LeadTimeCalculator.calculate.mockReturnValue({ avg: 0, p50: 0, p90: 0 });
      IncidentAnalyzer.calculateMTTR.mockReturnValue(0);

      const result = await service.calculateMetrics(iterationId);

      // Verify method does NOT throw error for empty data
      expect(result).toBeDefined();

      // Verify all calculators still called (with empty arrays)
      expect(VelocityCalculator.calculate).toHaveBeenCalledWith([]);
      expect(CycleTimeCalculator.calculate).toHaveBeenCalledWith([]);

      // Verify results have proper structure with zero values
      expect(result).toEqual(
        expect.objectContaining({
          velocityPoints: 0,
          velocityStories: 0,
          cycleTimeAvg: 0,
          cycleTimeP50: 0,
          cycleTimeP90: 0,
          deploymentFrequency: 0,
          leadTimeAvg: 0,
          leadTimeP50: 0,
          leadTimeP90: 0,
          mttrAvg: 0,
        })
      );
    });
  });

  describe('calculateMultipleMetrics', () => {
    // NOTE: Metrics persistence removed (see ADR 001)
    // These tests removed as repository.save() no longer called:
    // - "should persist results via repository after calculation"
    // - "should save a proper Metric entity with toJSON method to repository"

    it('should calculate metrics for multiple iterations efficiently', async () => {
      const iterationIds = [
        'gid://gitlab/Iteration/123',
        'gid://gitlab/Iteration/124',
        'gid://gitlab/Iteration/125'
      ];

      // Mock data provider to return data for all iterations
      mockDataProvider.fetchMultipleIterations.mockResolvedValue([
        {
          issues: [],
          mergeRequests: [],
          pipelines: [],
          incidents: [],
          iteration: {
            id: 'gid://gitlab/Iteration/123',
            title: 'Sprint 1',
            startDate: '2025-01-01',
            dueDate: '2025-01-14',
          },
        },
        {
          issues: [],
          mergeRequests: [],
          pipelines: [],
          incidents: [],
          iteration: {
            id: 'gid://gitlab/Iteration/124',
            title: 'Sprint 2',
            startDate: '2025-01-15',
            dueDate: '2025-01-28',
          },
        },
        {
          issues: [],
          mergeRequests: [],
          pipelines: [],
          incidents: [],
          iteration: {
            id: 'gid://gitlab/Iteration/125',
            title: 'Sprint 3',
            startDate: '2025-01-29',
            dueDate: '2025-02-11',
          },
        }
      ]);

      const results = await service.calculateMultipleMetrics(iterationIds);

      // Verify we get results for all iterations
      expect(results).toHaveLength(3);
      expect(results[0].iterationId).toBe('gid://gitlab/Iteration/123');
      expect(results[1].iterationId).toBe('gid://gitlab/Iteration/124');
      expect(results[2].iterationId).toBe('gid://gitlab/Iteration/125');

      // Verify fetchMultipleIterations was called once (batch operation)
      expect(mockDataProvider.fetchMultipleIterations).toHaveBeenCalledTimes(1);
      expect(mockDataProvider.fetchMultipleIterations).toHaveBeenCalledWith(iterationIds);
    });

    it('should return JSON representation of metrics, not Metric entity', async () => {
      // Verify the service returns plain object (JSON), not Metric entity
      const iterationId = 'gid://gitlab/Iteration/123';

      const result = await service.calculateMetrics(iterationId);

      // Result should be plain object, not Metric instance
      expect(result).not.toBeInstanceOf(Metric);

      // Result should have all metric fields
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          iterationId: 'gid://gitlab/Iteration/123',
          velocityPoints: 42,
          velocityStories: 5,
        })
      );

      // Result should be JSON-serializable
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should call DORA calculators with correct parameters (MRs and sprint days)', async () => {
      // TDD: Verify DeploymentFrequency and LeadTime calculators receive correct data
      const iterationId = 'gid://gitlab/Iteration/123';

      await service.calculateMetrics(iterationId);

      // Verify DeploymentFrequencyCalculator called with mergeRequests and calculated sprint days
      expect(DeploymentFrequencyCalculator.calculate).toHaveBeenCalledWith(
        mockIterationData.mergeRequests,  // Should pass MRs, not empty array
        14  // Sprint days: 2025-01-01 to 2025-01-14 = 14 days (end - start + 1)
      );

      // Verify LeadTimeCalculator called with mergeRequests
      expect(LeadTimeCalculator.calculate).toHaveBeenCalledWith(
        mockIterationData.mergeRequests  // Should pass MRs, not empty array
      );
    });
  });
});
