import { canonicalSignature } from '../simulation/layout.js';
import { createScenario } from '../simulation/scenario.js';
import { cafePresets, identifyPreset, themeForLayout } from './presets.js';
import { validatePlacement } from '../simulation/navigation.js';
import { caseStudy, identifyCaseVariant, isCaseBaseline } from './caseStudy.js';
export { canonicalSignature } from '../simulation/layout.js';

export function compatibleSnapshot(snapshot) {
  const scenario = createScenario(snapshot?.layout);
  return Boolean(snapshot && snapshot.engineVersion === scenario.engineVersion && snapshot.scenarioVersion === scenario.version);
}

function isTested(layout, latest) {
  return compatibleSnapshot(latest) && canonicalSignature(layout) === latest.signature;
}

function freezeSnapshot(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeSnapshot);
    Object.freeze(value);
  }
  return value;
}

export function createWorkspace(layout) {
  return { workingLayout: structuredClone(layout), undo: [], baseline: null, latest: null, view: 'working', status: 'idle', activeRun: null, tested: false, message: null, hydrated: false, storageBlocked: false };
}

export function hydrateWorkspace(saved, layout) {
  const base = createWorkspace(saved?.workingLayout ?? layout);
  return {
    ...base,
    baseline: saved?.baseline ? freezeSnapshot(structuredClone(saved.baseline)) : null,
    latest: saved?.latest ? freezeSnapshot(structuredClone(saved.latest)) : null,
    tested: saved?.latest ? isTested(saved.workingLayout, saved.latest) : false,
    message: saved?.message ?? null,
  };
}

export function workspaceReducer(state, action) {
  if (state.status === 'running' && ['COMMIT_MOVE', 'APPLY_PRESET', 'START_CASE_STUDY', 'APPLY_CASE_B', 'UNDO', 'RESET_COMPARISON', 'SET_VIEW', 'RUN_STARTED'].includes(action.type)) return state;
  if (action.type === 'HYDRATE') return { ...hydrateWorkspace(action.saved, state.workingLayout), hydrated: true };
  if (action.type === 'STORAGE_READY') return { ...state, hydrated: true, storageBlocked: Boolean(action.preserveUnreadable) };
  if (action.type === 'STORAGE_ALLOWED') return { ...state, storageBlocked: false };
  if (action.type === 'START_CASE_STUDY' || action.type === 'APPLY_CASE_B') {
    if (state.view !== 'working' || action.type === 'APPLY_CASE_B' && (!isCaseBaseline(state.baseline) || identifyCaseVariant(state.workingLayout) === 'b')) return state;
    const starting = action.type === 'START_CASE_STUDY';
    const layout = structuredClone(caseStudy.layouts[starting ? 'a' : 'b']);
    return { ...state, hydrated: true, workingLayout: layout, undo: [...state.undo, structuredClone(state.workingLayout)].slice(-30),
      baseline: starting ? null : state.baseline, latest: starting ? null : state.latest,
      tested: !starting && isTested(layout, state.latest), message: null };
  }
  if (action.type === 'APPLY_PRESET') {
    const preset = cafePresets.find((item) => item.id === action.presetId);
    if (state.view !== 'working' || !preset || identifyPreset(state.workingLayout)?.id === preset.id) return state;
    return { ...state, hydrated: true, workingLayout: structuredClone(preset.layout), undo: [...state.undo, structuredClone(state.workingLayout)].slice(-30), tested: isTested(preset.layout, state.latest), message: null };
  }
  if (action.type === 'COMMIT_MOVE') {
    if (state.status === 'running' || state.view !== 'working') return state;
    const changes = Array.isArray(action.object) ? action.object : [action.object];
    if (!changes.length || changes.some(o => !o || !state.workingLayout.objects.some(current => current.id === o.id && current.type === o.type)) || !validatePlacement(state.workingLayout, changes).valid) return state;
    if (state.workingLayout.tableGroups?.some(g => {
      const ids = [g.tableId, ...g.chairIds];
      return changes.some(o => ids.includes(o.id)) && !ids.every(id => changes.some(o => o.id === id));
    })) return state;
    const nextObjects = state.workingLayout.objects.map(object => changes.find(next => next.id === object.id) ?? object);
    if (JSON.stringify(nextObjects) === JSON.stringify(state.workingLayout.objects)) return state;
    const layout = { ...state.workingLayout, themeId: themeForLayout(state.workingLayout), objects: nextObjects.map((object) => structuredClone(object)) };
    return {
      ...state, hydrated: true,
      workingLayout: layout,
      undo: [...state.undo, structuredClone(state.workingLayout)].slice(-30), tested: isTested(layout, state.latest), view: 'working', message: null,
    };
  }
  if (action.type === 'UNDO') {
    if (state.view !== 'working') return state;
    const previous = state.undo.at(-1);
    return previous ? { ...state, workingLayout: previous, undo: state.undo.slice(0, -1), tested: isTested(previous, state.latest), message: null } : state;
  }
  if (action.type === 'RUN_STARTED') return state.view !== 'working' ? state : { ...state, hydrated: true, status: 'running', activeRun: structuredClone(action.layout), message: null };
  if (action.type === 'RUN_STOPPED') return { ...state, hydrated: true, status: 'idle', activeRun: null, message: 'Simulation stopped. Previous completed results are unchanged.' };
  if (action.type === 'RUN_ERROR') return { ...state, hydrated: true, status: 'idle', activeRun: null, message: `Simulation error: ${action.message}. Previous completed results are unchanged.` };
  if (action.type === 'RUN_COMPLETED') {
    if (!compatibleSnapshot(action.snapshot) || canonicalSignature(action.snapshot.layout) !== action.snapshot.signature) {
      return { ...state, status: 'idle', activeRun: null, message: 'Incompatible result rejected. Previous completed results are unchanged.' };
    }
    const snapshot = freezeSnapshot({ ...structuredClone(action.snapshot), runNumber: (state.latest?.runNumber ?? 0) + 1 });
    return { ...state, hydrated: true, status: 'idle', activeRun: null, baseline: state.baseline ?? snapshot, latest: snapshot, tested: isTested(state.workingLayout, snapshot), view: 'working', message: 'Simulation complete.' };
  }
  if (action.type === 'SET_VIEW') {
    if (action.view !== 'working' && (!['baseline', 'latest'].includes(action.view) || !compatibleSnapshot(state[action.view]))) return state;
    return { ...state, view: action.view };
  }
  if (action.type === 'RESET_COMPARISON') return { ...state, hydrated: true, baseline: null, latest: null, view: 'working', tested: false, message: 'Comparison reset. The current layout was kept.' };
  return state;
}

export function workingLayout(state) { return state.workingLayout; }

export function canvasPresentation(state, liveView) {
  if (state.status === 'running') return { layout: state.workingLayout, runView: liveView, heatmap: null };
  const snapshot = state.view === 'working' ? isTested(state.workingLayout, state.latest) ? state.latest : null : state[state.view];
  return {
    layout: state.view === 'working' ? state.workingLayout : snapshot.layout,
    runView: snapshot ? { customers: snapshot.outcomes, staff: snapshot.staff, seats: snapshot.seats, tick: snapshot.elapsedTicks, alpha: 1 } : null,
    heatmap: snapshot?.heatmap ?? null,
  };
}
