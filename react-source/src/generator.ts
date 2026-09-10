export type GeneratorMode = 'topdown-15' | 'topdown-17' | 'topdown-47';
export type EdgeStyle = 'rough' | 'clean';

export type RGB = { r: number; g: number; b: number };

export type RenderSettings = {
  mode: GeneratorMode;
  tileSize: number;
  edgeStyle: EdgeStyle;
  cornerRadius: number;
  edgeNoise: number;
  noiseSize: number;
  tilePadding: number;
  baseColor: string;
  edgeColor: string;
  surfaceColor: string;
  shades: number;
  edgeFade: number;
  textureNoise: number;
  fleckAmount: number;
  seed: number;
  whiteBackground: boolean;
  showGrid: boolean;
  pixelFlecks: boolean;
  platformTopDepth: number;
};

type RectPiece = {
  kind: 'rect';
  n?: boolean;
  e?: boolean;
  s?: boolean;
  w?: boolean;
};

type EmptyPiece = { kind: 'empty' };
type InnerCornersPiece = { kind: 'innerCorners' };
type Piece = RectPiece | EmptyPiece | InnerCornersPiece;

export const TOPDOWN_15_LAYOUT = [
  [4, 10, 13, 12],
  [9, 14, 15, 7],
  [2, 3, 11, 5],
  [0, 8, 6, 1],
] as const;

const emptyPiece: EmptyPiece = { kind: 'empty' };
const rectPiece = (connections: Omit<RectPiece, 'kind'>): RectPiece => ({ kind: 'rect', ...connections });

/**
 * 17-piece guide sheet.
 * 5x5 atlas containing: empty row, 3x3 island block, vertical stroke,
 * horizontal stroke, isolated tile, and a four-inner-corner helper.
 * This mirrors the common 17-piece guide layout used by SpriteCook's MIT base generator.
 */
export const TOPDOWN_17_LAYOUT: Piece[][] = [
  [emptyPiece, emptyPiece, emptyPiece, emptyPiece, emptyPiece],
  [
    rectPiece({ s: true }),
    rectPiece({ e: true, s: true }),
    rectPiece({ e: true, s: true, w: true }),
    rectPiece({ s: true, w: true }),
    { kind: 'innerCorners' },
  ],
  [
    rectPiece({ n: true, s: true }),
    rectPiece({ n: true, e: true, s: true }),
    rectPiece({ n: true, e: true, s: true, w: true }),
    rectPiece({ n: true, s: true, w: true }),
    emptyPiece,
  ],
  [
    rectPiece({ n: true }),
    rectPiece({ n: true, e: true }),
    rectPiece({ n: true, e: true, w: true }),
    rectPiece({ n: true, w: true }),
    emptyPiece,
  ],
  [
    rectPiece({}),
    rectPiece({ e: true }),
    rectPiece({ e: true, w: true }),
    rectPiece({ w: true }),
    emptyPiece,
  ],
];

/**
 * Top-down 47-piece blob sheet in the Godot 3 generic
 * 12×4 arrangement (47 used cells + one blank at col 10, row 1).
 * Masks use the classic cr31 neighbour bits:
 * N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128.
 */
export const TOPDOWN_47_LAYOUT: (number | null)[][] = [
  [16, 20, 84, 80, 213, 92, 116, 87, 28, 125, 124, 112],
  [17, 21, 85, 81, 29, 127, 253, 113, 31, 119, null, 245],
  [1, 5, 69, 65, 23, 223, 247, 209, 95, 255, 221, 241],
  [0, 4, 68, 64, 117, 71, 197, 93, 7, 199, 215, 193],
];

const BLOB_N = 1;
const BLOB_NE = 2;
const BLOB_E = 4;
const BLOB_SE = 8;
const BLOB_S = 16;
const BLOB_SW = 32;
const BLOB_W = 64;
const BLOB_NW = 128;

const QUADRANTS = [
  { bit: 1, col: 0, row: 0 },
  { bit: 2, col: 1, row: 0 },
  { bit: 4, col: 0, row: 1 },
  { bit: 8, col: 1, row: 1 },
] as const;

const OVERLAP = 0.09;

export function modeLabel(mode: GeneratorMode): string {
  if (mode === 'topdown-15') return '15-piece top-down';
  if (mode === 'topdown-17') return '17-piece top-down';
  return '47-piece top-down';
}

