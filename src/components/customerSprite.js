const shirts = ['#496e63', '#678696', '#9b7656', '#77718d'];
const skins = ['#e8bc94', '#bc835e', '#85583e', '#efcfb1'];

export function customerSprite(customer, frame, cellSize, reducedMotion = false) {
  if (customer.outcome === 'completed') return null;
  if (!customer.cell && !customer.seatAnchor) return null;
  const variation = [...String(customer.id)].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  if (!customer.cell) return { x: customer.seatAnchor.x, y: customer.seatAnchor.y, rotation: ((customer.seatRotation ?? 0) + 180) % 360, variant: variation % 2, pose: 'seated', stride: 0, failed: Boolean(customer.outcome) };
  const previous = customer.previousCell ?? customer.cell;
  const dx = customer.cell.x - previous.x;
  const dy = customer.cell.y - previous.y;
  const alpha = customer.outcome ? 1 : frame.alpha ?? 1;
  return {
    x: (previous.x + dx * alpha + 0.5) * cellSize,
    y: (previous.y + dy * alpha + 0.5) * cellSize,
    rotation: customer.role && ['idle', 'preparing'].includes(customer.phase) ? customer.facingStation ?? 0 : dx || dy ? Math.atan2(dy, dx) * 180 / Math.PI + 90 : customer.facing ?? 0,
    pose: customer.role ? customer.phase === 'preparing' ? 'preparing' : 'staff' : 'standing',
    carrying: customer.role === 'barista' && customer.phase === 'delivering',
    stride: !reducedMotion && !customer.outcome && (dx || dy) ? Math.sin(((frame.tick ?? 0) - 1 + alpha) * Math.PI) * 0.02 : 0,
    shirt: shirts[variation % shirts.length],
    skin: skins[variation % skins.length],
    variant: variation % 2,
    waiting: ['cashier queue', 'pickup queue', 'ordering', 'preparation', 'waiting for drink'].includes(customer.phase),
    failed: Boolean(customer.outcome),
  };
}
