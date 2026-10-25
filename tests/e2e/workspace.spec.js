import { expect, test } from '@playwright/test';
import { initialLayout } from '../../src/simulation/layout.js';
import { cafePresets, legacyPresets } from '../../src/app/presets.js';
import { createRun, step, finish } from '../../src/simulation/engine.js';
import { createScenario } from '../../src/simulation/scenario.js';
import { createWorkspace, workspaceReducer } from '../../src/app/workspace.js';
import { createSaveDocument } from '../../src/app/storage.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(layout => { localStorage.clear(); localStorage.setItem('floorcraft.workspace.v1', JSON.stringify({ schemaVersion: 1, workingLayout: layout, baseline: null, latest: null })); }, legacyPresets[0].layout);
  await page.reload();
  await expect(page.locator('.canvas-shell')).toHaveAttribute('data-assets', 'ready');
});

test('committed layout and completed snapshots survive reload, but an active run does not', async ({ page }) => {
  test.setTimeout(150000);
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  const geometry = await page.locator('.canvas-shell').evaluate((node) => ({ scale: Number(node.dataset.scale), x: Number(node.dataset.originX), y: Number(node.dataset.originY) }));
  const point = ([x, y]) => ({ x: box.x + geometry.x + (x - y) * geometry.scale, y: box.y + geometry.y + (x + y) * geometry.scale / 2 });
  const start = point([3.5, 5.25]); const end = point([1.5, 1.75]);
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 12 }); await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  const signature = await page.locator('.canvas-shell').getAttribute('data-layout-signature');
  await page.reload();
  await expect(page.locator('.canvas-shell')).toHaveAttribute('data-layout-signature', signature);
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByText('Simulation complete', { exact: true })).toBeVisible({ timeout: 60000 });
  await page.reload();
  await expect(page.getByText('Simulation complete', { exact: true })).toBeVisible();
  await expect(page.getByText('24 / 24', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByText('Simulation running', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Simulation complete', { exact: true })).toBeVisible();
  await expect(page.getByText('24 / 24', { exact: true })).toBeVisible();
  await expect(page.locator('.canvas-shell')).toHaveAttribute('data-active-customers', '0');
});

test('corrupt saves are preserved until explicit replacement', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('floorcraft.workspace.v1', '{broken-save'));
  await page.reload();
  await expect(page.getByText(/saved workspace could not be recovered/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Replace unreadable save/i })).toBeVisible();
  await expect(page.getByText('No completed experiment yet')).toBeVisible();
  await page.getByRole('button', { name: /Replace unreadable save/i }).click();
  await expect(page.getByText(/unreadable save replaced/i)).toBeVisible();
  await page.reload();
  await expect(page.getByText('Ready to simulate', { exact: true })).toBeVisible();
  await expect(page.getByText(/could not be recovered/i)).toHaveCount(0);
});

test('storage write failures keep the experiment usable and show an unsaved warning', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args) {
      if (args[0] === 'floorcraft.workspace.v1') throw new Error('quota fixture');
      return original.apply(this, args);
    };
  });
  await page.reload();
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  const geometry = await page.locator('.canvas-shell').evaluate((node) => ({ scale: Number(node.dataset.scale), x: Number(node.dataset.originX), y: Number(node.dataset.originY) }));
  const point = ([x, y]) => ({ x: box.x + geometry.x + (x - y) * geometry.scale, y: box.y + geometry.y + (x + y) * geometry.scale / 2 });
  const start = point([3.5, 5.25]); const end = point([1.5, 1.75]);
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 12 }); await page.mouse.up();
  await expect(page.getByText(/Changes cannot be saved in this browser/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
});

