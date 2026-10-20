import { describe, expect, test } from 'vitest';
import { blockedLayout, openLayout } from './fixtures.js';
import {
  buildNavigationMap,
  findRoute,
  validatePlacement,
  worldToCell,
} from '../src/simulation/navigation.js';

describe('shared floor geometry and navigation', () => {
  test('rejects overlap and out-of-bounds placements with structured reasons', () => {
    expect(validatePlacement(openLayout, { id: 'table-a', type: 'table', x: 6.5, y: 5, width: 1.5, height: 1 }).reason).toBe('overlap');
    expect(validatePlacement(openLayout, { id: 'table-a', type: 'table', x: 9.5, y: 7.5, width: 1.5, height: 1 }).reason).toBe('outside-room');
  });

  test('accepts a tight layout when entrance, services, and exit remain connected', () => {
    expect(validatePlacement(openLayout, { id: 'table-a', type: 'table', x: 1.5, y: 5.5, width: 1.5, height: 1 }).valid).toBe(true);
  });

  test('uses the same blocked cells for routes and placement access', () => {
    const map = buildNavigationMap(blockedLayout);
    const start = worldToCell(blockedLayout, { x: 0.25, y: 4 });
    const goal = worldToCell(blockedLayout, { x: 3.25, y: 1.75 });
    const route = findRoute(map, start, goal);
    expect(route).toBeNull();
  });

  test('moving a table changes the shortest route length', () => {
    const map = buildNavigationMap(openLayout);
    const start = worldToCell(openLayout, { x: 2.75, y: 5.25 });
    const goal = worldToCell(openLayout, { x: 4.75, y: 5.25 });
    const openRoute = findRoute(map, start, goal);
    const movedMap = buildNavigationMap({ ...openLayout, objects: openLayout.objects.map((object) => object.id === 'table-a' ? { ...object, x: 1, y: 1.5 } : object) });
    const movedRoute = findRoute(movedMap, start, goal);
    expect(movedRoute).toHaveLength(5);
    expect(openRoute.length).toBeGreaterThan(movedRoute.length);
  });

  test('rejects blocked entrance and unreachable pickup without disallowing tight accessible paths', () => {
    expect(validatePlacement(openLayout, { ...openLayout.objects[2], x: 0, y: 3.5 }).reason).toBe('entrance-blocked');
    const isolated = { ...openLayout, objects: [...openLayout.objects, { id: 'wall', type: 'table', x: 5, y: 0, width: 0.5, height: 8 }] };
    expect(validatePlacement(isolated).reason).toBe('pickup-unreachable');
  });

  test('clear endpoints do not permit a swept edge through a thin obstacle', () => {
    const layout = { room: { width: 2, height: 2, cellSize: 0.5 }, objects: [{ id: 'thin', x: 0.49, y: 0, width: 0.02, height: 2 }] };
    const map = buildNavigationMap(layout);
    expect(map.blocked.has('0,1')).toBe(false);
    expect(map.blocked.has('1,1')).toBe(false);
    expect(findRoute(map, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeNull();
  });
});
