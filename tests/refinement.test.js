import { expect, test } from 'vitest';
import { rotateFurniture } from '../src/app/furniture.js';
import { legacyPresets as cafePresets, cafePresets as functionalPresets, identifyPreset, themeForLayout } from '../src/app/presets.js';
import { createWorkspace, workspaceReducer, canonicalSignature } from '../src/app/workspace.js';
import { createSaveDocument, loadWorkspace } from '../src/app/storage.js';
import { initialLayout } from '../src/simulation/layout.js';
import { serviceCell, validatePlacement } from '../src/simulation/navigation.js';
import { createRun, step, finish } from '../src/simulation/engine.js';
import { createScenario } from '../src/simulation/scenario.js';

test('four clockwise turns restore geometry and service face without moving the anchor', () => {
  for (const object of initialLayout.objects) {
    let turned = object;
    for (let n = 0; n < 4; n++) {
      turned = rotateFurniture(turned);
      expect([turned.x, turned.y]).toEqual([object.x, object.y]);
    }
    expect(turned).toEqual({ ...object, rotation: 0 });
  }
  expect(rotateFurniture(initialLayout.objects[0])).toMatchObject({ width: 0.5, height: 1, rotation: 90, serviceFace: 'west' });
  expect(serviceCell(initialLayout, rotateFurniture(initialLayout.objects[0]))).not.toEqual(serviceCell(initialLayout, initialLayout.objects[0]));
});

test('rotation cannot extend outside the room or point service through its boundary', () => {
  for (const change of [{ id: 'table-a', x: 9, y: 4, width: 1, height: 1.5, rotation: 90 }, { id: 'cashier', x: 0, y: 1 }]) {
    const layout = structuredClone(cafePresets[0].layout);
    const object = layout.objects.find(o => o.id === change.id); Object.assign(object, change);
    expect(validatePlacement(layout, null).valid).toBe(true);
    const state = createWorkspace(layout);
    expect(workspaceReducer(state, { type: 'COMMIT_MOVE', object: rotateFurniture(object) })).toBe(state);
  }
});

test('visual-only square rotation stays tested and snapshots preserve their captured appearances', () => {
  const run = createRun(cafePresets[0].layout, createScenario()); while (!run.done) step(run);
  const tested = workspaceReducer(createWorkspace(run.layout), { type: 'RUN_COMPLETED', snapshot: finish(run) });
  const chair = tested.workingLayout.objects.find(o => o.id === 'chair-a');
  const rotated = workspaceReducer(tested, { type: 'COMMIT_MOVE', object: rotateFurniture(chair) });
  expect(rotated.tested).toBe(true);
  expect(rotated.baseline.layout.objects.find(o => o.id === chair.id).rotation).toBeUndefined();
  const split = workspaceReducer(rotated, { type: 'APPLY_PRESET', presetId: 'split' });
  const next = createRun(split.workingLayout, createScenario(split.workingLayout)); while (!next.done) step(next);
  const complete = workspaceReducer(split, { type: 'RUN_COMPLETED', snapshot: finish(next) });
  const saved = loadWorkspace({ getItem: () => JSON.stringify(createSaveDocument(complete)) });
  expect(saved.kind).toBe('loaded');
  expect(saved.workspace.baseline.layout.themeId).toBe('oak');
  expect(saved.workspace.latest.layout.themeId).toBe('terracotta');
});

test('rotation uses placement validation, Undo, and running/preview locks', () => {
  const state = createWorkspace(cafePresets[0].layout);
  const table = state.workingLayout.objects.find(o => o.id === 'table-a');
  const action = { type: 'COMMIT_MOVE', object: rotateFurniture(table) };
  const changed = workspaceReducer(state, action);
  expect(changed.undo).toHaveLength(1);
  expect(changed.workingLayout.objects.find(o => o.id === table.id)).toEqual(action.object);
  expect(identifyPreset(changed.workingLayout)).toBeNull();
  expect(workspaceReducer(changed, { type: 'UNDO' }).workingLayout).toEqual(state.workingLayout);
  const bar = state.workingLayout.objects.find(o => o.id === 'service-bar');
  expect(workspaceReducer(state, { type: 'COMMIT_MOVE', object: rotateFurniture(bar) })).toBe(state);
  const moved = { ...table, x: 0, y: 3.5, width: 0.5, height: 1 };
  expect(workspaceReducer(state, { type: 'COMMIT_MOVE', object: moved })).toBe(state);
  for (const locked of [{ ...state, status: 'running' }, { ...state, view: 'baseline' }]) expect(workspaceReducer(locked, action)).toBe(locked);
});

test('themes remain after editing old presets, while legacy saves and geometry identities stay compatible', () => {
  expect(cafePresets.map(p => p.layout.themeId)).toEqual(['oak', 'industrial', 'terracotta']);
  const old = structuredClone(cafePresets[1].layout); delete old.themeId;
  expect(themeForLayout(old)).toBe('industrial');
  expect(themeForLayout(initialLayout)).toBe('oak');
  const state = createWorkspace(old);
  const chair = old.objects.find(o => o.id === 'chair-a');
  const changed = workspaceReducer(state, { type: 'COMMIT_MOVE', object: rotateFurniture(chair) });
  expect(changed.workingLayout.themeId).toBe('industrial');
  expect(identifyPreset(changed.workingLayout)).toBeNull();
  expect(canonicalSignature(changed.workingLayout)).toBe(canonicalSignature(old));
  const restored = loadWorkspace({ getItem: () => JSON.stringify(createSaveDocument(changed)) });
  expect(restored.kind).toBe('loaded');
  expect(restored.workspace.workingLayout).toEqual(changed.workingLayout);
  expect(workspaceReducer(changed, { type: 'APPLY_PRESET', presetId: 'compact' }).workingLayout).toEqual(functionalPresets[1].layout);
});

test('save validation rejects invalid theme and rotation metadata without coercion', () => {
  for (const bad of [null, 'unknown', 1]) {
    const doc = createSaveDocument(createWorkspace(cafePresets[0].layout)); doc.workingLayout.themeId = bad;
    expect(loadWorkspace({ getItem: () => JSON.stringify(doc) }).kind).toBe('invalid');
  }
  for (const bad of [null, '90', 45, 360, -90]) {
    const doc = createSaveDocument(createWorkspace(cafePresets[0].layout)); doc.workingLayout.objects[0].rotation = bad;
    expect(loadWorkspace({ getItem: () => JSON.stringify(doc) }).kind).toBe('invalid');
  }
});
