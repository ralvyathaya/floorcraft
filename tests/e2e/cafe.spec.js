import { expect, test } from '@playwright/test';
import { cafePresets, legacyPresets } from '../../src/app/presets.js';
import { createRun, step, finish } from '../../src/simulation/engine.js';
import { createScenario } from '../../src/simulation/scenario.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/'); await page.evaluate(() => localStorage.clear()); await page.reload();
  await expect(page.locator('.canvas-shell')).toHaveAttribute('data-assets', 'ready');
});
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('floorcraft.workspace.v1')));
async function point(page, x, y) {
  const shell = page.locator('.canvas-shell'); const box = await shell.boundingBox();
  const g = await shell.evaluate(n => ({ s: +n.dataset.scale, x: +n.dataset.originX, y: +n.dataset.originY }));
  return { x: box.x + 1 + g.x + (x - y) * g.s, y: box.y + 1 + g.y + (x + y) * g.s / 2 };
}
async function drag(page, from, to, release = true) {
  const a = await point(page, ...from); const b = await point(page, ...to);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 12 });
  if (release) await page.mouse.up();
}
function result(layout, runNumber) {
  const r = createRun(layout, createScenario(layout)); while (!r.done) step(r);
  return { ...finish(r), runNumber };
}

test('grouped table and seats drag together after zoom/pan, reject invalid drops, Undo and reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const before = (await saved(page)).workingLayout;
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Pan', exact: true }).click();
  const box = await page.locator('.canvas-shell').boundingBox();
  await page.mouse.move(box.x + 100, box.y + 60); await page.mouse.down();
  await page.mouse.move(box.x + 125, box.y + 80, { steps: 8 }); await page.mouse.up();
  await page.getByRole('button', { name: 'Select / Move', exact: true }).click();
  await drag(page, [2.25, 4.5], [2.75, 4.5]);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  const moved = (await saved(page)).workingLayout;
  for (const id of ['table-1', 'chair-1-1', 'chair-1-2']) {
    expect(moved.objects.find(o => o.id === id).x).toBe(before.objects.find(o => o.id === id).x + 0.5);
  }
  await drag(page, [2.75, 4.5], [4, 0.5], false);
  await expect(page.getByText(/Placement rejected/)).toBeVisible(); await page.mouse.up();
  expect((await saved(page)).workingLayout).toEqual(moved);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await saved(page)).workingLayout).toEqual(before);
  await drag(page, [2.25, 4.5], [2.75, 4.5]); await page.reload();
  expect((await saved(page)).workingLayout).toEqual(moved);
  await expect(page.getByRole('heading', { name: /Custom café/ })).toBeVisible();
});

test('live mixed service shows production and seating, completes, and Stop/reload retain the result', async ({ page }, info) => {
  test.setTimeout(100000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: '32×', exact: true }).click();
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  const shell = page.locator('.canvas-shell');
  await expect(shell).toHaveAttribute('data-barista-phase', 'preparing', { timeout: 12000 });
  await expect.poll(async () => +(await shell.getAttribute('data-seated-customers')), { timeout: 12000 }).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath('seated-barista-desktop.png'), fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(shell).toHaveAttribute('data-reduced-motion', 'true');
  await expect(page.locator('.pulse')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: '8×', exact: true }).click();
  await expect(page.getByRole('button', { name: '8×', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '32×', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('seated-barista-narrow.png'), fullPage: true });
  await expect(page.getByText('Simulation complete', { exact: true })).toBeVisible({ timeout: 65000 });
  const doc = await saved(page);
  expect(doc.latest.metrics).toMatchObject({ completed: 24, dineInServed: 8, switchedToTakeaway: 10 });
  await expect(page.locator('.metric-row').filter({ hasText: 'Dine-in fulfilled' })).toContainText('8 / 18');
  await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  expect(await page.locator('.sidebar').evaluate(n => n.scrollHeight > n.clientHeight)).toBe(true);
  await expect(page.locator('body')).toHaveCSS('font-family', /Inter/);
  await page.screenshot({ path: info.outputPath('completed-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await page.getByRole('button', { name: 'Stop Simulation' }).click();
  expect((await saved(page)).latest).toEqual(doc.latest);
  await page.reload(); expect((await saved(page)).latest).toEqual(doc.latest);
  expect(errors).toEqual([]);
});

test('legacy and café results remain previewable but cannot be compared across models', async ({ page }, info) => {
  const baseline = result(legacyPresets[0].layout, 1); const latest = result(cafePresets[2].layout, 2);
  await page.evaluate(doc => localStorage.setItem('floorcraft.workspace.v1', JSON.stringify(doc)), {
    schemaVersion: 1, workingLayout: latest.layout, baseline, latest,
  });
  await page.reload();
  await expect(page.getByLabel('Experiment takeaway')).toContainText('cannot be compared');
  expect((await saved(page)).baseline).toEqual(baseline);
  await page.getByRole('button', { name: 'Baseline Preview', exact: true }).click();
  await expect(page.getByText('Takeaway rush hour', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simulate Rush Hour' })).toBeDisabled();
  await page.getByRole('button', { name: 'Latest Preview', exact: true }).click();
  await expect(page.getByText('Self-service café', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('historical-model-preview.png'), fullPage: true });
  await page.getByRole('button', { name: 'Return to Working Layout' }).click();
  await page.getByRole('button', { name: 'Start New Comparison' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await saved(page)).baseline).toEqual(baseline);
});
