import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  EdgeStyle,
  GeneratorMode,
  RenderSettings,
  modeGrid,
  modeLabel,
  modePieceCount,
  renderTilesetCanvas,
  sheetNativeSize,
  upscaleCanvas,
} from './generator';
import './styles.css';

const DEFAULTS: RenderSettings = {
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
  { name: 'Smooth', edgeStyle: 'clean' as EdgeStyle, cornerRadius: 2, edgeNoise: 0, noiseSize: 9, shades: 3, edgeFade: 2, textureNoise: 2, fleckAmount: 0, tilePadding: 2 },
  { name: 'Grainy', edgeStyle: 'rough' as EdgeStyle, cornerRadius: 2, edgeNoise: 3, noiseSize: 6, shades: 6, edgeFade: 2, textureNoise: 28, fleckAmount: 15, tilePadding: 2 },
  { name: 'Rocky', edgeStyle: 'rough' as EdgeStyle, cornerRadius: 3, edgeNoise: 7, noiseSize: 4, shades: 5, edgeFade: 3, textureNoise: 20, fleckAmount: 10, tilePadding: 3 },
  { name: 'Organic', edgeStyle: 'rough' as EdgeStyle, cornerRadius: 7, edgeNoise: 5, noiseSize: 7, shades: 5, edgeFade: 5, textureNoise: 15, fleckAmount: 8, tilePadding: 3 },
  { name: 'Spikey', edgeStyle: 'rough' as EdgeStyle, cornerRadius: 0, edgeNoise: 8, noiseSize: 2, shades: 5, edgeFade: 1, textureNoise: 18, fleckAmount: 6, tilePadding: 1 },
  { name: 'Cracked', edgeStyle: 'rough' as EdgeStyle, cornerRadius: 1, edgeNoise: 5, noiseSize: 3, shades: 7, edgeFade: 2, textureNoise: 31, fleckAmount: 12, tilePadding: 2 },
  { name: 'Mossy', edgeStyle: 'rough' as EdgeStyle, cornerRadius: 6, edgeNoise: 4, noiseSize: 8, shades: 6, edgeFade: 5, textureNoise: 22, fleckAmount: 14, tilePadding: 3 },
  { name: 'Chunky', edgeStyle: 'rough' as EdgeStyle, cornerRadius: 2, edgeNoise: 8, noiseSize: 9, shades: 4, edgeFade: 3, textureNoise: 18, fleckAmount: 9, tilePadding: 4 },
  { name: 'Layered', edgeStyle: 'clean' as EdgeStyle, cornerRadius: 4, edgeNoise: 2, noiseSize: 11, shades: 8, edgeFade: 7, textureNoise: 14, fleckAmount: 4, tilePadding: 2 },
];

function Icon({ name }: { name: 'spark' | 'download' | 'dice' | 'reset' | 'grid' | 'info' | 'sun' | 'moon' }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'download') return <svg {...common}><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>;
  if (name === 'dice') return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01"/></svg>;
  if (name === 'reset') return <svg {...common}><path d="M4 7v5h5"/><path d="M20 17a8 8 0 1 1-2.3-10.7L20 8"/></svg>;
  if (name === 'grid') return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
  if (name === 'info') return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>;
  if (name === 'sun') return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
  if (name === 'moon') return <svg {...common}><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/></svg>;
  return <svg {...common}><path d="m12 3 1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3Z"/><path d="m18.5 14 .8 2.4 2.2.7-2.2.7-.8 2.2-.7-2.2-2.3-.7 2.3-.7.7-2.4Z"/></svg>;
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: T;
  options: { label: string; value: T; sub?: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`segmented ${disabled ? 'is-disabled' : ''}`} style={{ '--count': options.length } as React.CSSProperties}>
      {options.map((option) => (
        <button
          type="button"
          key={String(option.value)}
          className={value === option.value ? 'active' : ''}
          onClick={() => !disabled && onChange(option.value)}
          disabled={disabled}
        >
          <span>{option.label}</span>
          {option.sub && <small>{option.sub}</small>}
        </button>
      ))}
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange, hint }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void; hint?: string }) {
  const pct = ((value - min) / Math.max(1, max - min)) * 100;
  return (
    <div className="control-block">
      <div className="control-head">
        <div>
          <span className="control-label">{label}</span>
          {hint && <span className="control-hint">{hint}</span>}
        </div>
        <span className="value-pill">{value}</span>
      </div>
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--range': `${pct}%` } as React.CSSProperties}
        onInput={(e) => onChange(Number(e.currentTarget.value))}
      />
    </div>
  );
}

