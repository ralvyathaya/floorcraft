import { initialLayout, canonicalSignature } from '../simulation/layout.js';

const studioObjects = [
  ...initialLayout.objects,
  { id: 'service-bar', type: 'bar', label: 'Coffee bar', x: 3, y: 0, width: 3, height: 0.5 },
  { id: 'display', type: 'display', label: 'Pastry display', x: 8.5, y: 1, width: 1, height: 0.5 },
  { id: 'bench', type: 'bench', label: 'Bench', x: 4, y: 7, width: 2, height: 0.5 },
  { id: 'planter-a', type: 'planter', label: 'Planter', x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
  { id: 'planter-b', type: 'planter', label: 'Planter', x: 9, y: 6.5, width: 0.5, height: 0.5 },
  { id: 'bin', type: 'bin', label: 'Waste bin', x: 0.5, y: 7, width: 0.5, height: 0.5 },
];

export const legacyPresets = [
  { id: 'corner', name: 'Corner Café', themeId: 'oak', description: 'Oak · Japandi', positions: {} },
  { id: 'compact', name: 'Compact Service', themeId: 'industrial', description: 'Concrete · Industrial', positions: { cashier: [2.5, 1], pickup: [4.5, 1] } },
  { id: 'split', name: 'Split Counter', themeId: 'terracotta', description: 'Terracotta · Mediterranean', positions: { pickup: [7, 4], 'table-a': [4, 3] } },
].map(({ positions, ...preset }) => ({
  ...preset,
  layout: {
    ...structuredClone(initialLayout),
    themeId: preset.themeId,
    objects: studioObjects.map((object) => ({ ...object, ...(positions[object.id] ? { x: positions[object.id][0], y: positions[object.id][1] } : {}) })),
  },
}));

export const cafePresets = [
  { id: 'corner', name: 'Corner Café', themeId: 'oak', description: 'Oak · Japandi', columns: [1.5, 6.5], chairs: 2, cashier: 1.5, pickup: 7.5 },
  { id: 'compact', name: 'Compact Service', themeId: 'industrial', description: 'Concrete · Industrial', columns: [1, 4, 7], chairs: 2, cashier: 2, pickup: 5.5 },
  { id: 'split', name: 'Split Counter', themeId: 'terracotta', description: 'Terracotta · Mediterranean', columns: [1.5, 6.5], chairs: 4, cashier: 1.5, pickup: 8 },
].map(({ columns, chairs, cashier, pickup, ...preset }) => {
  const objects = [
    { id: 'cashier', type: 'counter', label: 'Cashier', x: cashier, y: 2, width: 1, height: 0.5, serviceFace: 'south' },
    { id: 'pickup', type: 'counter', label: 'Pickup', x: pickup, y: 2, width: 1, height: 0.5, serviceFace: 'south' },
    { id: 'service-bar', type: 'bar', label: 'Coffee bar', x: 3, y: 0, width: 3, height: 0.5, serviceFace: 'south' },
    { id: 'display', type: 'display', label: 'Pastry display', x: 9, y: 2, width: 1, height: 0.5 },
    { id: 'planter-a', type: 'planter', label: 'Planter', x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    { id: 'planter-b', type: 'planter', label: 'Planter', x: 9, y: 6.5, width: 0.5, height: 0.5 },
    { id: 'bin', type: 'bin', label: 'Waste bin', x: 0.5, y: 7, width: 0.5, height: 0.5 },
  ];
  const tableGroups = [];
  for (const y of [3.5, 6]) for (const x of columns) {
    const n = tableGroups.length + 1;
    const tableId = `table-${n}`;
    objects.push({ id: tableId, type: 'table', label: `Table ${n}`, x, y: y + 0.5, width: 1.5, height: 1 });
    const offsets = chairs === 2 ? [[0.5, 0], [0.5, 1.5]] : [[0, 0], [1, 0], [0, 1.5], [1, 1.5]];
    const chairIds = offsets.map(([dx, dy], index) => {
      const id = `chair-${n}-${index + 1}`;
      objects.push({ id, type: 'chair', label: `Seat ${n}.${index + 1}`, x: x + dx, y: y + dy, width: 0.5, height: 0.5, rotation: dy ? 180 : 0 });
      return id;
    });
    tableGroups.push({ id: `seating-${n}`, tableId, chairIds });
  }
  return { ...preset, capacity: chairs * tableGroups.length, layout: {
    ...structuredClone(initialLayout), modelId: 'cafe-v2', themeId: preset.themeId, objects, tableGroups,
    staffZone: { x: 0, y: 0, width: 10, height: 2.5 }, waitingZone: { x: 0.5, y: 2.5, width: 9, height: 1 },
  } };
});

export function identifyPreset(layout) {
  const signature = canonicalSignature(layout);
  return cafePresets.find((preset) => canonicalSignature(preset.layout) === signature && themeForLayout(layout) === preset.themeId && layout.objects.every(object => (object.rotation ?? 0) === (preset.layout.objects.find(o => o.id === object.id)?.rotation ?? 0))) ?? null;
}

export function themeForLayout(layout) {
  return layout.themeId ?? [...cafePresets, ...legacyPresets].find((preset) => canonicalSignature(preset.layout) === canonicalSignature(layout))?.themeId ?? 'oak';
}

export function validObjectInventory(objects) {
  if (!Array.isArray(objects)) return false;
  const expected = [initialLayout.objects, studioObjects, ...cafePresets.map(p => p.layout.objects)].find(items => items.length === objects.length);
  if (!expected) return false;
  return objects.length === expected.length && new Set(objects.map((object) => object?.id)).size === expected.length &&
    expected.every((item) => objects.some((object) => object?.id === item.id && object.type === item.type));
}
