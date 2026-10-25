import { buildNavigationMap, cellCenter, cellKey, findRoute, insideZone, neighbors, oppositeServiceCell, portalCell, roleMap, sameCell, seatApproaches, serviceCell, validatePlacement } from './navigation.js';
import { buildQueues, joinQueue, queueTarget, releaseCustomer } from './queues.js';
import { resolveMovements } from './movement.js';
import { canonicalSignature } from './layout.js';
import { deriveMetrics } from './metrics.js';

function transition(run, actor, phase, tick = run.tick) {
  actor.phase = phase;
  actor.route = null;
  actor.stalledTicks = 0;
  actor.transitions?.push({ phase, tick });
}

function terminate(run, customer, outcome, tick = run.tick) {
  customer.outcome = outcome; customer.endTick = tick;
  transition(run, customer, outcome, tick);
  for (const queue of Object.values(run.queues)) releaseCustomer(queue, customer.id);
  for (const seat of run.seats) if (seat.customerId === customer.id) { seat.customerId = null; seat.status = 'empty'; }
  for (const hold of run.holding) if (hold.customerId === customer.id) hold.customerId = null;
  const order = run.orders.find(o => o.customerId === customer.id);
  if (order && order.status !== 'collected') order.status = 'cancelled';
}

export function createCafeRun(layout, scenario) {
  if (scenario.engineVersion !== 'grid-cafe-v2' || scenario.version !== 'mixed-cafe-rush-v2') throw new Error('Layout and scenario model do not match');
  const validation = validatePlacement(layout);
  if (!validation.valid) throw new Error(`Invalid café layout: ${validation.reason}`);
  const captured = structuredClone(layout);
  const map = buildNavigationMap(captured);
  const publicMap = roleMap(captured, map, 'public'); const staffMap = roleMap(captured, map, 'staff');
  const queues = buildQueues(captured, publicMap, 6);
  const pickup = queues.pickup.lane[0];
  const seats = captured.objects.filter(o => o.type === 'chair').map(chair => ({
    id: chair.id, anchor: { x: chair.x + chair.width / 2, y: chair.y + chair.height / 2 }, rotation: chair.rotation ?? 0,
    approaches: seatApproaches(captured, publicMap, chair).filter(c => findRoute(publicMap, pickup, c)),
    status: 'empty', customerId: null,
  }));
  const reserved = new Set([cellKey(portalCell(captured)), ...Object.values(queues).flatMap(q => q.lane.map(cellKey)), ...seats.flatMap(s => s.approaches.map(cellKey))]);
  const holding = [];
  for (let y = 0; y < publicMap.rows; y++) for (let x = 0; x < publicMap.columns; x++) {
    const cell = { x, y };
    if (cellCenter(map, cell).y >= captured.waitingZone.y + map.cellSize && insideZone(cellCenter(map, cell), captured.waitingZone) && !reserved.has(cellKey(cell)) && findRoute(publicMap, pickup, cell)) holding.push({ cell, customerId: null });
  }
  const bar = captured.objects.find(o => o.id === 'service-bar');
  const prepCell = serviceCell(captured, bar);
  const deliveryCell = oppositeServiceCell(captured, captured.objects.find(o => o.id === 'pickup'));
  const cashierCell = oppositeServiceCell(captured, captured.objects.find(o => o.id === 'cashier'));
  return {
    layout: captured, signature: canonicalSignature(captured), scenario: structuredClone(scenario), map, publicMap, staffMap,
    portal: portalCell(captured), prepCell, deliveryCell, queues, seats, holding, orders: [], tick: 0, done: false, movements: [],
    staff: [
      { id: 'cashier-staff', role: 'cashier', phase: 'serving', cell: cashierCell, previousCell: cashierCell, stalledTicks: 0, walkingTicks: 0, facing: 180 },
      { id: 'barista', role: 'barista', phase: 'idle', cell: prepCell, previousCell: prepCell, stalledTicks: 0, walkingTicks: 0, orderId: null, facingStation: { south: 0, north: 180, east: 270, west: 90 }[bar.serviceFace ?? 'south'] },
    ],
    customers: scenario.customers.map(c => ({ ...c, phase: 'outside', cell: null, previousCell: null, outcome: null,
      entryTick: null, endTick: null, transitions: [{ phase: 'outside', tick: 0 }], waitingTicks: 0, walkingTicks: 0,
      attemptedTicks: 0, blockedTicks: 0, orderingTicksSpent: 0, outsideTicks: 0, stalledTicks: 0, serviceRemaining: null,
      laneIndex: null, route: null, seatId: null, seatAnchor: null, effectiveMode: c.requestedMode, wasSeated: false, seatedTicksSpent: 0,
    })),
    heatmap: Array.from({ length: map.rows * map.columns }, (_, i) => ({ x: i % map.columns, y: Math.floor(i / map.columns), ticks: 0 })),
  };
}