export function modeGrid(mode: GeneratorMode): { cols: number; rows: number } {
  if (mode === 'topdown-17') return { cols: 5, rows: 5 };
  if (mode === 'topdown-47') return { cols: 12, rows: 4 };
  return { cols: 4, rows: 4 };
}

export function modePieceCount(mode: GeneratorMode): number {
  if (mode === 'topdown-15') return 15;
  if (mode === 'topdown-17') return 17;
  return 47;
}

export function sheetNativeSize(settings: RenderSettings): { width: number; height: number } {
  const tile = settings.tileSize;
  const { cols, rows } = modeGrid(settings.mode);
  return {
    width: tile * cols,
    height: tile * rows,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(b, a, h) - k * h * (1 - h);
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function mixColor(a: RGB, b: RGB, t: number): RGB {
  const amount = clamp(t, 0, 1);
  return {
    r: Math.round(lerp(a.r, b.r, amount)),
    g: Math.round(lerp(a.g, b.g, amount)),
    b: Math.round(lerp(a.b, b.b, amount)),
  };
}

function hash2(x: number, y: number, seed: number): number {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = smoothstep(x - xi);
  const ty = smoothstep(y - yi);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function fbm(x: number, y: number, seed: number): number {
  let total = 0;
  let amp = 0.55;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < 4; i += 1) {
    total += valueNoise(x * freq, y * freq, seed + i * 71) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / norm;
}

function roundedBoxSdf(px: number, py: number, l: number, t: number, r: number, b: number, radius: number): number {
  const cx = (l + r) * 0.5;
  const cy = (t + b) * 0.5;
  const hx = (r - l) * 0.5;
  const hy = (b - t) * 0.5;
  const rad = Math.max(0, Math.min(radius, hx, hy));
  const qx = Math.abs(px - cx) - (hx - rad);
  const qy = Math.abs(py - cy) - (hy - rad);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - rad;
}

function bitAt(col: number, row: number): number {
  if (col < 0 || col > 1 || row < 0 || row > 1) return -1;
  return 1 << (row * 2 + col);
}

function maskSdf(mask: number, x: number, y: number, tileSize: number, radius: number, roughness: number): number {
  const half = tileSize * 0.5;
  const ov = OVERLAP * tileSize;
  const ext = radius + roughness + 1;
  let dist: number | null = null;

  for (const q of QUADRANTS) {
    if ((mask & q.bit) === 0) continue;
    const l = q.col === 0 ? -ext : half - ov;
    const r = q.col === 1 ? tileSize + ext : half + ov;
    const t = q.row === 0 ? -ext : half - ov;
    const b = q.row === 1 ? tileSize + ext : half + ov;
    const d = roundedBoxSdf(x, y, l, t, r, b, radius);
    dist = dist === null ? d : smin(dist, d, radius);
  }

  return dist === null ? 9999 : dist;
}

function maskVoidSdf(mask: number, x: number, y: number, tileSize: number, radius: number): number {
  const half = tileSize * 0.5;
  const ov = OVERLAP * tileSize;
  const filled = (nb: number) => nb !== -1 && (mask & nb) !== 0;
  let dist = Infinity;

  for (const q of QUADRANTS) {
    if ((mask & q.bit) !== 0) continue;
    const l = q.col === 0 ? 0 : filled(bitAt(q.col - 1, q.row)) ? half + ov : half;
    const r = q.col === 1 ? tileSize : filled(bitAt(q.col + 1, q.row)) ? half - ov : half;
    const t = q.row === 0 ? 0 : filled(bitAt(q.col, q.row - 1)) ? half + ov : half;
    const b = q.row === 1 ? tileSize : filled(bitAt(q.col, q.row + 1)) ? half - ov : half;
    dist = Math.min(dist, roundedBoxSdf(x, y, l, t, r, b, radius));
  }

  return dist;
}

function rectPieceSdf(piece: RectPiece, x: number, y: number, tileSize: number, radius: number, roughness: number, padding: number): number {
  const ext = radius + roughness + 1;
  const inset = clamp(Math.round(padding), 1, Math.max(1, Math.floor(tileSize * 0.35)));
  const l = piece.w ? -ext : inset;
  const r = piece.e ? tileSize + ext : tileSize - inset;
  const t = piece.n ? -ext : inset;
  const b = piece.s ? tileSize + ext : tileSize - inset;
  return roundedBoxSdf(x, y, l, t, r, b, radius);
}

function innerCornersSdf(x: number, y: number, tileSize: number, radius: number, roughness: number, padding: number): number {
  const ext = radius + roughness + 1;
  const base = roundedBoxSdf(x, y, -ext, -ext, tileSize + ext, tileSize + ext, radius);
  const notch = clamp(Math.round(padding), 1, Math.max(1, Math.floor(tileSize * 0.35)));
  const notchRadius = Math.max(1, Math.min(radius, notch * 0.45));
  const notches = [
    roundedBoxSdf(x, y, -ext, -ext, notch, notch, notchRadius),
    roundedBoxSdf(x, y, tileSize - notch, -ext, tileSize + ext, notch, notchRadius),
    roundedBoxSdf(x, y, -ext, tileSize - notch, notch, tileSize + ext, notchRadius),
    roundedBoxSdf(x, y, tileSize - notch, tileSize - notch, tileSize + ext, tileSize + ext, notchRadius),
  ];
  return Math.max(base, -Math.min(...notches));
}

function pieceSdf(piece: Piece, x: number, y: number, tileSize: number, radius: number, roughness: number, padding: number): number {
  if (piece.kind === 'empty') return 9999;
  if (piece.kind === 'innerCorners') return innerCornersSdf(x, y, tileSize, radius, roughness, padding);
  return rectPieceSdf(piece, x, y, tileSize, radius, roughness, padding);
}

function axisMapper(tile: number, g: number) {
  if (g === 0) {
    return (o: number) => ({ cell: Math.floor(o / tile), local: o % tile });
  }
  const period = tile + g;
  return (o: number) => {
    const m = o % period;
    if (m < g) return { cell: -1, local: 0 };
    return { cell: Math.floor(o / period), local: m - g };
  };
}

function blobPieceSdf(mask: number, x: number, y: number, tileSize: number, radius: number, roughness: number, padding: number): number {
  const ext = radius + roughness + 1;
  const inset = clamp(Math.round(padding), 1, Math.max(1, Math.floor(tileSize * 0.35)));
  const n = (mask & BLOB_N) !== 0;
  const e = (mask & BLOB_E) !== 0;
  const s = (mask & BLOB_S) !== 0;
  const w = (mask & BLOB_W) !== 0;

  const l = w ? -ext : inset;
  const r = e ? tileSize + ext : tileSize - inset;
  const t = n ? -ext : inset;
  const b = s ? tileSize + ext : tileSize - inset;
  let shape = roundedBoxSdf(x, y, l, t, r, b, radius);

  // Keep 47-piece diagonal voids tiny: ~2 px at native 16×16.
  // Four adjacent inner-corner tiles should create a small central cross/diamond,
  // not a large square hole.
  const cut = clamp(Math.round(tileSize * 0.125), 2, 3);
  const cutRadius = Math.max(0.75, Math.min(1.25, radius * 0.7, cut * 0.5));
  const notches: number[] = [];
  if (n && w && (mask & BLOB_NW) === 0) notches.push(roundedBoxSdf(x, y, -ext, -ext, cut, cut, cutRadius));
  if (n && e && (mask & BLOB_NE) === 0) notches.push(roundedBoxSdf(x, y, tileSize - cut, -ext, tileSize + ext, cut, cutRadius));
  if (s && e && (mask & BLOB_SE) === 0) notches.push(roundedBoxSdf(x, y, tileSize - cut, tileSize - cut, tileSize + ext, tileSize + ext, cutRadius));
  if (s && w && (mask & BLOB_SW) === 0) notches.push(roundedBoxSdf(x, y, -ext, tileSize - cut, cut, tileSize + ext, cutRadius));
  for (const notch of notches) shape = Math.max(shape, -notch);
  return shape;
}

function safeEdgeNoiseOffset(sdf: number, rawNoise: number, tileSize: number): number {
  // Texture presets may roughen/cut the inside edge, but never grow pixels
  // outside the geometric land mask. This prevents detached/floating pixels.
  if (sdf > 0) return 0;
  const band = clamp(tileSize * 0.045, 0.6, 2.25);
  const nearEdge = clamp(1 - (-sdf / Math.max(0.75, band * 1.8)), 0, 1);
  return clamp(Math.max(0, rawNoise), 0, band) * nearEdge;
}

function drawGridOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, tile: number): void {
  ctx.save();
  ctx.strokeStyle = '#212121';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function renderTopdown47Canvas(settings: RenderSettings): HTMLCanvasElement {
  const tile = settings.tileSize;
  const cols = 12;
  const rows = 4;
  const width = cols * tile;
  const height = rows * tile;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) return canvas;

  const image = ctx.createImageData(width, height);
  const data = image.data;
  const roughness = settings.edgeStyle === 'clean' ? 0 : settings.edgeNoise * (tile / 32);
  const radius = settings.cornerRadius * (tile / 32);
  const padding = settings.tilePadding * (tile / 16);
  const edgeFade = Math.max(0.5, settings.edgeFade * (tile / 32));
  const noiseSize = Math.max(1, settings.noiseSize);
  const base = hexToRgb(settings.baseColor);
  const edge = hexToRgb(settings.edgeColor);
  const bg = settings.whiteBackground ? { r: 255, g: 255, b: 255, a: 255 } : { r: 0, g: 0, b: 0, a: 0 };
  const shades = Math.max(2, Math.round(settings.shades));
  const ramp = Array.from({ length: shades }, (_, i) => mixColor(base, edge, i / (shades - 1)));

  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const index = (py * width + px) * 4;
      const col = Math.floor(px / tile);
      const row = Math.floor(py / tile);
      const mask = TOPDOWN_47_LAYOUT[row][col];
      if (mask === null) {
        data[index] = bg.r; data[index + 1] = bg.g; data[index + 2] = bg.b; data[index + 3] = bg.a;
        continue;
      }

      const lx = (px % tile) + 0.5;
      const ly = (py % tile) + 0.5;
      const cx = col * tile + (px % tile);
      const cy = row * tile + (py % tile);
      const sdf = blobPieceSdf(mask, lx, ly, tile, radius, roughness, padding);
      const edgeDepth = -sdf;
      const rawEdgeNoise = (fbm(cx / noiseSize, cy / noiseSize, settings.seed + mask * 113) - 0.5) * roughness;
      // Never allow edge noise to create pixels outside the base tile mask.
      if (sdf > 0) {
        data[index] = bg.r; data[index + 1] = bg.g; data[index + 2] = bg.b; data[index + 3] = bg.a;
        continue;
      }
      const edgeNoise = safeEdgeNoiseOffset(sdf, rawEdgeNoise, tile);
      if (sdf + edgeNoise > 0) {
        data[index] = bg.r; data[index + 1] = bg.g; data[index + 2] = bg.b; data[index + 3] = bg.a;
        continue;
      }

      const edgeAmount = clamp(1 - (edgeDepth - edgeNoise) / edgeFade, 0, 1);
      let level = edgeAmount * (shades - 1);
      level += (fbm(cx / 4.2, cy / 4.2, settings.seed + 809) - 0.5) * (settings.textureNoise / 42) * 4;
      const fleckSeed = hash2(Math.floor(cx / 2), Math.floor(cy / 2), settings.seed + mask * 17);
      if (settings.pixelFlecks && settings.fleckAmount > 0 && fleckSeed > 1 - settings.fleckAmount / 250) {
        level += hash2(cx, cy, settings.seed + 421) > 0.6 ? 2 : 1;
      }
      const color = ramp[clamp(Math.round(level), 0, shades - 1)];

      data[index] = color.r;
      data[index + 1] = color.g;
      data[index + 2] = color.b;
      data[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  if (settings.showGrid) drawGridOverlay(ctx, width, height, tile);
  return canvas;
}


export function renderTilesetCanvas(settings: RenderSettings): HTMLCanvasElement {
  if (settings.mode === 'topdown-47') return renderTopdown47Canvas(settings);
  const tile = settings.tileSize;
  const effectiveSettings = { ...settings, tileSize: tile };
  const { cols, rows } = modeGrid(effectiveSettings.mode);
  const g = 0;
  const width = tile * cols + g * (cols + 1);
  const height = tile * rows + g * (rows + 1);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) return canvas;

  const image = ctx.createImageData(width, height);
  const data = image.data;
  const roughness = effectiveSettings.edgeStyle === 'clean' ? 0 : effectiveSettings.edgeNoise * (tile / 32);
  const radius = effectiveSettings.cornerRadius * (tile / 32);
  const padding = effectiveSettings.tilePadding * (tile / 16);
  const edgeFade = effectiveSettings.edgeFade * (tile / 32);
  const noiseSize = Math.max(1, effectiveSettings.noiseSize);
  const base = hexToRgb(effectiveSettings.baseColor);
  const edge = hexToRgb(effectiveSettings.edgeColor);
  const surface = hexToRgb(effectiveSettings.surfaceColor);
  const bg = effectiveSettings.whiteBackground
    ? { r: 255, g: 255, b: 255, a: 255 }
    : { r: 0, g: 0, b: 0, a: 0 };
  const mapAxisX = axisMapper(tile, g);
  const mapAxisY = axisMapper(tile, g);
  const shades = Math.max(2, Math.round(effectiveSettings.shades));
  const ramp = Array.from({ length: shades }, (_, i) => mixColor(base, edge, i / (shades - 1)));

  for (let py = 0; py < height; py += 1) {
    const ay = mapAxisY(py);
    for (let px = 0; px < width; px += 1) {
      const ax = mapAxisX(px);
      const index = (py * width + px) * 4;

      if (ax.cell < 0 || ay.cell < 0 || ax.cell >= cols || ay.cell >= rows) {
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 255;
        continue;
      }

      const col = ax.cell;
      const row = ay.cell;
      const lx = ax.local + 0.5;
      const ly = ay.local + 0.5;
      const cx = col * tile + ax.local;
      const cy = row * tile + ay.local;

      let sdf = 9999;
      let edgeDepth = Infinity;
      let pieceSeed = row * cols + col + 1;
      let empty = false;

      if (effectiveSettings.mode === 'topdown-15') {
        const mask = TOPDOWN_15_LAYOUT[row][col];
        if (mask === 0) {
          empty = true;
        } else {
          sdf = maskSdf(mask, lx, ly, tile, radius, roughness);
          edgeDepth = maskVoidSdf(mask, lx, ly, tile, radius);
          pieceSeed = mask;
        }
      } else if (effectiveSettings.mode === 'topdown-17') {
        const piece = TOPDOWN_17_LAYOUT[row][col];
        if (!piece || piece.kind === 'empty') {
          empty = true;
        } else {
          sdf = pieceSdf(piece, lx, ly, tile, radius, roughness, padding);
          edgeDepth = -sdf;
        }
      }

      if (empty) {
        data[index] = bg.r;
        data[index + 1] = bg.g;
        data[index + 2] = bg.b;
        data[index + 3] = bg.a;
        continue;
      }

      const rawEdgeNoise = (fbm(cx / noiseSize, cy / noiseSize, effectiveSettings.seed + pieceSeed * 113) - 0.5) * roughness;
      // Preserve the topology of every 15/17-piece land mask. Rough presets can
      // carve a shallow inside edge, but cannot spawn isolated outside pixels.
      if (sdf > 0) {
        data[index] = bg.r;
        data[index + 1] = bg.g;
        data[index + 2] = bg.b;
        data[index + 3] = bg.a;
        continue;
      }
      const edgeNoise = safeEdgeNoiseOffset(sdf, rawEdgeNoise, tile);
      const adjusted = sdf + edgeNoise;
      if (adjusted > 0) {
        data[index] = bg.r;
        data[index + 1] = bg.g;
        data[index + 2] = bg.b;
        data[index + 3] = bg.a;
        continue;
      }

      let color: RGB;
      const edgeAmount = edgeFade > 0 ? clamp(1 - (edgeDepth - edgeNoise) / edgeFade, 0, 1) : 0;
      let level = edgeAmount * (shades - 1);
      level += (fbm(cx / 4.2, cy / 4.2, effectiveSettings.seed + 809) - 0.5) * (effectiveSettings.textureNoise / 42) * 4;

      const fleckSeed = hash2(Math.floor(cx / 2), Math.floor(cy / 2), effectiveSettings.seed + pieceSeed * 17);
      const fleckOn =
        effectiveSettings.pixelFlecks &&
        effectiveSettings.fleckAmount > 0 &&
        fleckSeed > 1 - effectiveSettings.fleckAmount / 250;
      if (fleckOn) level += hash2(cx, cy, effectiveSettings.seed + 421) > 0.6 ? 2 : 1;
      color = ramp[clamp(Math.round(level), 0, shades - 1)];


      data[index] = color.r;
      data[index + 1] = color.g;
      data[index + 2] = color.b;
      data[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  if (effectiveSettings.showGrid) drawGridOverlay(ctx, width, height, tile);
  return canvas;
}

export function upscaleCanvas(source: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const factor = Math.max(1, Math.round(scale));
  if (factor === 1) return source;
  const target = document.createElement('canvas');
  target.width = source.width * factor;
  target.height = source.height * factor;
  const ctx = target.getContext('2d');
  if (!ctx) return target;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, target.width, target.height);
  return target;
}
