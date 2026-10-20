import { cellCenter, cellKey, edgeClear } from './navigation.js';

export function trajectoryDistance(a, b, c, d) {
  const relative = { x: a.x - c.x, y: a.y - c.y };
  const velocity = { x: b.x - a.x - d.x + c.x, y: b.y - a.y - d.y + c.y };
  const magnitude = velocity.x ** 2 + velocity.y ** 2;
  const t = magnitude ? Math.max(0, Math.min(1, -(relative.x * velocity.x + relative.y * velocity.y) / magnitude)) : 0;
  return Math.hypot(relative.x + t * velocity.x, relative.y + t * velocity.y);
}

export function resolveMovements(map, customers, intents) {
  const present = customers.filter((customer) => customer.cell && !customer.outcome);
  const byId = new Map(present.map((customer) => [customer.id, customer]));
  const occupied = new Set(present.map((customer) => cellKey(customer.cell)));
  const accepted = [];
  const destinations = new Set();
  const ordered = [...intents].sort((a, b) => (byId.get(b.id)?.stalledTicks ?? 0) - (byId.get(a.id)?.stalledTicks ?? 0) || a.id.localeCompare(b.id));
  for (const intent of ordered) {
    const customer = byId.get(intent.id);
    if (!customer || !edgeClear(map, customer.cell, intent.to) || occupied.has(cellKey(intent.to)) || destinations.has(cellKey(intent.to))) continue;
    const from = cellCenter(map, customer.cell);
    const to = cellCenter(map, intent.to);
    const safe = present.every((other) => {
      if (other.id === customer.id) return true;
      const movement = accepted.find((move) => move.id === other.id);
      const otherFrom = cellCenter(map, other.cell);
      const otherTo = movement ? cellCenter(map, movement.to) : otherFrom;
      return trajectoryDistance(from, to, otherFrom, otherTo) >= map.radius * 2 - 1e-10;
    });
    if (safe) {
      accepted.push({ id: customer.id, from: { ...customer.cell }, to: { ...intent.to } });
      destinations.add(cellKey(intent.to));
    }
  }
  return accepted;
}
