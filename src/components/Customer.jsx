import { Ellipse, Group, Image, Line, Circle } from 'react-konva';
import { project } from './isometric.js';
import { customerFrames, actorFrames, actorAnchors } from './cafeAssets.js';

export default function Customer({ sprite, scale, image, actorsImage }) {
  const point = project(sprite, scale);
  const direction = [3, 0, 1, 2][Math.round((sprite.rotation + 360) % 360 / 90) % 4];
  let crop; let source = image;
  if (sprite.pose === 'seated') {
    crop = actorFrames[sprite.variant][direction]; source = actorsImage;
  } else if (sprite.pose === 'staff' || sprite.pose === 'preparing') {
    let frame = 2;
    if (sprite.pose === 'preparing') frame = 4;
    else if (sprite.carrying) frame = 3;
    crop = actorFrames[frame][direction]; source = actorsImage;
  } else crop = customerFrames[sprite.variant * 2 + (sprite.stride > 0.001 ? 1 : 0)][direction];
  const height = scale * (sprite.pose === 'seated' ? 1.4 : 1.65);
  const width = height * crop.width / crop.height;
  const anchor = sprite.pose === 'seated' ? actorAnchors.seated : actorAnchors.standing;
  return <Group x={point.x} y={point.y} listening={false}>
    <Ellipse radiusX={scale * 0.2} radiusY={scale * 0.1} fill="#394b3c" opacity={0.15} />
    {sprite.waiting && !sprite.failed && <Ellipse radiusX={scale * 0.2} radiusY={scale * 0.1} stroke="#9c6d30" strokeWidth={1.3} dash={[3, 3]} />}
    {sprite.failed ? <>
      <Circle y={-scale * 0.25} radius={Math.max(5, scale * 0.15)} fill="#fff0e7" stroke="#a04a38" strokeWidth={1.3} />
      <Line points={[-3, -scale * 0.25 - 3, 3, -scale * 0.25 + 3]} stroke="#a04a38" strokeWidth={1.3} />
      <Line points={[3, -scale * 0.25 - 3, -3, -scale * 0.25 + 3]} stroke="#a04a38" strokeWidth={1.3} />
    </> : source ? <Image x={-width * anchor[0]} y={-height * anchor[1]} width={width} height={height} crop={crop} image={source} /> : <Circle y={-scale * 0.2} radius={scale * 0.16} fill={sprite.shirt ?? '#496e63'} />}
  </Group>;
}
