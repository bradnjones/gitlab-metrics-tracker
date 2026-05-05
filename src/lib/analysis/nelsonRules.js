/**
 * Nelson Rules for Statistical Process Control (SPC).
 * Detects non-random patterns in time-series data.
 */

/**
 * Rule 1: points outside 3 sigma from the mean.
 * @param {number[]} values
 * @param {number} mean
 * @param {number} stddev
 * @returns {{ index: number, value: number, direction: "above"|"below" }[]}
 */
export function detectRule1(values, mean, stddev) {
  if (stddev === 0) return [];
  const results = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const delta = v - mean;
    if (Math.abs(delta) > 3 * stddev) {
      results.push({ index: i, value: v, direction: delta > 0 ? "above" : "below" });
    }
  }
  return results;
}

/**
 * Rule 2: 9 or more consecutive points on the same side of the mean.
 * Values equal to mean break the run.
 * @param {number[]} values
 * @param {number} mean
 * @returns {{ startIndex: number, endIndex: number, count: number, direction: "above"|"below" }[]}
 */
export function detectRule2(values, mean) {
  const results = [];
  let runStart = null;
  let runDir = null;
  let runCount = 0;

  const flush = (endIndex) => {
    if (runCount >= 9) {
      results.push({
        startIndex: runStart,
        endIndex: endIndex,
        count: runCount,
        direction: runDir,
      });
    }
  };

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    let dir = null;
    if (v > mean) dir = "above";
    else if (v < mean) dir = "below";

    if (dir === null || dir !== runDir) {
      flush(i - 1);
      runStart = dir !== null ? i : null;
      runDir = dir;
      runCount = dir !== null ? 1 : 0;
    } else {
      runCount++;
    }
  }
  flush(values.length - 1);

  return results;
}

/**
 * Rule 3: 6 or more consecutive points trending monotonically in one direction.
 * @param {number[]} values
 * @returns {{ startIndex: number, endIndex: number, count: number, direction: "up"|"down" }[]}
 */
export function detectRule3(values) {
  if (values.length < 2) return [];

  const results = [];
  let trendStart = 0;
  let trendDir = null;
  let steps = 0;

  for (let i = 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    let dir = null;
    if (delta > 0) dir = "up";
    else if (delta < 0) dir = "down";

    if (dir !== null && dir === trendDir) {
      steps++;
    } else {
      if (steps >= 6) {
        results.push({
          startIndex: trendStart,
          endIndex: trendStart + steps,
          count: steps + 1,
          direction: trendDir,
        });
      }
      trendStart = i - 1;
      trendDir = dir;
      steps = dir !== null ? 1 : 0;
    }
  }

  if (steps >= 6) {
    results.push({
      startIndex: trendStart,
      endIndex: trendStart + steps,
      count: steps + 1,
      direction: trendDir,
    });
  }

  return results;
}

/**
 * Apply all three Nelson Rules to a dataset.
 * @param {number[]} values
 * @param {number} mean
 * @param {number} stddev
 * @returns {{ rule1: object[], rule2: object[], rule3: object[] }}
 */
export function applyAllRules(values, mean, stddev) {
  return {
    rule1: detectRule1(values, mean, stddev),
    rule2: detectRule2(values, mean),
    rule3: detectRule3(values),
  };
}