function queueEntry(run, queue) {
  const tail = queue.lane.at(-1);
  const interior = new Set(queue.lane.slice(0, -1).map(cellKey));
  return [tail, ...neighbors(run.publicMap, tail)].filter(c => !sameCell(c, run.portal) && !interior.has(cellKey(c)));
}

function joinIfArrived(run, customer) {
  const station = customer.phase === 'approaching cashier' ? 'cashier' : customer.phase === 'approaching pickup' ? 'pickup' : null;
  if (!station || !queueEntry(run, run.queues[station]).some(c => sameCell(c, customer.cell))) return;
  const queue = run.queues[station]; joinQueue(queue, customer.id);
  transition(run, customer, `${station} queue`);
  const index = queue.lane.findIndex(c => sameCell(c, customer.cell));
  customer.laneIndex = index < 0 ? null : index;
}

function targetFor(run, actor) {
  if (actor.role) return actor.phase === 'delivering' ? run.deliveryCell : ['returning', 'to prep'].includes(actor.phase) ? run.prepCell : null;
  if (actor.phase === 'exiting') return run.portal;
  if (actor.phase === 'to seat') return run.seats.find(s => s.id === actor.seatId).approaches;
  if (actor.phase === 'waiting for drink') return run.holding.find(h => h.customerId === actor.id)?.cell ?? null;
  if (actor.phase.startsWith('approaching')) return queueEntry(run, run.queues[actor.phase === 'approaching cashier' ? 'cashier' : 'pickup']);
  const queue = run.queues[actor.phase === 'cashier queue' ? 'cashier' : actor.phase === 'pickup queue' ? 'pickup' : ''];
  if (!queue) return null;
  const target = queueTarget(queue, actor.id);
  if (!target) return null;
  return actor.laneIndex !== null && actor.laneIndex > queue.members.indexOf(actor.id) ? queue.lane[actor.laneIndex - 1] : target;
}

function assignHolding(run, customer) {
  if (run.holding.some(h => h.customerId === customer.id)) return;
  const free = run.holding.filter(h => h.customerId === null).map(h => ({ h, route: findRoute(run.publicMap, customer.cell, h.cell) })).filter(v => v.route);
  free.sort((a, b) => a.route.length - b.route.length || cellKey(a.h.cell).localeCompare(cellKey(b.h.cell)));
  if (free[0]) free[0].h.customerId = customer.id;
}

