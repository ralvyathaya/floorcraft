import { canonicalSignature } from '../simulation/layout.js';
import { createScenario } from '../simulation/scenario.js';
export { canonicalSignature } from '../simulation/layout.js';

const scenario = createScenario();
export function compatibleSnapshot(snapshot) {
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
  if (state.status === 'running' && ['COMMIT_MOVE', 'UNDO', 'RESET_COMPARISON', 'SET_VIEW', 'RUN_STARTED'].includes(action.type)) return state;
  if (action.type === 'HYDRATE') return { ...hydrateWorkspace(action.saved, state.workingLayout), hydrated: true };
  if (action.type === 'STORAGE_READY') return { ...state, hydrated: true, storageBlocked: Boolean(action.preserveUnreadable) };
  if (action.type === 'STORAGE_ALLOWED') return { ...state, storageBlocked: false };
  if (action.type === 'COMMIT_MOVE') {
    if (state.status === 'running' || state.view !== 'working') return state;
    const current = state.workingLayout.objects.find((object) => object.id === action.object.id);
    const nextObjects = state.workingLayout.objects.map((object) => object.id === action.object.id ? action.object : object);
    const inside = action.object.x >= 0 && action.object.y >= 0 && action.object.x + action.object.width <= state.workingLayout.room.width && action.object.y + action.object.height <= state.workingLayout.room.height;
    const overlaps = nextObjects.some((object) => object.id !== action.object.id && action.object.x < object.x + object.width && action.object.x + action.object.width > object.x && action.object.y < object.y + object.height && action.object.y + action.object.height > object.y);
    if (!current || !inside || overlaps || JSON.stringify(current) === JSON.stringify(action.object)) return state;
    const layout = { ...state.workingLayout, objects: nextObjects.map((object) => structuredClone(object)) };
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
    runView: snapshot ? { customers: snapshot.outcomes, tick: snapshot.elapsedTicks, alpha: 1 } : null,
    heatmap: snapshot?.heatmap ?? null,
  };
}
