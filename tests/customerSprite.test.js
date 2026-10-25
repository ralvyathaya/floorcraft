import { expect, test } from 'vitest';
import { customerSprite } from '../src/components/customerSprite.js';

const customer = { id: 'customer-3', cell: { x: 3, y: 2 }, previousCell: { x: 2, y: 2 }, phase: 'approaching cashier', outcome: null };

test('sprite follows the accepted edge, including snap-after-batch and terminal positions', () => {
  expect(customerSprite(customer, { alpha: 0.25, tick: 4 }, 0.5)).toMatchObject({ x: 1.375, y: 1.25, rotation: 90 });
  expect(customerSprite(customer, { alpha: 1, tick: 4 }, 0.5)).toMatchObject({ x: 1.75, y: 1.25 });
  expect(customerSprite({ ...customer, outcome: 'stuck' }, { alpha: 0, tick: 4 }, 0.5)).toMatchObject({ x: 1.75, y: 1.25, failed: true, stride: 0 });
  expect(customerSprite({ ...customer, cell: null }, {}, 0.5)).toBeNull();
  expect(customerSprite({ ...customer, outcome: 'completed' }, {}, 0.5)).toBeNull();
});

test('reduced motion removes the walking gesture without changing position or appearance', () => {
  const frame = { alpha: 0.5, tick: 4 };
  const ordinary = customerSprite(customer, frame, 0.5);
  const reduced = customerSprite(customer, frame, 0.5, true);
  expect(ordinary.stride).not.toBe(0);
  expect(reduced).toEqual({ ...ordinary, stride: 0 });
  expect(customerSprite({ ...customer, previousCell: customer.cell, phase: 'cashier queue' }, frame, 0.5)).toMatchObject({ stride: 0, waiting: true });
  expect(customerSprite(customer, frame, 0.5)).toEqual(ordinary);
});

test('seated sprites use the chair anchor and keep their identity without a walking cell', () => {
  const seated = { ...customer, cell: null, seatAnchor: { x: 2.25, y: 3.75 }, seatRotation: 0, phase: 'seated' };
  const sprite = customerSprite(seated, { tick: 100, alpha: 0.5 }, 0.5);
  expect(sprite).toMatchObject({ x: 2.25, y: 3.75, rotation: 180, pose: 'seated', stride: 0 });
  expect(sprite.variant).toBe(customerSprite(customer, {}, 0.5).variant);
  expect(customerSprite(seated, { tick: 100, alpha: 0.5 }, 0.5, true)).toEqual(sprite);
});

test('staff carry a drink only during delivery, including reduced motion', () => {
  const worker = { ...customer, id: 'barista', role: 'barista', phase: 'delivering' };
  const frame = { tick: 4, alpha: 0.5 };
  const sprite = customerSprite(worker, frame, 0.5);
  expect(sprite).toMatchObject({ pose: 'staff', carrying: true });
  expect(customerSprite(worker, frame, 0.5, true)).toEqual({ ...sprite, stride: 0 });
  expect(customerSprite({ ...worker, phase: 'returning' }, frame, 0.5).carrying).toBe(false);
});
