import { expect, test } from 'vitest';
import { blockedLayout, openLayout } from './fixtures.js';
import { createScenario } from '../src/simulation/scenario.js';
import { createRun, step, finish } from '../src/simulation/engine.js';
import { initialLayout } from '../src/simulation/layout.js';

function drive(layout = openLayout, scenario = createScenario(), batch = 1) {
  const run = createRun(layout, scenario);
  for (let guard = 0; guard < 721 && !run.done; guard += batch) {
    for (let index = 0; index < batch && !run.done; index++) step(run);
  }
  return run;
}

test('fixed rush hour terminates with every scheduled customer honestly accounted for', () => {
  const run = drive();
  expect(run.done).toBe(true);
  expect(run.tick).toBeLessThanOrEqual(720);
  const result = finish(run);
  expect(result.metrics.scheduled).toBe(24);
  expect(result.metrics.completed).toBeGreaterThan(0);
  expect(result.metrics.completed + Object.values(result.metrics.failures).reduce((a, b) => a + b, 0)).toBe(24);
  expect(result.outcomes.every((customer) => customer.outcome)).toBe(true);
  expect(result.heatmap.reduce((sum, cell) => sum + cell.ticks, 0)).toBe(run.customers.reduce((sum, customer) => sum + customer.blockedTicks, 0));
  for (const customer of run.customers) expect(customer.attemptedTicks).toBe(customer.walkingTicks + customer.blockedTicks);
  const ids = run.customers.map((customer) => customer.id);
  expect(run.queues.cashier.served).toEqual(ids);
  expect(run.queues.pickup.served).toEqual(ids);
});

test('identical runs and different tick batches produce identical outcomes and heat', () => {
  expect(finish(drive())).toEqual(finish(drive(openLayout, createScenario(), 7)));
});

test('every movement preserves unique occupancy, safe body separation and cardinal edges', () => {
  const run = createRun(openLayout, createScenario());
  let observedMoves = 0;
  for (let tick = 0; tick < 720 && !run.done; tick++) {
    step(run);
    observedMoves += run.movements.length;
    const customers = run.customers.filter((customer) => customer.cell && !customer.outcome);
    expect(new Set(customers.map((c) => `${c.cell.x},${c.cell.y}`)).size).toBe(customers.length);
    let minimumFurnitureDistance = Infinity;
    let minimumCustomerDistance = Infinity;
    for (const customer of customers) {
      const previous = customer.previousCell ?? customer.cell;
      expect(Math.abs(previous.x - customer.cell.x) + Math.abs(previous.y - customer.cell.y)).toBeLessThanOrEqual(1);
      for (let sample = 0; sample <= 10; sample++) {
        const t = sample / 10;
        const point = { x: (previous.x + (customer.cell.x - previous.x) * t + 0.5) * 0.5, y: (previous.y + (customer.cell.y - previous.y) * t + 0.5) * 0.5 };
        for (const object of openLayout.objects) {
          const dx = Math.max(object.x - point.x, point.x - object.x - object.width, 0);
          const dy = Math.max(object.y - point.y, point.y - object.y - object.height, 0);
          minimumFurnitureDistance = Math.min(minimumFurnitureDistance, Math.hypot(dx, dy));
        }
        for (const other of customers) {
          if (customer.id >= other.id) continue;
          const prev = other.previousCell ?? other.cell;
          const x = (prev.x + (other.cell.x - prev.x) * t + 0.5) * 0.5;
          const y = (prev.y + (other.cell.y - prev.y) * t + 0.5) * 0.5;
          minimumCustomerDistance = Math.min(minimumCustomerDistance, Math.hypot(point.x - x, point.y - y));
        }
      }
    }
    expect(minimumFurnitureDistance).toBeGreaterThanOrEqual(0.2 - 1e-9);
    expect(minimumCustomerDistance).toBeGreaterThanOrEqual(0.4 - 1e-9);
  }
  expect(observedMoves).toBeGreaterThan(24);
});

test('one isolated customer waits only for preparation, not ordering or walking', () => {
  const scenario = createScenario();
  scenario.customers = [scenario.customers[0]];
  const result = finish(drive(openLayout, scenario));
  expect(result.metrics.completed).toBe(1);
  expect(result.metrics.averageWaitingSeconds).toBe(8);
  expect(result.metrics.congestionPercent).toBe(0);
  expect(result.heatmap.every((cell) => cell.ticks === 0)).toBe(true);
  expect(result.outcomes[0].orderingTicksSpent).toBe(12);
  expect(result.outcomes[0].transitions.map((entry) => entry.phase)).toEqual(['outside', 'approaching cashier', 'cashier queue', 'ordering', 'approaching pickup', 'pickup queue', 'preparation', 'exiting', 'completed']);
});

test('blocked static routes produce unreachable outcomes instead of forced movement', () => {
  const result = finish(drive(blockedLayout));
  expect(result.metrics.failures.unreachable).toBe(24);
  expect(result.metrics.completed).toBe(0);
});

test('the overall limit counts customers still outside as timeout failures', () => {
  const scenario = { ...createScenario(), runLimitTicks: 2 };
  const result = finish(drive(openLayout, scenario));
  expect(result.metrics.failures['timed-out']).toBe(24);
});

test('finish refuses to publish partial results and captures an independent layout', () => {
  const layout = structuredClone(openLayout);
  const run = createRun(layout, createScenario());
  layout.objects[0].x = 9;
  expect(run.layout.objects[0].x).toBe(3);
  expect(() => finish(run)).toThrow(/incomplete/i);
});

