import { canonicalSignature } from './workspace.js';
import { createScenario } from '../simulation/scenario.js';
import { validatePlacement } from '../simulation/navigation.js';

export const STORAGE_KEY = 'floorcraft.workspace.v1';
export const STORAGE_SCHEMA_VERSION = 1;
const scenario = createScenario();
const expectedTypes = new Map([
  ['cashier', 'counter'], ['pickup', 'counter'], ['table-a', 'table'], ['table-b', 'table'],
  ['chair-a', 'chair'], ['chair-b', 'chair'],
]);

const isRecord = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const finiteOrNull = (value) => value === null || finite(value);

function validLayout(layout) {
  if (!isRecord(layout) || !isRecord(layout.room) || !isRecord(layout.portal) || !Array.isArray(layout.objects)) return false;
  if (![layout.room.width, layout.room.height, layout.room.cellSize].every(finite) || layout.room.width <= 0 || layout.room.height <= 0 || layout.room.cellSize <= 0) return false;
  if (![layout.portal.x, layout.portal.y, layout.portal.width, layout.portal.height].every(finite)) return false;
  if (layout.portal.width <= 0 || layout.portal.height <= 0 || layout.portal.x < 0 || layout.portal.y < 0 || layout.portal.x + layout.portal.width > layout.room.width || layout.portal.y + layout.portal.height > layout.room.height) return false;
  if (layout.objects.length !== expectedTypes.size) return false;
  const ids = new Set();
  for (const object of layout.objects) {
    if (!isRecord(object) || ids.has(object.id) || expectedTypes.get(object.id) !== object.type) return false;
    ids.add(object.id);
    if (![object.x, object.y, object.width, object.height].every(finite) || object.width <= 0 || object.height <= 0) return false;
    if (object.serviceFace !== undefined && !['north', 'south', 'east', 'west'].includes(object.serviceFace)) return false;
  }
  return validatePlacement(layout, null).valid && canonicalSignature(layout) === canonicalSignature({ ...layout, objects: layout.objects.map((object) => ({ ...object, label: 'ignored' })) });
}

function validMetrics(metrics, scheduled) {
  if (!isRecord(metrics) || metrics.scheduled !== scheduled || !Number.isInteger(metrics.completed) || metrics.completed < 0 || metrics.completed > scheduled) return false;
  if (![metrics.averageWaitingSeconds, metrics.averageWalkingSeconds, metrics.congestionPercent, metrics.outsideHoldingSeconds].every(finiteOrNull)) return false;
  if (metrics.congestionPercent !== null && (metrics.congestionPercent < 0 || metrics.congestionPercent > 100)) return false;
  if (!Number.isInteger(metrics.outsideDelayed) || metrics.outsideDelayed < 0) return false;
  if (!isRecord(metrics.failures) || !['unreachable', 'stuck', 'timed-out'].every((key) => Number.isInteger(metrics.failures[key]) && metrics.failures[key] >= 0)) return false;
  return Object.values(metrics.failures).reduce((sum, count) => sum + count, 0) + metrics.completed === scheduled;
}

function validSnapshot(snapshot, layout) {
  if (!isRecord(snapshot) || snapshot.engineVersion !== scenario.engineVersion || snapshot.scenarioVersion !== scenario.version || !validLayout(snapshot.layout)) return false;
  if (canonicalSignature(snapshot.layout) !== snapshot.signature || !Number.isInteger(snapshot.runNumber) || snapshot.runNumber < 1 || !Number.isInteger(snapshot.elapsedTicks) || snapshot.elapsedTicks < 0 || !validMetrics(snapshot.metrics, scenario.customers.length)) return false;
  if (!Array.isArray(snapshot.outcomes) || snapshot.outcomes.length !== scenario.customers.length) return false;
  const ids = new Set(snapshot.outcomes.map((outcome) => outcome?.id));
  if (ids.size !== scenario.customers.length || !scenario.customers.every((customer) => ids.has(customer.id))) return false;
  if (snapshot.outcomes.some((outcome) => !isRecord(outcome) || !['completed', 'unreachable', 'stuck', 'timed-out'].includes(outcome.outcome))) return false;
  const completed = snapshot.outcomes.filter((outcome) => outcome.outcome === 'completed').length;
  if (completed !== snapshot.metrics.completed) return false;
  if (!Array.isArray(snapshot.heatmap) || snapshot.heatmap.length !== layout.room.width / layout.room.cellSize * (layout.room.height / layout.room.cellSize)) return false;
  if (snapshot.heatmap.some((cell) => !isRecord(cell) || !Number.isInteger(cell.x) || !Number.isInteger(cell.y) || !Number.isFinite(cell.ticks) || cell.ticks < 0)) return false;
  return true;
}

export function createSaveDocument(workspace) {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    workingLayout: structuredClone(workspace.workingLayout),
    baseline: workspace.baseline ? structuredClone(workspace.baseline) : null,
    latest: workspace.latest ? structuredClone(workspace.latest) : null,
  };
}

function readRaw(storage) {
  try { return { raw: storage.getItem(STORAGE_KEY), error: null }; } catch (error) { return { raw: null, error }; }
}

export function loadWorkspace(storage) {
  const read = readRaw(storage);
  if (read.error) return { kind: 'unavailable', workspace: null, raw: null, message: 'Changes cannot be saved in this browser.' };
  if (read.raw === null) return { kind: 'empty', workspace: null, raw: null, message: null };
  let document;
  try { document = JSON.parse(read.raw); } catch { return { kind: 'invalid', workspace: null, raw: read.raw, message: 'The saved workspace could not be recovered. Review it before replacing it.' }; }
  if (!isRecord(document) || document.schemaVersion !== STORAGE_SCHEMA_VERSION || !validLayout(document.workingLayout)) return { kind: 'invalid', workspace: null, raw: read.raw, message: 'The saved workspace could not be recovered. Review it before replacing it.' };
  let message = null;
  const results = {};
  for (const key of ['baseline', 'latest']) {
    if (document[key] === null) results[key] = null;
    else if (validSnapshot(document[key], document.workingLayout)) results[key] = structuredClone(document[key]);
    else { results[key] = null; message = message ? `${message} ${key} and other incompatible completed results were cleared.` : `Incompatible ${key} completed results were cleared; the working layout was kept.`; }
  }
  return { kind: 'loaded', workspace: { workingLayout: structuredClone(document.workingLayout), baseline: results.baseline, latest: results.latest }, raw: read.raw, message };
}

export function saveWorkspace(storage, workspace) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(createSaveDocument(workspace))); return { ok: true, kind: 'saved', message: null }; }
  catch { return { ok: false, kind: 'unavailable', message: 'Changes cannot be saved in this browser.' }; }
}

export function replaceUnreadableSave(storage, workspace) {
  return saveWorkspace(storage, workspace);
}