function customerTick(run, c) {
  if (c.phase === 'exiting' && sameCell(c.cell, run.portal)) { terminate(run, c, 'completed'); return true; }
  if (c.phase === 'to seat') {
    const seat = run.seats.find(s => s.id === c.seatId);
    if (seat.approaches.some(a => sameCell(a, c.cell))) {
      seat.status = 'occupied'; c.wasSeated = true; c.seatAnchor = seat.anchor; c.seatRotation = seat.rotation;
      c.cell = null; c.previousCell = null; c.seatedRemaining = run.scenario.seatedTicks;
      transition(run, c, 'seated'); return true;
    }
  }
  if (c.phase === 'waiting for drink') {
    const order = run.orders.find(o => o.customerId === c.id);
    if (order?.status === 'ready') {
      for (const h of run.holding) if (h.customerId === c.id) h.customerId = null;
      transition(run, c, 'approaching pickup');
    } else assignHolding(run, c);
  }
  joinIfArrived(run, c);
  const station = ['cashier queue', 'ordering'].includes(c.phase) ? 'cashier' : ['pickup queue', 'collecting'].includes(c.phase) ? 'pickup' : null;
  if (!station) return false;
  const queue = run.queues[station];
  if (queue.members[0] !== c.id || !sameCell(c.cell, queue.lane[0])) return false;
  if (c.serviceRemaining === null) { c.serviceRemaining = station === 'cashier' ? c.orderingTicks : c.pickupTicks; transition(run, c, station === 'cashier' ? 'ordering' : 'collecting'); }
  if (station === 'cashier') c.orderingTicksSpent++;
  if (--c.serviceRemaining <= 0) {
    queue.served.push(c.id); releaseCustomer(queue, c.id); c.serviceRemaining = null; c.laneIndex = null;
    if (station === 'cashier') {
      run.orders.push({ id: c.id, customerId: c.id, status: 'queued', submittedTick: run.tick + 1, readyTick: null, collectedTick: null });
      transition(run, c, 'waiting for drink', run.tick + 1); assignHolding(run, c);
    } else {
      const order = run.orders.find(o => o.customerId === c.id); order.status = 'collected'; order.collectedTick = run.tick + 1;
      transition(run, c, c.seatId ? 'to seat' : 'exiting', run.tick + 1);
    }
  }
  return true;
}

function baristaTick(run, barista) {
  let order = run.orders.find(o => o.id === barista.orderId);
  if (order?.status === 'cancelled') { barista.orderId = null; transition(run, barista, 'returning'); order = null; }
  if (barista.phase === 'returning' && sameCell(barista.cell, run.prepCell)) transition(run, barista, 'idle');
  if (barista.phase === 'idle') {
    order = run.orders.find(o => o.status === 'queued' && o.submittedTick <= run.tick);
    if (!order) return true;
    barista.orderId = order.id; order.status = 'preparing'; order.startedTick = run.tick;
    transition(run, barista, 'to prep');
  }
  if (barista.phase === 'to prep' && sameCell(barista.cell, run.prepCell)) {
    const customer = run.customers.find(c => c.id === order.customerId);
    barista.remaining = customer.preparationTicks; transition(run, barista, 'preparing');
  }
  if (barista.phase === 'preparing') {
    if (--barista.remaining <= 0) transition(run, barista, 'delivering', run.tick + 1);
    return true;
  }
  if (barista.phase === 'delivering' && sameCell(barista.cell, run.deliveryCell)) {
    order.status = 'ready'; order.readyTick = run.tick; barista.orderId = null;
    transition(run, barista, 'returning'); return true;
  }
  return false;
}

