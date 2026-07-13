import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const read = (file) => readFile(new URL(file, root), 'utf8');

test('page exposes the exhibition and accessible six-surface CSS 3D card rig', async () => {
  const html = await read('index.html');

  assert.match(html, /<main[^>]+id="exhibition"/);
  assert.match(html, /<article[^>]+id="character-card"[^>]+class="card-stage"/);
  assert.match(html, /aria-label="张飞人物卡"/);
  assert.match(html, /class="card-shadow"/);
  assert.match(html, /class="card-rig"/);
  assert.match(html, /class="card-face card-face--front"/);
  assert.match(html, /class="card-face card-face--back"/);
  assert.equal((html.match(/class="card-edge card-edge--/g) || []).length, 4);
  assert.match(html, /class="card-base-surface"/);
  assert.match(html, /class="card-base-art" src="assets\/zhangfei-card\.png"/);
  assert.match(html, /class="card-base-specular"/);
  assert.match(html, /class="card-foreground" src="assets\/zhangfei-foreground\.png"/);
  assert.match(html, /assets\/zhangfei-card-back\.png/);
  assert.doesNotMatch(html, /class="card-specular"/);
  assert.doesNotMatch(html, /card-hologram|card-gloss/);
});

test('styles clip a continuous base-only reflection beneath the alpha foreground', async () => {
  const css = await read('styles.css');

  assert.match(css, /perspective:\s*1100px/);
  assert.match(css, /\.card-rig\s*\{[\s\S]*transform-style:\s*preserve-3d/);
  assert.match(css, /\.card-base-surface\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.card-base-specular\s*\{[\s\S]*linear-gradient/);
  assert.doesNotMatch(css, /\.card-base-specular\s*\{[^}]*radial-gradient/);
  assert.match(css, /\.card-foreground\s*\{[\s\S]*drop-shadow/);
  assert.match(css, /--front-specular-x/);
  assert.match(css, /--front-specular-strength/);
  assert.doesNotMatch(css, /\.card-specular/);
  assert.match(css, /\.card-edge--top/);
  assert.match(css, /\.card-edge--right/);
  assert.match(css, /\.card-edge--bottom/);
  assert.match(css, /\.card-edge--left/);
  assert.doesNotMatch(css, /card-hologram|card-gloss|color-dodge|mix-blend-mode|repeating-linear-gradient/);
});

test('styles include responsive and reduced-motion safeguards', async () => {
  const css = await read('styles.css');

  assert.match(css, /width:\s*min\(52vw, 410px, 55svh\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('card presentation has no visible frame strokes', async () => {
  const css = await read('styles.css');

  assert.doesNotMatch(css, /\.card-face\s*\{[^}]*\bborder\s*:/);
  assert.match(css, /\.card-frame\s*\{\s*display:\s*none/);
  assert.doesNotMatch(css, /\.card-frame::(?:before|after)/);
  assert.match(css, /--art-crop-scale:\s*1\.08/);
  assert.match(css, /\.card-base-art\s*\{[\s\S]*transform:\s*scale\(var\(--art-crop-scale\)\)/);
  assert.match(css, /\.card-foreground\s*\{[\s\S]*scale\(var\(--art-crop-scale\)\)/);
});

test('runtime uses accumulated drag, pointer capture, deterministic material, and split layer motion', async () => {
  const app = await read('app.js');

  assert.match(app, /calculateSpecular/);
  assert.match(app, /stepLayerMotion/);
  assert.match(app, /foregroundMotion/);
  assert.match(app, /baseMotion/);
  assert.match(app, /setPointerCapture/);
  assert.match(app, /snapYaw/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /--foreground-x/);
  assert.match(app, /--base-x/);
  assert.match(app, /writeMaterial\('front'/);
  assert.match(app, /writeMaterial\('back'/);
  assert.match(app, /pointercancel/);
  assert.match(app, /event\.key === 'Escape'/);
  assert.doesNotMatch(app, /setTimeout|gloss|sheen|hologram/i);
});
