import { expect, test } from 'vitest';
import { advanceClock, createClock, presentationFrame } from '../src/app/clock.js';

test('60Hz and 20Hz presentation advance the same number of fixed ticks', () => {
  for (const frameCount of [20, 60]) {
    let clock = createClock(0);
    let steps = 0;
    for (let frame = 1; frame <= frameCount; frame++) {
      const result = advanceClock(clock, frame * 1000 / frameCount, false);
      clock = result.clock;
      steps += result.steps;
    }
    expect(steps).toBe(16);
  }
});

test('hidden-tab time is discarded and slow visible-frame work is bounded with carry-over', () => {
  const hidden = advanceClock(createClock(0), 60000, true);
  expect(hidden.steps).toBe(0);
  const resumed = advanceClock(hidden.clock, 60016, false);
  expect(resumed.steps).toBe(0);
  const slow = advanceClock(createClock(0), 2000, false);
  expect(slow.steps).toBe(12);
  const next = advanceClock(slow.clock, 2000, false);
  expect(next.steps).toBe(12);
});

test('a batched frame stays snapped until a new single tick avoids rewinding a skipped path', () => {
  const batch = presentationFrame(false, 3, 0);
  expect(batch).toEqual({ snap: true, alpha: 1 });
  expect(presentationFrame(batch.snap, 0, 100)).toEqual({ snap: true, alpha: 1 });
  expect(presentationFrame(batch.snap, 1, 100)).toEqual({ snap: false, alpha: 0.2 });
});