export function stepCafe(run) {
  if (run.done) return run;
  const { scenario } = run;
  const occupied = new Set([...run.customers, ...run.staff].filter(c => c.cell && !c.outcome).map(c => cellKey(c.cell)));
  for (const actor of [...run.customers, ...run.staff]) actor.previousCell = actor.cell && { ...actor.cell };
  for (const c of run.customers) {
    if (c.outcome) continue;
    if (c.phase === 'seated') { c.seatedTicksSpent++; if (--c.seatedRemaining <= 0) transition(run, c, 'leaving seat'); }
    if (c.phase === 'leaving seat') {
      const seat = run.seats.find(s => s.id === c.seatId);
      const access = seat.approaches.find(a => !occupied.has(cellKey(a)) && findRoute(run.publicMap, a, run.portal));
      if (access) {
        c.cell = { ...access }; c.previousCell = { ...access }; occupied.add(cellKey(access));
        seat.customerId = null; seat.status = 'empty'; c.seatAnchor = null; transition(run, c, 'exiting');
      }
    }
    if (c.phase !== 'outside' || c.arrivalTick > run.tick) continue;
    if (occupied.has(cellKey(run.portal)) || !run.holding.some(h => h.customerId === null)) { c.outsideTicks++; continue; }
    c.cell = { ...run.portal }; c.previousCell = { ...run.portal }; c.entryTick = run.tick; occupied.add(cellKey(run.portal));
    assignHolding(run, c);
    if (c.requestedMode === 'dine-in') {
      const free = run.seats.filter(s => s.customerId === null).map(s => ({ s, distance: Math.min(...s.approaches.map(a => findRoute(run.publicMap, run.queues.pickup.lane[0], a)?.length ?? Infinity)) }));
      free.sort((a, b) => a.distance - b.distance || a.s.id.localeCompare(b.s.id));
      if (free[0]) { c.seatId = free[0].s.id; free[0].s.customerId = c.id; free[0].s.status = 'reserved'; }
      else c.effectiveMode = 'takeaway';
    }
    transition(run, c, 'approaching cashier');
  }
  const active = [...run.customers, ...run.staff].filter(a => a.cell && !a.outcome);
  const consumed = new Set();
  for (const c of run.customers.filter(c => c.cell && !c.outcome)) if (customerTick(run, c)) consumed.add(c.id);
  const barista = run.staff.find(s => s.id === 'barista');
  if (baristaTick(run, barista)) consumed.add(barista.id);
  consumed.add('cashier-staff');
  const intents = []; const attempts = new Set();
  for (const actor of active) {
    if (!actor.cell || actor.outcome || consumed.has(actor.id)) continue;
    const map = actor.role ? run.staffMap : run.publicMap;
    const target = targetFor(run, actor);
    if (!target || (Array.isArray(target) ? target.some(c => sameCell(c, actor.cell)) : sameCell(target, actor.cell))) continue;
    const queue = run.queues[actor.phase === 'cashier queue' ? 'cashier' : actor.phase === 'pickup queue' ? 'pickup' : ''];
    let forbidden = new Set(actor.role ? [] : run.holding.filter(h => h.customerId && h.customerId !== actor.id).map(h => cellKey(h.cell)));
    if (queue) {
      const memberIndex = queue.members.indexOf(actor.id);
      const predecessor = active.find(a => a.id === queue.members[memberIndex - 1] && !a.outcome);
      if (predecessor && (predecessor.laneIndex === null || actor.laneIndex !== null && queue.lane.findIndex(c => sameCell(c, target)) <= predecessor.laneIndex)) continue;
      for (const cell of queue.lane.slice(0, Math.max(memberIndex, predecessor ? predecessor.laneIndex + 1 : 0))) forbidden.add(cellKey(cell));
    }
    const availableRoute = findRoute(map, actor.cell, target, forbidden);
    if (!availableRoute) {
      if (!findRoute(map, actor.cell, target)) {
        if (!actor.role) terminate(run, actor, 'unreachable');
        else for (const c of run.customers) if (!c.outcome) terminate(run, c, 'unreachable');
      }
      actor.route = null; continue;
    }
    attempts.add(actor.id);
    const targetKey = JSON.stringify(target); const routeIndex = actor.route?.findIndex(c => sameCell(c, actor.cell)) ?? -1;
    const retained = actor.routeTarget === targetKey && routeIndex >= 0 && actor.route.slice(routeIndex + 1).every(c => !forbidden.has(cellKey(c)));
    let route = queue ? availableRoute : retained ? actor.route.slice(routeIndex) : availableRoute;
    if (actor.stalledTicks >= scenario.retryTicks) {
      const unavailable = new Set([...forbidden, ...active.filter(a => a.cell && !a.outcome && a.id !== actor.id).map(a => cellKey(a.cell))]);
      const blocker = active.find(a => a.cell && !a.outcome && a.id !== actor.id && sameCell(a.cell, availableRoute[1]));
      const blockerTarget = blocker && targetFor(run, blocker);
      const blockerRoute = blockerTarget && !blocker.phase.endsWith('queue') && findRoute(map, blocker.cell, blockerTarget);
      const opposing = blockerRoute && sameCell(blockerRoute[1], actor.cell);
      const higherPriority = blocker && (actor.stalledTicks > blocker.stalledTicks || actor.stalledTicks === blocker.stalledTicks && actor.id < blocker.id);
      route = opposing && higherPriority ? availableRoute : findRoute(map, actor.cell, target, unavailable);
      if (!route && !queue) {
        const reserved = new Set(Object.values(run.queues).flatMap(q => q.members.map((_, i) => cellKey(q.lane[i]))));
        const side = neighbors(map, actor.cell).find(c => !unavailable.has(cellKey(c)) && !reserved.has(cellKey(c)) && !sameCell(c, availableRoute[1]));
        if (side) route = [actor.cell, side];
      }
    }
    if (queue && actor.laneIndex !== null) route = [actor.cell, target];
    actor.route = route; actor.routeTarget = targetKey;
    if (route?.length > 1) intents.push({ id: actor.id, to: route[1] });
  }
  run.movements = resolveMovements(run.map, active.filter(a => a.cell && !a.outcome), intents);
  const moved = new Map(run.movements.map(m => [m.id, m]));
  for (const actor of active) {
    if (!actor.cell || actor.outcome || consumed.has(actor.id)) continue;
    const move = moved.get(actor.id);
    if (attempts.has(actor.id)) actor.attemptedTicks = (actor.attemptedTicks ?? 0) + 1;
    if (move) {
      actor.facing = Math.atan2(move.to.y - actor.cell.y, move.to.x - actor.cell.x) * 180 / Math.PI + 90;
      actor.cell = { ...move.to }; actor.walkingTicks++; actor.stalledTicks = 0;
      if (actor.phase.endsWith('queue')) {
        const queue = run.queues[actor.phase === 'cashier queue' ? 'cashier' : 'pickup'];
        const index = queue.lane.findIndex(c => sameCell(c, actor.cell)); actor.laneIndex = index < 0 ? null : index;
      }
    } else {
      if (!actor.role && (actor.phase.endsWith('queue') || actor.phase === 'waiting for drink')) actor.waitingTicks++;
      if (attempts.has(actor.id)) {
        actor.stalledTicks++;
        if (!actor.role) { actor.blockedTicks++; run.heatmap[actor.cell.y * run.map.columns + actor.cell.x].ticks++; }
        if (actor.stalledTicks >= scenario.stuckTicks) {
          if (!actor.role) terminate(run, actor, 'stuck', run.tick + 1);
          else for (const c of run.customers) if (!c.outcome) terminate(run, c, 'stuck', run.tick + 1);
        }
      }
    }
  }
  for (const c of run.customers) if (c.cell && !c.outcome && !consumed.has(c.id)) joinIfArrived(run, c);
  run.tick++;
  if (run.tick >= scenario.runLimitTicks) for (const c of run.customers) if (!c.outcome) terminate(run, c, 'timed-out', run.tick);
  run.done = run.customers.every(c => c.outcome);
  return run;
}

