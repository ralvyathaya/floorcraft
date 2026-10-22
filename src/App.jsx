import { useReducer, useState } from 'react';
import { canvasPresentation, createWorkspace, workspaceReducer } from './app/workspace.js';
import { useSimulation } from './app/useSimulation.js';
import { initialLayout } from './simulation/layout.js';
import FloorplanCanvas from './components/FloorplanCanvas.jsx';
import Toolbar from './components/Toolbar.jsx';
import SimulationSidebar from './components/SimulationSidebar.jsx';

export default function App() {
  const [workspace, dispatch] = useReducer(workspaceReducer, initialLayout, createWorkspace);
  const [tool, setTool] = useState('move');
  const [scale, setScale] = useState(65);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [heatmap, setHeatmap] = useState(false);
  const [status, setStatus] = useState('idle');
  const simulation = useSimulation({
    onComplete(snapshot) { dispatch({ type: 'RUN_COMPLETED', snapshot }); setStatus('complete'); },
    onError(error) { dispatch({ type: 'RUN_ERROR', message: error.message }); setStatus('error'); },
  });
  const running = workspace.status === 'running';
  const preview = workspace.view !== 'working';
  const presentation = canvasPresentation(workspace, simulation.view);
  const viewLabel = preview ? `${workspace.view === 'baseline' ? 'Baseline' : 'Latest'} Preview · Read only` : workspace.baseline ? workspace.tested ? 'Working Layout · Tested' : 'Untested changes' : 'Working Layout';
  function start() {
    if (running || preview) return;
    setStatus('running');
    dispatch({ type: 'RUN_STARTED', layout: workspace.workingLayout });
    simulation.start(workspace.workingLayout);
  }
  function stop() {
    simulation.stop(); dispatch({ type: 'RUN_STOPPED' }); setStatus('stopped');
  }
  return <main>
    <header className="app-header">
      <div className="brand"><span className="brand-mark" aria-hidden="true">▱</span><h1>FloorCraft</h1><span className="brand-divider" /><span className="header-caption">Design a space that flows.</span></div>
      <span className="project-label"><span /> Café studio <b>POC</b></span>
    </header>
    <div className="workspace-grid">
      <section className="editor" aria-label="Café layout editor">
        <div className="editor-heading"><div><div className="eyebrow">YOUR SPACE, REIMAGINED</div><h2>The corner café <span>80 m²</span></h2></div><span className="layout-badge" role="status">{viewLabel}</span></div>
        <div className="canvas-caption"><span>{running ? 'Editing locked during simulation' : preview ? 'Read-only tested snapshot · working edits are safe' : 'Drag furniture to explore a different layout'}</span><span>10 × 8 m · 0.5 m grid</span></div>
        {preview && <button className="return-working" onClick={() => dispatch({ type: 'SET_VIEW', view: 'working' })}>← Return to Working Layout</button>}
        <FloorplanCanvas layout={presentation.layout} runView={presentation.runView} heatmap={heatmap ? presentation.heatmap : null} tool={tool} scale={scale} offset={offset} setOffset={setOffset} disabled={running || preview} onCommitMove={(object) => dispatch({ type: 'COMMIT_MOVE', object })} />
        <Toolbar tool={tool} setTool={setTool} onUndo={() => dispatch({ type: 'UNDO' })} onZoom={(factor) => setScale((value) => Math.min(110, Math.max(30, value * factor)))} onFit={() => { setScale(65); setOffset({ x: 0, y: 0 }); }} heatmap={heatmap} setHeatmap={setHeatmap} disabled={running || preview} canUndo={workspace.undo.length > 0} canHeatmap={Boolean(presentation.heatmap)} />
        {heatmap && presentation.heatmap && <div className="heat-legend" aria-label="Obstruction heatmap legend"><strong>Blocked-customer seconds</strong><span><i className="heat-zero" />0</span><span><i className="heat-low" />&gt;0</span><span><i className="heat-medium" />2</span><span><i className="heat-high" />5+</span><small>Fixed scale · obstruction, not ordinary queueing</small></div>}
        <span data-testid="viewport-status" data-offset={`${offset.x},${offset.y}`} className="sr-only">{Math.round(scale / 65 * 100)}%</span>
        <div className="editor-footer"><span><i className="legend-dot" /> Customer <i className="legend-dot waiting" /> In queue</span><span>Made for curious café owners.</span></div>
      </section>
      <SimulationSidebar running={running} runView={simulation.view} baseline={workspace.baseline} latest={workspace.latest} view={workspace.view} tested={workspace.tested} status={status} message={workspace.message} onStart={start} onStop={stop} onView={(view) => dispatch({ type: 'SET_VIEW', view })} onReset={() => { dispatch({ type: 'RESET_COMPARISON' }); setStatus('idle'); }} />
    </div>
  </main>;
}
