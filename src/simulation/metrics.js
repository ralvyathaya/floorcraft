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

export function compareSnapshots(baseline, latest) {
  if (!baseline || !latest || !baseline.engineVersion || !baseline.scenarioVersion || baseline.engineVersion !== latest.engineVersion || baseline.scenarioVersion !== latest.scenarioVersion || baseline.metrics.scheduled !== latest.metrics.scheduled) {
    return { comparable: false, deltas: {} };
  }
  const before = baseline.metrics; const after = latest.metrics;
  const knownCapacity = Number.isInteger(before.seatingCapacity) && Number.isInteger(after.seatingCapacity);
  const capacityChanged = knownCapacity && before.seatingCapacity !== after.seatingCapacity;
  const fewerCompleted = after.completed < before.completed;
  const fewerDineIn = Number.isFinite(before.dineInServed) && after.dineInServed < before.dineInServed;
  const hasFailures = [before, after].some((metrics) => Object.values(metrics.failures).some((count) => count > 0));
  const deltas = {};
  const rows = [['averageWaitingSeconds', 's'], ['averageWalkingSeconds', 's'], ['congestionPercent', 'pp'], ['completed', 'customers']];
  if (before.dineInRequested !== undefined) rows.push(['dineInServed', 'customers'], ['switchedToTakeaway', 'customers'], ['averageOrderToReadySeconds', 's'], ['baristaWalkingMeters', 'm']);
  for (const [key, unit] of rows) {
    if (!Number.isFinite(before[key]) || !Number.isFinite(after[key])) {
      deltas[key] = { value: null, unit, tone: 'unavailable' };
      continue;
    }
    const value = after[key] - before[key];
    const moreIsBetter = ['completed', 'dineInServed'].includes(key);
    const improved = moreIsBetter ? value > 0 : value < 0;
    const tone = value === 0 ? 'unchanged' : improved ? (fewerCompleted || fewerDineIn || capacityChanged) && !moreIsBetter ? 'caution' : 'improved' : 'worse';
    deltas[key] = { value, unit, tone };
  }
  return { comparable: true, fewerCompleted, fewerDineIn, hasFailures, capacityChanged, sameCapacity: knownCapacity && !capacityChanged, deltas };
}

// Absolute thresholds, never normalized to the current run's hottest cell.
export function heatColor(blockedSeconds) {
  return blockedSeconds <= 0 ? 'transparent' : blockedSeconds < 2 ? '#f4d99a' : blockedSeconds < 5 ? '#dba342' : '#bd5747';
}
