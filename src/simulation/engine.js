import { buildNavigationMap, cellKey, findRoute, neighbors, portalCell, sameCell } from './navigation.js';
import { buildQueues, joinQueue, queueTarget, releaseCustomer } from './queues.js';
import { resolveMovements } from './movement.js';
import { deriveMetrics } from './metrics.js';

export const layoutSignature = (layout) => JSON.stringify({ ...layout, objects: [...layout.objects].sort((a, b) => a.id.localeCompare(b.id)) });

function transition(run, customer, phase, tick = run.tick) {
  customer.phase = phase;
  customer.transitions.push({ phase, tick });
}

function terminate(run, customer, outcome, tick = run.tick) {
  customer.outcome = outcome;
  customer.endTick = tick;
  transition(run, customer, outcome, tick);
  for (const queue of Object.values(run.queues)) releaseCustomer(queue, customer.id);
}

export function createRun(layout, scenario) {
  const captured = structuredClone(layout);
  const map = buildNavigationMap(captured);
  return {
    layout: captured, signature: layoutSignature(captured), scenario: structuredClone(scenario), map,
    portal: portalCell(captured), queues: buildQueues(captured, map), tick: 0, done: false,
    customers: scenario.customers.map((scheduled) => ({
      ...scheduled, phase: 'outside', cell: null, previousCell: null, outcome: null,
      entryTick: null, endTick: null, transitions: [{ phase: 'outside', tick: 0 }],
      waitingTicks: 0, walkingTicks: 0, attemptedTicks: 0, blockedTicks: 0,
      orderingTicksSpent: 0, outsideTicks: 0, stalledTicks: 0, serviceRemaining: null,
      laneIndex: null, route: null,
    })),
    heatmap: Array.from({ length: map.rows * map.columns }, (_, index) => ({ x: index % map.columns, y: Math.floor(index / map.columns), ticks: 0 })),
    movements: [],
  };
}

function queueEntry(run, queue) {
  const tail = queue.lane.at(-1);
  const interior = new Set(queue.lane.slice(0, -1).map(cellKey));
  return [tail, ...neighbors(run.map, tail)].filter((cell) => !sameCell(cell, run.portal) && !interior.has(cellKey(cell)));
}

function joinIfArrived(run, customer) {
  const station = customer.phase === 'approaching cashier' ? 'cashier' : customer.phase === 'approaching pickup' ? 'pickup' : null;
  if (!station) return;
  const queue = run.queues[station];
  if (queueEntry(run, queue).some((cell) => sameCell(cell, customer.cell))) {
    joinQueue(queue, customer.id);
    transition(run, customer, `${station} queue`);
    const index = queue.lane.findIndex((cell) => sameCell(cell, customer.cell));
    customer.laneIndex = index < 0 ? null : index;
    customer.route = null;
  }
}

function travelTarget(run, customer) {
  if (customer.phase === 'exiting') return run.portal;
  if (customer.phase.startsWith('approaching')) {
    return queueEntry(run, run.queues[customer.phase === 'approaching cashier' ? 'cashier' : 'pickup']);
  }
  const station = customer.phase === 'cashier queue' ? 'cashier' : customer.phase === 'pickup queue' ? 'pickup' : null;
  if (!station) return null;
  const queue = run.queues[station];
  const target = queueTarget(queue, customer.id);
  if (!target) return null; // Physical overflow holds until a real lane slot is released.
  const desiredIndex = queue.members.indexOf(customer.id);
  if (customer.laneIndex !== null && customer.laneIndex > desiredIndex) return queue.lane[customer.laneIndex - 1];
  return target;
}

