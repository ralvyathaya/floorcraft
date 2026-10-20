export const initialLayout = {
  room: { width: 10, height: 8, cellSize: 0.5 },
  portal: { x: 0, y: 3.5, width: 0.5, height: 1, kind: 'entrance-exit' },
  objects: [
    { id: 'cashier', type: 'counter', label: 'Cashier', x: 3, y: 1, width: 1, height: 0.5, serviceFace: 'south' },
    { id: 'pickup', type: 'counter', label: 'Pickup', x: 7, y: 1, width: 1, height: 0.5, serviceFace: 'south' },
    { id: 'table-a', type: 'table', label: 'Table', x: 3, y: 5, width: 1.5, height: 1 },
    { id: 'table-b', type: 'table', label: 'Table', x: 6, y: 5, width: 1.5, height: 1 },
    { id: 'chair-a', type: 'chair', label: 'Chair', x: 1.5, y: 6, width: 0.5, height: 0.5 },
    { id: 'chair-b', type: 'chair', label: 'Chair', x: 8, y: 5.5, width: 0.5, height: 0.5 },
  ],
};
