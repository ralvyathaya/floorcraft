import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
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
