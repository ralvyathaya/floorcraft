import { describe, expect, test } from 'vitest';
import { openLayout } from './fixtures.js';
import {
  createWorkspace,
  workspaceReducer,
  workingLayout,
  canonicalSignature,
} from '../src/app/workspace.js';

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
    const first = { layout: structuredClone(openLayout), metrics: { completed: 24 }, signature: canonicalSignature(openLayout) };
    const second = { layout: { ...structuredClone(openLayout), objects: openLayout.objects.map((object) => object.id === 'table-a' ? { ...object, x: 1, y: 1.5 } : object) }, metrics: { completed: 23 }, signature: 'changed' };
    const withFirst = workspaceReducer(createWorkspace(openLayout), { type: 'RUN_COMPLETED', snapshot: first });
    const withSecond = workspaceReducer(withFirst, { type: 'RUN_COMPLETED', snapshot: second });
    expect(withFirst.baseline).not.toBe(first);
    expect(withFirst.baseline).toEqual(first);
    expect(withSecond.baseline).toEqual(first);
    expect(withSecond.latest).toEqual(second);
    expect(withSecond.baseline.layout).not.toBe(first.layout);
  });

  test('preview mode never replaces working edits and reset keeps them', () => {
    const snapshot = { layout: structuredClone(openLayout), metrics: { completed: 24 }, signature: canonicalSignature(openLayout) };
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
});