function serviceTick(run, customer) {
  const station = ['cashier queue', 'ordering'].includes(customer.phase) ? 'cashier' : ['pickup queue', 'preparation'].includes(customer.phase) ? 'pickup' : null;
  if (!station) return false;
  const queue = run.queues[station];
  if (queue.members[0] !== customer.id || !sameCell(customer.cell, queue.lane[0])) return false;
  if (customer.serviceRemaining === null) {
    customer.serviceRemaining = station === 'cashier' ? customer.orderingTicks : customer.preparationTicks;
    transition(run, customer, station === 'cashier' ? 'ordering' : 'preparation');
  }
  if (station === 'cashier') customer.orderingTicksSpent++;
  else customer.waitingTicks++;
  customer.serviceRemaining--;
  if (customer.serviceRemaining <= 0) {
    queue.served.push(customer.id);
    releaseCustomer(queue, customer.id);
    customer.serviceRemaining = null;
    customer.laneIndex = null;
    customer.route = null;
    transition(run, customer, station === 'cashier' ? 'approaching pickup' : 'exiting', run.tick + 1);
  }
  return true;
}

export function step(run) {
  if (run.done) return run;
  const { map, scenario } = run;
  const occupied = new Set(run.customers.filter((c) => c.cell && !c.outcome).map((c) => cellKey(c.cell)));
  for (const customer of run.customers) {
    customer.previousCell = customer.cell && { ...customer.cell };
    if (customer.phase !== 'outside' || customer.outcome || customer.arrivalTick > run.tick) continue;
    if (occupied.has(cellKey(run.portal))) { customer.outsideTicks++; continue; }
    customer.cell = { ...run.portal };
    customer.previousCell = { ...run.portal };
    customer.entryTick = run.tick;
    occupied.add(cellKey(run.portal));
    transition(run, customer, 'approaching cashier');
  }
  const active = run.customers.filter((c) => c.cell && !c.outcome);
  const consumed = new Set();
  for (const customer of active) {
    if (customer.phase === 'exiting' && sameCell(customer.cell, run.portal)) {
      terminate(run, customer, 'completed'); consumed.add(customer.id); continue;
    }
    joinIfArrived(run, customer);
    if (serviceTick(run, customer)) consumed.add(customer.id);
  }
  const intents = [];
  const attempts = new Set();
  for (const customer of active) {
    if (customer.outcome || consumed.has(customer.id)) continue;
    const target = travelTarget(run, customer);
    if (!target || (!Array.isArray(target) && sameCell(customer.cell, target))) continue;
    const queueStation = customer.phase === 'cashier queue' ? 'cashier' : customer.phase === 'pickup queue' ? 'pickup' : null;
    let queueForbidden = new Set();
    if (queueStation) {
      const queue = run.queues[queueStation];
      const memberIndex = queue.members.indexOf(customer.id);
      const predecessor = active.find((other) => other.id === queue.members[memberIndex - 1]);
      // A joining member cannot shortcut into a slot ahead of a predecessor
      // who is still walking to their own position. This is intentional FIFO
      // holding, not an obstruction attempt or a reason to yield one's place.
      if (predecessor) {
        if (predecessor.laneIndex === null) continue;
        const targetIndex = queue.lane.findIndex((cell) => sameCell(cell, target));
        if (customer.laneIndex !== null && targetIndex <= predecessor.laneIndex) continue;
      }
      const firstAllowed = Math.max(memberIndex, predecessor ? predecessor.laneIndex + 1 : 0);
      queueForbidden = new Set(queue.lane.slice(0, firstAllowed).map(cellKey));
    }
    if (queueStation && !Array.isArray(target)) {
      const predecessor = active.find((other) => !other.outcome && other.id !== customer.id && sameCell(other.cell, target));
      if (predecessor && run.queues[queueStation].members.indexOf(predecessor.id) >= 0 && run.queues[queueStation].members.indexOf(predecessor.id) < run.queues[queueStation].members.indexOf(customer.id)) continue;
    }
    const staticRoute = findRoute(map, customer.cell, target);
    if (!staticRoute) { terminate(run, customer, 'unreachable'); continue; }
    attempts.add(customer.id);
    const targetKey = JSON.stringify(target);
    const routeIndex = customer.route?.findIndex((cell) => sameCell(cell, customer.cell)) ?? -1;
    // Retain an accepted detour until its destination changes. Recomputing the
    // shortest static path after every edge makes opposing walkers oscillate.
    let route = queueStation ? findRoute(map, customer.cell, target, queueForbidden) : customer.routeTarget === targetKey && routeIndex >= 0 ? customer.route.slice(routeIndex) : staticRoute;
    if (customer.stalledTicks >= scenario.retryTicks) {
      const unavailable = new Set([...queueForbidden, ...active.filter((other) => !other.outcome && other.id !== customer.id).map((other) => cellKey(other.cell))]);
      const blocker = active.find((other) => !other.outcome && other.id !== customer.id && sameCell(other.cell, staticRoute[1]));
      const blockerTarget = blocker && travelTarget(run, blocker);
      const blockerRoute = blockerTarget && !blocker.phase.endsWith('queue') && findRoute(map, blocker.cell, blockerTarget);
      const opposing = blockerRoute && sameCell(blockerRoute[1], customer.cell);
      const higherPriority = blocker && (customer.stalledTicks > blocker.stalledTicks || (customer.stalledTicks === blocker.stalledTicks && customer.id < blocker.id));
      // Break a head-on symmetry: the higher-priority walker holds its route
      // while the other reroutes through passing space, instead of both yielding.
      route = opposing && higherPriority ? staticRoute : findRoute(map, customer.cell, target, unavailable);
      // Queue advancement stays on consecutive lane cells, never yields its place.
      if (!route && !queueStation) {
        const reserved = new Set(Object.values(run.queues).flatMap((queue) => queue.members.map((_, index) => cellKey(queue.lane[index]))));
        const side = neighbors(map, customer.cell).find((cell) => !unavailable.has(cellKey(cell)) && !reserved.has(cellKey(cell)) && !sameCell(cell, staticRoute[1]));
        if (side) route = [customer.cell, side];
      }
    }
    if (queueStation && customer.laneIndex !== null) route = [customer.cell, target];
    customer.route = route;
    customer.routeTarget = targetKey;
    if (route?.length > 1) intents.push({ id: customer.id, to: route[1] });
  }
  run.movements = resolveMovements(map, active, intents);
  const moved = new Map(run.movements.map((move) => [move.id, move]));
  for (const customer of active) {
    if (customer.outcome || consumed.has(customer.id)) continue;
    const move = moved.get(customer.id);
    if (attempts.has(customer.id)) customer.attemptedTicks++;
    if (move) {
      customer.cell = { ...move.to }; customer.walkingTicks++; customer.stalledTicks = 0;
      if (customer.phase.endsWith('queue')) {
        const station = customer.phase === 'cashier queue' ? 'cashier' : 'pickup';
        const index = run.queues[station].lane.findIndex((cell) => sameCell(cell, customer.cell));
        customer.laneIndex = index < 0 ? null : index;
      }
    } else {
      if (customer.phase.endsWith('queue')) customer.waitingTicks++;
      if (attempts.has(customer.id)) {
        customer.blockedTicks++; customer.stalledTicks++;
        run.heatmap[customer.cell.y * map.columns + customer.cell.x].ticks++;
        if (customer.stalledTicks >= scenario.stuckTicks) terminate(run, customer, 'stuck', run.tick + 1);
      }
    }
  }
  // Admit into station queues only after reaching their physical entry region.
  for (const customer of active) if (!customer.outcome && !consumed.has(customer.id)) joinIfArrived(run, customer);
  run.tick++;
  if (run.tick >= scenario.runLimitTicks) {
    for (const customer of run.customers) if (!customer.outcome) terminate(run, customer, 'timed-out', run.tick);
  }
  run.done = run.customers.every((customer) => customer.outcome);
  return run;
}

export function finish(run) {
  if (!run.done) throw new Error('Cannot publish an incomplete simulation');
  return structuredClone({
    engineVersion: run.scenario.engineVersion, scenarioVersion: run.scenario.version,
    layout: run.layout, signature: run.signature, elapsedTicks: run.tick,
    metrics: deriveMetrics({ scheduled: run.customers.length, customers: run.customers, tickSeconds: run.scenario.tickSeconds }),
    outcomes: run.customers, heatmap: run.heatmap,
  });
}
