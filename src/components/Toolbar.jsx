export default function Toolbar({ tool, setTool, onUndo, onZoom, onFit, heatmap, setHeatmap, disabled, canUndo, canHeatmap }) {
  return <div className="toolbar" aria-label="Canvas toolbar">
    <button className={tool === 'move' ? 'active' : ''} aria-pressed={tool === 'move'} onClick={() => setTool('move')} disabled={disabled}>Select / Move</button>
    <button className={tool === 'pan' ? 'active' : ''} aria-pressed={tool === 'pan'} onClick={() => setTool('pan')}>Pan</button>
    <button onClick={() => onZoom(1.12)} aria-label="Zoom in">＋</button>
    <button onClick={() => onZoom(0.88)} aria-label="Zoom out">−</button>
    <button onClick={onFit}>Fit to View</button>
    <button onClick={onUndo} disabled={disabled || !canUndo}>Undo</button>
    <button className={heatmap && canHeatmap ? 'active' : ''} aria-pressed={heatmap && canHeatmap} onClick={() => setHeatmap(!heatmap)} disabled={!canHeatmap} title={canHeatmap ? 'Toggle obstruction heatmap for this tested layout' : 'Complete a run of this geometry to see its heatmap'}>Heatmap</button>
  </div>;
}
