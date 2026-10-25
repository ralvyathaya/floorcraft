import { expect, test } from '@playwright/test';
import { cafePresets } from '../../src/app/presets.js';
import { createWorkspace, workspaceReducer } from '../../src/app/workspace.js';
import { createSaveDocument } from '../../src/app/storage.js';
import { createRun, step, finish } from '../../src/simulation/engine.js';
import { createScenario } from '../../src/simulation/scenario.js';

test.use({ hasTouch: true });
test.beforeEach(async ({ page }) => {
  await page.goto('/'); await page.evaluate(() => localStorage.clear()); await page.reload();
  await expect(page.locator('.canvas-shell')).toHaveAttribute('data-assets', 'ready');
});
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('floorcraft.workspace.v1')));
async function floorPoint(page, x, y) {
  const node = page.locator('.canvas-shell');
  const box = await node.boundingBox();
  const g = await node.evaluate(n => ({ s: +n.dataset.scale, x: +n.dataset.originX, y: +n.dataset.originY }));
  return { x: box.x + 1 + g.x + (x-y)*g.s, y: box.y + 1 + g.y + (x+y)*g.s/2 };
}

test('each preset loads its own material assets and keeps its theme through editing and reload', async ({ page }) => {
  const images = [];
  page.on('request', request => { if (request.resourceType() === 'image') images.push(request.url()); });
  await page.reload();
  await expect(page.locator('.canvas-shell')).toHaveAttribute('data-assets', 'ready');
  expect(images.some(url => url.includes('industrial-') || url.includes('terracotta-'))).toBe(false);
  for (const preset of cafePresets.slice(1)) {
    await page.getByRole('button', { name: `Load ${preset.name}`, exact: true }).click();
    await expect(page.locator('.canvas-shell')).toHaveAttribute('data-theme', preset.themeId);
    await expect(page.locator('.canvas-shell')).toHaveAttribute('data-assets', 'ready');
    expect(images.some(url => url.includes(`${preset.themeId}-service`))).toBe(true);
  }
  const a = await floorPoint(page, 2.25, 4.5);
  await page.mouse.click(a.x, a.y);
  await page.getByRole('button', { name: 'Rotate 90°' }).click();
  await expect(page.getByRole('heading', { name: /Custom café/ })).toBeVisible();
  await page.reload();
  await expect(page.locator('.canvas-shell')).toHaveAttribute('data-theme', 'terracotta');
  expect((await saved(page)).workingLayout.objects.find(o => o.id === 'table-1').rotation).toBe(90);
  await expect(page.getByText('Local workspace')).toHaveCount(0);
  await expect(page.getByText('ISOMETRIC / 2.5D')).toHaveCount(0);
  await page.getByText('About this simulation', { exact: true }).click();
  await expect(page.getByText(/not operational forecasts/i)).toBeVisible();
});

test('popup rotation follows projected footprints after pan/zoom and supports Undo and keyboard', async ({ page }, info) => {
  await page.getByRole('button', { name: 'Pan', exact: true }).click();
  const box = await page.locator('.canvas-shell').boundingBox();
  await page.mouse.move(box.x + 70, box.y + 70); await page.mouse.down();
  await page.mouse.move(box.x + 105, box.y + 100, { steps: 8 }); await page.mouse.up();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Select / Move', exact: true }).click();
  const p = await floorPoint(page, 2.25, 4.5); await page.mouse.click(p.x, p.y);
  const popup = page.getByRole('dialog', { name: 'Table 1 · 2 seats controls' });
  await expect(popup).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Rotate 90°' })).toBeFocused();
  await popup.getByRole('button', { name: 'Rotate 90°' }).click();
  expect((await saved(page)).workingLayout.objects.find(o => o.id === 'table-1')).toMatchObject({ x: 2, y: 3.5, width: 1, height: 1.5, rotation: 90 });
  await expect(popup).toBeVisible();
  await page.screenshot({ path: info.outputPath('rotation-desktop.png'), fullPage: true });
  await page.keyboard.press('Escape'); await expect(popup).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Café floorplan', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await saved(page)).workingLayout.objects.find(o => o.id === 'table-1').width).toBe(1.5);
  const canvas = page.getByRole('group', { name: 'Café floorplan', exact: true });
  await canvas.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Cashier controls' })).toBeVisible();
  await page.getByRole('button', { name: 'Load Compact Service', exact: true }).click();
  await expect(popup).toHaveCount(0);
  await canvas.focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('dialog', { name: 'Cashier controls' })).toBeVisible();
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(popup).toHaveCount(0);
  await canvas.focus(); await page.keyboard.press('Enter'); await expect(popup).toHaveCount(0);
  await page.getByRole('button', { name: 'Stop Simulation' }).click();
});

