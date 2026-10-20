import { Group, Rect, Text, Circle } from 'react-konva';

export default function Furniture({ object, scale, draggable, invalid, onDragMove, onDragEnd }) {
  const x = object.x * scale; const y = object.y * scale;
  const width = object.width * scale; const height = object.height * scale;
  const fill = invalid ? '#d8665d' : object.type === 'counter' ? '#6e8171' : object.type === 'chair' ? '#c79b6e' : '#d4b28b';
  return (
    <Group x={x} y={y} draggable={draggable} onDragMove={onDragMove} onDragEnd={onDragEnd}>
      <Rect width={width} height={height} cornerRadius={object.type === 'chair' ? 5 : 10} fill={fill} shadowColor="#1e2721" shadowBlur={8} shadowOpacity={0.16} />
      {object.type === 'table' && <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) * 0.25} fill="#f1dec2" opacity={0.72} />}
      <Text text={object.label} width={width} height={height} align="center" verticalAlign="middle" fontSize={Math.max(9, scale * 0.12)} fill="#272a28" listening={false} />
    </Group>
  );
}
