import { cellKey, neighbors, portalCell, serviceCell } from './navigation.js';

export function buildQueues(layout, map) {
  const portal = portalCell(layout);
  const heads = Object.fromEntries(['cashier', 'pickup'].map((id) => [id, serviceCell(layout, layout.objects.find((object) => object.id === id))]));
  const reserved = new Set([cellKey(portal), ...Object.values(heads).map(cellKey)]);
  const queues = {};
  for (const id of ['cashier', 'pickup']) {
    const lane = [heads[id]];
    while (lane.length < 12) {
      const candidates = neighbors(map, lane.at(-1)).filter((cell) => !reserved.has(cellKey(cell)));
      candidates.sort((a, b) => (Math.abs(a.x - portal.x) + Math.abs(a.y - portal.y)) - (Math.abs(b.x - portal.x) + Math.abs(b.y - portal.y)));
      if (!candidates.length) break;
      lane.push(candidates[0]);
      reserved.add(cellKey(candidates[0]));
    }
    queues[id] = { lane, members: [], overflow: [], served: [] };
  }
  return queues;
}

export function joinQueue(queue, id) {
  if (queue.members.includes(id) || queue.overflow.includes(id)) return;
  if (queue.members.length < queue.lane.length && queue.overflow.length === 0) queue.members.push(id);
  else queue.overflow.push(id);
}

export function releaseCustomer(queue, id) {
  queue.members = queue.members.filter((member) => member !== id);
  queue.overflow = queue.overflow.filter((member) => member !== id);
  while (queue.overflow.length && queue.members.length < queue.lane.length) queue.members.push(queue.overflow.shift());
}

export function queueTarget(queue, id) {
  const index = queue.members.indexOf(id);
  return index < 0 ? null : queue.lane[index];
}
