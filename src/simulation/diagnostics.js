export function deriveDiagnostics(snapshot) {
  const { layout, metrics = {}, orders, heatmap, elapsedTicks } = snapshot;
  const tickSeconds = 0.5;
  let production = null;
  if (layout.modelId === 'cafe-v2' && Array.isArray(orders)) {
    const ready = orders.filter(order => order && order.readyTick !== null && order.readyTick !== undefined);
    if (ready.length && ready.every(order => [order.submittedTick, order.startedTick, order.readyTick].every(Number.isInteger) && order.submittedTick >= 0 && order.submittedTick <= order.startedTick && order.startedTick <= order.readyTick && order.readyTick <= elapsedTicks)) {
      const average = duration => ready.reduce((total, order) => total + duration(order), 0) * tickSeconds / ready.length;
      production = {
        count: ready.length,
        queueSeconds: average(order => order.startedTick - order.submittedTick),
        handlingSeconds: average(order => order.readyTick - order.startedTick),
        readySeconds: average(order => order.readyTick - order.submittedTick),
      };
    }
  }
  const columns = layout.room.width / layout.room.cellSize;
  const rows = layout.room.height / layout.room.cellSize;
  const validHeatmap = Array.isArray(heatmap) && heatmap.length === columns * rows && new Set(heatmap.map(cell => cell && `${cell.x},${cell.y}`)).size === heatmap.length && heatmap.every(cell => cell && Number.isInteger(cell.x) && Number.isInteger(cell.y) && cell.x >= 0 && cell.x < columns && cell.y >= 0 && cell.y < rows && Number.isFinite(cell.ticks) && cell.ticks >= 0);
  let movement = null;
  if (validHeatmap) {
    const remaining = new Map(heatmap.filter(cell => cell.ticks > 0).map(cell => [`${cell.x},${cell.y}`, cell]));
    const areas = [];
    const coordinates = (a, b) => a.y - b.y || a.x - b.x;
    for (const seed of [...remaining.values()].sort(coordinates)) {
      if (!remaining.delete(`${seed.x},${seed.y}`)) continue;
      const cells = [seed];
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        for (const [x, y] of [[cell.x - 1, cell.y], [cell.x + 1, cell.y], [cell.x, cell.y - 1], [cell.x, cell.y + 1]]) {
          const key = `${x},${y}`; const neighbor = remaining.get(key);
          if (neighbor) { remaining.delete(key); cells.push(neighbor); }
        }
      }
      cells.sort(coordinates);
      areas.push({ id: `${cells[0].x},${cells[0].y}`, cells, seconds: cells.reduce((total, cell) => total + cell.ticks, 0) * tickSeconds });
    }
    areas.sort((a, b) => b.seconds - a.seconds || coordinates(a.cells[0], b.cells[0]));
    movement = { totalSeconds: areas.reduce((total, area) => total + area.seconds, 0), areaCount: areas.length, areas: areas.slice(0, 3) };
  }
  return {
    production, movement,
    baristaWalkingMeters: Number.isFinite(metrics.baristaWalkingMeters) ? metrics.baristaWalkingMeters : null,
    switchedToTakeaway: Number.isInteger(metrics.switchedToTakeaway) ? metrics.switchedToTakeaway : null,
    dineInRequested: Number.isInteger(metrics.dineInRequested) ? metrics.dineInRequested : null,
    outsideDelayed: Number.isInteger(metrics.outsideDelayed) ? metrics.outsideDelayed : null,
    outsideHoldingSeconds: Number.isFinite(metrics.outsideHoldingSeconds) ? metrics.outsideHoldingSeconds : null,
  };
}
