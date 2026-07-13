import assert from 'node:assert/strict';
import test from 'node:test';
import * as cardMath from '../lib/card-math.js';

test('snapping selects the nearest front or back face', () => {
  assert.equal(typeof cardMath.snapYaw, 'function');
  assert.equal(cardMath.snapYaw(106), 180);
  assert.equal(cardMath.snapYaw(-106), -180);
  assert.equal(cardMath.snapYaw(44), 0);
});

test('clamped poses keep pitch and camera approach inside the approved limits', () => {
  assert.equal(typeof cardMath.clampPose, 'function');
  assert.deepEqual(cardMath.clampPose({ rotateX: 120, rotateY: 250, translateZ: 900 }), {
    rotateX: 78,
    rotateY: 250,
    translateZ: 80
  });
});

test('the resting pose keeps only a faint clear-coat reflection', () => {
  assert.equal(typeof cardMath.restPose, 'function');
  assert.equal(typeof cardMath.calculateSpecular, 'function');
  const material = cardMath.calculateSpecular(cardMath.restPose(), 'front');

  assert.ok(material.strength >= 0.02 && material.strength <= 0.03);
  assert.ok(material.x >= 0 && material.x <= 100);
  assert.ok(material.y >= 0 && material.y <= 100);
});

test('specular response is deterministic for the same card pose', () => {
  assert.equal(typeof cardMath.calculateSpecular, 'function');
  const pose = { rotateX: -7, rotateY: 19, translateZ: 42 };

  assert.deepEqual(
    cardMath.calculateSpecular(pose, 'front'),
    cardMath.calculateSpecular(pose, 'front')
  );
});

test('specular material exposes a deterministic linear-field offset and angle', () => {
  const material = cardMath.calculateSpecular({ rotateX: -7, rotateY: 19, translateZ: 42 }, 'front');

  assert.equal(typeof material.offsetX, 'number');
  assert.equal(typeof material.offsetY, 'number');
  assert.equal(typeof material.angle, 'number');
  assert.ok(material.angle >= 105 && material.angle <= 165);
});

test('turning through softbox alignment changes brightness without a velocity input', () => {
  assert.equal(typeof cardMath.calculateSpecular, 'function');
  const dim = cardMath.calculateSpecular({ rotateX: 0, rotateY: -35, translateZ: 0 }, 'front');
  const lit = cardMath.calculateSpecular({ rotateX: 9, rotateY: 21, translateZ: 0 }, 'front');

  assert.ok(lit.strength > dim.strength);
});

test('a subtle left-right tilt creates a continuous visible reflection change', () => {
  const rest = cardMath.calculateSpecular({ rotateX: 0, rotateY: 0, translateZ: 0 }, 'front');
  const subtleTilt = cardMath.calculateSpecular({ rotateX: 0, rotateY: 4, translateZ: 0 }, 'front');

  assert.ok(subtleTilt.strength >= rest.strength + 0.018);
  assert.notEqual(subtleTilt.offsetX, rest.offsetX);
  assert.notEqual(subtleTilt.offsetY, rest.offsetY);
});

test('gentle hover tilts reveal gloss on both the left and right sides', () => {
  const rest = cardMath.calculateSpecular({ rotateX: 0, rotateY: 0, translateZ: 0 }, 'front');
  const left = cardMath.calculateSpecular({ rotateX: 0, rotateY: -2, translateZ: 0 }, 'front');
  const right = cardMath.calculateSpecular({ rotateX: 0, rotateY: 2, translateZ: 0 }, 'front');

  assert.ok(left.strength >= rest.strength + 0.012);
  assert.ok(right.strength >= rest.strength + 0.012);
  assert.notEqual(left.offsetX, right.offsetX);
});
