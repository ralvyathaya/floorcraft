import { describe, expect, test } from 'vitest';
import { openLayout } from './fixtures.js';
import { createScenario } from '../src/simulation/scenario.js';
import {
  createWorkspace,
  workspaceReducer,
  workingLayout,
  canonicalSignature,
} from '../src/app/workspace.js';
import * as workspaceModule from '../src/app/workspace.js';

const versions = { engineVersion: createScenario().engineVersion, scenarioVersion: createScenario().version };
const snapshotOf = (layout = openLayout) => ({ ...versions, layout: structuredClone(layout), signature: canonicalSignature(layout), metrics: { completed: 24 }, outcomes: [], heatmap: [] });

describe('workspace state', () => {
  test('accepts a valid move, tracks undo, and marks the layout untested', () => {
    const initial = createWorkspace(openLayout);
    const moved = { ...openLayout.objects[2], x: 1, y: 1.5 };
    const next = workspaceReducer(initial, { type: 'COMMIT_MOVE', object: moved });
    expect(workingLayout(next).objects.find((object) => object.id === moved.id)).toMatchObject({ x: 1, y: 1.5 });
    expect(next.undo).toHaveLength(1);
    expect(next.tested).toBe(false);
    expect(workspaceReducer(next, { type: 'UNDO' }).workingLayout).toEqual(openLayout);
  });

  test('locks edit actions during a run and preserves prior snapshots on stop', () => {
    const initial = createWorkspace(openLayout);
    const running = workspaceReducer(initial, { type: 'RUN_STARTED', layout: openLayout });
    expect(workspaceReducer(running, { type: 'COMMIT_MOVE', object: { ...openLayout.objects[2], x: 1, y: 1.5 } })).toBe(running);
    const stopped = workspaceReducer(running, { type: 'RUN_STOPPED' });
    expect(stopped.baseline).toBeNull();
    expect(stopped.latest).toBeNull();
  });

  test('first completion creates immutable baseline/latest and later completion replaces latest only', () => {
    const first = snapshotOf();
    const second = snapshotOf({ ...openLayout, objects: openLayout.objects.map((object) => object.id === 'table-a' ? { ...object, x: 1, y: 1.5 } : object) });
    second.metrics.completed = 23;
    const withFirst = workspaceReducer(createWorkspace(openLayout), { type: 'RUN_COMPLETED', snapshot: first });
    const withSecond = workspaceReducer(withFirst, { type: 'RUN_COMPLETED', snapshot: second });
    expect(withFirst.baseline).not.toBe(first);
    expect(withFirst.baseline).toEqual({ ...first, runNumber: 1 });
    expect(withSecond.baseline).toEqual({ ...first, runNumber: 1 });
    expect(withSecond.latest).toEqual({ ...second, runNumber: 2 });
    expect(withSecond.baseline.layout).not.toBe(first.layout);
  });

  test('preview mode never replaces working edits and reset keeps them', () => {
    const snapshot = snapshotOf();
    const completed = workspaceReducer(createWorkspace(openLayout), { type: 'RUN_COMPLETED', snapshot });
    const edited = workspaceReducer(completed, { type: 'COMMIT_MOVE', object: { ...openLayout.objects[2], x: 1, y: 1.5 } });
    const preview = workspaceReducer(edited, { type: 'SET_VIEW', view: 'baseline' });
    expect(preview.view).toBe('baseline');
    expect(preview.workingLayout).toEqual(edited.workingLayout);
    const reset = workspaceReducer(preview, { type: 'RESET_COMPARISON' });
    expect(reset.baseline).toBeNull();
    expect(reset.latest).toBeNull();
    expect(reset.workingLayout).toEqual(edited.workingLayout);
  });

  test('rejects invalid moves and ignores Undo/reset/start requests while running', () => {
    const initial = createWorkspace(openLayout);
    expect(workspaceReducer(initial, { type: 'COMMIT_MOVE', object: { ...openLayout.objects[2], x: -1 } })).toBe(initial);
    const edited = workspaceReducer(initial, { type: 'COMMIT_MOVE', object: { ...openLayout.objects[2], x: 1, y: 1.5 } });
    const running = workspaceReducer(edited, { type: 'RUN_STARTED', layout: edited.workingLayout });
    expect(workspaceReducer(running, { type: 'UNDO' })).toBe(running);
    expect(workspaceReducer(running, { type: 'RESET_COMPARISON' })).toBe(running);
    expect(workspaceReducer(running, { type: 'RUN_STARTED' })).toBe(running);
  });

  test('a no-op move adds no history and engine errors preserve the last completed experiment', () => {
    const initial = createWorkspace(openLayout);
    expect(workspaceReducer(initial, { type: 'COMMIT_MOVE', object: openLayout.objects[2] })).toBe(initial);
    const completed = workspaceReducer(initial, { type: 'RUN_COMPLETED', snapshot: { layout: openLayout, signature: canonicalSignature(openLayout) } });
    const error = workspaceReducer(completed, { type: 'RUN_ERROR', message: 'fixture exception' });
    expect(error.latest).toBe(completed.latest);
    expect(error.baseline).toBe(completed.baseline);
    expect(error.message).toContain('fixture exception');
  });

  test('canonical geometry ignores object order, property order and presentation labels', () => {
    const reordered = { objects: [...openLayout.objects].reverse().map(({ id, ...rest }) => ({ ...rest, label: 'New caption', id })), portal: { ...openLayout.portal }, room: { cellSize: 0.5, height: 8, width: 10 } };
    expect(canonicalSignature(reordered)).toBe(canonicalSignature(openLayout));
  });

  test('moving back to tested geometry and Undo both restore tested status', () => {
    const completed = workspaceReducer(createWorkspace(openLayout), { type: 'RUN_COMPLETED', snapshot: snapshotOf() });
    const moved = workspaceReducer(completed, { type: 'COMMIT_MOVE', object: { ...openLayout.objects[2], x: 1, y: 1.5 } });
    expect(moved.tested).toBe(false);
    expect(workspaceReducer(moved, { type: 'UNDO' }).tested).toBe(true);
    expect(workspaceReducer(moved, { type: 'COMMIT_MOVE', object: openLayout.objects[2] }).tested).toBe(true);
  });

  test('previews block Undo and simulation, and missing/unknown previews cannot be selected', () => {
    const initial = createWorkspace(openLayout);
    expect(workspaceReducer(initial, { type: 'SET_VIEW', view: 'latest' })).toBe(initial);
    expect(workspaceReducer(initial, { type: 'SET_VIEW', view: 'unknown' })).toBe(initial);
    const completed = workspaceReducer(initial, { type: 'RUN_COMPLETED', snapshot: snapshotOf() });
    const edited = workspaceReducer(completed, { type: 'COMMIT_MOVE', object: { ...openLayout.objects[2], x: 1, y: 1.5 } });
    const preview = workspaceReducer(edited, { type: 'SET_VIEW', view: 'baseline' });
    expect(workspaceReducer(preview, { type: 'UNDO' })).toBe(preview);
    expect(workspaceReducer(preview, { type: 'RUN_STARTED', layout: preview.workingLayout })).toBe(preview);
    expect(workspaceReducer(preview, { type: 'SET_VIEW', view: 'working' }).workingLayout).toEqual(edited.workingLayout);
  });

  test('snapshot copies resist later mutation and incompatible completions do not replace results', () => {
    const input = snapshotOf();
    const completed = workspaceReducer(createWorkspace(openLayout), { type: 'RUN_COMPLETED', snapshot: input });
    input.layout.objects[0].x = 99;
    input.metrics.completed = 0;
    expect(completed.baseline.layout.objects[0].x).toBe(3);
    expect(Object.isFrozen(completed.baseline.layout.objects[0])).toBe(true);
    for (const incompatible of [{ ...snapshotOf(), engineVersion: 'grid-future' }, { ...snapshotOf(), scenarioVersion: 'different-rush' }, { ...snapshotOf(), signature: 'incorrect' }]) {
      const rejected = workspaceReducer(completed, { type: 'RUN_COMPLETED', snapshot: incompatible });
      expect(rejected.baseline).toBe(completed.baseline);
      expect(rejected.latest).toBe(completed.latest);
      expect(rejected.message).toMatch(/incompatible/i);
    }
  });

  test('canvas presentation selects only matching snapshots and never stale runner drawings', () => {
    const snapshot = { ...snapshotOf(), outcomes: [{ id: 'failed', outcome: 'stuck', cell: { x: 4, y: 5 } }], heatmap: [{ x: 4, y: 5, ticks: 6 }] };
    const completed = workspaceReducer(createWorkspace(openLayout), { type: 'RUN_COMPLETED', snapshot });
    const staleRunner = { customers: [{ id: 'old' }], heatmap: [{ x: 1, y: 1, ticks: 99 }] };
    const tested = workspaceModule.canvasPresentation?.(completed, staleRunner);
    expect(tested?.runView.customers).toEqual(snapshot.outcomes);
    expect(tested?.heatmap).toEqual(snapshot.heatmap);
    const edited = workspaceReducer(completed, { type: 'COMMIT_MOVE', object: { ...openLayout.objects[2], x: 1, y: 1.5 } });
    const untested = workspaceModule.canvasPresentation?.(edited, staleRunner);
    expect(untested?.layout).toEqual(edited.workingLayout);
    expect(untested?.runView).toBeNull();
    expect(untested?.heatmap).toBeNull();
    const preview = workspaceModule.canvasPresentation?.(workspaceReducer(edited, { type: 'SET_VIEW', view: 'baseline' }), staleRunner);
    expect(preview?.layout).toEqual(openLayout);
    expect(preview?.heatmap).toEqual(snapshot.heatmap);
    const running = workspaceModule.canvasPresentation?.(workspaceReducer(edited, { type: 'RUN_STARTED', layout: edited.workingLayout }), staleRunner);
    expect(running?.runView).toBe(staleRunner);
    expect(running?.heatmap).toBeNull();
    const reset = workspaceModule.canvasPresentation?.(workspaceReducer(edited, { type: 'RESET_COMPARISON' }), staleRunner);
    expect(reset?.heatmap).toBeNull();
    expect(reset?.runView).toBeNull();
  });
});
