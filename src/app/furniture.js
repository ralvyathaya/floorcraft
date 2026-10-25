export function rotateFurniture(object) {
  const faces = ['north', 'east', 'south', 'west'];
  return {
    ...object,
    width: object.height,
    height: object.width,
    rotation: ((object.rotation ?? 0) + 90) % 360,
    ...(object.type === 'counter' || object.serviceFace ? { serviceFace: faces[(faces.indexOf(object.serviceFace ?? 'south') + 1) % 4] } : {}),
  };
}

export function selectionObjects(layout, id) {
  const group = layout.tableGroups?.find(g => g.tableId === id || g.chairIds.includes(id));
  const ids = group ? [group.tableId, ...group.chairIds] : [id];
  return layout.objects.filter(o => ids.includes(o.id));
}

export function moveSelection(layout, id, dx, dy) {
  return selectionObjects(layout, id).map(o => ({ ...o, x: o.x + dx, y: o.y + dy }));
}

export function rotateSelection(layout, id) {
  const objects = selectionObjects(layout, id);
  const x = Math.min(...objects.map(o => o.x)); const y = Math.min(...objects.map(o => o.y));
  const height = Math.max(...objects.map(o => o.y + o.height)) - y;
  return objects.map(o => ({ ...rotateFurniture(o), x: x + height - (o.y - y + o.height), y: y + o.x - x }));
}
