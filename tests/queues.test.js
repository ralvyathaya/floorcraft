import { expect, test } from 'vitest';
import { openLayout } from './fixtures.js';
import { buildNavigationMap, cellKey, edgeClear, portalCell, serviceCell } from '../src/simulation/navigation.js';
import { buildQueues, joinQueue, releaseCustomer, queueTarget } from '../src/simulation/queues.js';

test('physical queue lanes are connected, disjoint and avoid portal/furniture', () => {
  const map = buildNavigationMap(openLayout);
  const queues = buildQueues(openLayout, map);
  const occupied = new Set();
  for (const id of ['cashier', 'pickup']) {
    const lane = queues[id].lane;
    expect(lane.length).toBeGreaterThan(1);
    expect(lane.length).toBeLessThanOrEqual(12);
    expect(lane[0]).toEqual(serviceCell(openLayout, openLayout.objects.find((o) => o.id === id)));
    lane.forEach((cell, index) => {
      expect(cellKey(cell)).not.toBe(cellKey(portalCell(openLayout)));
      expect(map.blocked.has(cellKey(cell))).toBe(false);
      expect(occupied.has(cellKey(cell))).toBe(false);
      occupied.add(cellKey(cell));
      if (index) expect(edgeClear(map, lane[index - 1], cell)).toBe(true);
    });
  }
});

test('FIFO queue assigns real positions and releases the next member one slot at a time', () => {
  const queue = { lane: [{ x: 2, y: 2 }, { x: 2, y: 3 }], members: [], overflow: [] };
  joinQueue(queue, 'a'); joinQueue(queue, 'b'); joinQueue(queue, 'c');
  expect(queue.members).toEqual(['a', 'b']);
  expect(queue.overflow).toEqual(['c']);
  expect(queueTarget(queue, 'b')).toEqual({ x: 2, y: 3 });
  releaseCustomer(queue, 'a');
  expect(queue.members).toEqual(['b', 'c']);
  expect(queueTarget(queue, 'b')).toEqual({ x: 2, y: 2 });
});
