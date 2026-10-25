export const createClock = (last) => ({ last, carry: 0 });
export function advanceClock(clock, now, hidden = false, pace = 8) {
  if (hidden) return { clock: { last: now, carry: 0 }, steps: 0 };
  const elapsed = Math.max(0, now - clock.last);
  const carry = clock.carry + elapsed * pace;
  const steps = Math.min(12, Math.floor(carry / 500));
  return { clock: { last: now, carry: carry - steps * 500 }, steps };
}

export function presentationFrame(wasSnapped, steps, carry) {
  const snap = steps > 1 || (steps === 0 && wasSnapped);
  return { snap, alpha: snap ? 1 : Math.min(1, carry / 500) };
}
