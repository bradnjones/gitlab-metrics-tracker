import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MetricsService } from '../../../src/lib/core/services/MetricsService.js';
import { VelocityCalculator } from '../../../src/lib/core/services/VelocityCalculator.js';
import { ThroughputCalculator } from '../../../src/lib/core/services/ThroughputCalculator.js';
import { CycleTimeCalculator } from '../../../src/lib/core/services/CycleTimeCalculator.js';
import { DeploymentFrequencyCalculator } from '../../../src/lib/core/services/DeploymentFrequencyCalculator.js';
import { LeadTimeCalculator } from '../../../src/lib/core/services/LeadTimeCalculator.js';
import { IncidentAnalyzer } from '../../../src/lib/core/services/IncidentAnalyzer.js';

// Mock all calculator modules
jest.mock('../../../src/lib/core/services/VelocityCalculator.js');
jest.mock('../../../src/lib/core/services/ThroughputCalculator.js');
jest.mock('../../../src/lib/core/services/CycleTimeCalculator.js');
jest.mock('../../../src/lib/core/services/DeploymentFrequencyCalculator.js');
jest.mock('../../../src/lib/core/services/LeadTimeCalculator.js');
jest.mock('../../../src/lib/core/services/IncidentAnalyzer.js');

describe('MetricsService', () => {
  let service;
  let mockDataProvider;
  let mockRepository;
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
      },
    };

    // Setup data provider mock (Core interface, not Infrastructure)
    mockDataProvider = {
      fetchIterationData: jest.fn().mockResolvedValue(mockIterationData),
    };

    // Setup repository mock
    mockRepository = {
      save: jest.fn().mockResolvedValue({ id: '123', saved: true }),
    };

    // Setup calculator mocks to return expected values
    VelocityCalculator.calculate = jest.fn().mockReturnValue({ points: 42, stories: 5 });
    ThroughputCalculator.calculate = jest.fn().mockReturnValue(15);
    CycleTimeCalculator.calculate = jest.fn().mockReturnValue({ avg: 3.5, p50: 3.0, p90: 5.0 });
    DeploymentFrequencyCalculator.calculate = jest.fn().mockReturnValue(2.5);
    LeadTimeCalculator.calculate = jest.fn().mockReturnValue({ avg: 2.0, p50: 1.5, p90: 3.0 });
    IncidentAnalyzer.calculateMTTR = jest.fn().mockReturnValue(2.5);

    // Create service instance with Core interface mocks
    service = new MetricsService(mockDataProvider, mockRepository);
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
      expect(ThroughputCalculator.calculate).toHaveBeenCalledWith(mockIterationData.issues);
      expect(CycleTimeCalculator.calculate).toHaveBeenCalledWith(mockIterationData.issues);
      expect(LeadTimeCalculator.calculate).toHaveBeenCalled(); // Will verify MRs passed

      // Verify results structure contains all metrics
      expect(result).toEqual({
        velocityPoints: 42,
        velocityStories: 5,
        throughput: 15,
        cycleTimeAvg: 3.5,
        cycleTimeP50: 3.0,
        cycleTimeP90: 5.0,
        deploymentFrequency: 2.5,
        leadTimeAvg: 2.0,
        leadTimeP50: 1.5,
        leadTimeP90: 3.0,
        mttrAvg: 2.5,
      });
    });

    it('should persist results via repository after calculation', async () => {
      const iterationId = 'gid://gitlab/Iteration/123';

      const result = await service.calculateMetrics(iterationId);

      // Verify repository.save() was called AFTER calculations
      expect(mockRepository.save).toHaveBeenCalledTimes(1);

      // Verify save() received the calculated results
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          velocityPoints: 42,
          velocityStories: 5,
          throughput: 15,
        })
      );

      // Verify method still returns the results
      expect(result).toEqual(
        expect.objectContaining({
          velocityPoints: 42,
          velocityStories: 5,
          throughput: 15,
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
      expect(ThroughputCalculator.calculate).not.toHaveBeenCalled();
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
        iteration: { id: iterationId },
      });

      // Mock calculators to return zero/empty results for empty data
      VelocityCalculator.calculate.mockReturnValue({ points: 0, stories: 0 });
      ThroughputCalculator.calculate.mockReturnValue(0);
      CycleTimeCalculator.calculate.mockReturnValue({ avg: 0, p50: 0, p90: 0 });
      DeploymentFrequencyCalculator.calculate.mockReturnValue(0);
      LeadTimeCalculator.calculate.mockReturnValue({ avg: 0, p50: 0, p90: 0 });
      IncidentAnalyzer.calculateMTTR.mockReturnValue(0);

      const result = await service.calculateMetrics(iterationId);

      // Verify method does NOT throw error for empty data
      expect(result).toBeDefined();

      // Verify all calculators still called (with empty arrays)
      expect(VelocityCalculator.calculate).toHaveBeenCalledWith([]);
      expect(ThroughputCalculator.calculate).toHaveBeenCalledWith([]);
      expect(CycleTimeCalculator.calculate).toHaveBeenCalledWith([]);

      // Verify results have proper structure with zero values
      expect(result).toEqual({
        velocityPoints: 0,
        velocityStories: 0,
        throughput: 0,
        cycleTimeAvg: 0,
        cycleTimeP50: 0,
        cycleTimeP90: 0,
        deploymentFrequency: 0,
        leadTimeAvg: 0,
        leadTimeP50: 0,
        leadTimeP90: 0,
        mttrAvg: 0,
      });

      // Verify repository.save() still called (empty sprint is valid data)
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
