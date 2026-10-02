/**
 * Pixel-art binocular view. Pure drawing code: fills an RGBA buffer (LENS_W x LENS_H) that the
 * overlay blits to a <canvas> and scales up with image-rendering: pixelated.
 */
export const LENS_W = 160;
export const LENS_H =  80;

const C1 = { x: 58, y: 40 };
const C2 = { x: 102, y: 40 };
const R = 36;
const HORIZON = 50;

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

interface Theme {
  sky: RGB[]; sea: RGB[]; wave: RGB; orb: RGB; orbGlow: RGB; orbX: number; orbY: number; orbR: number; stars: number; land: RGB;
}
// One theme per "floor" (cycles): night, dusk, dawn, so each climb feels like a new window.
const THEMES: Theme[] = [
  { sky: ['#070b24', '#0a1233', '#0e1b45', '#14275a', '#1b3470', '#234283', '#2d5195'].map(hex), sea: ['#1a3f7a', '#143262', '#0f264d', '#0a1b3a'].map(hex),
    wave: hex('#3b6fb8'), orb: hex('#fff3c4'), orbGlow: hex('#5d78c8'), orbX: 118, orbY: 20, orbR: 5, stars: 1, land: hex('#050814') },
  { sky: ['#2a1650', '#4a1d62', '#7a2a72', '#b2447c', '#e0687a', '#f59a6a', '#ffc47a'].map(hex), sea: ['#a24a7a', '#6e3470', '#472460', '#2a1646'].map(hex),
    wave: hex('#ffb07a'), orb: hex('#ffe2a0'), orbGlow: hex('#f58a72'), orbX: 44, orbY: 41, orbR: 6, stars: 0.18, land: hex('#1a0c2e') },
  { sky: ['#06222e', '#0a3340', '#0f4a54', '#18666a', '#2a8c86', '#52b8a2', '#9ae0b8'].map(hex), sea: ['#2a8c8e', '#1c6a78', '#134c60', '#0c3448'].map(hex),
    wave: hex('#8de6d0'), orb: hex('#e8fff0'), orbGlow: hex('#6fd0b8'), orbX: 120, orbY: 36, orbR: 5, stars: 0.4, land: hex('#06161e') },
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const BAYER = [[0, 2], [3, 1]];
const mulc = (c: RGB, f: number): RGB => [c[0] * f, c[1] * f, c[2] * f];

// star field (fixed)
const STARS: { x: number; y: number; bright: boolean; k: number }[] = (() => {
  const r = rng(7); const out = [];
  for (let i = 0; i < 90; i++) out.push({ x: Math.floor(r() * LENS_W), y: Math.floor(r() * (HORIZON - 3)), bright: r() > 0.7, k: r() });
  return out;
})();

function bands(pal: RGB[], t: number, x: number, y: number): RGB {
  const f = Math.min(pal.length - 1, Math.max(0, t)) ;
  const i = Math.min(pal.length - 2, Math.floor(f));
  const frac = f - i;
  return frac > (BAYER[y & 1][x & 1] + 0.5) / 4 ? pal[i + 1] : pal[i];
}

export function drawLens(data: Uint8ClampedArray, frame: number, floor: number): void {
  const th = THEMES[((floor % THEMES.length) + THEMES.length) % THEMES.length];
  const W = LENS_W, H = LENS_H;
  const bg = hex('#07070d');
  const put = (x: number, y: number, c: RGB) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
  };
  const scene = new Map<number, RGB>();
  const set = (x: number, y: number, c: RGB) => { if (x >= 0 && y >= 0 && x < W && y < H) scene.set(y * W + x, c); };

  // sky + sea
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y < HORIZON) set(x, y, bands(th.sky, (y / HORIZON) * (th.sky.length - 1), x, y));
    else set(x, y, bands(th.sea, ((y - HORIZON) / (H - HORIZON)) * (th.sea.length - 1), x, y));
  }
  // orb glow + orb
  for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) {
    const d = Math.hypot(x, y); const px = th.orbX + x, py = th.orbY + y;
    if (py >= HORIZON) continue;
    if (d <= th.orbR) set(px, py, x > 1 && y < 2 && d > th.orbR - 2.2 && floor % 3 === 0 ? mulc(th.orb, 0.9) : th.orb);
    else if (d <= th.orbR + 3) set(px, py, (px + py) % 2 === 0 ? th.orbGlow : scene.get(py * W + px)!);
    else if (d <= th.orbR + 6 && (px + py) % 4 === 0) set(px, py, th.orbGlow);
  }
  // stars (twinkle)
  STARS.forEach((s, i) => {
    if (i / STARS.length > th.stars) return;
    if ((frame + i) % 6 === 0) return;
    const nearOrb = Math.hypot(s.x - th.orbX, s.y - th.orbY) < th.orbR + 7;
    if (nearOrb) return;
    set(s.x, s.y, s.bright ? hex('#ffffff') : hex('#aebfff'));
    if (s.bright && (frame + i) % 4 !== 0) { set(s.x - 1, s.y, hex('#6678c0')); set(s.x + 1, s.y, hex('#6678c0')); set(s.x, s.y - 1, hex('#6678c0')); set(s.x, s.y + 1, hex('#6678c0')); }
  });
  // distant island
  for (let x = 14; x < 58; x++) {
    const h = Math.round(6 * Math.sin((Math.PI * (x - 14)) / 44) + (x % 7 === 0 ? 1 : 0));
    for (let k = 0; k < h; k++) set(x, HORIZON - 1 - k, th.land);
  }
  // blinking buoy light on the island
  if (frame % 4 < 2) { set(36, HORIZON - 9, hex('#ffe27a')); set(37, HORIZON - 9, hex('#ffb347')); }
  // horizon line
  for (let x = 0; x < W; x++) set(x, HORIZON, mulc(th.sea[0], 1.35));
  // waves
  for (let y = HORIZON + 2; y < H; y += 3) for (let x = 0; x < W; x++) {
    const p = (x + y * 7 + (frame >> 1) * ((y >> 1) % 2 ? 1 : -1)) % 23;
    if (p < 2 + Math.floor((y - HORIZON) / 14)) set(x, y, mulc(th.wave, 0.65 + (y - HORIZON) / 90));
  }
  // orb reflection
  for (let y = HORIZON + 1; y < H; y += 2) {
    const w = Math.max(0, Math.round(th.orbR - (y - HORIZON) / 5)) + ((frame + y) % 3 === 0 ? 1 : 0);
    for (let x = -w; x <= w; x++) set(th.orbX + x, y, mulc(th.orb, 0.85));
  }
  // sailboat bobbing
  const bx = 84, by = HORIZON + (frame % 4 < 2 ? 0 : 1);
  for (let k = 0; k < 7; k++) for (let j = 0; j <= Math.max(0, 5 - k); j++) set(bx + j, by - 8 + k, hex('#f2f4ff'));
  for (let k = 0; k < 8; k++) set(bx - 1, by - 8 + k, hex('#5a4030'));
  for (let x = -3; x <= 6; x++) set(bx + x, by + 1, hex('#4a3020'));
  for (let x = -2; x <= 5; x++) set(bx + x, by + 2, hex('#2a1c14'));

  // lens mask + rim + vignette
  const RIM_PINK = hex('#ff8fe8'), RIM_DARK = hex('#8a0f6e'), METAL = hex('#12142b'), METAL_HI = hex('#3a4080');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d1 = Math.hypot(x + 0.5 - C1.x, y + 0.5 - C1.y), d2 = Math.hypot(x + 0.5 - C2.x, y + 0.5 - C2.y);
    const e = R - Math.min(d1, d2);
    if (e < 0) { put(x, y, bg); continue; }
    if (e < 1.6) { put(x, y, RIM_DARK); continue; }
    if (e < 2.8) { put(x, y, RIM_PINK); continue; }
    if (e < 6) { put(x, y, (x + y) < 78 && e < 4 ? METAL_HI : METAL); continue; }
    let c = scene.get(y * W + x) ?? bg;
    if (e < 10) c = mulc(c, 0.5); else if (e < 14) c = mulc(c, 0.72); else if (e < 17 && (x + y) % 2 === 0) c = mulc(c, 0.85);
    put(x, y, c);
  }
  // lens glare
  for (const c of [C1, C2]) for (let k = 0; k < 5; k++) { put(Math.round(c.x - 22 + k), Math.round(c.y - 21 - k * 0.3), hex('#a9b8ff')); }
}