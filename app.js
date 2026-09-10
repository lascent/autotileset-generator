const TOPDOWN_15_LAYOUT = [
    [4, 10, 13, 12],
    [9, 14, 15, 7],
    [2, 3, 11, 5],
    [0, 8, 6, 1],
];
const emptyPiece = { kind: 'empty' };
const rectPiece = (connections) => ({ kind: 'rect', ...connections });
/**
 * 17-piece guide sheet.
 * 5x5 atlas containing: empty row, 3x3 island block, vertical stroke,
 * horizontal stroke, isolated tile, and a four-inner-corner helper.
 * This mirrors the common 17-piece guide layout used by SpriteCook's MIT base generator.
 */
const TOPDOWN_17_LAYOUT = [
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
 * Top-down 47-piece blob sheet in a standard 12×4 arrangement.
 * Uses 47 valid blob combinations plus one blank slot.
 */
const TOPDOWN_47_LAYOUT = [
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
];
const OVERLAP = 0.09;
function modeLabel(mode) {
    if (mode === 'topdown-15')
        return '15-piece top-down';
    if (mode === 'topdown-17')
        return '17-piece top-down';
    return '47-piece top-down';
}
function modeGrid(mode) {
    if (mode === 'topdown-17')
        return { cols: 5, rows: 5 };
    if (mode === 'topdown-47')
        return { cols: 12, rows: 4 };
    return { cols: 4, rows: 4 };
}
function modePieceCount(mode) {
    if (mode === 'topdown-15')
        return 15;
    if (mode === 'topdown-17')
        return 17;
    return 47;
}
function sheetNativeSize(settings) {
    const tile = settings.tileSize;
    const { cols, rows } = modeGrid(settings.mode);
    return {
        width: tile * cols,
        height: tile * rows,
    };
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
function smoothstep(t) {
    return t * t * (3 - 2 * t);
}
function smin(a, b, k) {
    if (k <= 0)
        return Math.min(a, b);
    const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
    return lerp(b, a, h) - k * h * (1 - h);
}
function hexToRgb(hex) {
    const clean = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
    };
}
function mixColor(a, b, t) {
    const amount = clamp(t, 0, 1);
    return {
        r: Math.round(lerp(a.r, b.r, amount)),
        g: Math.round(lerp(a.g, b.g, amount)),
        b: Math.round(lerp(a.b, b.b, amount)),
    };
}
function hash2(x, y, seed) {
    let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function valueNoise(x, y, seed) {
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
function fbm(x, y, seed) {
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
function roundedBoxSdf(px, py, l, t, r, b, radius) {
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
function bitAt(col, row) {
    if (col < 0 || col > 1 || row < 0 || row > 1)
        return -1;
    return 1 << (row * 2 + col);
}
function maskSdf(mask, x, y, tileSize, radius, roughness) {
    const half = tileSize * 0.5;
    const ov = OVERLAP * tileSize;
    const ext = radius + roughness + 1;
    let dist = null;
    for (const q of QUADRANTS) {
        if ((mask & q.bit) === 0)
            continue;
        const l = q.col === 0 ? -ext : half - ov;
        const r = q.col === 1 ? tileSize + ext : half + ov;
        const t = q.row === 0 ? -ext : half - ov;
        const b = q.row === 1 ? tileSize + ext : half + ov;
        const d = roundedBoxSdf(x, y, l, t, r, b, radius);
        dist = dist === null ? d : smin(dist, d, radius);
    }
    return dist === null ? 9999 : dist;
}
function maskVoidSdf(mask, x, y, tileSize, radius) {
    const half = tileSize * 0.5;
    const ov = OVERLAP * tileSize;
    const filled = (nb) => nb !== -1 && (mask & nb) !== 0;
    let dist = Infinity;
    for (const q of QUADRANTS) {
        if ((mask & q.bit) !== 0)
            continue;
        const l = q.col === 0 ? 0 : filled(bitAt(q.col - 1, q.row)) ? half + ov : half;
        const r = q.col === 1 ? tileSize : filled(bitAt(q.col + 1, q.row)) ? half - ov : half;
        const t = q.row === 0 ? 0 : filled(bitAt(q.col, q.row - 1)) ? half + ov : half;
        const b = q.row === 1 ? tileSize : filled(bitAt(q.col, q.row + 1)) ? half - ov : half;
        dist = Math.min(dist, roundedBoxSdf(x, y, l, t, r, b, radius));
    }
    return dist;
}
function rectPieceSdf(piece, x, y, tileSize, radius, roughness, padding) {
    const ext = radius + roughness + 1;
    const inset = clamp(Math.round(padding), 1, Math.max(1, Math.floor(tileSize * 0.35)));
    const l = piece.w ? -ext : inset;
    const r = piece.e ? tileSize + ext : tileSize - inset;
    const t = piece.n ? -ext : inset;
    const b = piece.s ? tileSize + ext : tileSize - inset;
    return roundedBoxSdf(x, y, l, t, r, b, radius);
}
function innerCornersSdf(x, y, tileSize, radius, roughness, padding) {
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
function pieceSdf(piece, x, y, tileSize, radius, roughness, padding) {
    if (piece.kind === 'empty')
        return 9999;
    if (piece.kind === 'innerCorners')
        return innerCornersSdf(x, y, tileSize, radius, roughness, padding);
    return rectPieceSdf(piece, x, y, tileSize, radius, roughness, padding);
}
function axisMapper(tile, g) {
    if (g === 0) {
        return (o) => ({ cell: Math.floor(o / tile), local: o % tile });
    }
    const period = tile + g;
    return (o) => {
        const m = o % period;
        if (m < g)
            return { cell: -1, local: 0 };
        return { cell: Math.floor(o / period), local: m - g };
    };
}
function blobPieceSdf(mask, x, y, tileSize, radius, roughness, padding) {
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
    const cut = clamp(Math.round(tileSize * 0.125), 2, 3);
    const cutRadius = Math.max(0.75, Math.min(1.25, radius * 0.7, cut * 0.5));
    const notches = [];
    if (n && w && (mask & BLOB_NW) === 0)
        notches.push(roundedBoxSdf(x, y, -ext, -ext, cut, cut, cutRadius));
    if (n && e && (mask & BLOB_NE) === 0)
        notches.push(roundedBoxSdf(x, y, tileSize - cut, -ext, tileSize + ext, cut, cutRadius));
    if (s && e && (mask & BLOB_SE) === 0)
        notches.push(roundedBoxSdf(x, y, tileSize - cut, tileSize - cut, tileSize + ext, tileSize + ext, cutRadius));
    if (s && w && (mask & BLOB_SW) === 0)
        notches.push(roundedBoxSdf(x, y, -ext, tileSize - cut, cut, tileSize + ext, cutRadius));
    for (const notch of notches)
        shape = Math.max(shape, -notch);
    return shape;
}
function safeEdgeNoiseOffset(sdf, rawNoise, tileSize) {
    // Texture presets may roughen/cut the inside edge, but never grow pixels
    // outside the geometric land mask. This prevents detached/floating pixels.
    if (sdf > 0)
        return 0;
    const band = clamp(tileSize * 0.045, 0.6, 2.25);
    const nearEdge = clamp(1 - (-sdf / Math.max(0.75, band * 1.8)), 0, 1);
    return clamp(Math.max(0, rawNoise), 0, band) * nearEdge;
}
function drawGridOverlay(ctx, width, height, tile) {
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
function renderTopdown47Canvas(settings) {
    const tile = settings.tileSize;
    const cols = 12;
    const rows = 4;
    const width = cols * tile;
    const height = rows * tile;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx)
        return canvas;
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
            // Only a shallow, clamped inward erosion is allowed near the edge.
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
            if (settings.pixelFlecks && settings.fleckAmount > 0 && fleckSeed > 1 - settings.fleckAmount / 250)
                level += hash2(cx, cy, settings.seed + 421) > 0.6 ? 2 : 1;
            const color = ramp[clamp(Math.round(level), 0, shades - 1)];
            data[index] = color.r; data[index + 1] = color.g; data[index + 2] = color.b; data[index + 3] = 255;
        }
    }
    ctx.putImageData(image, 0, 0);
    if (settings.showGrid)
        drawGridOverlay(ctx, width, height, tile);
    return canvas;
}
function renderTilesetCanvas(settings) {
    if (settings.mode === 'topdown-47')
        return renderTopdown47Canvas(settings);
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
    if (!ctx)
        return canvas;
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
                }
                else {
                    sdf = maskSdf(mask, lx, ly, tile, radius, roughness);
                    edgeDepth = maskVoidSdf(mask, lx, ly, tile, radius);
                    pieceSeed = mask;
                }
            }
            else if (effectiveSettings.mode === 'topdown-17') {
                const piece = TOPDOWN_17_LAYOUT[row][col];
                if (!piece || piece.kind === 'empty') {
                    empty = true;
                }
                else {
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
            // Preserve the topology of every 15/17-piece land mask. Rough presets
            // can carve the inside boundary, but cannot spawn isolated outside pixels.
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
            let color;
            const edgeAmount = edgeFade > 0 ? clamp(1 - (edgeDepth - edgeNoise) / edgeFade, 0, 1) : 0;
            let level = edgeAmount * (shades - 1);
            level += (fbm(cx / 4.2, cy / 4.2, effectiveSettings.seed + 809) - 0.5) * (effectiveSettings.textureNoise / 42) * 4;
            const fleckSeed = hash2(Math.floor(cx / 2), Math.floor(cy / 2), effectiveSettings.seed + pieceSeed * 17);
            const fleckOn = effectiveSettings.pixelFlecks &&
                effectiveSettings.fleckAmount > 0 &&
                fleckSeed > 1 - effectiveSettings.fleckAmount / 250;
            if (fleckOn)
                level += hash2(cx, cy, effectiveSettings.seed + 421) > 0.6 ? 2 : 1;
            color = ramp[clamp(Math.round(level), 0, shades - 1)];
            data[index] = color.r;
            data[index + 1] = color.g;
            data[index + 2] = color.b;
            data[index + 3] = 255;
        }
    }
    ctx.putImageData(image, 0, 0);
    if (effectiveSettings.showGrid)
        drawGridOverlay(ctx, width, height, tile);
    return canvas;
}
function upscaleCanvas(source, scale) {
    const factor = Math.max(1, Math.round(scale));
    if (factor === 1)
        return source;
    const target = document.createElement('canvas');
    target.width = source.width * factor;
    target.height = source.height * factor;
    const ctx = target.getContext('2d');
    if (!ctx)
        return target;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0, target.width, target.height);
    return target;
}

const DEFAULTS = {
    mode: 'topdown-15',
    tileSize: 32,
    edgeStyle: 'rough',
    cornerRadius: 3,
    edgeNoise: 4,
    noiseSize: 5,
    tilePadding: 2,
    baseColor: '#B18148',
    edgeColor: '#60452F',
    surfaceColor: '#5CA734',
    shades: 4,
    edgeFade: 3,
    textureNoise: 10,
    fleckAmount: 6,
    seed: 934043,
    whiteBackground: true,
    showGrid: false,
    pixelFlecks: true,
    platformTopDepth: 3,
};
const PRESETS = [
    { name: 'Meadow', base: '#78AE3D', edge: '#2F642D', surface: '#9AD556' },
    { name: 'Earth', base: '#B18148', edge: '#60452F', surface: '#D39A5E' },
    { name: 'Stone', base: '#7C858C', edge: '#414B52', surface: '#A8B1B6' },
    { name: 'Ocean', base: '#4B89A4', edge: '#28546A', surface: '#72B6D0' },
    { name: 'Sand', base: '#C9B476', edge: '#7B673A', surface: '#E0CE91' },
    { name: 'Frost', base: '#B9D8DE', edge: '#708FA0', surface: '#E4F6F8' },
];
const TEXTURE_PRESETS = [
    { name: 'Smooth', edgeStyle: 'clean', cornerRadius: 2, edgeNoise: 0, noiseSize: 9, shades: 3, edgeFade: 2, textureNoise: 2, fleckAmount: 0, tilePadding: 2 },
    { name: 'Grainy', edgeStyle: 'rough', cornerRadius: 2, edgeNoise: 3, noiseSize: 6, shades: 6, edgeFade: 2, textureNoise: 28, fleckAmount: 15, tilePadding: 2 },
    { name: 'Rocky', edgeStyle: 'rough', cornerRadius: 3, edgeNoise: 7, noiseSize: 4, shades: 5, edgeFade: 3, textureNoise: 20, fleckAmount: 10, tilePadding: 3 },
    { name: 'Organic', edgeStyle: 'rough', cornerRadius: 7, edgeNoise: 5, noiseSize: 7, shades: 5, edgeFade: 5, textureNoise: 15, fleckAmount: 8, tilePadding: 3 },
    { name: 'Spikey', edgeStyle: 'rough', cornerRadius: 0, edgeNoise: 8, noiseSize: 2, shades: 5, edgeFade: 1, textureNoise: 18, fleckAmount: 6, tilePadding: 1 },
    { name: 'Cracked', edgeStyle: 'rough', cornerRadius: 1, edgeNoise: 5, noiseSize: 3, shades: 7, edgeFade: 2, textureNoise: 31, fleckAmount: 12, tilePadding: 2 },
    { name: 'Mossy', edgeStyle: 'rough', cornerRadius: 6, edgeNoise: 4, noiseSize: 8, shades: 6, edgeFade: 5, textureNoise: 22, fleckAmount: 14, tilePadding: 3 },
    { name: 'Chunky', edgeStyle: 'rough', cornerRadius: 2, edgeNoise: 8, noiseSize: 9, shades: 4, edgeFade: 3, textureNoise: 18, fleckAmount: 9, tilePadding: 4 },
    { name: 'Layered', edgeStyle: 'clean', cornerRadius: 4, edgeNoise: 2, noiseSize: 11, shades: 8, edgeFade: 7, textureNoise: 14, fleckAmount: 4, tilePadding: 2 },
];
function Icon(props) {
    const name = props.name;
    const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
    if (name === 'download')
        return React.createElement("svg", Object.assign({}, common),
            React.createElement("path", { d: "M12 3v12" }),
            React.createElement("path", { d: "m7 10 5 5 5-5" }),
            React.createElement("path", { d: "M5 21h14" }));
    if (name === 'dice')
        return React.createElement("svg", Object.assign({}, common),
            React.createElement("rect", { x: "4", y: "4", width: "16", height: "16", rx: "4" }),
            React.createElement("path", { d: "M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" }));
    if (name === 'reset')
        return React.createElement("svg", Object.assign({}, common),
            React.createElement("path", { d: "M4 7v5h5" }),
            React.createElement("path", { d: "M20 17a8 8 0 1 1-2.3-10.7L20 8" }));
    if (name === 'grid')
        return React.createElement("svg", Object.assign({}, common),
            React.createElement("rect", { x: "4", y: "4", width: "6", height: "6", rx: "1" }),
            React.createElement("rect", { x: "14", y: "4", width: "6", height: "6", rx: "1" }),
            React.createElement("rect", { x: "4", y: "14", width: "6", height: "6", rx: "1" }),
            React.createElement("rect", { x: "14", y: "14", width: "6", height: "6", rx: "1" }));
    if (name === 'info')
        return React.createElement("svg", Object.assign({}, common),
            React.createElement("circle", { cx: "12", cy: "12", r: "9" }),
            React.createElement("path", { d: "M12 11v5M12 8h.01" }));
    if (name === 'sun')
        return React.createElement("svg", Object.assign({}, common),
            React.createElement("circle", { cx: "12", cy: "12", r: "4" }),
            React.createElement("path", { d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" }));
    if (name === 'moon')
        return React.createElement("svg", Object.assign({}, common),
            React.createElement("path", { d: "M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" }));
    return React.createElement("svg", Object.assign({}, common),
        React.createElement("path", { d: "m12 3 1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3Z" }),
        React.createElement("path", { d: "m18.5 14 .8 2.4 2.2.7-2.2.7-.8 2.2-.7-2.2-2.3-.7 2.3-.7.7-2.4Z" }));
}
function Segmented(props) {
    const countStyle = { '--count': props.options.length };
    return (React.createElement("div", { className: `segmented ${props.disabled ? 'is-disabled' : ''}`, style: countStyle }, props.options.map((option) => (React.createElement("button", { type: "button", key: String(option.value), className: props.value === option.value ? 'active' : '', onClick: () => !props.disabled && props.onChange(option.value), disabled: props.disabled },
        React.createElement("span", null, option.label),
        option.sub && React.createElement("small", null, option.sub))))));
}
function Slider(props) {
    const pct = ((props.value - props.min) / Math.max(1, props.max - props.min)) * 100;
    const rangeStyle = { '--range': `${pct}%` };
    return (React.createElement("div", { className: "control-block" },
        React.createElement("div", { className: "control-head" },
            React.createElement("div", null,
                React.createElement("span", { className: "control-label" }, props.label),
                props.hint && React.createElement("span", { className: "control-hint" }, props.hint)),
            React.createElement("span", { className: "value-pill" }, props.value)),
        React.createElement("input", { className: "range", type: "range", min: props.min, max: props.max, step: props.step || 1, value: props.value, style: rangeStyle, onInput: (e) => props.onChange(Number(e.currentTarget.value)) })));
}
function Switch(props) {
    return React.createElement("label", { className: "switch-row" },
        React.createElement("span", { className: "switch-copy" },
            React.createElement("strong", null, props.label),
            props.description && React.createElement("small", null, props.description)),
        React.createElement("input", { type: "checkbox", checked: props.checked, onChange: (e) => props.onChange(e.target.checked) }),
        React.createElement("span", { className: "switch-ui" },
            React.createElement("span", null)));
}
function ColorField(props) {
    return React.createElement("label", { className: "color-field" },
        React.createElement("span", null, props.label),
        React.createElement("div", { className: "color-input-shell" },
            React.createElement("input", { type: "color", value: props.value, onChange: (e) => props.onChange(e.target.value.toUpperCase()) }),
            React.createElement("code", null, props.value.toUpperCase())));
}
function Section(props) {
    return React.createElement("section", { className: "settings-card" },
        React.createElement("div", { className: "section-title" },
            React.createElement("span", null, props.eyebrow),
            React.createElement("h2", null, props.title)),
        React.createElement("div", { className: "section-content" }, props.children));
}
function getInitialTheme() {
    try { return localStorage.getItem('autotileset-theme') === 'pink' ? 'pink' : 'dark'; }
    catch (_) { return 'dark'; }
}
class App extends React.Component {
    constructor() {
        super(...arguments);
        this.state = { settings: Object.assign({}, DEFAULTS), zoom: 4, exportScale: 1, theme: getInitialTheme() };
        this.canvasNode = null;
        this.sourceCanvas = null;
        this.drawFrame = 0;
    }
    componentDidMount() { this.applyTheme(); this.scheduleDraw(); }
    componentDidUpdate() { this.applyTheme(); this.scheduleDraw(); }
    componentWillUnmount() {
        if (this.drawFrame) cancelAnimationFrame(this.drawFrame);
    }
    scheduleDraw() {
        if (this.drawFrame) cancelAnimationFrame(this.drawFrame);
        this.drawFrame = requestAnimationFrame(() => {
            this.drawFrame = 0;
            this.draw();
        });
    }
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.state.theme);
        try { localStorage.setItem('autotileset-theme', this.state.theme); } catch (_) {}
    }
    toggleTheme() { this.setState((prev) => ({ theme: prev.theme === 'dark' ? 'pink' : 'dark' })); }
    effectiveTile() { return this.state.settings.tileSize; }
    draw() {
        const settings = this.state.settings;
        const source = renderTilesetCanvas(Object.assign(Object.assign({}, settings), { tileSize: this.effectiveTile() }));
        this.sourceCanvas = source;
        const target = this.canvasNode;
        if (target) {
            target.width = source.width;
            target.height = source.height;
            const ctx = target.getContext('2d');
            if (ctx) {
                ctx.imageSmoothingEnabled = false;
                ctx.clearRect(0, 0, target.width, target.height);
                ctx.drawImage(source, 0, 0);
            }
        }
    }
    update(key, value) { this.setState((prev) => ({ settings: Object.assign(Object.assign({}, prev.settings), { [key]: value }) })); }
    chooseMode(mode) {
        this.setState((prev) => ({ settings: Object.assign(Object.assign({}, prev.settings), { mode }) }));
    }
    randomizeSeed() { this.update('seed', Math.floor(100000 + Math.random() * 899999)); }
    reset() { this.setState((prev) => ({ settings: Object.assign({}, DEFAULTS), zoom: 4, exportScale: 1, theme: prev.theme })); }
    download() {
        if (!this.sourceCanvas)
            return;
        const finalCanvas = upscaleCanvas(this.sourceCanvas, this.state.exportScale);
        finalCanvas.toBlob((blob) => {
            if (!blob)
                return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `autotileset_${this.state.settings.mode.replace(/-/g, '_')}_${this.effectiveTile()}px_seed-${this.state.settings.seed}${this.state.exportScale > 1 ? `_x${this.state.exportScale}` : ''}.png`;
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');
    }
    render() {
        const settings = this.state.settings;
        const effectiveTile = this.effectiveTile();
        const grid = modeGrid(settings.mode);
        const native = sheetNativeSize(Object.assign(Object.assign({}, settings), { tileSize: effectiveTile }));
        const nativeWidth = native.width;
        const nativeHeight = native.height;
        const description = settings.mode === 'topdown-15'
            ? '4-corner Wang / dual-grid base. 15 visible pieces + one empty slot.'
            : settings.mode === 'topdown-17'
                ? '5×5 guide: 3×3 island, strokes, isolated tile, and inner-corner helper.'
                : '12×4 blob sheet with 47 valid top-down autotile pieces plus one blank slot.';
        return React.createElement("div", { className: "app-shell" },
            React.createElement("header", { className: "topbar" },
                React.createElement("div", { className: "brand-lockup" },
                    React.createElement("div", { className: "brand-mark" },
                        React.createElement("img", { src: "./resources/zense-logo.png", alt: "Zense logo" })),
                    React.createElement("div", null,
                        React.createElement("div", { className: "brand-line" },
                            React.createElement("strong", null, "autotileset-generator"),
                            React.createElement("span", null, "by Zense")),
                        React.createElement("p", null, "Friendly pixel-perfect autotile generator"))),
                React.createElement("div", { className: "topbar-actions" },
                    React.createElement("span", { className: "status-chip" },
                        React.createElement("i", null),
                        " Local renderer"),
                    React.createElement("button", { className: "theme-btn", onClick: () => this.toggleTheme(), title: this.state.theme === 'dark' ? 'Switch to Pink mode' : 'Switch to Dark mode' },
                        React.createElement(Icon, { name: this.state.theme === 'dark' ? 'spark' : 'moon' }),
                        this.state.theme === 'dark' ? ' Pink' : ' Dark'),
                    React.createElement("button", { className: "ghost-btn", onClick: () => this.reset() },
                        React.createElement(Icon, { name: "reset" }),
                        " Reset"),
                    React.createElement("button", { className: "primary-btn", onClick: () => this.download() },
                        React.createElement(Icon, { name: "download" }),
                        " Export PNG"))),
            React.createElement("main", { className: "workspace" },
                React.createElement("aside", { className: "sidebar" },
                    React.createElement(Section, { eyebrow: "01", title: "Template" },
                        React.createElement("div", { className: "control-block" },
                            React.createElement("div", { className: "control-head compact" },
                                React.createElement("span", { className: "control-label" }, "Piece set")),
                            React.createElement(Segmented, { value: settings.mode, options: [{ label: '15-piece', value: 'topdown-15' }, { label: '17-piece', value: 'topdown-17' }, { label: '47-piece', value: 'topdown-47' }], onChange: (v) => this.chooseMode(v) })),
                        React.createElement("div", { className: "control-block" },
                            React.createElement("div", { className: "control-head compact" },
                                React.createElement("span", { className: "control-label" }, "Tile size")),
                            React.createElement(Segmented, { value: effectiveTile, options: [{ label: '16x16', value: 16 }, { label: '32x32', value: 32 }, { label: '64x64', value: 64 }], onChange: (v) => this.update('tileSize', v) })),
                        React.createElement("div", { className: "control-block" },
                            React.createElement("div", { className: "control-head compact" },
                                React.createElement("span", { className: "control-label" }, "Edge style")),
                            React.createElement(Segmented, { value: settings.edgeStyle, options: [{ label: 'Rough', value: 'rough' }, { label: 'Clean', value: 'clean' }], onChange: (v) => this.update('edgeStyle', v) })),
                        React.createElement(Slider, { label: "Corner radius", value: settings.cornerRadius, min: 0, max: 12, onChange: (v) => this.update('cornerRadius', v) }),
                        React.createElement(Slider, { label: "Tile padding", value: settings.tilePadding, min: 1, max: 6, onChange: (v) => this.update('tilePadding', v), hint: "Inset on open edges" }),
                        React.createElement(Slider, { label: "Edge noise", value: settings.edgeNoise, min: 0, max: 10, onChange: (v) => this.update('edgeNoise', v) }),
                        React.createElement(Slider, { label: "Noise size", value: settings.noiseSize, min: 1, max: 12, onChange: (v) => this.update('noiseSize', v) })),
                    React.createElement(Section, { eyebrow: "02", title: "Palette & texture" },
                        React.createElement("div", { className: "color-grid" },
                            React.createElement(ColorField, { label: "Base", value: settings.baseColor, onChange: (v) => this.update('baseColor', v) }),
                            React.createElement(ColorField, { label: "Edge", value: settings.edgeColor, onChange: (v) => this.update('edgeColor', v) }),
                            React.createElement(ColorField, { label: "Accent", value: settings.surfaceColor, onChange: (v) => this.update('surfaceColor', v) })),
                        React.createElement("div", { className: "control-block" },
                            React.createElement("div", { className: "control-head compact" },
                                React.createElement("span", { className: "control-label" }, "Presets")),
                            React.createElement("div", { className: "preset-grid" }, PRESETS.map((p) => React.createElement("button", { key: p.name, type: "button", className: "preset", title: `${p.name} · ${p.base} · ${p.edge} · ${p.surface}`, onClick: () => this.setState((prev) => ({ settings: Object.assign(Object.assign({}, prev.settings), { baseColor: p.base, edgeColor: p.edge, surfaceColor: p.surface }) })) },
                                React.createElement("span", { className: "preset-swatches" },
                                    React.createElement("i", { style: { background: p.edge } }),
                                    React.createElement("i", { style: { background: p.base } }),
                                    React.createElement("i", { style: { background: p.surface } })),
                                React.createElement("em", null, p.name))))),
                        React.createElement("div", { className: "control-block" },
                            React.createElement("div", { className: "control-head compact" },
                                React.createElement("span", { className: "control-label" }, "Texture presets")),
                            React.createElement("div", { className: "texture-grid" }, TEXTURE_PRESETS.map((p) => React.createElement("button", { key: p.name, type: "button", className: "texture-preset", onClick: () => this.setState((prev) => ({ settings: Object.assign(Object.assign({}, prev.settings), p) })) }, p.name)))),
                        React.createElement(Slider, { label: "Shades", value: settings.shades, min: 2, max: 8, onChange: (v) => this.update('shades', v) }),
                        React.createElement(Slider, { label: "Edge fade", value: settings.edgeFade, min: 0, max: 10, onChange: (v) => this.update('edgeFade', v) }),
                        React.createElement(Slider, { label: "Texture noise", value: settings.textureNoise, min: 0, max: 32, onChange: (v) => this.update('textureNoise', v) }),
                        React.createElement(Slider, { label: "Flecks", value: settings.fleckAmount, min: 0, max: 18, onChange: (v) => this.update('fleckAmount', v) })),
                    React.createElement(Section, { eyebrow: "03", title: "Output" },
                        React.createElement("div", { className: "seed-row seed-row-wide" },
                            React.createElement("label", null,
                                React.createElement("span", null, "Seed"),
                                React.createElement("input", { type: "number", min: 1, max: 999999, value: settings.seed, onChange: (e) => this.update('seed', Math.max(1, Number(e.target.value) || 1)) })),
                            React.createElement("button", { type: "button", className: "seed-generate-btn", onClick: () => this.randomizeSeed(), title: "Generate a new random seed" },
                                React.createElement(Icon, { name: "dice" }),
                                " Generate Seeds")),
                        React.createElement("div", { className: "switch-list" },
                            React.createElement(Switch, { label: "White background", description: "Off = transparent PNG", checked: settings.whiteBackground, onChange: (v) => this.update('whiteBackground', v) }),
                            React.createElement(Switch, { label: "Tile grid", description: "#212121 · 1 px · off by default", checked: settings.showGrid, onChange: (v) => this.update('showGrid', v) }),
                            React.createElement(Switch, { label: "Pixel clusters", description: "Adds seeded fleck groups", checked: settings.pixelFlecks, onChange: (v) => this.update('pixelFlecks', v) })),
                        React.createElement("div", { className: "control-block" },
                            React.createElement("div", { className: "control-head compact" },
                                React.createElement("span", { className: "control-label" }, "Export scale")),
                            React.createElement(Segmented, { value: this.state.exportScale, options: [{ label: '1×', value: 1 }, { label: '2×', value: 2 }, { label: '4×', value: 4 }, { label: '8×', value: 8 }], onChange: (v) => this.setState({ exportScale: v }) })))),
                React.createElement("section", { className: "preview-panel" },
                    React.createElement("div", { className: "preview-head" },
                        React.createElement("div", null,
                            React.createElement("div", { className: "eyebrow" }, "LIVE SHEET"),
                            React.createElement("h1", null, modeLabel(settings.mode)),
                            React.createElement("p", null, description)),
                        React.createElement("div", { className: "preview-meta" },
                            React.createElement("div", null,
                                React.createElement("span", null, 'Pieces'),
                                React.createElement("strong", null, modePieceCount(settings.mode))),
                            React.createElement("div", null,
                                React.createElement("span", null, 'Layout'),
                                React.createElement("strong", null, `${grid.cols}×${grid.rows}`)),
                            React.createElement("div", null,
                                React.createElement("span", null, "Native"),
                                React.createElement("strong", null,
                                    nativeWidth,
                                    "\u00D7",
                                    nativeHeight)),
                            React.createElement("div", null,
                                React.createElement("span", null, "Tile"),
                                React.createElement("strong", null,
                                    effectiveTile,
                                    "px")))),
                    React.createElement("div", { className: "canvas-toolbar" },
                        React.createElement("div", { className: "sheet-chip" },
                            React.createElement(Icon, { name: "spark" }),
                            React.createElement("span", null, 'Live tilesheet')), 
                        React.createElement("div", { className: "zoom-control" },
                            React.createElement("span", null, "Preview"),
                            React.createElement(Segmented, { value: this.state.zoom, options: [{ label: '2×', value: 2 }, { label: '4×', value: 4 }, { label: '6×', value: 6 }, { label: '8×', value: 8 }], onChange: (v) => this.setState({ zoom: v }) }))),
                    React.createElement("div", { className: "canvas-stage" },
                        React.createElement("section", { className: "preview-card-ui main single-preview" },
                            React.createElement("div", { className: "preview-card-head" },
                                React.createElement("div", null,
                                    React.createElement("strong", null, "Live tilesheet"),
                                    React.createElement("p", null, "This is the exact tilesheet generated from your current settings and exported as PNG."))),
                            React.createElement("div", { className: `canvas-frame ${settings.whiteBackground ? 'white' : 'transparent'}` },
                                React.createElement("canvas", { ref: (node) => { this.canvasNode = node; }, style: { width: `${nativeWidth * this.state.zoom}px`, height: `${nativeHeight * this.state.zoom}px` } })),
                            React.createElement("div", { className: "scene-note" }, "Live export preview — change the template, palette, texture, seed, or size above to update it instantly."))),
                    React.createElement("div", { className: "preview-footer" },
                        React.createElement("div", { className: "accuracy-note" },
                            React.createElement(Icon, { name: "info" }),
                            React.createElement("span", null,
                                React.createElement("strong", null, 'Live export preview.'),
                                ' The canvas above is the exact tilesheet that will be exported.')), 
                        React.createElement("button", { className: "primary-btn large", onClick: () => this.download() },
                            React.createElement(Icon, { name: "download" }),
                            " Export ",
                            this.state.exportScale,
                            "\u00D7 PNG")))),
            React.createElement("footer", { className: "app-footer" },
                React.createElement("span", null, "autotileset-generator \u00B7 Made by Zense \u00B7 React + TypeScript + Canvas"),
                React.createElement("span", null, "GitHub Pages ready \u00B7 Dark and light mode included")));
    }
}
ReactDOM.render(React.createElement(App, null), document.getElementById('root'));
