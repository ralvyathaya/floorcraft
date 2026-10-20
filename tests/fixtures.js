export const openLayout = {
  room: { width: 10, height: 8, cellSize: 0.5 },
  portal: { x: 0, y: 3.5, width: 0.5, height: 1, kind: 'entrance-exit' },
  objects: [
    { id: 'cashier', type: 'counter', x: 3, y: 1, width: 1, height: 0.5, serviceFace: 'south' },
    { id: 'pickup', type: 'counter', x: 7, y: 1, width: 1, height: 0.5, serviceFace: 'south' },
    { id: 'table-a', type: 'table', x: 3, y: 5, width: 1.5, height: 1 },
    { id: 'table-b', type: 'table', x: 6, y: 5, width: 1.5, height: 1 },
  ],
};

export const narrowLayout = {
  room: { width: 4, height: 3, cellSize: 0.5 },
  portal: { x: 0, y: 1, width: 0.5, height: 1, kind: 'entrance-exit' },
  objects: [
    { id: 'cashier', type: 'counter', x: 2.5, y: 0.5, width: 1, height: 0.5, serviceFace: 'south' },
    { id: 'pickup', type: 'counter', x: 2.5, y: 2, width: 1, height: 0.5, serviceFace: 'north' },
  ],
};

export const blockedLayout = {
  ...openLayout,
  objects: [
    ...openLayout.objects.filter((object) => object.id !== 'table-a'),
    { id: 'table-a', type: 'table', x: 0.5, y: 0, width: 1, height: 8 },
  ],
};
