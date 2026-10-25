import { useEffect, useReducer, useState } from 'react';
import { canvasPresentation, createWorkspace, workspaceReducer } from './app/workspace.js';
import { loadWorkspace, replaceUnreadableSave, saveWorkspace } from './app/storage.js';
import { useSimulation } from './app/useSimulation.js';
import { cafePresets, identifyPreset } from './app/presets.js';
import FloorplanCanvas from './components/FloorplanCanvas.jsx';
import Toolbar from './components/Toolbar.jsx';
import SimulationSidebar from './components/SimulationSidebar.jsx';
import Icon from './components/Icon.jsx';
import PresetPicker from './components/PresetPicker.jsx';
import { identifyCaseVariant, isCaseBaseline } from './app/caseStudy.js';

export default function App() {
  const [workspace, dispatch] = useReducer(workspaceReducer, cafePresets[0].layout, createWorkspace);
  const [storageNotice, setStorageNotice] = useState(null);
  const [unreadableSave, setUnreadableSave] = useState(null);
  const [tool, setTool] = useState('move');
  const [scale, setScale] = useState(65);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [heatmap, setHeatmap] = useState(false);
  const [status, setStatus] = useState('idle');
  const [canvasEpoch, setCanvasEpoch] = useState(0);
  const [pace, setPace] = useState(8);
  const [diagnosticFocus, setDiagnosticFocus] = useState(null);
  const simulation = useSimulation({
    pace,
    onComplete(snapshot) { dispatch({ type: 'RUN_COMPLETED', snapshot }); setStatus('complete'); },
    onError(error) { dispatch({ type: 'RUN_ERROR', message: error.message }); setStatus('error'); },
  });
  const running = workspace.status === 'running';
  const preview = workspace.view !== 'working';
  const presentation = canvasPresentation(workspace, simulation.view);
  const visiblePreset = identifyPreset(presentation.layout);
  const caseVariant = identifyCaseVariant(presentation.layout);
  const layoutName = caseVariant ? `Case ${caseVariant.toUpperCase()} · 12 seats` : visiblePreset?.name ?? (isCaseBaseline(workspace.baseline) ? 'Custom variation' : 'Custom café');
  const diagnosticArea = heatmap && !running && diagnosticFocus?.view === workspace.view && workspace[workspace.view]?.signature === diagnosticFocus.signature ? diagnosticFocus.area : null;
  const legacy = workspace.workingLayout.modelId !== 'cafe-v2';
  const viewLabel = preview ? `${workspace.view === 'baseline' ? 'Baseline' : 'Latest'} Preview · Read only` : workspace.baseline ? workspace.tested ? 'Working Layout · Tested' : 'Untested changes' : 'Working Layout';
  const hydrated = workspace.hydrated;
  useEffect(() => {
    const result = loadWorkspace(window.localStorage);
    if (result.kind === 'loaded') {
      dispatch({ type: 'HYDRATE', saved: result.workspace });
      if (result.message) setStorageNotice(result.message);
    } else if (result.kind === 'invalid') {
      setUnreadableSave(result.raw);
      setStorageNotice(result.message);
      dispatch({ type: 'STORAGE_READY', preserveUnreadable: true });
    } else if (result.kind === 'unavailable') {
      setStorageNotice(result.message);
      dispatch({ type: 'STORAGE_READY' });
    } else dispatch({ type: 'STORAGE_READY' });
  }, []);
  useEffect(() => {
    if (!hydrated || workspace.storageBlocked) return;
    const result = saveWorkspace(window.localStorage, workspace);
    if (!result.ok) setStorageNotice(result.message);
  }, [workspace, hydrated]);
  function start() {
    if (running || preview) return;
    setDiagnosticFocus(null);
    setStatus('running');
    dispatch({ type: 'RUN_STARTED', layout: workspace.workingLayout });
    simulation.start(workspace.workingLayout);
  }
  function stop() {
    simulation.stop(); dispatch({ type: 'RUN_STOPPED' }); setStatus('stopped');
  }
  function changeView(view) {
    setDiagnosticFocus(null); dispatch({ type: 'SET_VIEW', view });
  }
  function applyCase(type) {
    setDiagnosticFocus(null); dispatch({ type }); setStatus('idle');
    setCanvasEpoch(value => value + 1); setOffset({ x: 0, y: 0 }); setScale(65);
  }
  function showDiagnostic({ snapshot, view, area }) {
    dispatch({ type: 'SET_VIEW', view }); setHeatmap(true);
    setDiagnosticFocus({ view, signature: snapshot.signature, area });
    setCanvasEpoch(value => value + 1);
    requestAnimationFrame(() => document.querySelector('.canvas-shell')?.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
  }
  return <main>
    <header className="app-header">
      <div className="brand"><span className="brand-mark"><Icon name="plan" /></span><h1>FloorCraft</h1></div>
    </header>
    <div className="workspace-grid">
      <section className="editor" aria-label="Café layout editor">
        <div className="editor-heading"><h2>{layoutName} <span>10 × 8 m · 80 m²</span></h2><span className="layout-badge" data-state={running ? 'running' : preview ? 'preview' : workspace.baseline && !workspace.tested ? 'untested' : 'working'} role="status">{viewLabel}</span></div>
        <PresetPicker layout={workspace.workingLayout} disabled={running || preview} onChoose={(presetId) => { setDiagnosticFocus(null); dispatch({ type: 'APPLY_PRESET', presetId }); setCanvasEpoch(value => value + 1); setOffset({ x: 0, y: 0 }); setScale(65); }} />
        {legacy && <p className="legacy-note">Saved takeaway model preserved. Load a preset for dine-in seating and barista service; Undo returns here.</p>}
        <div className="canvas-caption"><span>{running ? 'Editing locked during simulation' : preview ? 'Read-only tested snapshot' : 'Drag to move · click a footprint to rotate'}</span><span>{presentation.layout.objects.length} objects · 0.5 m grid</span></div>
        {preview && <button className="return-working" onClick={() => changeView('working')}>← Return to Working Layout</button>}
        <FloorplanCanvas layout={presentation.layout} selectionResetKey={`${workspace.view}:${canvasEpoch}`} runView={presentation.runView} heatmap={heatmap ? presentation.heatmap : null} diagnosticArea={diagnosticArea} tool={tool} scale={scale} offset={offset} setOffset={setOffset} disabled={running || preview} onCommitMove={(object) => { setDiagnosticFocus(null); dispatch({ type: 'COMMIT_MOVE', object }); }} />
        <Toolbar tool={tool} setTool={setTool} onUndo={() => { setDiagnosticFocus(null); dispatch({ type: 'UNDO' }); }} onZoom={(factor) => setScale((value) => Math.min(110, Math.max(30, value * factor)))} onFit={() => { setScale(65); setOffset({ x: 0, y: 0 }); }} heatmap={heatmap} setHeatmap={(value) => { setHeatmap(value); if (!value) setDiagnosticFocus(null); }} disabled={running || preview} canUndo={workspace.undo.length > 0} canHeatmap={Boolean(presentation.heatmap)} />
        {diagnosticArea && <p className="diagnostic-caption" role="status">Area {diagnosticArea.number} outlined · {diagnosticArea.seconds.toFixed(1)} blocked-customer seconds · tested layout</p>}
        {heatmap && presentation.heatmap && <div className="heat-legend" aria-label="Obstruction heatmap legend"><strong>Blocked-customer seconds</strong><span><i className="heat-zero" />0</span><span><i className="heat-low" />&gt;0</span><span><i className="heat-medium" />2</span><span><i className="heat-high" />5+</span><small>Fixed scale · obstruction, not ordinary queueing</small></div>}
        <span data-testid="viewport-status" data-offset={`${offset.x},${offset.y}`} className="sr-only">{Math.round(scale / 65 * 100)}%</span>
        <div className="editor-footer"><span><i className="legend-person" /> Customer <i className="legend-person waiting" /> Waiting <i className="legend-failed" /> Unable to finish {presentation.layout.modelId === 'cafe-v2' && <><i className="legend-seat reserved" /> Reserved seat <i className="legend-seat occupied" /> Occupied seat</>}</span></div>
      </section>
      <SimulationSidebar layout={presentation.layout} workingLayout={workspace.workingLayout} pace={pace} onPace={setPace} running={running} runView={simulation.view} baseline={workspace.baseline} latest={workspace.latest} view={workspace.view} tested={workspace.tested} status={status} message={workspace.message} storageNotice={storageNotice} unreadableSave={unreadableSave} onStart={start} onStop={stop} onView={changeView} onShowDiagnostic={showDiagnostic} onStartExample={() => applyCase('START_CASE_STUDY')} onApplyB={() => applyCase('APPLY_CASE_B')} onReset={() => { setDiagnosticFocus(null); dispatch({ type: 'RESET_COMPARISON' }); setStatus('idle'); }} onReplaceSave={() => { const result = replaceUnreadableSave(window.localStorage, workspace); if (result.ok) { dispatch({ type: 'STORAGE_ALLOWED' }); setUnreadableSave(null); setStorageNotice('Unreadable save replaced with the current workspace.'); } else setStorageNotice(result.message); }} />
    </div>
  </main>;
}
