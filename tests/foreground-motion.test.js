import assert from 'node:assert/strict';
import test from 'node:test';
import { createLayerMotion, stepLayerMotion } from '../lib/foreground-motion.js';

test('foreground moves farther than the delayed base for one shared hover target', () => {
  const target = { x: 8, y: -6 };
  const foreground = stepLayerMotion(createLayerMotion(), target, 0.32, 8);
  const base = stepLayerMotion(createLayerMotion(), target, 0.1, 4);

  assert.ok(Math.abs(foreground.x) > Math.abs(base.x));
  assert.ok(Math.abs(foreground.y) > Math.abs(base.y));
});

test('layer motion is clamped and converges back to rest', () => {
  let layer = createLayerMotion();
  layer = stepLayerMotion(layer, { x: 80, y: -80 }, 1, 8);
  assert.deepEqual(layer, { x: 8, y: -8 });

  for (let index = 0; index < 30; index += 1) {
    layer = stepLayerMotion(layer, { x: 0, y: 0 }, 0.32, 8);
  }

  assert.ok(Math.abs(layer.x) < 0.01);
  assert.ok(Math.abs(layer.y) < 0.01);
});
