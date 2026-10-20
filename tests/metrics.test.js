import { describe, expect, test } from 'vitest';
import { deriveMetrics } from '../src/simulation/metrics.js';

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
