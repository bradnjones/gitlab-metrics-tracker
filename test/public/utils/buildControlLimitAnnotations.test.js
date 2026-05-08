import { describe, test, expect } from '@jest/globals';
import buildControlLimitAnnotations from '../../../src/public/utils/buildControlLimitAnnotations.js';

describe('buildControlLimitAnnotations', () => {
  const sampleLimits = {
    average: 10,
    upperLimit: 16.6,
    lowerLimit: 3.4,
  };

  // ── Null / undefined guards ────────────────────────────────────────────────

  test('returns empty object when controlLimits is null', () => {
    expect(buildControlLimitAnnotations(null)).toEqual({});
  });

  test('returns empty object when controlLimits is undefined', () => {
    expect(buildControlLimitAnnotations(undefined)).toEqual({});
  });

  test('returns empty object when called with no arguments', () => {
    expect(buildControlLimitAnnotations()).toEqual({});
  });

  // ── Return shape ───────────────────────────────────────────────────────────

  test('returns an object with upperLimit, average, and lowerLimit keys', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result).toHaveProperty('upperLimit');
    expect(result).toHaveProperty('average');
    expect(result).toHaveProperty('lowerLimit');
  });

  test('every annotation entry has type "line"', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.upperLimit.type).toBe('line');
    expect(result.average.type).toBe('line');
    expect(result.lowerLimit.type).toBe('line');
  });

  // ── yMin / yMax values ─────────────────────────────────────────────────────

  test('upperLimit annotation yMin and yMax equal controlLimits.upperLimit', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.upperLimit.yMin).toBe(sampleLimits.upperLimit);
    expect(result.upperLimit.yMax).toBe(sampleLimits.upperLimit);
  });

  test('average annotation yMin and yMax equal controlLimits.average', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.average.yMin).toBe(sampleLimits.average);
    expect(result.average.yMax).toBe(sampleLimits.average);
  });

  test('lowerLimit annotation yMin and yMax equal controlLimits.lowerLimit', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.lowerLimit.yMin).toBe(sampleLimits.lowerLimit);
    expect(result.lowerLimit.yMax).toBe(sampleLimits.lowerLimit);
  });

  // ── Label content ──────────────────────────────────────────────────────────

  test('upperLimit label content shows UCL with one decimal place', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.upperLimit.label.content).toBe('UCL: 16.6');
  });

  test('average label content shows Avg with one decimal place', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.average.label.content).toBe('Avg: 10.0');
  });

  test('lowerLimit label content shows LCL with one decimal place', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.lowerLimit.label.content).toBe('LCL: 3.4');
  });

  test('labels have display true', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.upperLimit.label.display).toBe(true);
    expect(result.average.label.display).toBe(true);
    expect(result.lowerLimit.label.display).toBe(true);
  });

  // ── Default colours ────────────────────────────────────────────────────────

  test('upperLimit uses default borderColor #93c5fd', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.upperLimit.borderColor).toBe('#93c5fd');
  });

  test('average uses default borderColor #1976d2', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.average.borderColor).toBe('#1976d2');
  });

  test('lowerLimit defaults to the same colour as upperLimit', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.lowerLimit.borderColor).toBe(result.upperLimit.borderColor);
  });

  test('average annotation has borderDash for dotted line', () => {
    const result = buildControlLimitAnnotations(sampleLimits);
    expect(result.average.borderDash).toEqual([5, 5]);
  });

  // ── Custom colour options ──────────────────────────────────────────────────

  test('respects custom upperColor option', () => {
    const result = buildControlLimitAnnotations(sampleLimits, { upperColor: '#ff0000' });
    expect(result.upperLimit.borderColor).toBe('#ff0000');
  });

  test('respects custom averageColor option', () => {
    const result = buildControlLimitAnnotations(sampleLimits, { averageColor: '#00ff00' });
    expect(result.average.borderColor).toBe('#00ff00');
  });

  test('respects custom lowerColor option independently of upperColor', () => {
    const result = buildControlLimitAnnotations(sampleLimits, {
      upperColor: '#ff0000',
      lowerColor: '#0000ff',
    });
    expect(result.upperLimit.borderColor).toBe('#ff0000');
    expect(result.lowerLimit.borderColor).toBe('#0000ff');
  });

  // ── Pure function — no side effects ───────────────────────────────────────

  test('does not mutate the controlLimits argument', () => {
    const limits = { average: 10, upperLimit: 16.6, lowerLimit: 3.4 };
    buildControlLimitAnnotations(limits);
    expect(limits).toEqual({ average: 10, upperLimit: 16.6, lowerLimit: 3.4 });
  });

  test('returns a new object on each call', () => {
    const a = buildControlLimitAnnotations(sampleLimits);
    const b = buildControlLimitAnnotations(sampleLimits);
    expect(a).not.toBe(b);
  });

  // ── Zero / boundary values ─────────────────────────────────────────────────

  test('handles lowerLimit of 0 correctly', () => {
    const limits = { average: 5, upperLimit: 10, lowerLimit: 0 };
    const result = buildControlLimitAnnotations(limits);
    expect(result.lowerLimit.yMin).toBe(0);
    expect(result.lowerLimit.label.content).toBe('LCL: 0.0');
  });
});
