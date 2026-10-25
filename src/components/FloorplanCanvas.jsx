import { useEffect, useMemo, useRef, useState } from 'react';
import { Group, Layer, Line, Shape, Stage, Text } from 'react-konva';
import Furniture from './Furniture.jsx';
import Customer from './Customer.jsx';
import { useCafeAssets, artForFurniture } from './cafeAssets.js';
import { themeForLayout } from '../app/presets.js';
import { moveSelection, rotateSelection, selectionObjects } from '../app/furniture.js';
import { customerSprite } from './customerSprite.js';
import { fitIsometric, footprint, project, sortScene, unproject } from './isometric.js';
import { buildNavigationMap, oppositeServiceCell, serviceCell, validatePlacement } from '../simulation/navigation.js';
import { canonicalSignature } from '../simulation/layout.js';
import { heatColor } from '../simulation/metrics.js';

export default function FloorplanCanvas({ layout, selectionResetKey, runView, heatmap, diagnosticArea, tool, scale: zoom, offset, setOffset, disabled, onCommitMove }) {
  const wrap = useRef(null);
  const [size, setSize] = useState({ width: 700, height: 540 });
  const [candidate, setCandidate] = useState(null);
  const themeId = themeForLayout(layout);
  const assets = useCafeAssets(themeId);
  const [selectedId, setSelectedId] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [rotationError, setRotationError] = useState(null);
  const rotateButton = useRef(null);
  const selected = layout.objects.find(object => object.id === selectedId);
  const selectedObjects = selected ? selectionObjects(layout, selected.id) : [];
  const selectedGroup = layout.tableGroups?.find(g => g.tableId === selectedId || g.chairIds.includes(selectedId));
  const selectionLabel = selectedGroup ? `${layout.objects.find(o => o.id === selectedGroup.tableId).label} · ${selectedGroup.chairIds.length} seats` : selected?.label;
  const closeSelection = () => { setSelectedId(null); setPopupOpen(false); setRotationError(null); };
  useEffect(() => { closeSelection(); }, [disabled, tool, selectionResetKey]);
  useEffect(() => {
    const outside = event => { if (!wrap.current?.contains(event.target)) closeSelection(); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  useEffect(() => { if (popupOpen) rotateButton.current?.focus(); }, [popupOpen, selectedId]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) }));
    observer.observe(wrap.current);
    return () => observer.disconnect();
  }, []);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update(); preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  const map = useMemo(() => buildNavigationMap(layout), [layout]);
  const { scale, origin } = fitIsometric(layout.room, size, zoom);
  const projectedPoints = (points) => points.flatMap(([x, y]) => { const point = project({ x, y }, scale); return [point.x, point.y]; });
  const floor = footprint(layout.room, scale);
  const { width, height } = layout.room;
  const front = projectedPoints([[width, 0], [width, height], [0, height]]);
  const wall = (from, to, color) => {
    const a = project(from, scale); const b = project(to, scale);
    return <Group key={`${from.x},${from.y}-${to.x},${to.y}`}>
      <Line points={[a.x, a.y, a.x, a.y - scale * 0.9, b.x, b.y - scale * 0.9, b.x, b.y]} closed fill={color} stroke="#839177" strokeWidth={1} />
      <Line points={[a.x, a.y - scale * 0.9, b.x, b.y - scale * 0.9]} stroke="#ac9974" strokeWidth={4} />
      <Line points={[a.x, a.y - scale * 0.12, b.x, b.y - scale * 0.12]} stroke="#879176" strokeWidth={2} />
    </Group>;
  };
  const bar = layout.objects.find(o => o.id === 'service-bar');
  const idleStaff = layout.modelId === 'cafe-v2' ? [
    { id: 'barista', role: 'barista', phase: 'idle', cell: serviceCell(layout, bar), facingStation: { south: 0, north: 180, east: 270, west: 90 }[bar.serviceFace ?? 'south'] },
    { id: 'cashier-staff', role: 'cashier', phase: 'serving', facing: 180, cell: oppositeServiceCell(layout, layout.objects.find(o => o.id === 'cashier')) },
  ] : [];
  const scene = sortScene([
    ...layout.objects.map((object) => ({ ...(candidate?.objects.find(o => o.id === object.id) ?? object), kind: 'furniture', object })),
    ...[...(runView?.customers ?? []), ...(runView?.staff ?? idleStaff)].flatMap((customer) => {
      const sprite = customerSprite(customer, runView ?? { alpha: 1 }, layout.room.cellSize, reducedMotion);
      return sprite ? [{ id: customer.id, kind: 'customer', x: sprite.x - 0.2, y: sprite.y - 0.2, width: 0.4, height: 0.4, sprite }] : [];
    }),
  ]);
  const dragCandidate = (event, object) => {
    const point = unproject(event.target.position(), scale);
    const next = moveSelection(layout, object.id, Math.round(point.x * 2) / 2 - object.x, Math.round(point.y * 2) / 2 - object.y);
    return { objects: next, validation: validatePlacement(layout, next) };
  };
  const onDragEnd = (event, object) => {
    const current = dragCandidate(event, object);
    if (current.validation.valid) onCommitMove(current.objects);
    event.target.position(project(current.validation.valid ? current.objects.find(o => o.id === object.id) : object, scale));
    setCandidate(null);
  };
  const portal = project({ x: layout.portal.x, y: layout.portal.y + layout.portal.height / 2 }, scale);
  const anchor = selected && project({ x: selected.x + selected.width, y: selected.y + selected.height / 2 }, scale);
  const select = (event, object) => {
    if (disabled || tool !== 'move') return;
    event.cancelBubble = true; setSelectedId(object.id); setPopupOpen(true); setRotationError(null);
  };
  const rotate = () => {
    const next = rotateSelection(layout, selected.id);
    const result = validatePlacement(layout, next);
    if (result.valid) { onCommitMove(next); setRotationError(null); }
    else setRotationError(`Cannot rotate: ${result.reason.replaceAll('-', ' ')}.`);
  };
  const keyboard = event => {
    if (event.key === 'Escape') { closeSelection(); wrap.current.focus(); return; }
    if (event.target !== event.currentTarget || disabled || tool !== 'move') return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const index = layout.objects.findIndex(object => object.id === selectedId);
      const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
      setSelectedId(layout.objects[index < 0 ? 0 : (index + direction + layout.objects.length) % layout.objects.length].id);
      setPopupOpen(false); setRotationError(null);
    } else if (event.key === 'Enter') {
      event.preventDefault(); setSelectedId(selectedId ?? layout.objects[0].id); setPopupOpen(true);
    }
  };
  return <div className="canvas-shell" ref={wrap} tabIndex={0} role="group" aria-label="Café floorplan" aria-describedby="canvas-keyboard-help" onKeyDown={keyboard} data-theme={themeId} data-selected-object={selectedId ?? ''} data-projection="isometric" data-assets={assets.status} data-tool={tool} data-editable={!disabled} data-reduced-motion={reducedMotion} data-layout-signature={canonicalSignature(layout)} data-heatmap={JSON.stringify(heatmap ?? null)} data-scale={scale} data-origin-x={origin.x + offset.x} data-origin-y={origin.y + offset.y} data-scene-order={scene.map((item) => item.id).join(',')} data-active-customers={runView?.customers.filter((customer) => (customer.cell || customer.seatAnchor) && !customer.outcome).length ?? 0} data-seated-customers={runView?.customers.filter(c => c.phase === 'seated').length ?? 0} data-barista-phase={runView?.staff?.find(s => s.id === 'barista')?.phase ?? 'idle'}>
    <span id="canvas-keyboard-help" className="sr-only">Use arrow keys to select furniture, Enter to open rotation controls, and Escape to close them.</span>
    <span className="sr-only" data-testid="diagnostic-area" data-cells={JSON.stringify(diagnosticArea?.cells ?? [])}>{diagnosticArea ? `Area ${diagnosticArea.number}: ${diagnosticArea.seconds.toFixed(1)} blocked-customer seconds` : ''}</span>
    <Stage width={size.width} height={size.height} x={origin.x + offset.x} y={origin.y + offset.y} draggable={tool === 'pan'} onClick={closeSelection} onTap={closeSelection} onDragStart={closeSelection} onDragEnd={(event) => { if (event.target === event.target.getStage()) setOffset({ x: event.target.x() - origin.x, y: event.target.y() - origin.y }); }} className="floor-stage">
      <Layer listening={false} imageSmoothingEnabled={false}>
        <Line points={[...front, front[4], front[5] + 9, front[2], front[3] + 9, front[0], front[1] + 9]} closed fill="#a18a63" stroke="#887751" strokeWidth={1} shadowColor="#465042" shadowBlur={14} shadowOffsetY={12} shadowOpacity={0.14} />
        <Line points={floor} closed fill="#d6c39e" />
        {assets.floor && <Shape sceneFunc={(context) => {
          context.save(); context.imageSmoothingEnabled = true; context.transform(1, 0.5, -1, 0.5, 0, 0);
          context.drawImage(assets.floor, 0, 0, width * scale, height * scale);
          context.restore();
        }} />}
        <Line points={floor} closed fill="#fff6dd" opacity={0.22} />
        {layout.staffZone && <>
          <Line points={projectedPoints([[0, 0], [width, 0], [width, 2.5], [0, 2.5]])} closed fill="#48654d" opacity={0.09} />
          <Line points={projectedPoints([[0, 2.5], [width, 2.5]])} stroke="#697e59" opacity={0.4} dash={[4, 5]} />
          <Text {...project({ x: 1, y: 1 }, scale)} text="STAFF" fontSize={9} fill="#53664b" opacity={0.8} />
          <Text {...project({ x: 5, y: 3.2 }, scale)} text="WAITING" fontSize={9} fill="#6b644b" opacity={0.75} />
        </>}
        {Array.from({ length: map.columns + 1 }, (_, index) => <Line key={`v${index}`} points={projectedPoints([[index * layout.room.cellSize, 0], [index * layout.room.cellSize, height]])} stroke="#6f785f" strokeWidth={0.6} opacity={0.12} />)}
        {Array.from({ length: map.rows + 1 }, (_, index) => <Line key={`h${index}`} points={projectedPoints([[0, index * layout.room.cellSize], [width, index * layout.room.cellSize]])} stroke="#6f785f" strokeWidth={0.6} opacity={0.12} />)}
        {wall({ x: 0, y: 0 }, { x: width, y: 0 }, '#b7c0a9')}
        {wall({ x: 0, y: 0 }, { x: 0, y: layout.portal.y }, '#c4c9b5')}
        {wall({ x: 0, y: layout.portal.y + layout.portal.height }, { x: 0, y: height }, '#c4c9b5')}
        <Line points={[...projectedPoints([[0.5, 0], [2.5, 0]]).map((value, index) => index % 2 ? value - scale * 0.24 : value), ...projectedPoints([[2.5, 0], [0.5, 0]]).map((value, index) => index % 2 ? value - scale * 0.72 : value)]} closed fill="#e1e3c9" stroke="#8d997c" strokeWidth={3} />
        <Line points={projectedPoints([[layout.portal.x, layout.portal.y], [layout.portal.x + layout.portal.width, layout.portal.y], [layout.portal.x + layout.portal.width, layout.portal.y + layout.portal.height], [layout.portal.x, layout.portal.y + layout.portal.height]])} closed fill="#b8c5a1" opacity={0.6} />
        <Text x={portal.x - 58} y={portal.y + 3} text="IN / OUT" fontSize={9} letterSpacing={1} fill="#56644c" />
        {heatmap?.filter((cell) => cell.ticks > 0).map((cell) => <Line key={`${cell.x},${cell.y}`} x={project({ x: cell.x * layout.room.cellSize, y: cell.y * layout.room.cellSize }, scale).x} y={project({ x: cell.x * layout.room.cellSize, y: cell.y * layout.room.cellSize }, scale).y} points={footprint({ width: layout.room.cellSize, height: layout.room.cellSize }, scale)} closed fill={heatColor(cell.ticks * 0.5)} opacity={0.7} />)}
        {diagnosticArea?.cells.map(cell => <Line key={`diagnostic-${cell.x},${cell.y}`} {...project({ x: cell.x * layout.room.cellSize, y: cell.y * layout.room.cellSize }, scale)} points={footprint({ width: layout.room.cellSize, height: layout.room.cellSize }, scale)} closed stroke="#334b61" strokeWidth={2.5} />)}
        {runView?.queues && Object.values(runView.queues).map((queue, index) => <Line key={index} points={projectedPoints(queue.lane.map((cell) => [(cell.x + 0.5) * layout.room.cellSize, (cell.y + 0.5) * layout.room.cellSize]))} stroke="#6f805a" strokeWidth={1.5} dash={[4, 5]} opacity={0.45} />)}
        {candidate?.objects.map(object => <Line key={object.id} x={project(object, scale).x} y={project(object, scale).y} points={footprint(object, scale)} closed fill={candidate.validation.valid ? '#dae6b870' : '#d2746266'} stroke={candidate.validation.valid ? '#617b49' : '#b14d38'} strokeWidth={2} />)}
      </Layer>
      <Layer imageSmoothingEnabled={false}>
        {scene.map((item) => item.kind === 'furniture' ? <Furniture key={item.id} object={item.object} preview={candidate?.objects.find(o => o.id === item.id)} seatStatus={runView?.seats?.find(s => s.id === item.id)?.status} scale={scale} images={assets.furniture} art={artForFurniture(themeId, item.object)} selected={!disabled && selectedObjects.some(o => o.id === item.id)} onSelect={event => select(event, item.object)} onDragStart={closeSelection} draggable={!disabled && tool === 'move'} invalid={Boolean(candidate?.objects.some(o => o.id === item.id) && !candidate.validation.valid)} onDragMove={(event) => setCandidate(dragCandidate(event, item.object))} onDragEnd={(event) => onDragEnd(event, item.object)} /> : <Customer key={item.id} sprite={item.sprite} scale={scale} image={assets.customers} actorsImage={assets.actors} />)}
      </Layer>
    </Stage>
    {popupOpen && selected && !disabled && tool === 'move' && <div className="furniture-popup" role="dialog" aria-label={`${selectionLabel} controls`} style={{ left: Math.max(8, Math.min(size.width - 218, origin.x + offset.x + anchor.x + 14)), top: Math.max(8, Math.min(size.height - 190, origin.y + offset.y + anchor.y - 90)) }}>
      <div><strong>{selectionLabel}</strong><button aria-label="Close furniture controls" onClick={() => { closeSelection(); wrap.current.focus(); }}>×</button></div>
      <button className="rotate-furniture" ref={rotateButton} onClick={rotate}>↻ Rotate 90°</button>
      {rotationError && <p role="status">{rotationError}</p>}
    </div>}
    {assets.status !== 'ready' && <div className="art-status" role={assets.status === 'error' ? 'alert' : 'status'}>{assets.message ?? 'Loading café artwork…'}</div>}
    {candidate && !candidate.validation.valid && <div className="canvas-warning" role="status">Placement rejected: {candidate.validation.reason.replaceAll('-', ' ')}</div>}
  </div>;
}
