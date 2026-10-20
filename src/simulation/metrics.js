export function deriveMetrics({ scheduled, customers, tickSeconds = 0.5 }) {
  const completed = customers.filter((customer) => customer.outcome === 'completed');
  const sum = (list, key) => list.reduce((total, customer) => total + (customer[key] ?? 0), 0);
  const attempted = sum(customers, 'attemptedTicks');
  return {
    scheduled,
    completed: completed.length,
    averageWaitingSeconds: completed.length ? sum(completed, 'waitingTicks') * tickSeconds / completed.length : null,
    averageWalkingSeconds: completed.length ? sum(completed, 'walkingTicks') * tickSeconds / completed.length : null,
    congestionPercent: attempted ? 100 * sum(customers, 'blockedTicks') / attempted : null,
    failures: Object.fromEntries(['unreachable', 'stuck', 'timed-out'].map((reason) => [reason, customers.filter((customer) => customer.outcome === reason).length])),
    outsideDelayed: customers.filter((customer) => customer.outsideTicks > 0).length,
    outsideHoldingSeconds: sum(customers, 'outsideTicks') * tickSeconds,
  };
}
