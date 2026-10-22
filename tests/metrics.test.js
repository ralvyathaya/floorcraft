import { describe, expect, test } from 'vitest';
import * as metricsModule from '../src/simulation/metrics.js';
const { deriveMetrics } = metricsModule;

describe('simulation metrics', () => {
  test('excludes ordering and walking from waiting averages', () => {
    const metrics = deriveMetrics({
      scheduled: 2,
      customers: [
        { outcome: 'completed', waitingTicks: 10, walkingTicks: 6, attemptedTicks: 6, blockedTicks: 2 },
        { outcome: 'stuck', waitingTicks: 20, walkingTicks: 4, attemptedTicks: 8, blockedTicks: 4 },
      ],
      heatmap: [{ x: 1, y: 2, ticks: 2 }],
    });
    expect(metrics.averageWaitingSeconds).toBe(5);
    expect(metrics.averageWalkingSeconds).toBe(3);
    expect(metrics.congestionPercent).toBeCloseTo(42.8571428571);
    expect(metrics.completed).toBe(1);
    expect(metrics.failures).toEqual({ unreachable: 0, stuck: 1, 'timed-out': 0 });
  });

  test('returns null averages and congestion when denominators are zero', () => {
    const metrics = deriveMetrics({ scheduled: 1, customers: [{ outcome: 'unreachable', waitingTicks: 0, walkingTicks: 0, attemptedTicks: 0, blockedTicks: 0 }], heatmap: [] });
    expect(metrics.averageWaitingSeconds).toBeNull();
    expect(metrics.averageWalkingSeconds).toBeNull();
    expect(metrics.congestionPercent).toBeNull();
  });
});

const baseline = {
  engineVersion: 'grid-v1', scenarioVersion: 'takeaway-rush-v1',
  metrics: { scheduled: 24, completed: 24, averageWaitingSeconds: 20.04, averageWalkingSeconds: 15, congestionPercent: 10, failures: { unreachable: 0, stuck: 0, 'timed-out': 0 } },
};
const latestWith = (changes) => ({ ...baseline, metrics: { ...baseline.metrics, ...changes } });

describe('completion-aware comparisons', () => {
  test('uses raw values for improvements and expresses units as seconds, points and counts', () => {
    const result = metricsModule.compareSnapshots?.(baseline, latestWith({ averageWaitingSeconds: 20.01, averageWalkingSeconds: 16, congestionPercent: 8 }));
    expect(result?.deltas).toMatchObject({
      averageWaitingSeconds: { unit: 's', tone: 'improved' },
      averageWalkingSeconds: { value: 1, unit: 's', tone: 'worse' },
      congestionPercent: { value: -2, unit: 'pp', tone: 'improved' },
      completed: { value: 0, unit: 'customers', tone: 'unchanged' },
    });
    expect(result?.deltas.averageWaitingSeconds.value).toBeCloseTo(-0.03);
  });

  test('fewer completions suppress favorable averages and obstruction, not regressions', () => {
    const result = metricsModule.compareSnapshots?.(baseline, latestWith({ completed: 23, averageWaitingSeconds: 10, averageWalkingSeconds: 17, congestionPercent: 8, failures: { unreachable: 0, stuck: 1, 'timed-out': 0 } }));
    expect(result?.fewerCompleted).toBe(true);
    expect(result?.hasFailures).toBe(true);
    expect(result?.deltas.averageWaitingSeconds.tone).toBe('caution');
    expect(result?.deltas.congestionPercent.tone).toBe('caution');
    expect(result?.deltas.averageWalkingSeconds.tone).toBe('worse');
    expect(result?.deltas.completed).toMatchObject({ value: -1, tone: 'worse' });
  });

  test('equal counts with failures still carry a caution, more completions are favorable', () => {
    const failed = latestWith({ completed: 23, failures: { unreachable: 0, stuck: 1, 'timed-out': 0 } });
    expect(metricsModule.compareSnapshots?.(failed, failed)?.hasFailures).toBe(true);
    expect(metricsModule.compareSnapshots?.(failed, baseline)?.deltas.completed).toMatchObject({ value: 1, tone: 'improved' });
  });

  test('null denominators do not become zero or receive improvement labels', () => {
    const result = metricsModule.compareSnapshots?.(baseline, latestWith({ completed: 0, averageWaitingSeconds: null, averageWalkingSeconds: null, congestionPercent: null }));
    expect(result?.deltas.averageWaitingSeconds).toMatchObject({ value: null, tone: 'unavailable' });
    expect(result?.deltas.congestionPercent).toMatchObject({ value: null, tone: 'unavailable' });
  });

  test('missing runs, different versions or scheduled totals cannot be compared', () => {
    for (const incompatible of [null, { ...baseline, engineVersion: 'grid-v2' }, { ...baseline, scenarioVersion: 'another' }, latestWith({ scheduled: 25 })]) {
      expect(metricsModule.compareSnapshots?.(baseline, incompatible)?.comparable).toBe(false);
    }
  });
});

test('heat uses absolute blocked-customer seconds with the same thresholds for every run', () => {
  const color = metricsModule.heatColor;
  expect(color?.(0)).toBe('transparent');
  expect(color?.(0.5)).toBe('#f4d99a');
  expect(color?.(2)).toBe('#dba342');
  expect(color?.(5)).toBe('#bd5747');
  expect(color?.(500)).toBe(color?.(5));
});
