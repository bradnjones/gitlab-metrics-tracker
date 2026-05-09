/**
 * Builds the deterministic signal package sent to the LLM.
 * Pure computation — no I/O, no side effects.
 *
 * @module core/services/SignalPackageBuilder
 */

import {
  linearRegression,
  classifyTrend,
  recentVsHistorical,
} from '../../analysis/trendCalculator.js';
import {
  detectRule1,
  detectRule2,
  detectRule3,
} from '../../analysis/nelsonRules.js';

/**
 * @typedef {import('../entities/Metric.js').Metric} Metric
 * @typedef {import('../entities/Annotation.js').Annotation} Annotation
 */

/**
 * Metric descriptor: which field to pull from a Metric entity and its directionality.
 * @type {Array<{key: string, field: string, higherIsBetter: boolean}>}
 */
const METRIC_DESCRIPTORS = [
  { key: 'velocity',            field: 'velocityPoints',      higherIsBetter: true  },
  { key: 'throughput',          field: 'velocityStories',     higherIsBetter: true  },
  { key: 'cycleTimeAvg',        field: 'cycleTimeAvg',        higherIsBetter: false },
  { key: 'deploymentFrequency', field: 'deploymentFrequency', higherIsBetter: true  },
  { key: 'leadTimeAvg',         field: 'leadTimeAvg',         higherIsBetter: false },
  { key: 'mttrAvg',             field: 'mttrAvg',             higherIsBetter: false },
  { key: 'changeFailureRate',   field: 'changeFailureRate',   higherIsBetter: false },
];

/** Minimum iterations for "high" confidence. */
const HIGH_CONFIDENCE_THRESHOLD = 5;

/** σ threshold above which an annotation shift is "meaningful". */
const MEANINGFUL_DELTA_SIGMAS = 1;

/** Iterations to include before annotation date for beforeAfter window. */
const WINDOW_BEFORE = 1;

/** Iterations to include after annotation date for beforeAfter window. */
const WINDOW_AFTER = 2;

/**
 * Compute population mean.
 * @param {number[]} values
 * @returns {number}
 */
function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Compute population standard deviation.
 * @param {number[]} values
 * @param {number} mu - pre-computed mean
 * @returns {number}
 */
