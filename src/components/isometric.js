export const project = ({ x, y }, scale = 1) => ({ x: (x - y) * scale, y: (x + y) * scale / 2 });
export const unproject = ({ x, y }, scale = 1) => ({ x: (x / 2 + y) / scale, y: (y - x / 2) / scale });

export function footprint({ width, height }, scale) {
  return [[0, 0], [width, 0], [width, height], [0, height]].flatMap(([x, y]) => Object.values(project({ x, y }, scale)));
}

export function fitIsometric(room, size, zoom = 65) {
  const span = room.width + room.height;
  const scale = Math.max(1, Math.min((size.width - 72) / span, (size.height - 80) / (span / 2 + 2.25))) * zoom / 65;
  return { scale, origin: { x: (size.width - (room.width - room.height) * scale) / 2, y: (size.height - (span / 2 - 1.75) * scale) / 2 } };
}

const byDepth = (a, b) => (a.x + a.y + (a.width + a.height) / 2) - (b.x + b.y + (b.width + b.height) / 2) || a.id.localeCompare(b.id);
const separatedBefore = (a, b) => a.x + a.width <= b.x + 1e-8 || a.y + a.height <= b.y + 1e-8;

export function sortScene(items) {
  // Footprint separation keeps long counters behind people on their front edge.
  const pending = [...items].sort(byDepth);
  const ordered = [];
  while (pending.length) {
    const index = pending.findIndex((item) => !pending.some((other) => other !== item && separatedBefore(other, item) && !separatedBefore(item, other)));
    ordered.push(...pending.splice(index < 0 ? 0 : index, 1));
  }
  return ordered;
}
