import Icon from './Icon.jsx';

export default function Toolbar({ tool, setTool, onUndo, onZoom, onFit, heatmap, setHeatmap, disabled, canUndo, canHeatmap }) {
  return <div className="toolbar" aria-label="Canvas toolbar">
    <button className={tool === 'move' ? 'active' : ''} aria-pressed={tool === 'move'} onClick={() => setTool('move')} disabled={disabled}><Icon name="move" />Select / Move</button>
    <button className={tool === 'pan' ? 'active' : ''} aria-pressed={tool === 'pan'} onClick={() => setTool('pan')}><Icon name="pan" />Pan</button>
    <span className="toolbar-divider" />
    <button onClick={() => onZoom(1.12)} aria-label="Zoom in"><Icon name="plus" /></button>
    <button onClick={() => onZoom(0.88)} aria-label="Zoom out"><Icon name="minus" /></button>
    <button onClick={onFit}><Icon name="fit" />Fit to View</button>
    <span className="toolbar-divider" />
    <button onClick={onUndo} disabled={disabled || !canUndo}><Icon name="undo" />Undo</button>
    <button className={heatmap && canHeatmap ? 'active' : ''} aria-pressed={heatmap && canHeatmap} onClick={() => setHeatmap(!heatmap)} disabled={!canHeatmap} title={canHeatmap ? 'Toggle obstruction heatmap for this tested layout' : 'Complete a run of this geometry to see its heatmap'}><Icon name="heat" />Heatmap</button>
  </div>;
}
