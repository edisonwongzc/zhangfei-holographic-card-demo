import { calculateSpecular, clampPose, restPose, snapYaw } from './lib/card-math.js';
import { createLayerMotion, stepLayerMotion } from './lib/foreground-motion.js';

const exhibition = document.querySelector('.exhibition');
const card = document.querySelector('#character-card');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const state = {
  pose: restPose(),
  idlePose: restPose(),
  dragStart: null,
  startPose: null,
  pointerId: null,
  poseFrame: 0,
  layerFrame: 0,
  velocity: { x: 0, y: 0 },
  lastMove: null,
  hoverTarget: createLayerMotion(),
  foregroundMotion: createLayerMotion(),
  baseMotion: createLayerMotion()
};

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const near = (value, target) => Math.abs(value - target) < 0.05;

function writeMaterial(prefix, material) {
  exhibition.style.setProperty(`--${prefix}-specular-x`, `${material.offsetX}%`);
  exhibition.style.setProperty(`--${prefix}-specular-y`, `${material.offsetY}%`);
  exhibition.style.setProperty(`--${prefix}-specular-angle`, `${material.angle}deg`);
  exhibition.style.setProperty(`--${prefix}-specular-strength`, `${material.strength}`);
}

function applyPose(nextPose) {
  const pose = clampPose(nextPose);
  const frontMaterial = calculateSpecular(pose, 'front');
  const backMaterial = calculateSpecular(pose, 'back');

  state.pose = pose;
  exhibition.style.setProperty('--rotate-x', `${pose.rotateX}deg`);
  exhibition.style.setProperty('--rotate-y', `${pose.rotateY}deg`);
  exhibition.style.setProperty('--card-z', `${pose.translateZ}px`);
  exhibition.style.setProperty('--shadow-scale', `${1 - pose.translateZ / 360}`);
  writeMaterial('front', frontMaterial);
  writeMaterial('back', backMaterial);
}

function cancelMotion() {
  cancelAnimationFrame(state.poseFrame);
  state.poseFrame = 0;
}

function animateTo(target) {
  cancelMotion();

  if (reduceMotion.matches) {
    applyPose(target);
    return;
  }

  const tick = () => {
    const current = state.pose;
    const next = {
      rotateX: current.rotateX + (target.rotateX - current.rotateX) * 0.18,
      rotateY: current.rotateY + (target.rotateY - current.rotateY) * 0.18,
      translateZ: current.translateZ + (target.translateZ - current.translateZ) * 0.2
    };

    applyPose(next);

    if (near(next.rotateX, target.rotateX)
      && near(next.rotateY, target.rotateY)
      && near(next.translateZ, target.translateZ)) {
      applyPose(target);
      state.poseFrame = 0;
      return;
    }

    state.poseFrame = requestAnimationFrame(tick);
  };

  state.poseFrame = requestAnimationFrame(tick);
}

function pointerPosition(event) {
  const bounds = card.getBoundingClientRect();
  const horizontal = clamp((event.clientX - bounds.left) / bounds.width, 0, 1) * 2 - 1;
  const vertical = clamp((event.clientY - bounds.top) / bounds.height, 0, 1) * 2 - 1;

  return { horizontal, vertical };
}

function hoverPose(event) {
  const { horizontal, vertical } = pointerPosition(event);

  return {
    rotateX: -vertical * 8,
    rotateY: state.idlePose.rotateY + horizontal * 10,
    translateZ: 0
  };
}

function hoverLayerTarget(event) {
  const { horizontal, vertical } = pointerPosition(event);
  return { x: horizontal * 8, y: vertical * -6 };
}

function writeLayerMotion() {
  const foreground = state.foregroundMotion;
  const base = state.baseMotion;
  exhibition.style.setProperty('--foreground-x', `${foreground.x}px`);
  exhibition.style.setProperty('--foreground-y', `${foreground.y}px`);
  exhibition.style.setProperty('--base-x', `${base.x}px`);
  exhibition.style.setProperty('--base-y', `${base.y}px`);
  exhibition.style.setProperty('--foreground-shadow-x', `${1 - foreground.x * 0.34}px`);
  exhibition.style.setProperty('--foreground-shadow-y', `${4 - foreground.y * 0.28}px`);
  exhibition.style.setProperty('--foreground-ambient-x', `${3 - foreground.x * 0.48}px`);
  exhibition.style.setProperty('--foreground-ambient-y', `${9 - foreground.y * 0.42}px`);
}

function layersAreResting() {
  const items = [state.foregroundMotion, state.baseMotion, state.hoverTarget];
  return items.every((layer) => Math.abs(layer.x) < 0.04 && Math.abs(layer.y) < 0.04);
}

