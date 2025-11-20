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

  describe('_calculateSprintDays', () => {
    it('should calculate sprint days correctly (inclusive of start and end)', () => {
      const service = new MetricsService(mockDataProvider);

      // 14-day sprint: Jan 1 to Jan 14
      const days = service._calculateSprintDays('2025-01-01', '2025-01-14');
      expect(days).toBe(14);
    });

    it('should handle single-day sprint', () => {
      const service = new MetricsService(mockDataProvider);

      const days = service._calculateSprintDays('2025-01-01', '2025-01-01');
      expect(days).toBe(1); // Single day = 1 day
    });

    it('should handle cross-month sprint', () => {
      const service = new MetricsService(mockDataProvider);

      // Jan 25 to Feb 7 = 14 days
      const days = service._calculateSprintDays('2025-01-25', '2025-02-07');
      expect(days).toBe(14);
    });
  });

  describe('_calculateDeploymentCount', () => {
    it('should count merged MRs to main branch', () => {
      const service = new MetricsService(mockDataProvider);

      const mergeRequests = [
        { state: 'merged', targetBranch: 'main' },
        { state: 'merged', targetBranch: 'feature' },
        { state: 'open', targetBranch: 'main' }
      ];

      const count = service._calculateDeploymentCount(mergeRequests);
      expect(count).toBe(1); // Only 1 merged to main
    });

    it('should count merged MRs to master branch', () => {
      const service = new MetricsService(mockDataProvider);

      const mergeRequests = [
        { state: 'merged', targetBranch: 'master' },
        { state: 'merged', targetBranch: 'develop' }
      ];

      const count = service._calculateDeploymentCount(mergeRequests);
      expect(count).toBe(1); // Only 1 merged to master
    });

    it('should handle case-insensitive branch names', () => {
      const service = new MetricsService(mockDataProvider);

      const mergeRequests = [
        { state: 'merged', targetBranch: 'MAIN' },
        { state: 'merged', targetBranch: 'Main' },
        { state: 'merged', targetBranch: 'MASTER' }
      ];

      const count = service._calculateDeploymentCount(mergeRequests);
      expect(count).toBe(3); // All should count (case-insensitive)
    });

    it('should handle empty or null mergeRequests', () => {
      const service = new MetricsService(mockDataProvider);

      expect(service._calculateDeploymentCount([])).toBe(0);
      expect(service._calculateDeploymentCount(null)).toBe(0);
      expect(service._calculateDeploymentCount(undefined)).toBe(0);
    });

    it('should handle missing targetBranch property', () => {
      const service = new MetricsService(mockDataProvider);

      const mergeRequests = [
        { state: 'merged' }, // No targetBranch
        { state: 'merged', targetBranch: null }
      ];

      const count = service._calculateDeploymentCount(mergeRequests);
      expect(count).toBe(0); // Should not crash, returns 0
    });
  });

  describe('incident filtering logic', () => {
    beforeEach(() => {
      // Spy on console.log to suppress output and verify branches
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    it('should filter out incidents without changeLink', async () => {
      const iterationId = 'gid://gitlab/Iteration/123';

      mockDataProvider.fetchIterationData.mockResolvedValue({
        ...mockIterationData,
        incidents: [
          {
            iid: 1,
            changeLink: null, // NO changeLink
            changeDate: '2025-01-05',
            createdAt: '2025-01-05'
          },
          {
            iid: 2,
            changeLink: { type: 'MR', url: 'http://gitlab.com/mr/1' },
            changeDate: '2025-01-06',
            createdAt: '2025-01-06'
          }
        ]
      });

      const result = await service.calculateMetrics(iterationId);

      // Should only count incident #2 (has changeLink)
      expect(result.incidentCount).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ Excluding Incident #1: NO changeLink')
      );
    });

    it('should filter out incidents without changeDate', async () => {
      const iterationId = 'gid://gitlab/Iteration/123';

      mockDataProvider.fetchIterationData.mockResolvedValue({
        ...mockIterationData,
        incidents: [
          {
            iid: 1,
            changeLink: { type: 'MR', url: 'http://gitlab.com/mr/1' },
            changeDate: null, // NO changeDate
            createdAt: '2025-01-05'
          },
          {
            iid: 2,
            changeLink: { type: 'Commit', url: 'http://gitlab.com/commit/abc' },
            changeDate: '2025-01-06',
            createdAt: '2025-01-06'
          }
        ]
      });

      const result = await service.calculateMetrics(iterationId);

      // Should only count incident #2 (has changeDate)
      expect(result.incidentCount).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ Excluding Incident #1: has changeLink but NO changeDate')
      );
    });

    it('should filter out incidents with changeDate before iteration', async () => {
      const iterationId = 'gid://gitlab/Iteration/123';

      mockDataProvider.fetchIterationData.mockResolvedValue({
        ...mockIterationData,
        iteration: {
          id: iterationId,
          title: 'Sprint 2025-01',
          startDate: '2025-01-01',
          dueDate: '2025-01-14'
        },
        incidents: [
          {
            iid: 1,
            changeLink: { type: 'MR', url: 'http://gitlab.com/mr/1' },
            changeDate: '2024-12-31', // Before iteration start
            createdAt: '2024-12-31'
          },
          {
            iid: 2,
            changeLink: { type: 'MR', url: 'http://gitlab.com/mr/2' },
            changeDate: '2025-01-05', // Within iteration
            createdAt: '2025-01-05'
          }
        ]
      });

      const result = await service.calculateMetrics(iterationId);

      // Should only count incident #2 (within iteration)
      expect(result.incidentCount).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ Excluding Incident #1: change date 2024-12-31 is OUTSIDE iteration')
      );
    });

    it('should filter out incidents with changeDate after iteration', async () => {
      const iterationId = 'gid://gitlab/Iteration/123';

      mockDataProvider.fetchIterationData.mockResolvedValue({
        ...mockIterationData,
        iteration: {
          id: iterationId,
          title: 'Sprint 2025-01',
          startDate: '2025-01-01',
          dueDate: '2025-01-14'
        },
        incidents: [
          {
            iid: 1,
            changeLink: { type: 'MR', url: 'http://gitlab.com/mr/1' },
            changeDate: '2025-01-15', // After iteration end
            createdAt: '2025-01-15'
          },
          {
            iid: 2,
            changeLink: { type: 'MR', url: 'http://gitlab.com/mr/2' },
            changeDate: '2025-01-10', // Within iteration
            createdAt: '2025-01-10'
          }
        ]
      });

      const result = await service.calculateMetrics(iterationId);

      // Should only count incident #2 (within iteration)
      expect(result.incidentCount).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ Excluding Incident #1: change date 2025-01-15 is OUTSIDE iteration')
      );
    });

    it('should include incidents with changeDate on iteration boundaries', async () => {
      const iterationId = 'gid://gitlab/Iteration/123';

      mockDataProvider.fetchIterationData.mockResolvedValue({
        ...mockIterationData,
        iteration: {
          id: iterationId,
          title: 'Sprint 2025-01',
          startDate: '2025-01-01',
          dueDate: '2025-01-14'
        },
        incidents: [
          {
            iid: 1,
            changeLink: { type: 'MR', url: 'http://gitlab.com/mr/1' },
            changeDate: '2025-01-01', // On start date
            createdAt: '2025-01-01'
          },
          {
            iid: 2,
            changeLink: { type: 'MR', url: 'http://gitlab.com/mr/2' },
            changeDate: '2025-01-14', // On end date
            createdAt: '2025-01-14'
          }
        ]
      });

      const result = await service.calculateMetrics(iterationId);

      // Should count both incidents (boundaries are inclusive)
      expect(result.incidentCount).toBe(2);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Including Incident #1: change date 2025-01-01 is WITHIN iteration')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Including Incident #2: change date 2025-01-14 is WITHIN iteration')
      );
    });

    it('should log incident details with changeLink type and URL', async () => {
      const iterationId = 'gid://gitlab/Iteration/123';

      mockDataProvider.fetchIterationData.mockResolvedValue({
        ...mockIterationData,
        incidents: [
          {
            iid: 1,
            changeLink: { type: 'MR', url: 'http://gitlab.com/mr/123' },
            changeDate: '2025-01-05',
            createdAt: '2025-01-05'
          }
        ]
      });

      await service.calculateMetrics(iterationId);

      // Verify console.log shows changeLink details
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('changeLink: MR http://gitlab.com/mr/123')
      );
    });
  });

  describe('calculateMultipleMetrics error handling', () => {
    it('should throw descriptive error when fetchMultipleIterations fails', async () => {
      const iterationIds = ['gid://gitlab/Iteration/123', 'gid://gitlab/Iteration/124'];
      const dataError = new Error('Network timeout');

      mockDataProvider.fetchMultipleIterations.mockRejectedValue(dataError);

      await expect(service.calculateMultipleMetrics(iterationIds)).rejects.toThrow(
        'Failed to fetch multiple iterations: Network timeout'
      );

      // Verify fetchMultipleIterations was called
      expect(mockDataProvider.fetchMultipleIterations).toHaveBeenCalledWith(iterationIds);
    });
  });

  describe('calculateMultipleMetrics incident filtering', () => {
    beforeEach(() => {
      // Spy on console.log to suppress output and verify branches
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    it('should filter incidents in each iteration of calculateMultipleMetrics', async () => {
      const iterationIds = ['gid://gitlab/Iteration/123', 'gid://gitlab/Iteration/124'];

      mockDataProvider.fetchMultipleIterations.mockResolvedValue([
        {
          issues: [],
          mergeRequests: [],
          pipelines: [],
          incidents: [
            {
              iid: 1,
              changeLink: null, // NO changeLink
              changeDate: '2025-01-05',
              createdAt: '2025-01-05'
            },
            {
              iid: 2,
              changeLink: { type: 'MR', url: 'http://gitlab.com/mr/1' },
              changeDate: '2025-01-06',
              createdAt: '2025-01-06'
            }
          ],
          iteration: {
            id: 'gid://gitlab/Iteration/123',
            title: 'Sprint 1',
            startDate: '2025-01-01',
            dueDate: '2025-01-14'
          }
        },
        {
          issues: [],
          mergeRequests: [],
          pipelines: [],
          incidents: [
            {
              iid: 3,
              changeLink: { type: 'MR', url: 'http://gitlab.com/mr/2' },
              changeDate: null, // NO changeDate
              createdAt: '2025-01-20'
            },
            {
              iid: 4,
              changeLink: { type: 'MR', url: 'http://gitlab.com/mr/3' },
              changeDate: '2025-01-22',
              createdAt: '2025-01-22'
            }
          ],
          iteration: {
            id: 'gid://gitlab/Iteration/124',
            title: 'Sprint 2',
            startDate: '2025-01-15',
            dueDate: '2025-01-28'
          }
        }
      ]);

      const results = await service.calculateMultipleMetrics(iterationIds);

      // Sprint 1: Should exclude incident #1 (no changeLink), include #2
      expect(results[0].incidentCount).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ Excluding Incident #1: NO changeLink')
      );

      // Sprint 2: Should exclude incident #3 (no changeDate), include #4
      expect(results[1].incidentCount).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ Excluding Incident #3: has changeLink but NO changeDate')
      );
    });

    it('should filter incidents by date range in calculateMultipleMetrics', async () => {
      const iterationIds = ['gid://gitlab/Iteration/123', 'gid://gitlab/Iteration/124'];

      mockDataProvider.fetchMultipleIterations.mockResolvedValue([
        {
          issues: [],
          mergeRequests: [],
          pipelines: [],
          incidents: [
            {
              iid: 1,
              changeLink: { type: 'MR', url: 'http://gitlab.com/mr/1' },
              changeDate: '2024-12-31', // Before iteration
              createdAt: '2024-12-31'
            },
            {
              iid: 2,
              changeLink: { type: 'MR', url: 'http://gitlab.com/mr/2' },
              changeDate: '2025-01-05', // Within iteration
              createdAt: '2025-01-05'
            }
          ],
          iteration: {
            id: 'gid://gitlab/Iteration/123',
            title: 'Sprint 1',
            startDate: '2025-01-01',
            dueDate: '2025-01-14'
          }
        },
        {
          issues: [],
          mergeRequests: [],
          pipelines: [],
          incidents: [
            {
              iid: 3,
              changeLink: { type: 'MR', url: 'http://gitlab.com/mr/3' },
              changeDate: '2025-01-29', // After iteration
              createdAt: '2025-01-29'
            },
            {
              iid: 4,
              changeLink: { type: 'MR', url: 'http://gitlab.com/mr/4' },
              changeDate: '2025-01-20', // Within iteration
              createdAt: '2025-01-20'
            }
          ],
          iteration: {
            id: 'gid://gitlab/Iteration/124',
            title: 'Sprint 2',
            startDate: '2025-01-15',
            dueDate: '2025-01-28'
          }
        }
      ]);

      const results = await service.calculateMultipleMetrics(iterationIds);

      // Sprint 1: Should exclude #1 (before), include #2
      expect(results[0].incidentCount).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ Excluding Incident #1: change date 2024-12-31 is OUTSIDE iteration')
      );

      // Sprint 2: Should exclude #3 (after), include #4
      expect(results[1].incidentCount).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ Excluding Incident #3: change date 2025-01-29 is OUTSIDE iteration')
      );
    });

    it('should log incident details for each iteration in calculateMultipleMetrics', async () => {
      const iterationIds = ['gid://gitlab/Iteration/123'];

      mockDataProvider.fetchMultipleIterations.mockResolvedValue([
        {
          issues: [],
          mergeRequests: [],
          pipelines: [],
          incidents: [
            {
              iid: 1,
              changeLink: { type: 'Commit', url: 'http://gitlab.com/commit/abc123' },
              changeDate: '2025-01-05',
              createdAt: '2025-01-05'
            }
          ],
          iteration: {
            id: 'gid://gitlab/Iteration/123',
            title: 'Sprint 1',
            startDate: '2025-01-01',
            dueDate: '2025-01-14'
          }
        }
      ]);

      await service.calculateMultipleMetrics(iterationIds);

      // Verify console.log shows incident details
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Incident #1:'));
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('changeLink: Commit http://gitlab.com/commit/abc123')
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
