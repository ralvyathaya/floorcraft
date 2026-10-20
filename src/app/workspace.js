export function canonicalSignature(layout) {
  return JSON.stringify({ ...layout, objects: [...layout.objects].sort((a, b) => a.id.localeCompare(b.id)) });
}

export function createWorkspace(layout) {
  return { workingLayout: structuredClone(layout), undo: [], baseline: null, latest: null, view: 'working', status: 'idle', activeRun: null, tested: false, message: null };
}

export function workspaceReducer(state, action) {
  if (state.status === 'running' && ['COMMIT_MOVE', 'UNDO', 'RESET_COMPARISON', 'SET_VIEW', 'RUN_STARTED'].includes(action.type)) return state;
  if (action.type === 'COMMIT_MOVE') {
    if (state.status === 'running' || state.view !== 'working') return state;
    const current = state.workingLayout.objects.find((object) => object.id === action.object.id);
    const nextObjects = state.workingLayout.objects.map((object) => object.id === action.object.id ? action.object : object);
    const inside = action.object.x >= 0 && action.object.y >= 0 && action.object.x + action.object.width <= state.workingLayout.room.width && action.object.y + action.object.height <= state.workingLayout.room.height;
    const overlaps = nextObjects.some((object) => object.id !== action.object.id && action.object.x < object.x + object.width && action.object.x + action.object.width > object.x && action.object.y < object.y + object.height && action.object.y + action.object.height > object.y);
    if (!current || !inside || overlaps || JSON.stringify(current) === JSON.stringify(action.object)) return state;
    return {
      ...state,
      workingLayout: { ...state.workingLayout, objects: nextObjects.map((object) => structuredClone(object)) },
      undo: [...state.undo, structuredClone(state.workingLayout)].slice(-30), tested: false, view: 'working',
    };
  }
  if (action.type === 'UNDO') {
    const previous = state.undo.at(-1);
    return previous ? { ...state, workingLayout: previous, undo: state.undo.slice(0, -1), tested: state.latest ? canonicalSignature(previous) === state.latest.signature : false } : state;
  }
  if (action.type === 'RUN_STARTED') return state.status === 'running' ? state : { ...state, status: 'running', activeRun: action.layout, view: 'working', message: null };
  if (action.type === 'RUN_STOPPED') return { ...state, status: 'idle', activeRun: null, message: 'Simulation stopped. Previous completed results are unchanged.' };
  if (action.type === 'RUN_ERROR') return { ...state, status: 'idle', activeRun: null, message: `Simulation error: ${action.message}. Previous completed results are unchanged.` };
  if (action.type === 'RUN_COMPLETED') {
    const snapshot = structuredClone(action.snapshot);
    return { ...state, status: 'idle', activeRun: null, baseline: state.baseline ?? snapshot, latest: snapshot, tested: canonicalSignature(state.workingLayout) === snapshot.signature, view: 'working', message: 'Simulation complete.' };
  }
  if (action.type === 'SET_VIEW') return { ...state, view: action.view };
  if (action.type === 'RESET_COMPARISON') return { ...state, baseline: null, latest: null, view: 'working', tested: false, message: 'Comparison reset. The current layout was kept.' };
  return state;
}

export function workingLayout(state) { return state.workingLayout; }