function Switch({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (checked: boolean) => void; description?: string }) {
  return (
    <label className="switch-row">
      <span className="switch-copy">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-ui" aria-hidden="true"><span /></span>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="color-field">
      <span>{label}</span>
      <div className="color-input-shell">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        <code>{value.toUpperCase()}</code>
      </div>
    </label>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="settings-card">
      <div className="section-title">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="section-content">{children}</div>
    </section>
  );
}

function App() {
  const [settings, setSettings] = useState<RenderSettings>(DEFAULTS);
  const [zoom, setZoom] = useState(4);
  const [exportScale, setExportScale] = useState(1);
  const [theme, setTheme] = useState<'dark' | 'pink'>('dark');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewFitRef = useRef<HTMLDivElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewShellWidth, setPreviewShellWidth] = useState(0);

  const effectiveTile = settings.tileSize;
  const grid = modeGrid(settings.mode);
  const native = sheetNativeSize({ ...settings, tileSize: effectiveTile });
  const nativeWidth = native.width;
  const nativeHeight = native.height;
  const previewPadding = 12;
  const desiredPreviewWidth = nativeWidth * zoom;
  const maxPreviewCanvasWidth = previewShellWidth > 0 ? Math.max(120, previewShellWidth - previewPadding * 2) : desiredPreviewWidth;
  const previewCanvasWidth = Math.min(desiredPreviewWidth, maxPreviewCanvasWidth);
  const previewCanvasHeight = Math.round(previewCanvasWidth * (nativeHeight / Math.max(1, nativeWidth)));
  const previewFrameWidth = previewCanvasWidth + previewPadding * 2;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('autotileset-theme', theme); } catch { /* file:// privacy mode */ }
  }, [theme]);

  const description = useMemo(() => {
    if (settings.mode === 'topdown-15') return '4-corner Wang / dual-grid base. 15 visible pieces + one empty slot.';
    if (settings.mode === 'topdown-17') return '5×5 guide: 3×3 island, strokes, isolated tile, and inner-corner helper.';
    return 'Standard 47-piece blob/autotile sheet in the Godot 3 generic 12×4 layout, with one blank slot.';
  }, [settings.mode]);

  useEffect(() => {
    // Coalesce rapid slider/preset changes into one render per animation frame.
    // This keeps dragging responsive even for 32x32/64x64 47-piece sheets.
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      const source = renderTilesetCanvas({ ...settings, tileSize: effectiveTile });
      sourceCanvasRef.current = source;
      const target = canvasRef.current;
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
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [settings, effectiveTile]);

  useEffect(() => {
    const node = previewFitRef.current;
    if (!node) return;

    const measure = () => {
      const nextWidth = Math.round(node.clientWidth || 0);
      setPreviewShellWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    };

    measure();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(node);
    } else {
      window.addEventListener('resize', measure);
    }

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  function update<K extends keyof RenderSettings>(key: K, value: RenderSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function chooseMode(mode: GeneratorMode) {
    setSettings((prev) => ({ ...prev, mode }));
  }


  function randomizeSeed() {
    update('seed', Math.floor(100000 + Math.random() * 899999));
  }

  function randomizeTexturePreset() {
    setSettings((prev) => {
      const rough = Math.random() < 0.78;
      const rand = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
      return {
        ...prev,
        edgeStyle: rough ? 'rough' : 'clean',
        cornerRadius: rand(0, 9),
        tilePadding: rand(1, 4),
        edgeNoise: rough ? rand(2, 9) : rand(0, 3),
        noiseSize: rand(2, 11),
        shades: rand(3, 8),
        edgeFade: rand(1, 8),
        textureNoise: rand(4, 32),
        fleckAmount: rand(0, 18),
        pixelFlecks: Math.random() < 0.82,
        seed: Math.floor(100000 + Math.random() * 899999),
      };
    });
  }

  function reset() {
    setSettings(DEFAULTS);
    setZoom(4);
    setExportScale(1);
  }

  function download() {
    const source = sourceCanvasRef.current;
    if (!source) return;
    const finalCanvas = upscaleCanvas(source, exportScale);
    finalCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const modeSlug = settings.mode.replaceAll('-', '_');
      a.href = url;
      a.download = `autotileset_${modeSlug}_${effectiveTile}px_seed-${settings.seed}${exportScale > 1 ? `_x${exportScale}` : ''}.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><img src="/zense-logo.png" alt="Zense logo" /></div>
          <div>
            <div className="brand-line"><strong>autotileset-generator</strong><span>by Zense</span></div>
            <p>Friendly pixel-perfect autotile generator</p>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="status-chip"><i /> Local renderer</span>
          <button className="theme-btn" onClick={() => setTheme((prev) => prev === 'dark' ? 'pink' : 'dark')} title={theme === 'dark' ? 'Switch to Pink mode' : 'Switch to Dark mode'}><Icon name={theme === 'dark' ? 'spark' : 'moon'} /> {theme === 'dark' ? 'Pink' : 'Dark'}</button>
          <button className="ghost-btn" onClick={reset}><Icon name="reset" /> Reset</button>
          <button className="primary-btn" onClick={download}><Icon name="download" /> Export PNG</button>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <Section eyebrow="01" title="Template">
            <div className="control-block">
              <div className="control-head compact"><span className="control-label">Piece set</span></div>
              <Segmented
                value={settings.mode}
                options={[
                  { label: '15-piece', value: 'topdown-15' },
                  { label: '17-piece', value: 'topdown-17' },
                  { label: '47-piece', value: 'topdown-47' },
                ]}
                onChange={chooseMode}
              />
            </div>

            <div className="control-block">
              <div className="control-head compact"><span className="control-label">Frame / tile size</span><span className="mini-badge">Synced</span></div>
              <Segmented
                value={effectiveTile}
                options={[{ label: '16×16', value: 16 }, { label: '32×32', value: 32 }, { label: '64×64', value: 64 }]}
                onChange={(value) => update('tileSize', value)}
              />
              <span className="control-hint frame-hint">Every generated frame uses the selected square size.</span>
            </div>

            <div className="control-block">
              <div className="control-head compact"><span className="control-label">Edge style</span></div>
              <Segmented<EdgeStyle>
                value={settings.edgeStyle}
                options={[{ label: 'Rough', value: 'rough' }, { label: 'Clean', value: 'clean' }]}
                onChange={(value) => update('edgeStyle', value)}
              />
            </div>

            <Slider label="Corner radius" value={settings.cornerRadius} min={0} max={12} onChange={(v) => update('cornerRadius', v)} />
            <Slider label="Tile padding" value={settings.tilePadding} min={1} max={6} onChange={(v) => update('tilePadding', v)} hint="Inset on open edges" />
            <Slider label="Edge noise" value={settings.edgeNoise} min={0} max={10} onChange={(v) => update('edgeNoise', v)} />
            <Slider label="Noise size" value={settings.noiseSize} min={1} max={12} onChange={(v) => update('noiseSize', v)} />
          </Section>

          <Section eyebrow="02" title="Palette & texture">
            <div className="color-grid">
              <ColorField label="Base" value={settings.baseColor} onChange={(v) => update('baseColor', v)} />
              <ColorField label="Edge" value={settings.edgeColor} onChange={(v) => update('edgeColor', v)} />
              <ColorField label="Accent" value={settings.surfaceColor} onChange={(v) => update('surfaceColor', v)} />
            </div>

            <div className="control-block">
              <div className="control-head compact"><span className="control-label">Presets</span></div>
              <div className="preset-grid">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className="preset"
                    title={preset.name}
                    onClick={() => setSettings((prev) => ({ ...prev, baseColor: preset.base, edgeColor: preset.edge, surfaceColor: preset.surface }))}
                  >
                    <span className="preset-swatches">
                      <i style={{ background: preset.edge }} />
                      <i style={{ background: preset.base }} />
                      <i style={{ background: preset.surface }} />
                    </span>
                    <em>{preset.name}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className="control-block">
              <div className="control-head compact"><span className="control-label">Texture presets</span></div>
              <div className="texture-grid">
                {TEXTURE_PRESETS.map((preset) => (
                  <button key={preset.name} type="button" className="texture-preset" onClick={() => setSettings((prev) => ({ ...prev, ...preset }))}>
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <Slider label="Shades" value={settings.shades} min={2} max={8} onChange={(v) => update('shades', v)} />
            <Slider label="Edge fade" value={settings.edgeFade} min={0} max={10} onChange={(v) => update('edgeFade', v)} />
            <Slider label="Texture noise" value={settings.textureNoise} min={0} max={32} onChange={(v) => update('textureNoise', v)} />
            <Slider label="Flecks" value={settings.fleckAmount} min={0} max={18} onChange={(v) => update('fleckAmount', v)} />
          </Section>
        </aside>

        <div className="right-column">
          <section className="preview-panel">
            <div className="preview-head">
              <div>
                <div className="eyebrow">LIVE SHEET</div>
                <h1>{modeLabel(settings.mode)}</h1>
                <p>{description}</p>
              </div>
              <div className="preview-meta">
                <div><span>Pieces</span><strong>{modePieceCount(settings.mode)}</strong></div>
                <div><span>Layout</span><strong>{grid.cols}×{grid.rows}</strong></div>
                <div><span>Sheet</span><strong>{nativeWidth}×{nativeHeight}</strong></div>
                <div><span>Frame</span><strong>{effectiveTile}×{effectiveTile}</strong></div>
              </div>
            </div>

            <div className="canvas-toolbar">
              <div className="sheet-chip"><Icon name="spark" /><span>Auto-fit live PNG preview</span></div>
              <div className="zoom-control">
                <span>Max zoom</span>
                <Segmented value={zoom} options={[{ label: '2×', value: 2 }, { label: '4×', value: 4 }, { label: '6×', value: 6 }, { label: '8×', value: 8 }]} onChange={setZoom} />
              </div>
            </div>

            <div className="canvas-stage">
              <section className="preview-card-ui main single-preview">
                <div className="preview-card-head">
                  <div><strong>Live tilesheet</strong><p>The frame grid, sheet dimensions, and PNG output stay synchronized with your selected tile size.</p></div>
                  <div className="frame-sync-chip"><span>Frame</span><strong>{effectiveTile}×{effectiveTile}px</strong></div>
                </div>
                <div className="canvas-fit-shell" ref={previewFitRef}>
                  <div
                    className={`canvas-frame ${settings.whiteBackground ? 'white' : 'transparent'}`}
                    style={{ width: `${previewFrameWidth}px`, padding: `${previewPadding}px` }}
                  >
                    <canvas
                      ref={canvasRef}
                      style={{ width: `${previewCanvasWidth}px`, height: `${previewCanvasHeight}px`, maxWidth: '100%' }}
                      aria-label={`${modeLabel(settings.mode)} tileset preview`}
                    />
                  </div>
                </div>
                <div className="scene-note">Changes to Template or Palette & texture update this sheet instantly. Output and export controls are directly below.</div>
              </section>
            </div>
          </section>

          <section className="settings-card output-card">
            <div className="section-title output-title">
              <span>03</span>
              <h2>Output & export</h2>
              <div className="sync-status"><i /> Frame sizes synced</div>
            </div>
            <div className="section-content output-content">
              <div className="output-group">
                <div className="output-group-head"><strong>Variation</strong><span>Seeded texture</span></div>
                <div className="seed-row seed-row-wide">
                  <label><span>Seed</span><input type="number" min={1} max={999999} value={settings.seed} onChange={(e) => update('seed', Math.max(1, Number(e.target.value) || 1))} /></label>
                  <button type="button" className="seed-generate-btn" onClick={randomizeSeed} title="Generate a new random seed"><Icon name="dice" /> New seed</button>
                </div>
                <button
                  type="button"
                  className="random-texture-btn"
                  onClick={randomizeTexturePreset}
                  title="Generate randomized texture settings while preserving template, frame size, and palette colors"
                >
                  <Icon name="spark" />
                  <span>Random Texture Presets</span>
                  <small>New texture mix</small>
                </button>
              </div>

              <div className="output-group">
                <div className="output-group-head"><strong>PNG options</strong><span>Applied live</span></div>
                <div className="switch-list compact-switches">
                  <Switch label="White background" description="Off = transparent" checked={settings.whiteBackground} onChange={(v) => update('whiteBackground', v)} />
                  <Switch label="Tile grid" description="#212121 · 1 px" checked={settings.showGrid} onChange={(v) => update('showGrid', v)} />
                  <Switch label="Pixel clusters" description="Seeded fleck groups" checked={settings.pixelFlecks} onChange={(v) => update('pixelFlecks', v)} />
                </div>
              </div>

              <div className="output-group export-group">
                <div className="output-group-head"><strong>Export</strong><span>Nearest-neighbor scale</span></div>
                <div className="control-block">
                  <div className="control-head compact"><span className="control-label">Export scale</span></div>
                  <Segmented value={exportScale} options={[{ label: '1×', value: 1 }, { label: '2×', value: 2 }, { label: '4×', value: 4 }, { label: '8×', value: 8 }]} onChange={setExportScale} />
                </div>
                <div className="size-sync-grid">
                  <div><span>Source frame</span><strong>{effectiveTile}×{effectiveTile}px</strong></div>
                  <div><span>Export frame</span><strong>{effectiveTile * exportScale}×{effectiveTile * exportScale}px</strong></div>
                  <div><span>Export sheet</span><strong>{nativeWidth * exportScale}×{nativeHeight * exportScale}px</strong></div>
                </div>
                <button className="primary-btn large export-main-btn" onClick={download}><Icon name="download" /> Export {exportScale}× PNG</button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <span>autotileset-generator · Made by Zense · React + TypeScript + Canvas</span>
        <span>GitHub Pages ready · Dark and Pink modes included</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