test('an isolated FIFO service queue has positive waiting without invented obstruction heat', () => {
  const scenario = createScenario();
  scenario.customers = scenario.customers.slice(0, 2);
  const run = createRun(openLayout, scenario);
  run.queues.cashier.lane = [{ x: 7, y: 3 }, { x: 7, y: 4 }];
  run.queues.cashier.members = ['customer-01', 'customer-02'];
  run.customers.forEach((customer, index) => Object.assign(customer, { cell: { ...run.queues.cashier.lane[index] }, entryTick: 0, phase: 'cashier queue', laneIndex: index }));
  for (let index = 0; index < 8; index++) step(run);
  expect(run.customers[1].waitingTicks).toBe(8);
  expect(run.customers[1].stalledTicks).toBe(0);
  expect(run.customers[1].blockedTicks).toBe(0);
  expect(run.heatmap.reduce((sum, cell) => sum + cell.ticks, 0)).toBe(0);
});

test('a physical service customer obstructing a crossing traveler produces heat, not fake queue waiting', () => {
  const scenario = createScenario(); scenario.customers = scenario.customers.slice(0, 2);
  const run = createRun(openLayout, scenario);
  run.queues.cashier.lane = [{ x: 7, y: 6 }];
  Object.assign(run.customers[0], { cell: { x: 7, y: 6 }, entryTick: 0, phase: 'ordering', serviceRemaining: 12 });
  run.queues.cashier.members = [run.customers[0].id];
  Object.assign(run.customers[1], { cell: { x: 7, y: 7 }, entryTick: 0, phase: 'exiting' });
  run.portal = { x: 7, y: 5 };
  run.map = { ...run.map, blocked: new Set(Array.from({ length: 20 * 16 }, (_, index) => `${index % 20},${Math.floor(index / 20)}`).filter((key) => !['7,5', '7,6', '7,7'].includes(key))) };
  step(run);
  expect(run.customers[1].blockedTicks).toBe(1);
  expect(run.customers[1].waitingTicks).toBe(0);
  expect(run.heatmap.find((cell) => cell.x === 7 && cell.y === 7).ticks).toBe(1);
});

test('opposing travelers reroute through passing space without changing their destinations', () => {
  const scenario = createScenario(); scenario.customers = scenario.customers.slice(0, 2);
  const run = createRun(openLayout, scenario);
  Object.assign(run.customers[0], { cell: { x: 3, y: 6 }, entryTick: 0, phase: 'exiting' });
  Object.assign(run.customers[1], { cell: { x: 2, y: 6 }, entryTick: 0, phase: 'approaching pickup' });
  run.portal = { x: 0, y: 6 };
  run.queues.pickup.lane = [{ x: 6, y: 6 }];
  for (let index = 0; index < 100 && !run.done; index++) step(run);
  expect(run.customers[0].outcome).toBe('completed');
  expect(run.customers[1].transitions.some((entry) => entry.phase === 'preparation')).toBe(true);
  expect(run.customers.every((customer) => customer.outcome !== 'stuck')).toBe(true);
});

test('a true no-passing jam ends in explicit stuck failures, never forced success', () => {
  const scenario = createScenario(); scenario.customers = scenario.customers.slice(0, 2);
  const run = createRun(openLayout, scenario);
  run.map = { ...run.map, blocked: new Set(Array.from({ length: 320 }, (_, i) => `${i % 20},${Math.floor(i / 20)}`).filter((key) => !['2,6', '3,6'].includes(key))) };
  run.portal = { x: 2, y: 6 };
  run.queues.pickup.lane = [{ x: 3, y: 6 }];
  Object.assign(run.customers[0], { cell: { x: 3, y: 6 }, entryTick: 0, phase: 'exiting' });
  Object.assign(run.customers[1], { cell: { x: 2, y: 6 }, entryTick: 0, phase: 'approaching pickup' });
  for (let i = 0; i < 41 && !run.done; i++) step(run);
  expect(run.customers.some((customer) => customer.outcome === 'stuck')).toBe(true);
  expect(run.customers.filter((customer) => customer.outcome === 'completed')).toHaveLength(0);
});

test('an edited counter never lets a later queue member physically overtake its predecessor', () => {
  const layout = structuredClone(initialLayout);
  Object.assign(layout.objects.find((object) => object.id === 'cashier'), { x: 0, y: 0 });
  const run = createRun(layout, createScenario());
  while (!run.done) {
    step(run);
    for (const queue of Object.values(run.queues)) {
      const members = queue.members.map((id) => run.customers.find((customer) => customer.id === id));
      for (let index = 1; index < members.length; index++) {
        const earlier = members[index - 1]; const later = members[index];
        if (earlier.laneIndex !== null && later.laneIndex !== null) expect(later.laneIndex).toBeGreaterThan(earlier.laneIndex);
      }
    }
  }
  for (const station of ['cashier', 'pickup']) {
    const joined = run.customers.filter((customer) => customer.transitions.some((entry) => entry.phase === `${station} queue`))
      .sort((a, b) => a.transitions.find((entry) => entry.phase === `${station} queue`).tick - b.transitions.find((entry) => entry.phase === `${station} queue`).tick || a.id.localeCompare(b.id))
      .map((customer) => customer.id).filter((id) => run.queues[station].served.includes(id));
    expect(run.queues[station].served).toEqual(joined);
  }
});
