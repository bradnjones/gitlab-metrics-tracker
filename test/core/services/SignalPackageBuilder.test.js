import { describe, it, expect } from '@jest/globals';
import { SignalPackageBuilder } from '../../../src/lib/core/services/SignalPackageBuilder.js';
import { Metric } from '../../../src/lib/core/entities/Metric.js';
import { Annotation } from '../../../src/lib/core/entities/Annotation.js';

/**
 * Build a minimal Metric entity for testing.
 * @param {Partial<Object>} overrides
 * @returns {Metric}
 */
function makeMetric(overrides = {}) {
  return new Metric({
    iterationId: overrides.iterationId ?? 'iter-1',
    iterationTitle: overrides.iterationTitle ?? 'Sprint 1',
    startDate: overrides.startDate ?? '2025-01-01',
    endDate: overrides.endDate ?? '2025-01-14',
    velocityPoints: overrides.velocityPoints ?? 30,
    velocityStories: overrides.velocityStories ?? 5,
    cycleTimeAvg: overrides.cycleTimeAvg ?? 3,
    cycleTimeP50: overrides.cycleTimeP50 ?? 2.5,
    cycleTimeP90: overrides.cycleTimeP90 ?? 6,
    deploymentFrequency: overrides.deploymentFrequency ?? 0.5,
    leadTimeAvg: overrides.leadTimeAvg ?? 4,
    leadTimeP50: overrides.leadTimeP50 ?? 3,
    leadTimeP90: overrides.leadTimeP90 ?? 8,
    mttrAvg: overrides.mttrAvg ?? 2,
    changeFailureRate: overrides.changeFailureRate ?? 10,
    issueCount: overrides.issueCount ?? 10,
    mrCount: overrides.mrCount ?? 4,
    deploymentCount: overrides.deploymentCount ?? 3,
    incidentCount: overrides.incidentCount ?? 1,
    rawData: {}
  });
}

/**
 * Build a minimal Annotation entity for testing.
 * @param {Partial<Object>} overrides
 * @returns {Annotation}
 */
function makeAnnotation(overrides = {}) {
  return new Annotation({
    id: overrides.id ?? 'ann-1',
    date: overrides.date ?? '2025-02-01',
    title: overrides.title ?? 'Team change',
    description: overrides.description ?? 'Added senior engineer',
    eventType: overrides.eventType ?? 'Team',
    impact: overrides.impact ?? 'Positive',
    affectedMetrics: overrides.affectedMetrics ?? ['velocity']
  });
}