test('opens the premade café workspace with an obvious next action', async ({ page }) => {
  await expect(page).toHaveTitle(/FloorCraft/);
  await expect(page.getByRole('heading', { name: 'FloorCraft' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simulate Rush Hour' })).toBeVisible();
  await expect(page.getByText('Ready to simulate')).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();
});

test('legacy saves remain intact and preset selection is undoable, persistent, and locked during runs', async ({ page }) => {
  await page.evaluate((layout) => localStorage.setItem('floorcraft.workspace.v1', JSON.stringify({ schemaVersion: 1, workingLayout: layout, baseline: null, latest: null })), initialLayout);
  await page.reload();
  await expect(page.getByText(/Saved takeaway model preserved/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Custom café 10 × 8 m/ })).toBeVisible();
  const shell = page.locator('.canvas-shell');
  const original = await shell.getAttribute('data-layout-signature');
  await page.getByRole('button', { name: 'Load Corner Café', exact: true }).click();
  expect(JSON.parse(await shell.getAttribute('data-layout-signature')).objects).toHaveLength(19);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(shell).toHaveAttribute('data-layout-signature', original);
  await page.getByRole('button', { name: 'Load Compact Service', exact: true }).click();
  const compact = await shell.getAttribute('data-layout-signature');
  await page.reload();
  await expect(shell).toHaveAttribute('data-layout-signature', compact);
  await expect(page.getByRole('button', { name: 'Load Compact Service', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  for (const name of ['Corner Café', 'Compact Service', 'Split Counter']) await expect(page.getByRole('button', { name: `Load ${name}`, exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Stop Simulation' }).click();
  await expect(shell).toHaveAttribute('data-layout-signature', compact);
});

test('a sprite-loading failure keeps the geometry and experiment usable', async ({ page }) => {
  await page.route('**/oak-service.png*', (route) => route.request().resourceType() === 'image' ? route.abort() : route.continue());
  await page.reload();
  await expect(page.locator('.canvas-shell')).toHaveAttribute('data-assets', 'error');
  await expect(page.getByText(/artwork could not load/i)).toBeVisible();
  await moveTable(page, [3.5, 5.25], [1.5, 1.75]);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByRole('button', { name: 'Stop Simulation' })).toBeEnabled();
});

test('a sprite’s rectangular image box does not capture drags outside its floor footprint', async ({ page }) => {
  const shell = page.locator('.canvas-shell');
  const original = await shell.getAttribute('data-layout-signature');
  const box = await page.locator('canvas').first().boundingBox();
  const geometry = await shell.evaluate((node) => ({ scale: Number(node.dataset.scale), x: Number(node.dataset.originX), y: Number(node.dataset.originY) }));
  // Just above the left tip of table-a's footprint: inside its image bounds, outside its ground polygon.
  const x = box.x + geometry.x + (3 - 5 - 0.9) * geometry.scale;
  const y = box.y + geometry.y + ((3 + 5) / 2 - 0.1) * geometry.scale;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 20, y + 10, { steps: 6 }); await page.mouse.up();
  await expect(shell).toHaveAttribute('data-layout-signature', original);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

test('motion preference updates live without changing layout, saved state or run controls', async ({ page }) => {
  const shell = page.locator('.canvas-shell');
  const signature = await shell.getAttribute('data-layout-signature');
  const saved = await page.evaluate(() => localStorage.getItem('floorcraft.workspace.v1'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(shell).toHaveAttribute('data-reduced-motion', 'true');
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(shell).toHaveAttribute('data-active-customers', /^[1-9]/);
  await expect(page.locator('.pulse')).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: 'Select / Move' })).toBeDisabled();
  await page.getByRole('button', { name: 'Stop Simulation' }).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(shell).toHaveAttribute('data-reduced-motion', 'false');
  await expect(shell).toHaveAttribute('data-layout-signature', signature);
  expect(await page.evaluate(() => localStorage.getItem('floorcraft.workspace.v1'))).toBe(saved);
});

test('restyled workspace fits desktop and narrow windows without horizontal overflow', async ({ page }, testInfo) => {
  for (const [width, height] of [[1440, 900], [980, 720], [390, 844], [320, 740]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.locator('.canvas-shell').evaluate((node) => {
      const canvas = node.querySelector('canvas').getBoundingClientRect();
      const scale = Number(node.dataset.scale);
      const x = Number(node.dataset.originX); const y = Number(node.dataset.originY);
      return x - 8 * scale >= 28 && y >= 28 && x + 10 * scale + 28 <= canvas.width && y + 9 * scale + 28 <= canvas.height;
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440 || width === 390) await page.screenshot({ path: testInfo.outputPath(`idle-${width}.png`), fullPage: true });
  }
  // Real engine-generated snapshots keep responsive result artwork checks fast.
  let fixture = createWorkspace(cafePresets[0].layout);
  for (const preset of cafePresets.slice(0, 2)) {
    fixture = workspaceReducer(fixture, { type: 'APPLY_PRESET', presetId: preset.id });
    const run = createRun(preset.layout, createScenario(preset.layout)); while (!run.done) step(run);
    fixture = workspaceReducer(fixture, { type: 'RUN_COMPLETED', snapshot: finish(run) });
  }
  await page.evaluate((saved) => localStorage.setItem('floorcraft.workspace.v1', JSON.stringify(saved)), createSaveDocument(fixture));
  await page.reload();
  await expect(page.getByLabel('Experiment takeaway')).toContainText('24 / 24 → 24 / 24 completed');
  await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`comparison-${width}.png`), fullPage: true });
  }
});

test('starting a run shows moving customers and locks editing', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByText('Simulation running')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop Simulation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(page.getByText(/on floor/i)).toBeVisible();
  await expect.poll(async () => Number(await page.locator('.canvas-shell').getAttribute('data-active-customers')), { timeout: 15000 }).toBeGreaterThanOrEqual(8);
  await page.screenshot({ path: testInfo.outputPath('isometric-running-1440.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('canvas').first().evaluate((node) => node.getBoundingClientRect().width <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('isometric-running-390.png'), fullPage: true });
});

test('stopping a run restores the ready state without publishing results', async ({ page }) => {
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByRole('button', { name: 'Stop Simulation' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop Simulation' }).click();
  await expect(page.getByText('Simulation stopped', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simulate Rush Hour' })).toBeEnabled();
  await expect(page.getByText('No completed experiment yet')).toBeVisible();
});

test('valid furniture moves remain placed, invalid drops snap back and Undo restores geometry', async ({ page }) => {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  const geometry = await page.locator('.canvas-shell').evaluate((node) => ({ scale: Number(node.dataset.scale), x: Number(node.dataset.originX), y: Number(node.dataset.originY) }));
  const { scale } = geometry;
  const origin = { x: box.x + geometry.x, y: box.y + geometry.y };
  const point = ([x, y]) => ({ x: origin.x + (x - y) * scale, y: origin.y + (x + y) * scale / 2 });
  const tableStart = point([3.5, 5.25]);
  const validTarget = point([1.5, 1.75]);
  await page.mouse.move(tableStart.x, tableStart.y);
  await page.mouse.down();
  await page.mouse.move(validTarget.x, validTarget.y, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await expect(page.locator('[data-testid="viewport-status"]')).toHaveAttribute('data-offset', '0,0');

  const invalidTarget = point([6.5, 5.25]);
  await page.mouse.move(validTarget.x, validTarget.y);
  await page.mouse.down();
  await page.mouse.move(invalidTarget.x, invalidTarget.y, { steps: 12 });
  await expect(page.getByText(/Placement rejected: overlap/)).toBeVisible();
  await page.mouse.up();
  await expect(page.getByText(/Placement rejected/)).toHaveCount(0);
  // A second attempt from the valid location proves rejection restored it there.
  await page.mouse.move(validTarget.x, validTarget.y);
  await page.mouse.down();
  await page.mouse.move(invalidTarget.x, invalidTarget.y, { steps: 12 });
  await expect(page.getByText(/Placement rejected: overlap/)).toBeVisible();
  await page.mouse.up();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

test('rush hour completes naturally and stopping another run retains its completed metrics', async ({ page }) => {
  test.setTimeout(70000);
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByText('Simulation complete', { exact: true })).toBeVisible({ timeout: 60000 });
  await expect(page.getByText('24 / 24', { exact: true })).toBeVisible();
  const results = await page.locator('.metric-row').allTextContents();
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await page.getByRole('button', { name: 'Stop Simulation' }).click();
  await expect(page.locator('.metric-row')).toHaveCount(4);
  expect(await page.locator('.metric-row').allTextContents()).toEqual(results);
});

test('viewport zoom, Fit and Pan change presentation without editing furniture', async ({ page }) => {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.locator('[data-testid="viewport-status"]')).not.toHaveText('100%');
  await page.getByRole('button', { name: 'Fit to View', exact: true }).click();
  await page.getByRole('button', { name: 'Pan', exact: true }).click();
  await page.mouse.move(box.x + 120, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 120, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await expect(page.locator('[data-testid="viewport-status"]')).toHaveAttribute('data-offset', /[^0]/);
  await page.getByRole('button', { name: 'Fit to View', exact: true }).click();
  const geometry = await page.locator('.canvas-shell').evaluate((node) => ({ scale: Number(node.dataset.scale), x: Number(node.dataset.originX), y: Number(node.dataset.originY) }));
  expect(geometry.x).toBeGreaterThanOrEqual(0);
  expect(geometry.y).toBeGreaterThanOrEqual(0);
  expect(geometry.x + 10 * geometry.scale).toBeLessThanOrEqual(box.width);
  expect(geometry.y + 9 * geometry.scale).toBeLessThanOrEqual(box.height);
  await page.setViewportSize({ width: 980, height: 720 });
  await expect.poll(async () => page.locator('.canvas-shell').evaluate((node) => {
    const canvas = node.querySelector('canvas').getBoundingClientRect();
    return Number(node.dataset.originX) + Number(node.dataset.scale) * 10 <= canvas.width + 1;
  })).toBe(true);
  const newBox = await canvas.boundingBox();
  expect(newBox.width).toBeLessThan(box.width);
});

test('an initialization exception is visible, unlocks controls and never publishes completion', async ({ page }) => {
  await page.route('**/src/simulation/engine.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'export function createRun(){throw new Error("Fixture initialization failure")} export function step(){} export function finish(){}',
  }));
  await page.reload();
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByText('Simulation error', { exact: true })).toBeVisible();
  await expect(page.getByText(/Fixture initialization failure/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simulate Rush Hour' })).toBeEnabled();
  await expect(page.getByText('No completed experiment yet')).toBeVisible();
});

test('a mid-run exception clears partial customer presentation without publishing results', async ({ page }) => {
  await page.route('**/src/simulation/engine.js*', async (route) => {
    const response = await route.fetch();
    const source = (await response.text()).replace('export function step(run) {', 'export function step(run) { if (run.tick === 10) throw new Error("Fixture tick failure");');
    await route.fulfill({ response, body: source });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.locator('.canvas-shell')).toHaveAttribute('data-active-customers', /^[1-9]/);
  await expect(page.getByText('Simulation error', { exact: true })).toBeVisible();
  await expect(page.locator('.canvas-shell')).toHaveAttribute('data-active-customers', '0');
  await expect(page.getByText('No completed experiment yet')).toBeVisible();
});

async function moveTable(page, from, to) {
  const box = await page.locator('canvas').first().boundingBox();
  const geometry = await page.locator('.canvas-shell').evaluate((node) => ({ scale: Number(node.dataset.scale), x: Number(node.dataset.originX), y: Number(node.dataset.originY) }));
  const point = ([x, y]) => ({ x: box.x + geometry.x + (x - y) * geometry.scale, y: box.y + geometry.y + (x + y) * geometry.scale / 2 });
  const start = point(from); const end = point(to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}

test('baseline and latest previews show their own heatmaps without losing untested edits, reset confirms', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await expect(page.getByRole('button', { name: 'Heatmap', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect.poll(async () => Number(await page.locator('.canvas-shell').getAttribute('data-active-customers'))).toBeGreaterThanOrEqual(8);
  await page.screenshot({ path: testInfo.outputPath('running-1440.png'), fullPage: true });
  await expect(page.getByText('Simulation complete', { exact: true })).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/first completed run is your baseline/i)).toBeVisible();
  await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Heatmap', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Blocked-customer seconds', { exact: true })).toBeVisible();
  const shell = page.locator('.canvas-shell');
  const baselineHeat = await shell.getAttribute('data-heatmap');
  expect(JSON.parse(baselineHeat).some((cell) => cell.ticks > 0)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('baseline-heatmap-1440.png'), fullPage: true });
  const original = await shell.getAttribute('data-layout-signature');
  // A known route-sensitive fixture: table origin (3,5) → (4,3).
  await moveTable(page, [3.5, 5.25], [4.5, 3.25]);
  await expect(page.locator('.layout-badge')).toHaveText('Untested changes');
  await expect(page.getByRole('button', { name: 'Heatmap', exact: true })).toBeDisabled();
  await expect(shell).toHaveAttribute('data-heatmap', 'null');
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByText('Simulation complete', { exact: true })).toBeVisible({ timeout: 60000 });
  const latest = await shell.getAttribute('data-layout-signature');
  const latestHeat = await shell.getAttribute('data-heatmap');
  expect(latest).not.toBe(original);
  expect(latestHeat).not.toBe(baselineHeat);
  const rows = page.getByRole('table', { name: 'Baseline and latest results' });
  await expect(rows.getByRole('columnheader', { name: 'Baseline Run 1', exact: true })).toBeVisible();
  await expect(rows.getByRole('columnheader', { name: 'Latest Run 2', exact: true })).toBeVisible();
  await expect(rows.getByText(/worse/i).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('comparison-1440.png'), fullPage: true });
  await moveTable(page, [4.5, 3.25], [1.5, 1.75]);
  const unsimulated = await shell.getAttribute('data-layout-signature');
  await expect(page.getByText(/Results belong to earlier layouts/i)).toBeVisible();
  for (const [name, signature, heat] of [['Baseline Preview', original, baselineHeat], ['Latest Preview', latest, latestHeat]]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.layout-badge')).toHaveText(`${name} · Read only`);
    await expect(shell).toHaveAttribute('data-layout-signature', signature);
    await expect(shell).toHaveAttribute('data-heatmap', heat);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Select / Move', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Simulate Rush Hour' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Pan', exact: true })).toBeEnabled();
    // Attempting to drag the visible table cannot mutate its snapshot.
    await moveTable(page, name === 'Baseline Preview' ? [3.5, 5.25] : [4.5, 3.25], [1.5, 1.75]);
    await expect(shell).toHaveAttribute('data-layout-signature', signature);
    await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
    await expect(shell).toHaveAttribute('data-heatmap', 'null');
    await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
    await page.getByRole('button', { name: 'Return to Working Layout' }).click();
    await expect(shell).toHaveAttribute('data-layout-signature', unsimulated);
    await expect(shell).toHaveAttribute('data-heatmap', 'null');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Latest Preview', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('comparison-390.png'), fullPage: true });
  await page.getByRole('button', { name: 'Return to Working Layout' }).click();
  const reset = page.getByRole('button', { name: 'Start New Comparison', exact: true });
  await reset.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Start a new comparison?' });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('reset-dialog-390.png') });
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(reset).toBeFocused();
  await reset.click();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(rows).toBeVisible();
  await expect(shell).toHaveAttribute('data-layout-signature', unsimulated);
  await reset.click();
  await dialog.getByRole('button', { name: 'Clear comparison', exact: true }).click();
  await expect(page.getByText('No completed experiment yet')).toBeVisible();
  await expect(shell).toHaveAttribute('data-layout-signature', unsimulated);
  await expect(page.getByRole('button', { name: 'Baseline Preview', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('Compact Service retains the baseline and reports lower averages alongside three failed journeys', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByText('Simulation complete', { exact: true })).toBeVisible({ timeout: 60000 });
  const original = await page.locator('.canvas-shell').getAttribute('data-layout-signature');
  await page.evaluate(layout => { const doc = JSON.parse(localStorage.getItem('floorcraft.workspace.v1')); doc.workingLayout = layout; localStorage.setItem('floorcraft.workspace.v1', JSON.stringify(doc)); }, legacyPresets[1].layout);
  await page.reload();
  await expect(page.getByText(/Results belong to earlier layouts/i)).toBeVisible();
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByText('Simulation complete', { exact: true })).toBeVisible({ timeout: 60000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('floorcraft.workspace.v1')));
  expect(saved.baseline.signature).toBe(original);
  expect(saved.latest.metrics.completed).toBe(21);
  expect(saved.latest.metrics.failures.stuck).toBe(3);
  await expect(page.getByLabel('Experiment takeaway')).toContainText('24 / 24 → 21 / 24 completed');
  await expect(page.getByLabel('Experiment takeaway')).toContainText('Lower waiting time does not establish an improvement');
  await expect(page.locator('.delta.improved')).toHaveCount(0);
  await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('compact-tradeoff.png'), fullPage: true });
});
