/**
 * @jest-environment node
 */
import { describe, test, expect } from "@jest/globals";
import { detectRule1, detectRule2, detectRule3, applyAllRules } from "../../src/lib/analysis/nelsonRules.js";

describe("detectRule1", () => {
  test("detects outlier beyond 3 sigma and ignores points within range", () => {
    // mean=10, stddev=2: 3*sigma boundary is 16 and 4
    const values = [10, 11, 9, 18, 10]; // 18 is above (10 + 3*2 = 16)
    const signals = detectRule1(values, 10, 2);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toEqual({ index: 3, value: 18, direction: "above" });
  });

  test("returns empty array when stddev is 0", () => {
    const values = [5, 5, 5, 5, 100];
    expect(detectRule1(values, 5, 0)).toEqual([]);
  });
});

describe("detectRule2", () => {
  test("detects run of 10 values all above mean", () => {
    const values = [6, 7, 8, 6, 7, 8, 6, 7, 8, 6]; // all > mean=5
    const runs = detectRule2(values, 5);
    expect(runs).toHaveLength(1);
    expect(runs[0].startIndex).toBe(0);
    expect(runs[0].endIndex).toBe(9);
    expect(runs[0].count).toBe(10);
    expect(runs[0].direction).toBe("above");
  });

  test("returns empty array for mixed values that never hit 9 consecutive", () => {
    // alternates above and below mean of 5
    const values = [6, 4, 6, 4, 6, 4, 6, 4, 6, 4];
    expect(detectRule2(values, 5)).toEqual([]);
  });
});

describe("detectRule3", () => {
  test("detects ascending trend of 7 values (6 steps) at indices 0-6", () => {
    const values = [1, 2, 3, 4, 5, 6, 7];
    const trends = detectRule3(values);
    expect(trends).toHaveLength(1);
    expect(trends[0]).toEqual({ startIndex: 0, endIndex: 6, count: 7, direction: "up" });
  });

  test("returns empty array for non-monotonic data", () => {
    const values = [3, 1, 4, 1, 5, 9, 2, 6];
    expect(detectRule3(values)).toEqual([]);
  });
});

describe("applyAllRules", () => {
  test("returns object with rule1, rule2, rule3 array properties", () => {
    const values = [5, 5, 5, 5, 5];
    const result = applyAllRules(values, 5, 1);
    expect(result).toHaveProperty("rule1");
    expect(result).toHaveProperty("rule2");
    expect(result).toHaveProperty("rule3");
    expect(Array.isArray(result.rule1)).toBe(true);
    expect(Array.isArray(result.rule2)).toBe(true);
    expect(Array.isArray(result.rule3)).toBe(true);
  });
});