export function finishCafe(run) {
  if (!run.done) throw new Error('Cannot publish an incomplete simulation');
  const metrics = deriveMetrics({ scheduled: run.customers.length, customers: run.customers, tickSeconds: run.scenario.tickSeconds });
  const ready = run.orders.filter(o => o.readyTick !== null);
  return structuredClone({
    engineVersion: run.scenario.engineVersion, scenarioVersion: run.scenario.version, layout: run.layout, signature: run.signature, elapsedTicks: run.tick,
    metrics: { ...metrics, seatingCapacity: run.seats.length, dineInRequested: run.customers.filter(c => c.requestedMode === 'dine-in').length,
      dineInServed: run.customers.filter(c => c.wasSeated && c.outcome === 'completed').length,
      switchedToTakeaway: run.customers.filter(c => c.requestedMode === 'dine-in' && c.effectiveMode === 'takeaway').length,
      averageOrderToReadySeconds: ready.length ? ready.reduce((n, o) => n + o.readyTick - o.submittedTick, 0) * run.scenario.tickSeconds / ready.length : null,
      baristaWalkingMeters: run.staff.find(s => s.id === 'barista').walkingTicks * run.map.cellSize },
    outcomes: run.customers, heatmap: run.heatmap, staff: run.staff, seats: run.seats, orders: run.orders,
  });
}
