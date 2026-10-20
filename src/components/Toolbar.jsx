export default function Toolbar({ tool, setTool, onUndo, onZoom, onFit, heatmap, setHeatmap, disabled, canUndo }) {
  return <div className="toolbar" aria-label="Canvas toolbar">
    <button className={tool === 'move' ? 'active' : ''} onClick={() => setTool('move')} disabled={disabled}>Select / Move</button>
    <button className={tool === 'pan' ? 'active' : ''} onClick={() => setTool('pan')}>Pan</button>
    <button onClick={() => onZoom(1.12)} aria-label="Zoom in">＋</button>
    <button onClick={() => onZoom(0.88)} aria-label="Zoom out">−</button>
    <button onClick={onFit}>Fit to View</button>
    <button onClick={onUndo} disabled={disabled || !canUndo}>Undo</button>
    <button className={heatmap ? 'active' : ''} onClick={() => setHeatmap(!heatmap)} disabled title="Available with comparison heatmaps in the next build slice">Heatmap</button>
  </div>;
}
