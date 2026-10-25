import { expect, test } from 'vitest';
import { deriveDiagnostics } from '../src/simulation/diagnostics.js';

function snapshot() {
  return {
    layout: { modelId: 'cafe-v2', room: { width: 2, height: 2, cellSize: 0.5 } }, elapsedTicks: 100,
    metrics: { averageWaitingSeconds: 999, baristaWalkingMeters: 12, switchedToTakeaway: 6, dineInRequested: 18, outsideDelayed: 2, outsideHoldingSeconds: 10 },
    orders: [
      { submittedTick: 0, startedTick: 10, readyTick: 70, status: 'collected' },
      { submittedTick: 10, startedTick: 30, readyTick: 90, status: 'cancelled' },
      { submittedTick: 90, readyTick: null, status: 'cancelled' },
    ],
    heatmap: Array.from({ length: 16 }, (_, i) => ({ x: i % 4, y: Math.floor(i / 4), ticks: 0 })),
  };
}

test('production stages share the produced-order cohort, including a drink followed by failure', () => {
  const input = snapshot(); const before = structuredClone(input);
  const result = deriveDiagnostics(input);
  expect(result.production).toEqual({ count: 2, queueSeconds: 7.5, handlingSeconds: 30, readySeconds: 37.5 });
  expect(result.production.queueSeconds + result.production.handlingSeconds).toBe(result.production.readySeconds);
  expect(result.switchedToTakeaway).toBe(6);
  expect(result.outsideDelayed).toBe(2);
  expect(input).toEqual(before);
});

test('missing, empty, or invalid historical timing is unavailable without losing other diagnostics', () => {
  for (const orders of [undefined, [], [{ readyTick: null }], [{ submittedTick: 1, readyTick: 10 }], [{ submittedTick: 10, startedTick: 5, readyTick: 20 }], [{ submittedTick: 0, startedTick: 10, readyTick: 101 }]]) {
    const result = deriveDiagnostics({ ...snapshot(), orders });
    expect(result.production).toBeNull(); expect(result.movement.totalSeconds).toBe(0);
  }
  const old = snapshot(); delete old.layout.modelId; delete old.metrics.switchedToTakeaway;
  expect(deriveDiagnostics(old).production).toBeNull(); expect(deriveDiagnostics(old).switchedToTakeaway).toBeNull();
});

test('hotspots join four-neighbor cells, rank by accumulated seconds and break ties by y/x', () => {
  const input = snapshot();
  for (const [x, y, ticks] of [[0, 0, 8], [1, 0, 2], [3, 0, 10], [0, 2, 12], [3, 3, 2]]) input.heatmap.find(c => c.x === x && c.y === y).ticks = ticks;
  const result = deriveDiagnostics(input).movement;
  expect(result.totalSeconds).toBe(17); expect(result.areaCount).toBe(4);
  expect(result.areas.map(a => [a.id, a.seconds, a.cells.length])).toEqual([['0,2', 6, 1], ['0,0', 5, 2], ['3,0', 5, 1]]);
  expect(deriveDiagnostics({ ...input, heatmap: [...input.heatmap].reverse() }).movement).toEqual(result);
});

test('zero heat is distinct from missing or malformed heat data', () => {
  expect(deriveDiagnostics(snapshot()).movement).toEqual({ totalSeconds: 0, areaCount: 0, areas: [] });
  for (const heatmap of [undefined, [], [{ x: 0, y: 0, ticks: -1 }], Array(16).fill({ x: 0, y: 0, ticks: 1 })]) expect(deriveDiagnostics({ ...snapshot(), heatmap }).movement).toBeNull();
});
