export const cellKey = ({ x, y }) => `${x},${y}`;
export const sameCell = (a, b) => Boolean(a && b && a.x === b.x && a.y === b.y);
export const worldToCell = (layout, point) => ({
  x: Math.floor(point.x / layout.room.cellSize),
  y: Math.floor(point.y / layout.room.cellSize),
});
export const cellCenter = (map, cell) => ({
  x: (cell.x + 0.5) * map.cellSize,
  y: (cell.y + 0.5) * map.cellSize,
});

function intersectsBody(point, object, radius) {
  const dx = point.x - Math.max(object.x, Math.min(point.x, object.x + object.width));
  const dy = point.y - Math.max(object.y, Math.min(point.y, object.y + object.height));
  return dx * dx + dy * dy < radius * radius - 1e-10;
}

export function buildNavigationMap(layout) {
  const { width, height, cellSize } = layout.room;
  const map = { width, height, cellSize, radius: 0.2, columns: Math.round(width / cellSize), rows: Math.round(height / cellSize), blocked: new Set(), objects: layout.objects };
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.columns; x++) {
      const cell = { x, y };
      const point = cellCenter(map, cell);
      if (point.x < map.radius || point.y < map.radius || point.x > width - map.radius || point.y > height - map.radius || layout.objects.some((object) => intersectsBody(point, object, map.radius))) {
        map.blocked.add(cellKey(cell));
      }
    }
  }
  return map;
}

export function walkable(map, cell) {
  return Boolean(cell && cell.x >= 0 && cell.y >= 0 && cell.x < map.columns && cell.y < map.rows && !map.blocked.has(cellKey(cell)));
}

// Cardinal grid edges have an axis-aligned swept capsule. The nearest point
// of each rectangle to the swept center segment establishes body clearance.
export function edgeClear(map, from, to) {
  if (!walkable(map, from) || !walkable(map, to) || Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return false;
  const a = cellCenter(map, from);
  const b = cellCenter(map, to);
  return !map.objects.some((object) => {
    const dx = Math.max(object.x - Math.max(a.x, b.x), Math.min(a.x, b.x) - object.x - object.width, 0);
    const dy = Math.max(object.y - Math.max(a.y, b.y), Math.min(a.y, b.y) - object.y - object.height, 0);
    return dx * dx + dy * dy < map.radius * map.radius - 1e-10;
  });
}

export function neighbors(map, cell) {
  return [{ x: cell.x + 1, y: cell.y }, { x: cell.x, y: cell.y + 1 }, { x: cell.x - 1, y: cell.y }, { x: cell.x, y: cell.y - 1 }].filter((next) => edgeClear(map, cell, next));
}

export function findRoute(map, start, goal, unavailable = new Set()) {
  const goals = Array.isArray(goal) ? goal : [goal];
  const goalKeys = new Set(goals.filter((cell) => walkable(map, cell)).map(cellKey));
  if (!walkable(map, start) || goalKeys.size === 0) return null;
  const queue = [start];
  const parents = new Map([[cellKey(start), null]]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (goalKeys.has(cellKey(current))) {
      const route = [];
      for (let cell = current; cell; cell = parents.get(cellKey(cell))) route.push(cell);
      return route.reverse();
    }
    for (const next of neighbors(map, current)) {
      const key = cellKey(next);
      if (!parents.has(key) && !unavailable.has(key)) {
        parents.set(key, current);
        queue.push(next);
      }
    }
  }
  return null;
}

export function serviceCell(layout, object) {
  const s = layout.room.cellSize;
  const middle = { x: object.x + object.width / 2, y: object.y + object.height / 2 };
  if (object.serviceFace === 'north') middle.y = object.y - s / 2;
  else if (object.serviceFace === 'east') middle.x = object.x + object.width + s / 2;
  else if (object.serviceFace === 'west') middle.x = object.x - s / 2;
  else middle.y = object.y + object.height + s / 2;
  return worldToCell(layout, middle);
}

export const portalCell = (layout) => worldToCell(layout, { x: layout.portal.x + layout.portal.width / 2, y: layout.portal.y + layout.portal.height / 2 });

export function validatePlacement(layout, candidate) {
  const objects = candidate ? layout.objects.map((object) => object.id === candidate.id ? candidate : object) : layout.objects;
  for (const object of objects) {
    if (![object.x, object.y, object.width, object.height].every(Number.isFinite) || object.width <= 0 || object.height <= 0 || object.x < 0 || object.y < 0 || object.x + object.width > layout.room.width || object.y + object.height > layout.room.height) return { valid: false, reason: 'outside-room' };
    if (objects.some((other) => other.id !== object.id && object.x < other.x + other.width && object.x + object.width > other.x && object.y < other.y + other.height && object.y + object.height > other.y)) return { valid: false, reason: 'overlap' };
  }
  const next = { ...layout, objects };
  const map = buildNavigationMap(next);
  const portal = portalCell(next);
  if (!walkable(map, portal) || !neighbors(map, portal).length) return { valid: false, reason: 'entrance-blocked' };
  let previous = portal;
  for (const id of ['cashier', 'pickup']) {
    const counter = objects.find((object) => object.id === id);
    const approach = counter && serviceCell(next, counter);
    if (!approach || sameCell(approach, portal) || !findRoute(map, previous, approach) || neighbors(map, approach).length === 0) return { valid: false, reason: `${id}-unreachable` };
    previous = approach;
  }
  if (!findRoute(map, previous, portal)) return { valid: false, reason: 'exit-unreachable' };
  return { valid: true, reason: null };
}
