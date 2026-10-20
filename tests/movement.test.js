import { expect, test } from 'vitest';
import { resolveMovements, trajectoryDistance } from '../src/simulation/movement.js';
import { buildNavigationMap } from '../src/simulation/navigation.js';
const map = buildNavigationMap({ room: { width: 4, height: 4, cellSize: 0.5 }, objects: [] });

test('rejects swaps and following into a cell occupied at tick start', () => {
  const customers = [{ id: 'a', cell: { x: 1, y: 1 } }, { id: 'b', cell: { x: 2, y: 1 } }];
  const accepted = resolveMovements(map, customers, [{ id: 'a', to: { x: 2, y: 1 } }, { id: 'b', to: { x: 3, y: 1 } }]);
  expect(accepted.map((move) => move.id)).toEqual(['b']);
});

test('reserves a destination once, prioritizing longest blocked duration then ID', () => {
  const customers = [{ id: 'a', cell: { x: 1, y: 1 }, stalledTicks: 1 }, { id: 'b', cell: { x: 3, y: 1 }, stalledTicks: 4 }];
  expect(resolveMovements(map, customers, customers.map((c) => ({ id: c.id, to: { x: 2, y: 1 } }))).map((move) => move.id)).toEqual(['b']);
});

test('swept body clearance rejects perpendicular near misses with distinct endpoints', () => {
  const customers = [{ id: 'a', cell: { x: 1, y: 1 } }, { id: 'b', cell: { x: 2, y: 0 } }];
  const moves = resolveMovements(map, customers, [{ id: 'a', to: { x: 2, y: 1 } }, { id: 'b', to: { x: 2, y: 2 } }]);
  expect(moves).toHaveLength(1);
  expect(trajectoryDistance({ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0 })).toBe(0);
});

test('legal cardinal turns must retain 0.4m separation throughout interpolation', () => {
  const a = { x: 1, y: 1 }; const b = { x: 2, y: 2 };
  const customers = [{ id: 'a', cell: a }, { id: 'b', cell: b }];
  const moves = resolveMovements(map, customers, [{ id: 'a', to: { x: 2, y: 1 } }, { id: 'b', to: { x: 1, y: 2 } }]);
  expect(moves).toHaveLength(2);
  expect(trajectoryDistance({ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 0.5 }, { x: 0, y: 0.5 })).toBe(0.5);
});