function stddev(values, mu) {
  if (values.length === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mu) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Round a number to N decimal places.
 * @param {number} n
 * @param {number} [decimals=2]
 * @returns {number}
 */
function round(n, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

/**
 * Build a single-metric block for the signal package.
 *
 * @param {string} key - metric key (e.g. "velocity")
 * @param {string} field - Metric entity property name
 * @param {boolean} higherIsBetter
 * @param {Metric[]} metrics - sorted by endDate ascending
 * @returns {Object} metric block
 */
function buildMetricBlock(key, field, higherIsBetter, metrics) {
  const series = metrics.map((m) => ({
    iterationId: m.iterationId,
    title: m.iterationTitle,
    endDate: m.endDate,
    value: m[field] ?? 0,
  }));

  const values = series.map((s) => s.value);
  const mu = mean(values);
  const sigma = stddev(values, mu);
  const cv = mu === 0 ? 0 : (sigma / mu) * 100;
  const confidence = metrics.length >= HIGH_CONFIDENCE_THRESHOLD ? 'high' : 'low';

  const reg = linearRegression(values);
  const classification = classifyTrend(reg.slope, mu, higherIsBetter);

  const rvh = recentVsHistorical(values);

  const nelsonViolations = {
    rule1: detectRule1(values, mu, sigma),
    rule2: detectRule2(values, mu),
    rule3: detectRule3(values),
  };

  // CV-based status: 🟢 <20%, 🟡 20-35%, 🔴 >35%
  const status = cv < 20 ? 'stable' : cv <= 35 ? 'noisy' : 'volatile';

  return {
    higherIsBetter,
    series,
    summary: {
      mean: round(mu),
      stddev: round(sigma),
      cv: round(cv),
      ucl: round(mu + 3 * sigma),
      lcl: round(mu - 3 * sigma),
      confidence,
    },
    trend: {
      slope: round(reg.slope),
      intercept: round(reg.intercept),
      r2: round(reg.r2),
      classification,
    },
    recentVsHistorical: {
      recentMean: round(rvh.recentMean),
      historicalMean: round(rvh.historicalMean),
      delta: round(rvh.delta),
      deltaPct: round(rvh.deltaPct),
    },
    nelsonViolations,
    status,
  };
}

/**
 * Compute beforeAfter impact for one annotation against one metric's values+series.
 *
 * @param {Annotation} annotation
 * @param {string} metricKey
 * @param {Object[]} series - [{iterationId, endDate, value, ...}]
 * @param {number} sigma - overall population stddev for the metric
 * @returns {Object|null} beforeAfter block or null if insufficient data
 */
function computeBeforeAfter(annotation, metricKey, series, sigma) {
  const annDate = new Date(annotation.date);

  // Find the split point: first series entry whose endDate > annotation date
  const firstAfterIdx = series.findIndex((s) => new Date(s.endDate) > annDate);

  if (firstAfterIdx === -1 || firstAfterIdx === 0) {
    // Annotation is after all data, or before all data
    return null;
  }

  const beforeSlice = series.slice(
    Math.max(0, firstAfterIdx - WINDOW_BEFORE),
    firstAfterIdx
  );
  const afterSlice = series.slice(firstAfterIdx, firstAfterIdx + WINDOW_AFTER);

  const beforeMean = mean(beforeSlice.map((s) => s.value));
  const afterMean = mean(afterSlice.map((s) => s.value));
  const delta = afterMean - beforeMean;
  const deltaSigmas = sigma === 0 ? 0 : Math.abs(delta) / sigma;
  const verdict = deltaSigmas >= MEANINGFUL_DELTA_SIGMAS ? 'meaningful' : 'inconclusive';

  return {
    beforeMean: round(beforeMean),
    afterMean: round(afterMean),
    delta: round(delta),
    deltaSigmas: round(deltaSigmas),
    verdict,
  };
}

/**
 * Build annotation blocks, enriched with beforeAfter impact per affected metric.
 *
 * @param {Annotation[]} annotations
 * @param {Object} metricBlocks - keyed by metric key
 * @returns {Object[]}
 */
function buildAnnotationBlocks(annotations, metricBlocks) {
  return annotations.map((ann) => {
    const beforeAfter = {};

    for (const metricKey of ann.affectedMetrics) {
      const block = metricBlocks[metricKey];
      if (!block) continue;

      const result = computeBeforeAfter(
        ann,
        metricKey,
        block.series,
        block.summary.stddev
      );
      if (result) {
        beforeAfter[metricKey] = result;
      }
    }

    return {
      id: ann.id,
      date: ann.date,
      title: ann.title,
      eventType: ann.eventType,
      impact: ann.impact,
      affectedMetrics: ann.affectedMetrics,
      beforeAfter,
    };
  });
}

/**
 * SignalPackageBuilder — builds the deterministic JSON signal package
 * that is sent to the LLM for interpretation.
 */
export class SignalPackageBuilder {
  /**
   * Build the signal package from metrics and annotations.
   *
   * @param {Object} params
   * @param {Metric[]} params.metrics - Metric entities sorted by endDate ascending
   * @param {Annotation[]} params.annotations - All annotations for the period
   * @returns {Object} Signal package (matches plan schema v1)
   */
  static build({ metrics, annotations }) {
    // Sort by endDate to guarantee temporal order
    const sorted = [...metrics].sort(
      (a, b) => new Date(a.endDate) - new Date(b.endDate)
    );

    const metricBlocks = {};
    for (const { key, field, higherIsBetter } of METRIC_DESCRIPTORS) {
      metricBlocks[key] = buildMetricBlock(key, field, higherIsBetter, sorted);
    }

    const annotationBlocks = buildAnnotationBlocks(annotations, metricBlocks);

    const iterationRange = {
      from: sorted.length > 0 ? sorted[0].endDate : null,
      to: sorted.length > 0 ? sorted[sorted.length - 1].endDate : null,
      count: sorted.length,
    };

    return {
      schemaVersion: 1,
      iterationRange,
      metrics: metricBlocks,
      annotations: annotationBlocks,
    };
  }
}
