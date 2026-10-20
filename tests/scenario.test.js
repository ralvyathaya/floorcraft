import { describe, expect, test } from 'vitest';
import { createScenario } from '../src/simulation/scenario.js';

describe('fixed rush-hour scenario', () => {
  test('creates stable arrivals and service durations without randomness', () => {
    const first = createScenario();
    const second = createScenario();
    expect(first).toEqual(second);
    expect(first.customers).toHaveLength(24);
    expect(first.customers[0]).toMatchObject({ id: 'customer-01', arrivalTick: 0 });
    expect(first.customers[1].arrivalTick).toBe(8);
    expect(first.ticksPerSecond).toBe(2);
    expect(first.runLimitTicks).toBe(720);
  });
});
