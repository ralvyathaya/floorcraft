export function createScenario(layout) {
  if (layout?.modelId === 'cafe-v2') return {
    version: 'mixed-cafe-rush-v2', engineVersion: 'grid-cafe-v2', ticksPerSecond: 2, tickSeconds: 0.5,
    displayPace: 8, retryTicks: 4, stuckTicks: 40, runLimitTicks: 5400, seatedTicks: 1200,
    customers: Array.from({ length: 24 }, (_, index) => ({
      id: `customer-${String(index + 1).padStart(2, '0')}`, arrivalTick: index * 30,
      orderingTicks: 12, preparationTicks: 60, pickupTicks: 4, requestedMode: index % 4 === 3 ? 'takeaway' : 'dine-in',
    })),
  };
  return {
    version: 'takeaway-rush-v1', engineVersion: 'grid-v1', ticksPerSecond: 2,
    tickSeconds: 0.5, displayPace: 8, retryTicks: 4, stuckTicks: 40,
    runLimitTicks: 720,
    customers: Array.from({ length: 24 }, (_, index) => ({
      id: `customer-${String(index + 1).padStart(2, '0')}`,
      arrivalTick: index * 8, orderingTicks: 12, preparationTicks: 16,
    })),
  };
}