function cancelLayerMotion() {
  cancelAnimationFrame(state.layerFrame);
  state.layerFrame = 0;
}

function advanceLayerMotion() {
  state.foregroundMotion = stepLayerMotion(state.foregroundMotion, state.hoverTarget, 0.32, 8);
  state.baseMotion = stepLayerMotion(state.baseMotion, state.hoverTarget, 0.1, 4);
  writeLayerMotion();

  if (layersAreResting()) {
    state.foregroundMotion = createLayerMotion();
    state.baseMotion = createLayerMotion();
    writeLayerMotion();
    state.layerFrame = 0;
    return;
  }

  state.layerFrame = requestAnimationFrame(advanceLayerMotion);
}

function setLayerTarget(target, immediate = false) {
  state.hoverTarget = target;

  if (immediate || reduceMotion.matches) {
    cancelLayerMotion();
    state.foregroundMotion = stepLayerMotion(createLayerMotion(), target, 1, 8);
    state.baseMotion = stepLayerMotion(createLayerMotion(), target, 1, 4);
    writeLayerMotion();
    return;
  }

  if (!state.layerFrame) state.layerFrame = requestAnimationFrame(advanceLayerMotion);
}

function updateVelocity(event) {
  const now = performance.now();
  if (state.lastMove) {
    const elapsed = Math.max(now - state.lastMove.time, 1);
    state.velocity = {
      x: (event.clientX - state.lastMove.x) / elapsed,
      y: (event.clientY - state.lastMove.y) / elapsed
    };
  }
  state.lastMove = { x: event.clientX, y: event.clientY, time: now };
}

function updateDrag(event) {
  const deltaX = event.clientX - state.dragStart.x;
  const deltaY = event.clientY - state.dragStart.y;
  const distance = Math.hypot(deltaX, deltaY);

  updateVelocity(event);
  applyPose({
    rotateX: state.startPose.rotateX - deltaY * 0.22,
    rotateY: state.startPose.rotateY + deltaX * 0.42,
    translateZ: Math.min(80, distance * 0.24)
  });
}

function settleCard() {
  card.classList.remove('is-dragging');
  state.pointerId = null;
  state.dragStart = null;
  state.startPose = null;
  state.lastMove = null;
  state.velocity = { x: 0, y: 0 };
  state.idlePose = {
    rotateX: 0,
    rotateY: snapYaw(state.pose.rotateY),
    translateZ: 0
  };
  setLayerTarget(createLayerMotion());
  animateTo(state.idlePose);
}

function resetHover() {
  if (state.pointerId !== null) return;
  setLayerTarget(createLayerMotion());
  animateTo(state.idlePose);
}

card.addEventListener('pointerenter', (event) => {
  if (state.pointerId === null) {
    applyPose(hoverPose(event));
    setLayerTarget(hoverLayerTarget(event));
  }
});

card.addEventListener('pointermove', (event) => {
  if (state.pointerId === event.pointerId) {
    updateDrag(event);
    return;
  }

  if (state.pointerId === null) {
    applyPose(hoverPose(event));
    setLayerTarget(hoverLayerTarget(event));
  }
});

card.addEventListener('pointerleave', resetHover);

card.addEventListener('pointerdown', (event) => {
  cancelMotion();
  setLayerTarget(createLayerMotion());
  card.focus({ preventScroll: true });
  state.pointerId = event.pointerId;
  state.dragStart = { x: event.clientX, y: event.clientY };
  state.startPose = { ...state.pose };
  state.lastMove = { x: event.clientX, y: event.clientY, time: performance.now() };
  card.classList.add('is-dragging');
  card.setPointerCapture(event.pointerId);
});

card.addEventListener('pointerup', (event) => {
  if (state.pointerId !== event.pointerId) return;
  card.releasePointerCapture?.(event.pointerId);
  settleCard();
});

card.addEventListener('pointercancel', () => {
  if (state.pointerId !== null) settleCard();
});

card.addEventListener('lostpointercapture', () => {
  if (state.pointerId !== null) settleCard();
});

card.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    cancelMotion();
    setLayerTarget(createLayerMotion(), true);
    state.pointerId = null;
    card.classList.remove('is-dragging');
    state.idlePose = restPose();
    applyPose(state.idlePose);
  }
});

card.addEventListener('blur', resetHover);
window.addEventListener('blur', () => {
  if (state.pointerId !== null) settleCard();
});
reduceMotion.addEventListener?.('change', () => {
  if (reduceMotion.matches) {
    if (state.poseFrame) animateTo(state.idlePose);
    setLayerTarget(state.hoverTarget, true);
  }
});

applyPose(state.pose);
writeLayerMotion();
