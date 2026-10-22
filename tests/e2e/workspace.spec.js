import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('committed layout and completed snapshots survive reload, but an active run does not', async ({ page }) => {
  test.setTimeout(150000);
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  const geometry = await page.locator('.canvas-shell').evaluate((node) => ({ scale: Number(node.dataset.scale), x: Number(node.dataset.originX), y: Number(node.dataset.originY) }));
  const point = ([x, y]) => ({ x: box.x + geometry.x + x * geometry.scale, y: box.y + geometry.y + y * geometry.scale });
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
  const point = ([x, y]) => ({ x: box.x + geometry.x + x * geometry.scale, y: box.y + geometry.y + y * geometry.scale });
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

test('starting a run shows moving customers and locks editing', async ({ page }) => {
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByText('Simulation running')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop Simulation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(page.getByText(/customers in motion/i)).toBeVisible();
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
  const tableStart = { x: origin.x + 3.5 * scale, y: origin.y + 5.25 * scale };
  const validTarget = { x: origin.x + 1.5 * scale, y: origin.y + 1.75 * scale };
  await page.mouse.move(tableStart.x, tableStart.y);
  await page.mouse.down();
  await page.mouse.move(validTarget.x, validTarget.y, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await expect(page.locator('[data-testid="viewport-status"]')).toHaveAttribute('data-offset', '0,0');

  const invalidTarget = { x: origin.x + 6.5 * scale, y: origin.y + 5.25 * scale };
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
  expect(geometry.y + 8 * geometry.scale).toBeLessThanOrEqual(box.height);
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
  const point = ([x, y]) => ({ x: box.x + geometry.x + x * geometry.scale, y: box.y + geometry.y + y * geometry.scale });
  const start = point(from); const end = point(to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}

test('baseline and latest previews show their own heatmaps without losing untested edits, reset confirms', async ({ page }) => {
  test.setTimeout(150000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.getByRole('button', { name: 'Heatmap', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Simulate Rush Hour' }).click();
  await expect(page.getByText('Simulation complete', { exact: true })).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/first completed run is your baseline/i)).toBeVisible();
  await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Heatmap', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Blocked-customer seconds')).toBeVisible();
  const shell = page.locator('.canvas-shell');
  const baselineHeat = await shell.getAttribute('data-heatmap');
  expect(JSON.parse(baselineHeat).some((cell) => cell.ticks > 0)).toBe(true);
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
  await moveTable(page, [4.5, 3.25], [1.5, 1.75]);
  const unsimulated = await shell.getAttribute('data-layout-signature');
  await expect(page.getByText(/results below belong to earlier tested layouts/i)).toBeVisible();
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
  const reset = page.getByRole('button', { name: 'Start New Comparison', exact: true });
  await reset.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Start a new comparison?' });
  await expect(dialog).toBeVisible();
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
