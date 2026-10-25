import { expect, test } from 'vitest';
import { caseStudy, identifyCaseVariant, isCaseBaseline } from '../src/app/caseStudy.js';
import { cafePresets } from '../src/app/presets.js';
import { createRun, finish, step } from '../src/simulation/engine.js';
import { createScenario } from '../src/simulation/scenario.js';
import { validatePlacement } from '../src/simulation/navigation.js';
import { deriveDiagnostics } from '../src/simulation/diagnostics.js';
import { createWorkspace, workspaceReducer } from '../src/app/workspace.js';
import { createSaveDocument, loadWorkspace } from '../src/app/storage.js';
import { compareSnapshots } from '../src/simulation/metrics.js';

const complete = layout => { const r = createRun(layout, createScenario(layout)); while (!r.done) step(r); return { ...finish(r), runNumber: 1 }; };

test('case variants have twelve accessible seats and differ in pickup position only', () => {
  const { a, b } = caseStudy.layouts;
  for (const [key, layout] of Object.entries(caseStudy.layouts)) {
    expect(validatePlacement(layout)).toEqual({ valid: true, reason: null });
    expect(layout.objects.filter(o => o.type === 'chair')).toHaveLength(12);
    expect(identifyCaseVariant(layout)).toBe(key);
    expect(createScenario(layout)).toEqual(createScenario(a));
  }
  const withoutPickup = layout => ({ ...layout, objects: layout.objects.filter(o => o.id !== 'pickup') });
  expect(withoutPickup(a)).toEqual(withoutPickup(b));
  expect(a.objects.find(o => o.id === 'pickup').x).toBe(8);
  expect(b.objects.find(o => o.id === 'pickup').x).toBe(5);
});

test('both cases run deterministically; deriving evidence never changes the snapshot or outcomes', () => {
  for (const layout of Object.values(caseStudy.layouts)) {
    const result = complete(layout); const before = structuredClone(result);
    const diagnostics = deriveDiagnostics(result);
    expect(result).toEqual(before); expect(complete(layout)).toEqual(result);
    expect(diagnostics.production.readySeconds).toBeCloseTo(result.metrics.averageOrderToReadySeconds);
    expect(diagnostics.movement.totalSeconds).toBe(result.outcomes.reduce((sum, c) => sum + c.blockedTicks, 0) * 0.5);
    expect(result.metrics.completed + Object.values(result.metrics.failures).reduce((a, b) => a + b, 0)).toBe(24);
    expect(result.metrics).toMatchObject({ completed: 24, dineInServed: 12, switchedToTakeaway: 6, baristaWalkingMeters: identifyCaseVariant(layout) === 'a' ? 240 : 96 });
  }
});

test('start is one undoable change; B preserves captured results; reload derives case identity', () => {
  const original = cafePresets[0].layout;
  let state = workspaceReducer(createWorkspace(original), { type: 'START_CASE_STUDY' });
  expect(state.undo).toHaveLength(1); expect(state.baseline).toBeNull();
  expect(workspaceReducer(state, { type: 'UNDO' }).workingLayout).toEqual(original);
  state = workspaceReducer(state, { type: 'RUN_COMPLETED', snapshot: complete(state.workingLayout) });
  const a = state.baseline;
  expect(isCaseBaseline(a)).toBe(true);
  state = workspaceReducer(state, { type: 'APPLY_CASE_B' });
  expect(state.baseline).toBe(a); expect(state.latest).toBe(a); expect(state.undo).toHaveLength(2);
  expect(identifyCaseVariant(state.workingLayout)).toBe('b');
  const loaded = loadWorkspace({ getItem: () => JSON.stringify(createSaveDocument(state)) });
  expect(loaded.kind).toBe('loaded'); expect(isCaseBaseline(loaded.workspace.baseline)).toBe(true);
  expect(identifyCaseVariant(loaded.workspace.workingLayout)).toBe('b');
  const historical = structuredClone(loaded.workspace);
  delete historical.latest.orders[0].startedTick;
  const restored = loadWorkspace({ getItem: () => JSON.stringify(createSaveDocument(historical)) });
  expect(restored.workspace.latest).toEqual(historical.latest);
  expect(deriveDiagnostics(restored.workspace.latest).production).toBeNull();
  const restarted = workspaceReducer(state, { type: 'START_CASE_STUDY' });
  expect(restarted.baseline).toBeNull(); expect(restarted.latest).toBeNull();
});

test('case actions obey running/preview locks and require baseline A before B', () => {
  const initial = createWorkspace(cafePresets[0].layout);
  expect(workspaceReducer(initial, { type: 'APPLY_CASE_B' })).toBe(initial);
  for (const state of [{ ...initial, status: 'running' }, { ...initial, view: 'baseline' }]) for (const type of ['START_CASE_STUDY', 'APPLY_CASE_B']) expect(workspaceReducer(state, { type })).toBe(state);
});

test('capacity differences keep favorable supporting deltas cautious, including more seating', () => {
  const a = complete(caseStudy.layouts.a); const b = complete(caseStudy.layouts.b);
  expect(compareSnapshots(a, b)).toMatchObject({ sameCapacity: true, capacityChanged: false });
  const moreSeats = { ...b, metrics: { ...b.metrics, seatingCapacity: 16, averageWaitingSeconds: 0, congestionPercent: 0 } };
  expect(compareSnapshots(a, moreSeats)).toMatchObject({ sameCapacity: false, capacityChanged: true, deltas: { averageWaitingSeconds: { tone: 'caution' }, congestionPercent: { tone: 'caution' } } });
});