describe('SignalPackageBuilder', () => {
  describe('build()', () => {
    it('computes correct mean, stddev, and CV for a velocity series', () => {
      // Hand-computed: values [30, 35, 40, 28, 38]
      // mean = 34.2, population stddev ≈ 4.578, CV ≈ 13.38%
      const metrics = [
        makeMetric({ iterationId: 's1', endDate: '2025-01-14', velocityPoints: 30 }),
        makeMetric({ iterationId: 's2', endDate: '2025-01-28', velocityPoints: 35 }),
        makeMetric({ iterationId: 's3', endDate: '2025-02-11', velocityPoints: 40 }),
        makeMetric({ iterationId: 's4', endDate: '2025-02-25', velocityPoints: 28 }),
        makeMetric({ iterationId: 's5', endDate: '2025-03-11', velocityPoints: 38 }),
      ];

      const pkg = SignalPackageBuilder.build({ metrics, annotations: [] });

      const { summary } = pkg.metrics.velocity;
      expect(summary.mean).toBeCloseTo(34.2, 1);
      expect(summary.stddev).toBeCloseTo(4.578, 1);
      expect(summary.cv).toBeCloseTo(13.38, 1);
      expect(summary.ucl).toBeCloseTo(34.2 + 3 * 4.578, 1);
      expect(summary.lcl).toBeCloseTo(34.2 - 3 * 4.578, 1);
    });

    it('sets summary.confidence to "low" when fewer than 5 iterations provided', () => {
      const metrics = [
        makeMetric({ iterationId: 's1' }),
        makeMetric({ iterationId: 's2' }),
        makeMetric({ iterationId: 's3' }),
        makeMetric({ iterationId: 's4' }),
      ];

      const pkg = SignalPackageBuilder.build({ metrics, annotations: [] });

      expect(pkg.metrics.velocity.summary.confidence).toBe('low');
    });

    it('sets summary.confidence to "high" when 5 or more iterations provided', () => {
      const metrics = [
        makeMetric({ iterationId: 's1' }),
        makeMetric({ iterationId: 's2' }),
        makeMetric({ iterationId: 's3' }),
        makeMetric({ iterationId: 's4' }),
        makeMetric({ iterationId: 's5' }),
      ];

      const pkg = SignalPackageBuilder.build({ metrics, annotations: [] });

      expect(pkg.metrics.velocity.summary.confidence).toBe('high');
    });

    it('computes linear regression trend classification for a rising series', () => {
      // velocityPoints rising monotonically → slope > 0 → "improving" (higherIsBetter: true)
      const metrics = [
        makeMetric({ iterationId: 's1', endDate: '2025-01-14', velocityPoints: 20 }),
        makeMetric({ iterationId: 's2', endDate: '2025-01-28', velocityPoints: 25 }),
        makeMetric({ iterationId: 's3', endDate: '2025-02-11', velocityPoints: 30 }),
        makeMetric({ iterationId: 's4', endDate: '2025-02-25', velocityPoints: 35 }),
        makeMetric({ iterationId: 's5', endDate: '2025-03-11', velocityPoints: 40 }),
      ];

      const pkg = SignalPackageBuilder.build({ metrics, annotations: [] });

      const { trend } = pkg.metrics.velocity;
      expect(trend.slope).toBeGreaterThan(0);
      expect(trend.classification).toBe('improving');
      expect(typeof trend.r2).toBe('number');
      expect(typeof trend.intercept).toBe('number');
    });

    it('computes recentVsHistorical delta using last 3 iterations vs overall mean', () => {
      // Values [10, 10, 10, 40, 40, 40]: last 3 mean = 40, overall mean = 25
      const metrics = [
        makeMetric({ iterationId: 's1', endDate: '2025-01-01', velocityPoints: 10 }),
        makeMetric({ iterationId: 's2', endDate: '2025-01-15', velocityPoints: 10 }),
        makeMetric({ iterationId: 's3', endDate: '2025-01-29', velocityPoints: 10 }),
        makeMetric({ iterationId: 's4', endDate: '2025-02-12', velocityPoints: 40 }),
        makeMetric({ iterationId: 's5', endDate: '2025-02-26', velocityPoints: 40 }),
        makeMetric({ iterationId: 's6', endDate: '2025-03-12', velocityPoints: 40 }),
      ];

      const pkg = SignalPackageBuilder.build({ metrics, annotations: [] });

      const rvh = pkg.metrics.velocity.recentVsHistorical;
      expect(rvh.recentMean).toBeCloseTo(40, 1);
      expect(rvh.historicalMean).toBeCloseTo(25, 1);
      expect(rvh.delta).toBeCloseTo(15, 1);
    });

    it('computes beforeAfter window using 1-iteration-before and 2-iterations-after the annotation date', () => {
      // 6 sprints: annotation date falls between sprint 3 and 4
      // velocityPoints: [20, 20, 20, 40, 40, 40]
      // Before: sprint 3 (value=20); After: sprints 4+5 (value=40 each)
      const metrics = [
        makeMetric({ iterationId: 's1', endDate: '2025-01-14', velocityPoints: 20 }),
        makeMetric({ iterationId: 's2', endDate: '2025-01-28', velocityPoints: 20 }),
        makeMetric({ iterationId: 's3', endDate: '2025-02-11', velocityPoints: 20 }),
        makeMetric({ iterationId: 's4', endDate: '2025-02-25', velocityPoints: 40 }),
        makeMetric({ iterationId: 's5', endDate: '2025-03-11', velocityPoints: 40 }),
        makeMetric({ iterationId: 's6', endDate: '2025-03-25', velocityPoints: 40 }),
      ];
      const annotations = [
        makeAnnotation({
          id: 'ann-1',
          date: '2025-02-15', // between sprint 3 (2025-02-11) and sprint 4 (2025-02-25)
          affectedMetrics: ['velocity']
        })
      ];

      const pkg = SignalPackageBuilder.build({ metrics, annotations });

      const ann = pkg.annotations[0];
      expect(ann.id).toBe('ann-1');
      expect(ann.beforeAfter).toBeDefined();
      expect(ann.beforeAfter.velocity).toBeDefined();
      expect(ann.beforeAfter.velocity.beforeMean).toBeCloseTo(20, 1); // 1 iteration before
      expect(ann.beforeAfter.velocity.afterMean).toBeCloseTo(40, 1); // 2 iterations after
    });

    it('sets verdict to "meaningful" when deltaSigmas >= 1 and "inconclusive" when < 1', () => {
      // Meaningful: velocityPoints [20,20,20,40,40,40] → deltaSigmas = 20/stddev
      // stddev (population of [20,20,20,40,40,40]): mean=30, variance=100, stddev=10
      // deltaSigmas = (40-20)/10 = 2.0 → "meaningful"
      const metricsLarge = [
        makeMetric({ iterationId: 's1', endDate: '2025-01-14', velocityPoints: 20 }),
        makeMetric({ iterationId: 's2', endDate: '2025-01-28', velocityPoints: 20 }),
        makeMetric({ iterationId: 's3', endDate: '2025-02-11', velocityPoints: 20 }),
        makeMetric({ iterationId: 's4', endDate: '2025-02-25', velocityPoints: 40 }),
        makeMetric({ iterationId: 's5', endDate: '2025-03-11', velocityPoints: 40 }),
        makeMetric({ iterationId: 's6', endDate: '2025-03-25', velocityPoints: 40 }),
      ];
      const annotationMeaningful = [
        makeAnnotation({ id: 'ann-m', date: '2025-02-15', affectedMetrics: ['velocity'] })
      ];
      const pkgMeaningful = SignalPackageBuilder.build({
        metrics: metricsLarge,
        annotations: annotationMeaningful
      });
      expect(pkgMeaningful.annotations[0].beforeAfter.velocity.verdict).toBe('meaningful');
      expect(pkgMeaningful.annotations[0].beforeAfter.velocity.deltaSigmas).toBeCloseTo(2.0, 0);

      // Inconclusive: noisy series [10,50,30,30,50,10], stddev≈16.33
      // before=30 (sprint 3), after=(30+50)/2=40, delta=10, deltaSigmas≈0.61 → "inconclusive"
      const metricsFlat = [
        makeMetric({ iterationId: 's1', endDate: '2025-01-14', velocityPoints: 10 }),
        makeMetric({ iterationId: 's2', endDate: '2025-01-28', velocityPoints: 50 }),
        makeMetric({ iterationId: 's3', endDate: '2025-02-11', velocityPoints: 30 }),
        makeMetric({ iterationId: 's4', endDate: '2025-02-25', velocityPoints: 30 }),
        makeMetric({ iterationId: 's5', endDate: '2025-03-11', velocityPoints: 50 }),
        makeMetric({ iterationId: 's6', endDate: '2025-03-25', velocityPoints: 10 }),
      ];
      const annotationInconclusive = [
        makeAnnotation({ id: 'ann-i', date: '2025-02-15', affectedMetrics: ['velocity'] })
      ];
      const pkgInconclusive = SignalPackageBuilder.build({
        metrics: metricsFlat,
        annotations: annotationInconclusive
      });
      expect(pkgInconclusive.annotations[0].beforeAfter.velocity.verdict).toBe('inconclusive');
    });

    it('omits beforeAfter when annotation date is after all iteration endDates', () => {
      const metrics = [
        makeMetric({ iterationId: 's1', endDate: '2025-01-14', velocityPoints: 30 }),
        makeMetric({ iterationId: 's2', endDate: '2025-01-28', velocityPoints: 35 }),
      ];
      const annotations = [
        makeAnnotation({ id: 'ann-1', date: '2025-12-01', affectedMetrics: ['velocity'] })
      ];

      const pkg = SignalPackageBuilder.build({ metrics, annotations });

      expect(pkg.annotations[0].beforeAfter).toEqual({});
    });

    it('omits beforeAfter when annotation date is before all iteration endDates', () => {
      const metrics = [
        makeMetric({ iterationId: 's1', endDate: '2025-06-01', velocityPoints: 30 }),
        makeMetric({ iterationId: 's2', endDate: '2025-06-15', velocityPoints: 35 }),
      ];
      const annotations = [
        makeAnnotation({ id: 'ann-1', date: '2025-01-01', affectedMetrics: ['velocity'] })
      ];

      const pkg = SignalPackageBuilder.build({ metrics, annotations });

      expect(pkg.annotations[0].beforeAfter).toEqual({});
    });

    it('handles a metric with zero mean without throwing (CV = 0)', () => {
      const metrics = [
        makeMetric({ iterationId: 's1', deploymentFrequency: 0 }),
        makeMetric({ iterationId: 's2', deploymentFrequency: 0 }),
        makeMetric({ iterationId: 's3', deploymentFrequency: 0 }),
      ];

      expect(() => SignalPackageBuilder.build({ metrics, annotations: [] })).not.toThrow();
      const pkg = SignalPackageBuilder.build({ metrics, annotations: [] });
      expect(pkg.metrics.deploymentFrequency.summary.cv).toBe(0);
    });

    it('handles empty metrics array without throwing and returns null iterationRange', () => {
      expect(() => SignalPackageBuilder.build({ metrics: [], annotations: [] })).not.toThrow();
      const pkg = SignalPackageBuilder.build({ metrics: [], annotations: [] });
      expect(pkg.iterationRange.from).toBeNull();
      expect(pkg.iterationRange.to).toBeNull();
      expect(pkg.iterationRange.count).toBe(0);
    });

    it('skips beforeAfter for an annotation that references an unknown metric key', () => {
      const metrics = [
        makeMetric({ iterationId: 's1', endDate: '2025-01-14' }),
        makeMetric({ iterationId: 's2', endDate: '2025-01-28' }),
        makeMetric({ iterationId: 's3', endDate: '2025-02-11' }),
      ];
      const annotations = [
        makeAnnotation({
          id: 'ann-1',
          date: '2025-01-20',
          affectedMetrics: ['nonExistentMetric']
        })
      ];

      const pkg = SignalPackageBuilder.build({ metrics, annotations });

      expect(pkg.annotations[0].beforeAfter).toEqual({});
    });

    it('sets deltaSigmas to 0 when all values are identical (stddev = 0)', () => {
      // All velocity values identical → stddev=0; beforeAfter should not throw and deltaSigmas=0
      const metrics = [
        makeMetric({ iterationId: 's1', endDate: '2025-01-14', velocityPoints: 30 }),
        makeMetric({ iterationId: 's2', endDate: '2025-01-28', velocityPoints: 30 }),
        makeMetric({ iterationId: 's3', endDate: '2025-02-11', velocityPoints: 30 }),
        makeMetric({ iterationId: 's4', endDate: '2025-02-25', velocityPoints: 30 }),
      ];
      const annotations = [
        makeAnnotation({ id: 'ann-1', date: '2025-02-15', affectedMetrics: ['velocity'] })
      ];

      const pkg = SignalPackageBuilder.build({ metrics, annotations });

      expect(pkg.annotations[0].beforeAfter.velocity.deltaSigmas).toBe(0);
      expect(pkg.annotations[0].beforeAfter.velocity.verdict).toBe('inconclusive');
    });

    it('output includes schemaVersion:1, iterationRange, all 7 metric keys, and annotations array', () => {
      const metrics = [
        makeMetric({ iterationId: 's1', endDate: '2025-01-14' }),
        makeMetric({ iterationId: 's2', endDate: '2025-01-28' }),
        makeMetric({ iterationId: 's3', endDate: '2025-02-11' }),
        makeMetric({ iterationId: 's4', endDate: '2025-02-25' }),
        makeMetric({ iterationId: 's5', endDate: '2025-03-11' }),
      ];

      const pkg = SignalPackageBuilder.build({ metrics, annotations: [] });

      expect(pkg.schemaVersion).toBe(1);
      expect(pkg.iterationRange).toMatchObject({
        from: '2025-01-14',
        to: '2025-03-11',
        count: 5
      });
      const expectedMetricKeys = [
        'velocity', 'throughput', 'cycleTimeAvg',
        'deploymentFrequency', 'leadTimeAvg', 'mttrAvg', 'changeFailureRate'
      ];
      for (const key of expectedMetricKeys) {
        expect(pkg.metrics).toHaveProperty(key);
      }
      expect(Array.isArray(pkg.annotations)).toBe(true);
    });
  });
});
