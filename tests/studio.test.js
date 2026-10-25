import { expect, test } from 'vitest';
import { cafePresets, legacyPresets, identifyPreset, themeForLayout } from '../src/app/presets.js';
import { project, unproject, fitIsometric, sortScene } from '../src/components/isometric.js';
import { initialLayout } from '../src/simulation/layout.js';
import { validatePlacement } from '../src/simulation/navigation.js';
import { createRun, step, finish } from '../src/simulation/engine.js';
import { createScenario } from '../src/simulation/scenario.js';
import { createWorkspace, workspaceReducer } from '../src/app/workspace.js';
import { STORAGE_KEY, createSaveDocument, loadWorkspace } from '../src/app/storage.js';

test('the three expanded presets remain valid, deterministic experiments with honest failures', () => {
  for (const [index, preset] of legacyPresets.entries()) {
    expect(preset.layout.objects).toHaveLength(12);
    expect(validatePlacement(preset.layout, null).valid).toBe(true);
    const run = createRun(preset.layout, createScenario());
    while (!run.done) step(run);
    const { metrics } = finish(run);
    expect(metrics.completed).toBe([24, 21, 24][index]);
    expect(metrics.failures.stuck).toBe([0, 3, 0][index]);
    expect(metrics.congestionPercent).toBeCloseTo([21.1323, 52.5887, 34.6278][index], 3);
    expect(themeForLayout(preset.layout)).toBe(preset.themeId);
  }
});

test('applying a preset preserves snapshots, adds one Undo entry, and respects running/preview locks', () => {
  const first = cafePresets[0].layout;
  const run = createRun(first, createScenario(first)); while (!run.done) step(run);
  const tested = workspaceReducer(createWorkspace(first), { type: 'RUN_COMPLETED', snapshot: finish(run) });
  const action = { type: 'APPLY_PRESET', presetId: cafePresets[1].id };
  const changed = workspaceReducer(tested, action);
  expect(changed.workingLayout).toEqual(cafePresets[1].layout);
  expect(changed.baseline).toBe(tested.baseline);
  expect(changed.latest).toBe(tested.latest);
  expect(changed.tested).toBe(false);
  expect(changed.undo).toHaveLength(1);
  expect(workspaceReducer(changed, { type: 'UNDO' })).toMatchObject({ workingLayout: first, tested: true });
  expect(workspaceReducer(tested, { type: 'APPLY_PRESET', presetId: 'invalid' })).toBe(tested);
  expect(workspaceReducer(tested, { type: 'APPLY_PRESET', presetId: cafePresets[0].id })).toBe(tested);
  for (const locked of [workspaceReducer(tested, { type: 'RUN_STARTED', layout: first }), workspaceReducer(tested, { type: 'SET_VIEW', view: 'baseline' })]) {
    expect(workspaceReducer(locked, action)).toBe(locked);
  }
});

test('legacy and expanded saves round-trip without injecting objects or accepting partial inventories', () => {
  for (const layout of [initialLayout, cafePresets[0].layout]) {
    const saved = createSaveDocument(createWorkspace(layout));
    const raw = JSON.stringify(saved);
    const restored = loadWorkspace({ getItem: (key) => key === STORAGE_KEY ? raw : null });
    expect(saved.schemaVersion).toBe(1);
    expect(restored.kind).toBe('loaded');
    expect(restored.workspace.workingLayout).toEqual(layout);
  }
  const bad = createSaveDocument(createWorkspace(cafePresets[0].layout));
  bad.workingLayout.objects.pop();
  expect(loadWorkspace({ getItem: () => JSON.stringify(bad) }).kind).toBe('invalid');
  bad.workingLayout = structuredClone(cafePresets[0].layout);
  bad.workingLayout.objects.at(-1).type = 'unknown';
  expect(loadWorkspace({ getItem: () => JSON.stringify(bad) }).kind).toBe('invalid');
  expect(identifyPreset(initialLayout)).toBeNull();
});

test('isometric projection round-trips world coordinates and fits floor, height, and annotations', () => {
  expect(project({ x: 10, y: 8 }, 2)).toEqual({ x: 4, y: 18 });
  expect(unproject({ x: -8, y: 4 }, 2)).toEqual({ x: 0, y: 4 });
  for (const scale of [12, 36, 65]) for (const point of [{ x: 0, y: 0 }, { x: 10, y: 8 }, { x: 1.5, y: 5.25 }]) {
    const result = unproject(project(point, scale), scale);
    expect(result.x).toBeCloseTo(point.x); expect(result.y).toBeCloseTo(point.y);
  }
  for (const size of [{ width: 290, height: 440 }, { width: 980, height: 650 }]) {
    const { scale, origin } = fitIsometric(initialLayout.room, size);
    for (const point of [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 }]) {
      const projected = project(point, scale);
      expect(projected.x + origin.x).toBeGreaterThanOrEqual(28);
      expect(projected.x + origin.x).toBeLessThanOrEqual(size.width - 28);
      expect(projected.y + origin.y).toBeGreaterThanOrEqual(28);
      expect(projected.y + origin.y).toBeLessThanOrEqual(size.height - 28);
    }
  }
});

test('depth sorting puts an overlapping bar behind a customer in front of it, independent of input order', () => {
  const bar = { id: 'bar', x: 3, y: 0, width: 3, height: 0.5 };
  const person = { id: 'person', x: 3.1, y: 0.6, width: 0.3, height: 0.3 };
  const behind = { id: 'behind', x: 3.1, y: -0.5, width: 0.3, height: 0.3 };
  expect(sortScene([person, bar, behind]).map((item) => item.id)).toEqual(['behind', 'bar', 'person']);
  expect(sortScene([behind, bar, person])).toEqual(sortScene([person, bar, behind]));
});
