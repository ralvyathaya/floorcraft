import { describe, expect, test } from 'vitest';
import { initialLayout } from '../src/simulation/layout.js';
import { createScenario } from '../src/simulation/scenario.js';
import { canonicalSignature } from '../src/app/workspace.js';
import {
  STORAGE_KEY,
  createSaveDocument,
  loadWorkspace,
  saveWorkspace,
  replaceUnreadableSave,
} from '../src/app/storage.js';

const scenario = createScenario();
const metrics = { scheduled: 24, completed: 24, averageWaitingSeconds: 1, averageWalkingSeconds: 2, congestionPercent: 3, failures: { unreachable: 0, stuck: 0, 'timed-out': 0 }, outsideDelayed: 0, outsideHoldingSeconds: 0 };
const outcome = (id, outcomeName = 'completed') => ({ id, outcome: outcomeName });
const snapshot = (layout = initialLayout, overrides = {}) => ({
  engineVersion: scenario.engineVersion,
  scenarioVersion: scenario.version,
  runNumber: 1,
  layout: structuredClone(layout),
  signature: canonicalSignature(layout),
  elapsedTicks: 20,
  metrics: { ...metrics, ...overrides.metrics, scheduled: 24, completed: overrides.metrics?.completed ?? 24 },
  outcomes: scenario.customers.map((customer) => outcome(customer.id)),
  heatmap: Array.from({ length: 320 }, (_, index) => ({ x: index % 20, y: Math.floor(index / 20), ticks: 0 })),
  ...overrides,
});
const workspace = (overrides = {}) => ({ workingLayout: structuredClone(initialLayout), baseline: null, latest: null, ...overrides });

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    raw(key = STORAGE_KEY) { return values.get(key); },
  };
}

describe('versioned workspace storage', () => {
  test('round-trips only working layout and completed snapshots', () => {
    const storage = memoryStorage();
    const saved = workspace({ baseline: snapshot(), latest: snapshot() });
    saveWorkspace(storage, saved);
    const loaded = loadWorkspace(storage);
    expect(loaded.kind).toBe('loaded');
    expect(loaded.workspace).toEqual({ workingLayout: saved.workingLayout, baseline: saved.baseline, latest: saved.latest });
    expect(JSON.parse(storage.raw())).toEqual(createSaveDocument(saved));
  });

  test('empty storage returns the bundled workspace without a warning', () => {
    expect(loadWorkspace(memoryStorage())).toEqual({ kind: 'empty', workspace: null, raw: null, message: null });
  });

  test('rejects malformed, nonfinite, overlapping and inaccessible geometry', () => {
    const cases = [
      '{not-json',
      JSON.stringify({ schemaVersion: 1, workingLayout: { ...initialLayout, room: { ...initialLayout.room, width: null } }, baseline: null, latest: null }),
      JSON.stringify({ schemaVersion: 1, workingLayout: { ...initialLayout, objects: [...initialLayout.objects, { ...initialLayout.objects[0], id: 'duplicate' }] }, baseline: null, latest: null }),
      JSON.stringify({ schemaVersion: 1, workingLayout: { ...initialLayout, objects: initialLayout.objects.map((object) => object.id === 'table-a' ? { ...object, x: 9, y: 7.5 } : object) }, baseline: null, latest: null }),
    ];
    for (const raw of cases) {
      const result = loadWorkspace(memoryStorage({ [STORAGE_KEY]: raw }));
      expect(result.kind).toBe('invalid');
      expect(result.raw).toBe(raw);
      expect(result.message).toMatch(/could not be recovered/i);
    }
  });

  test('rejects malformed snapshots, outcome mismatches, bad heatmaps and changed versions', () => {
    const invalidSnapshots = [
      { ...snapshot(), metrics: { ...metrics, completed: 1, failures: { unreachable: 0, stuck: 0, 'timed-out': 23 } } },
      { ...snapshot(), outcomes: [outcome('customer-01'), outcome('customer-01')] },
      { ...snapshot(), heatmap: [{ x: 0, y: 0, ticks: -1 }] },
      { ...snapshot(), engineVersion: 'future-grid' },
      { ...snapshot(), signature: 'wrong' },
    ];
    for (const invalid of invalidSnapshots) {
      const result = loadWorkspace(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, workingLayout: structuredClone(initialLayout), baseline: invalid, latest: null }) }));
      expect(result.kind).toBe('loaded');
      expect(result.workspace.workingLayout).toEqual(initialLayout);
      expect(result.workspace.baseline).toBeNull();
      expect(result.message).toMatch(/completed results were cleared/i);
    }
  });

  test('preserves valid geometry while clearing only incompatible results', () => {
    const moved = { ...structuredClone(initialLayout), objects: initialLayout.objects.map((object) => object.id === 'table-a' ? { ...object, x: 1, y: 1.5 } : object) };
    const result = loadWorkspace(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, workingLayout: moved, baseline: { ...snapshot(), scenarioVersion: 'future-rush' }, latest: snapshot() }) }));
    expect(result.kind).toBe('loaded');
    expect(result.workspace.workingLayout).toEqual(moved);
    expect(result.workspace.baseline).toBeNull();
    expect(result.workspace.latest).toEqual(snapshot());
    expect(result.message).toMatch(/baseline/i);
  });

  test('keeps unreadable raw data until explicit replacement consent', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{broken' });
    const loaded = loadWorkspace(storage);
    expect(storage.raw()).toBe('{broken');
    replaceUnreadableSave(storage, workspace());
    expect(loadWorkspace(storage).kind).toBe('loaded');
    expect(storage.raw()).not.toBe('{broken');
  });

  test('reports denied and quota-limited storage without throwing', () => {
    const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    expect(loadWorkspace(denied).kind).toBe('unavailable');
    expect(() => saveWorkspace(denied, workspace())).not.toThrow();
    const quota = { setItem() { throw new Error('quota'); } };
    expect(saveWorkspace(quota, workspace())).toMatchObject({ ok: false, kind: 'unavailable' });
  });
});