test('invalid turns preserve save/history and touch controls stay inside a narrow canvas', async ({ page }, info) => {
  const before = (await saved(page)).workingLayout;
  await page.setViewportSize({ width: 390, height: 844 });
  const p = await floorPoint(page, 4, 0.25); await page.touchscreen.tap(p.x, p.y);
  const popup = page.getByRole('dialog', { name: 'Coffee bar controls' });
  await expect(popup).toBeVisible();
  await popup.getByRole('button', { name: 'Rotate 90°' }).click();
  await expect(popup.getByRole('status')).toHaveText(/Cannot rotate: staff access blocked/);
  expect((await popup.getByRole('button', { name: 'Rotate 90°' }).boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect((await page.getByRole('button', { name: 'Simulate Rush Hour' }).boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect((await page.getByRole('button', { name: 'Zoom in', exact: true }).boundingBox()).width).toBeGreaterThanOrEqual(44);
  expect((await saved(page)).workingLayout).toEqual(before);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  const boundary = await page.locator('.canvas-shell').boundingBox(); const bounds = await popup.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(boundary.x);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(boundary.x + boundary.width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(boundary.y + boundary.height);
  await page.screenshot({ path: info.outputPath('rotation-narrow.png'), fullPage: true });
  await popup.getByRole('button', { name: 'Close furniture controls' }).click(); await expect(popup).toHaveCount(0);
  const q = await floorPoint(page, 2.25, 5.25); await page.touchscreen.tap(q.x, q.y);
  await expect(page.getByRole('dialog', { name: 'Table 1 · 2 seats controls' })).toBeVisible();
  await page.getByRole('heading', { name: 'FloorCraft', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('snapshot previews retain each captured theme and heatmap while working edits stay intact', async ({ page }) => {
  let state = createWorkspace(cafePresets[0].layout);
  for (const preset of [cafePresets[0], cafePresets[2]]) {
    state = workspaceReducer(state, { type: 'APPLY_PRESET', presetId: preset.id });
    const run = createRun(preset.layout, createScenario(preset.layout)); while (!run.done) step(run);
    state = workspaceReducer(state, { type: 'RUN_COMPLETED', snapshot: finish(run) });
  }
  await page.evaluate(doc => localStorage.setItem('floorcraft.workspace.v1', JSON.stringify(doc)), createSaveDocument(state));
  await page.reload(); await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
  for (const [name, theme] of [['Baseline Preview', 'oak'], ['Latest Preview', 'terracotta']]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.canvas-shell')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.canvas-shell')).toHaveAttribute('data-assets', 'ready');
    await expect(page.locator('.canvas-shell')).not.toHaveAttribute('data-heatmap', 'null');
    await page.getByRole('group', { name: 'Café floorplan', exact: true }).focus();
    await page.keyboard.press('Enter'); await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect((await saved(page)).workingLayout.themeId).toBe('terracotta');
  await expect(page.locator('.experiment-summary .delta')).toHaveCount(0);
  await expect(page.locator('.comparison-table .delta')).toHaveCount(8);
});

test('three themes remain readable idle, running and completed at desktop and narrow widths', async ({ page }, info) => {
  test.setTimeout(200000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  for (const preset of cafePresets) {
    await page.getByRole('button', { name: `Load ${preset.name}`, exact: true }).click();
    await expect(page.locator('.canvas-shell')).toHaveAttribute('data-assets', 'ready');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.screenshot({ path: info.outputPath(`${preset.themeId}-idle-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: '32×', exact: true }).click();
    await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
    await expect.poll(async () => +(await page.locator('.canvas-shell').getAttribute('data-active-customers'))).toBeGreaterThanOrEqual(8);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.screenshot({ path: info.outputPath(`${preset.themeId}-running-${width}.png`), fullPage: true });
    }
    await expect(page.getByText('Simulation complete', { exact: true })).toBeVisible({ timeout: 60000 });
    const heat = page.getByRole('button', { name: 'Heatmap', exact: true });
    if (await heat.getAttribute('aria-pressed') !== 'true') await heat.click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${preset.themeId}-completed-${width}.png`), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});
