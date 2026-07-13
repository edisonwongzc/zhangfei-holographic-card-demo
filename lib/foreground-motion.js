const clamp = (value, limit) => Math.min(limit, Math.max(-limit, value));

export function createLayerMotion() {
  return { x: 0, y: 0 };
}

export function stepLayerMotion(current, target, damping, limit) {
  return {
    x: clamp(current.x + (target.x - current.x) * damping, limit),
    y: clamp(current.y + (target.y - current.y) * damping, limit)
  };
}
