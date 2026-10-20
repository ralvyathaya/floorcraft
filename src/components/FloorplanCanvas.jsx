import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Layer, Line, Rect, Stage, Text } from 'react-konva';
import Furniture from './Furniture.jsx';
import { buildNavigationMap, validatePlacement } from '../simulation/navigation.js';

export default function FloorplanCanvas({ layout, runView, tool, scale: zoom, offset, setOffset, disabled, onCommitMove }) {
  const wrap = useRef(null);
  const [size, setSize] = useState({ width: 700, height: 540 });
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) }));
    observer.observe(wrap.current);
    return () => observer.disconnect();
  }, []);
  const [candidate, setCandidate] = useState(null);
  const map = useMemo(() => buildNavigationMap(layout), [layout]);
  const scale = Math.max(8, Math.min((size.width - 48) / layout.room.width, (size.height - 48) / layout.room.height)) * zoom / 65;
  const width = layout.room.width * scale; const height = layout.room.height * scale;
  const origin = { x: (size.width - width) / 2, y: (size.height - height) / 2 };
  const toWorld = (value) => value / scale;
  const onDragMove = (event, object) => {
    const position = event.target.position();
    const next = { ...object, x: Math.round(toWorld(position.x) * 2) / 2, y: Math.round(toWorld(position.y) * 2) / 2 };
    setCandidate({ object: next, validation: validatePlacement(layout, next) });
  };
  const onDragEnd = (event, object) => {
    const position = event.target.position();
    const next = { ...object, x: Math.round(toWorld(position.x) * 2) / 2, y: Math.round(toWorld(position.y) * 2) / 2 };
    const current = { object: next, validation: validatePlacement(layout, next) };
    if (current.validation.valid) onCommitMove(current.object);
    const accepted = current.validation.valid ? current.object : object;
    event.target.position({ x: accepted.x * scale, y: accepted.y * scale });
    setCandidate(null);
  };
  return <div className="canvas-shell" ref={wrap} data-scale={scale} data-origin-x={origin.x + offset.x} data-origin-y={origin.y + offset.y} data-active-customers={runView?.customers.filter((customer) => customer.cell && !customer.outcome).length ?? 0}>
    <Stage width={size.width} height={size.height} x={origin.x + offset.x} y={origin.y + offset.y} draggable={tool === 'pan'} onDragEnd={(event) => { if (event.target === event.target.getStage()) setOffset({ x: event.target.x() - origin.x, y: event.target.y() - origin.y }); }} className="floor-stage">
      <Layer>
        <Rect width={width} height={height} fill="#eee9df" stroke="#cfc8ba" strokeWidth={2} cornerRadius={12} />
        {Array.from({ length: map.columns + 1 }, (_, index) => <Line key={`v${index}`} points={[index * scale * layout.room.cellSize, 0, index * scale * layout.room.cellSize, height]} stroke="#ddd8ce" strokeWidth={1} opacity={0.45} listening={false} />)}
        {Array.from({ length: map.rows + 1 }, (_, index) => <Line key={`h${index}`} points={[0, index * scale * layout.room.cellSize, width, index * scale * layout.room.cellSize]} stroke="#ddd8ce" strokeWidth={1} opacity={0.45} listening={false} />)}
        <Rect x={layout.portal.x * scale} y={layout.portal.y * scale} width={layout.portal.width * scale} height={layout.portal.height * scale} fill="#272a28" cornerRadius={4} />
        <Text x={layout.portal.x * scale + 8} y={layout.portal.y * scale + layout.portal.height * scale + 8} text="ENTRANCE / EXIT" fontSize={11} fill="#617768" />
        {layout.objects.map((object) => <Furniture key={object.id} object={object} scale={scale} draggable={!disabled && tool === 'move'} invalid={candidate?.object.id === object.id && !candidate.validation.valid} onDragMove={(event) => onDragMove(event, object)} onDragEnd={(event) => onDragEnd(event, object)} />)}
      </Layer>
      <Layer listening={false}>
        {runView?.queues && Object.values(runView.queues).map((queue, index) => <Line key={index} points={queue.lane.flatMap((cell) => [(cell.x + 0.5) * layout.room.cellSize * scale, (cell.y + 0.5) * layout.room.cellSize * scale])} stroke="#8a957e" strokeWidth={scale * 0.08} dash={[5, 6]} opacity={0.35} />)}
        {runView?.customers?.filter((customer) => customer.cell && customer.outcome !== 'completed').map((customer) => {
          const previous = customer.previousCell ?? customer.cell;
          const alpha = customer.outcome ? 1 : runView.alpha ?? 1;
          const x = previous.x + (customer.cell.x - previous.x) * alpha;
          const y = previous.y + (customer.cell.y - previous.y) * alpha;
          return <Circle key={customer.id} x={(x + 0.5) * layout.room.cellSize * scale} y={(y + 0.5) * layout.room.cellSize * scale} radius={scale * 0.16} fill={customer.outcome ? '#b64d40' : customer.phase.includes('queue') ? '#b86d3e' : '#405b50'} opacity={customer.outcome ? 0.6 : 1} />;
        })}
      </Layer>
    </Stage>
    {candidate && !candidate.validation.valid && <div className="canvas-warning">Placement rejected: {candidate.validation.reason.replaceAll('-', ' ')}</div>}
  </div>;
}
