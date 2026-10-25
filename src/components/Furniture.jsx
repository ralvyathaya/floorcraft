import { useState } from 'react';
import { Group, Image, Line, Rect, Text } from 'react-konva';
import { footprint, project } from './isometric.js';

export default function Furniture({ object, preview, seatStatus, scale, images, art, draggable, invalid, selected, onSelect, onDragStart, onDragMove, onDragEnd }) {
  const [hovered, setHovered] = useState(false);
  const point = project(preview ?? object, scale);
  const image = images?.[art.sheet];
  const width = (object.width + object.height) * scale * (art.widthFactor ?? 1);
  const height = width * art.crop.height / art.crop.width;
  const centerX = (object.width - object.height) * scale / 2;
  const frontY = (object.width + object.height) * scale / 2;
  const showLabel = hovered || object.type === 'counter' || !image;
  return <Group x={point.x} y={point.y} draggable={draggable} onClick={onSelect} onTap={onSelect} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
    {image && <Image x={centerX - width / 2} y={frontY - height * art.anchorY} width={width} height={height} image={image} crop={art.crop} listening={false} />}
    <Line points={footprint(object, scale)} closed fill={invalid ? '#d2746266' : selected ? '#f5dda044' : image ? '#ffffff01' : '#bda985'} stroke={invalid ? '#b14d38' : selected || hovered && draggable ? '#8a6729' : seatStatus === 'occupied' ? '#52734a' : seatStatus === 'reserved' ? '#a77f3d' : image ? '#596d4c44' : '#6c775e'} strokeWidth={invalid || selected || hovered ? 2 : seatStatus && seatStatus !== 'empty' ? 1.5 : 0.7} dash={invalid || selected || hovered || seatStatus === 'occupied' ? [] : [3, 3]} />
    {showLabel && <Group x={centerX - 40} y={frontY - height * art.anchorY - 20} listening={false}>
      <Rect width={80} height={17} fill="#f7f0df" opacity={0.95} cornerRadius={3} stroke="#b5b899" strokeWidth={0.6} />
      <Text width={80} height={17} text={object.label} align="center" verticalAlign="middle" fontSize={10} fontFamily="sans-serif" fill="#3f5142" />
    </Group>}
  </Group>;
}
