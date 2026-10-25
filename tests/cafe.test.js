import { expect, test } from 'vitest';
import { cafePresets } from '../src/app/presets.js';
import { createScenario } from '../src/simulation/scenario.js';
import { createRun, step, finish } from '../src/simulation/engine.js';
import { cellCenter, edgeClear, insideZone, validatePlacement } from '../src/simulation/navigation.js';
import { trajectoryDistance } from '../src/simulation/movement.js';
import { advanceClock, createClock } from '../src/app/clock.js';

test('functional presets have reachable grouped seating and a versioned mixed scenario', () => {
  for (const [index, { layout }] of cafePresets.entries()) {
    expect(layout.modelId).toBe('cafe-v2');
    expect(layout.objects.filter(o => o.type === 'chair')).toHaveLength([8, 12, 16][index]);
    expect(layout.tableGroups).toHaveLength([4, 6, 4][index]);
    expect(validatePlacement(layout).valid).toBe(true);
    const scenario = createScenario(layout);
    expect(scenario.version).toBe('mixed-cafe-rush-v2');
    expect(scenario.customers.filter(c => c.requestedMode === 'dine-in')).toHaveLength(18);
  }
});

test('café tickets, seats and staff are real deterministic state, separate from customer counts', () => {
  const layout = cafePresets[0].layout;
  const simulate = () => {
    const run = createRun(layout, createScenario(layout));
    let sawSeated = false; let sawPreparing = false; let sawStaffWalk = false;
    while (!run.done) {
      step(run);
      sawSeated ||= run.customers.some(c => c.phase === 'seated');
      sawPreparing ||= run.staff?.some(s => s.phase === 'preparing');
      sawStaffWalk ||= run.movements.some(m => m.id === 'barista');
      const actors = [...run.customers, ...(run.staff ?? [])].filter(c => c.cell && !c.outcome);
      expect(new Set(actors.map(c => `${c.cell.x},${c.cell.y}`)).size).toBe(actors.length);
      const owners = run.seats?.filter(s => s.customerId).map(s => s.customerId) ?? [];
      expect(new Set(owners).size).toBe(owners.length);
    }
    expect(sawSeated && sawPreparing && sawStaffWalk).toBe(true);
    expect(run.customers).toHaveLength(24);
    expect(run.seats.every(s => s.customerId === null)).toBe(true);
    expect(run.orders.every(o => ['collected', 'cancelled'].includes(o.status))).toBe(true);
    return finish(run);
  };
  const result = simulate();
  expect(result.metrics.completed).toBe(24);
  expect(result.metrics.dineInRequested).toBe(18);
  expect(result.metrics.dineInServed).toBe(8);
  expect(result.metrics.switchedToTakeaway).toBe(10);
  expect(result.metrics.baristaWalkingMeters).toBeGreaterThan(0);
  expect(result.metrics.averageOrderToReadySeconds).toBeGreaterThanOrEqual(30);
  expect(simulate()).toEqual(result);
});

test('all capacities reconcile production, seating, FIFO and swept-safe actor movement', () => {
  for (const [index, preset] of cafePresets.entries()) {
    const r = createRun(preset.layout, createScenario(preset.layout));
    while (!r.done) {
      step(r);
      const present = [...r.customers, ...r.staff].filter(a => a.cell && !a.outcome);
      for (const move of r.movements) expect(edgeClear(r.map, move.from, move.to)).toBe(true);
      for (const [i, a] of present.entries()) {
        expect(insideZone(cellCenter(r.map, a.cell), r.layout.staffZone)).toBe(Boolean(a.role));
        for (const b of present.slice(i + 1)) {
          const distance = trajectoryDistance(cellCenter(r.map, a.previousCell ?? a.cell), cellCenter(r.map, a.cell), cellCenter(r.map, b.previousCell ?? b.cell), cellCenter(r.map, b.cell));
          if (distance < 0.4 - 1e-10) throw new Error(`Unsafe ${a.id}/${b.id} at ${r.tick}: ${distance}`);
        }
      }
    }
    const result = finish(r);
    expect(result.metrics).toMatchObject({ completed: 24, dineInRequested: 18, dineInServed: [8, 12, 16][index], switchedToTakeaway: [10, 6, 2][index] });
    expect(r.orders.map(o => o.customerId)).toEqual(r.queues.cashier.served);
    expect([...r.orders].sort((a, b) => a.startedTick - b.startedTick).map(o => o.id)).toEqual(r.orders.map(o => o.id));
    for (const o of r.orders) {
      expect(o.readyTick - o.startedTick).toBeGreaterThanOrEqual(60);
      expect(o.collectedTick).toBeGreaterThan(o.readyTick);
    }
    for (const c of r.customers.filter(c => c.wasSeated)) expect(c.seatedTicksSpent).toBe(1200);
  }
}, 15000);

test('playback pace and batching change presentation time only', () => {
  const layout = cafePresets[0].layout;
  const drive = pace => {
    const r = createRun(layout, createScenario(layout)); let clock = createClock(0); let now = 0;
    while (!r.done) {
      const frame = advanceClock(clock, now += 117, false, pace); clock = frame.clock;
      for (let i = 0; i < frame.steps && !r.done; i++) step(r);
    }
    return finish(r);
  };
  expect(drive(8)).toEqual(drive(32));
});

test('finite-limit failures release reservations and cancel unfinished production', () => {
  const layout = cafePresets[0].layout; const scenario = { ...createScenario(layout), runLimitTicks: 150 };
  const r = createRun(layout, scenario); while (!r.done) step(r);
  const result = finish(r);
  expect(result.metrics.completed + Object.values(result.metrics.failures).reduce((a, b) => a + b, 0)).toBe(24);
  expect(r.seats.every(s => s.customerId === null && s.status === 'empty')).toBe(true);
  expect(r.holding.every(h => h.customerId === null)).toBe(true);
  expect(r.orders.every(o => ['collected', 'cancelled'].includes(o.status))).toBe(true);
});

test('a reachable queue target temporarily reserved by its predecessor does not become unreachable', () => {
  const layout = structuredClone(cafePresets[0].layout);
  Object.assign(layout.objects.find(o => o.id === 'planter-a'), { x: 1.5, y: 3 });
  expect(validatePlacement(layout).valid).toBe(true);
  const r = createRun(layout, createScenario(layout));
  while (r.tick < 600 && !r.done) step(r);
  expect(r.customers.filter(c => c.outcome === 'unreachable')).toHaveLength(0);
});
