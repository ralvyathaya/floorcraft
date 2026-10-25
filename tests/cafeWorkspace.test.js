import { expect, test } from 'vitest';
import { cafePresets, legacyPresets } from '../src/app/presets.js';
import { rotateSelection, moveSelection } from '../src/app/furniture.js';
import { createWorkspace, workspaceReducer, hydrateWorkspace, canvasPresentation } from '../src/app/workspace.js';
import { createSaveDocument, loadWorkspace } from '../src/app/storage.js';
import { createRun, step, finish } from '../src/simulation/engine.js';
import { createScenario } from '../src/simulation/scenario.js';
import { canonicalSignature } from '../src/simulation/layout.js';
import { compareSnapshots } from '../src/simulation/metrics.js';

const completed = layout => { const r = createRun(layout, createScenario(layout)); while (!r.done) step(r); return { ...finish(r), runNumber: 1 }; };

test('table and chairs move/rotate atomically, reject broken access, and Undo in one step', () => {
  const layout = cafePresets[0].layout; const table = layout.objects.find(o => o.id === 'table-1');
  let state = createWorkspace(layout);
  for (let i = 0; i < 4; i++) {
    state = workspaceReducer(state, { type: 'COMMIT_MOVE', object: rotateSelection(state.workingLayout, 'table-1') });
    expect(state.undo).toHaveLength(i + 1);
  }
  expect(canonicalSignature(state.workingLayout)).toBe(canonicalSignature(layout));
  const moved = workspaceReducer(state, { type: 'COMMIT_MOVE', object: moveSelection(state.workingLayout, table.id, 0.5, 0) });
  expect(moved.undo).toHaveLength(5);
  expect(moved.workingLayout.objects.find(o => o.id === 'chair-1-1').x).toBe(layout.objects.find(o => o.id === 'chair-1-1').x + 0.5);
  expect(workspaceReducer(moved, { type: 'UNDO' }).workingLayout).toEqual(state.workingLayout);
  expect(workspaceReducer(state, { type: 'COMMIT_MOVE', object: moveSelection(layout, table.id, -5, 0) })).toBe(state);
  expect(workspaceReducer(state, { type: 'COMMIT_MOVE', object: { ...table, x: table.x + 0.5 } })).toBe(state);
});

test('known historical snapshots survive reload and preview across model versions', () => {
  const old = completed(legacyPresets[0].layout); const next = completed(cafePresets[0].layout);
  const document = createSaveDocument({ workingLayout: cafePresets[0].layout, baseline: old, latest: { ...next, runNumber: 2 } });
  const loaded = loadWorkspace({ getItem: () => JSON.stringify(document) });
  expect(loaded.kind).toBe('loaded');
  expect(loaded.workspace.baseline).toEqual(old);
  expect(loaded.workspace.latest.metrics.dineInServed).toBe(8);
  const state = hydrateWorkspace(loaded.workspace, cafePresets[0].layout);
  expect(state.tested).toBe(true);
  const preview = workspaceReducer(state, { type: 'SET_VIEW', view: 'baseline' });
  expect(canvasPresentation(preview).layout).toEqual(old.layout);
  expect(compareSnapshots(old, next).comparable).toBe(false);
  expect(workspaceReducer(preview, { type: 'COMMIT_MOVE', object: rotateSelection(next.layout, 'table-1') })).toBe(preview);
});

test('lower dine-in fulfillment makes favorable time deltas cautious', () => {
  const a = {
    engineVersion: 'grid-cafe-v2', scenarioVersion: 'mixed-cafe-rush-v2',
    metrics: { scheduled: 24, completed: 24, seatingCapacity: 12, dineInRequested: 18, dineInServed: 12, averageWaitingSeconds: 20, failures: { unreachable: 0, stuck: 0, 'timed-out': 0 } },
  };
  const b = { ...a, metrics: { ...a.metrics, dineInServed: 10, averageWaitingSeconds: 1 } };
  const result = compareSnapshots(a, b);
  expect(result.sameCapacity).toBe(true);
  expect(result.fewerCompleted).toBe(false);
  expect(result.fewerDineIn).toBe(true);
  expect(result.deltas.averageWaitingSeconds.tone).toBe('caution');
});

test('expanded saves reject malformed model metadata without throwing or losing the raw document', () => {
  for (const mutate of [
    l => l.modelId = 'unknown', l => l.tableGroups = null, l => l.tableGroups[0].id = null,
    l => l.tableGroups[0].chairIds = [], l => l.staffZone.height = 4,
    l => l.waitingZone.width = null, l => l.objects.find(o => o.type === 'chair').width = 1,
    l => l.objects[0].serviceFace = 'east',
  ]) {
    const doc = createSaveDocument(createWorkspace(cafePresets[0].layout)); mutate(doc.workingLayout);
    const raw = JSON.stringify(doc); const result = loadWorkspace({ getItem: () => raw });
    expect(result.kind).toBe('invalid'); expect(result.raw).toBe(raw);
  }
});

test('corrupt saved staff is rejected without throwing; the working layout and other result survive', () => {
  const good = completed(cafePresets[0].layout);
  const bad = { ...structuredClone(good), staff: [null, {}] };
  const doc = createSaveDocument({ workingLayout: good.layout, baseline: good, latest: bad });
  const result = loadWorkspace({ getItem: () => JSON.stringify(doc) });
  expect(result.kind).toBe('loaded');
  expect(result.workspace.baseline).toEqual(good);
  expect(result.workspace.latest).toBeNull();
  expect(result.workspace.workingLayout).toEqual(good.layout);
});

test('a collected drink followed by a failed seated journey remains a valid saved experiment', () => {
  const layout = cafePresets[0].layout;
  const run = createRun(layout, { ...createScenario(layout), runLimitTicks: 150 });
  while (!run.done) step(run);
  const snapshot = { ...finish(run), runNumber: 1 };
  expect(snapshot.metrics.completed).toBe(0);
  expect(snapshot.orders.some(o => o.status === 'collected')).toBe(true);
  const doc = createSaveDocument({ workingLayout: layout, baseline: snapshot, latest: snapshot });
  const loaded = loadWorkspace({ getItem: () => JSON.stringify(doc) });
  expect(loaded.workspace.latest).toEqual(snapshot);
});
