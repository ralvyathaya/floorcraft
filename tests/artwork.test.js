import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { customerFrames, actorFrames, artForFurniture } from '../src/components/cafeAssets.js';
import atlas from '../src/assets/furniture-atlas.json';

test('every atlas crop remains inside its bundled PNG with no empty or negative source rectangle', () => {
  const sheets = Object.entries(atlas).flatMap(([theme, kinds]) => ['seating', 'service', 'props'].map(sheet => [`${theme}-${sheet}.png`, Object.values(kinds).flat().filter(art => art.sheet === sheet).map(art => art.crop)]));
  for (const [file, crops] of [
    ...sheets,
    ['cafe-customers.png', customerFrames.flat()],
    ['cafe-actors.png', actorFrames.flat()],
  ]) {
    const png = readFileSync(new URL(`../src/assets/${file}`, import.meta.url));
    const width = png.readUInt32BE(16); const height = png.readUInt32BE(20);
    for (const crop of crops) {
      expect(crop.x).toBeGreaterThanOrEqual(0); expect(crop.y).toBeGreaterThanOrEqual(0);
      expect(crop.width).toBeGreaterThan(0); expect(crop.height).toBeGreaterThan(0);
      expect(crop.x + crop.width).toBeLessThanOrEqual(width);
      expect(crop.y + crop.height).toBeLessThanOrEqual(height);
    }
  }
});

test('every theme has four upright frames per furniture family with recorded ground anchors', () => {
  expect(Object.keys(atlas)).toEqual(['oak', 'industrial', 'terracotta']);
  for (const theme of Object.keys(atlas)) for (const [kind, frames] of Object.entries(atlas[theme])) {
    expect(frames).toHaveLength(4);
    for (const [index, art] of frames.entries()) {
      expect(art.anchorY).toBe(0.98);
      expect(artForFurniture(theme, { id: kind, type: ['cashier', 'pickup'].includes(kind) ? 'counter' : kind, rotation: index * 90 })).toBe(art);
    }
  }
});

test('chair artwork follows south, west, north, east clockwise facings in every theme', () => {
  // These source columns were visually checked against each chair's seat and backrest.
  const sourceX = { oak: [128, 1001, 605, 1476], industrial: [124, 568, 1007, 1463], terracotta: [128, 1006, 587, 1459] };
  for (const [theme, columns] of Object.entries(sourceX)) {
    expect([0, 90, 180, 270].map(rotation => artForFurniture(theme, { type: 'chair', rotation }).crop.x)).toEqual(columns);
  }
});
