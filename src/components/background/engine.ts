import { DOT_FIELD } from './config';
import { observeTheme, readPalette, type DotPalette } from './palette';

/**
 * ============================================================================
 * DOT FIELD ENGINE
 * ============================================================================
 * A procedural dot grid on a single canvas, with a cursor-proximity response.
 * Framework-free on purpose: React mounts it and never participates in a frame.
 *
 * ─── WHY THIS IS CHEAP ───────────────────────────────────────────────────────
 * A 2560×1440 viewport at 26px pitch is ~5,400 dots. Re-stroking all of them every frame
 * would be the whole frame budget for something nobody is meant to notice.
 *
 * Instead the resting grid is rendered ONCE into an offscreen canvas whenever the size,
 * DPR or theme changes. Each frame only touches the dots that are actually moving:
 *
 *   1. an ACTIVE SET holds the indices with non-zero energy
 *   2. the dirty rect is the bounding box of that set
 *   3. the dirty rect is restored from the offscreen base with one drawImage
 *   4. only the active dots are re-drawn
 *
 * At a 150px influence radius that is ~130 dots per frame regardless of screen size, so the
 * cost is flat: a 4K monitor costs the same per frame as a laptop.
 *
 * When the set empties and the pointer is gone, the loop STOPS — not a rAF spinning on a
 * no-op. Idle cost is genuinely zero, which matters for a background that is on screen for
 * eight hours.
 *
 * ─── FIVE CONCERNS, MARKED BELOW ─────────────────────────────────────────────
 *   · Resize manager      — ResizeObserver + DPR, rebuilds the base layer
 *   · Theme adapter       — MutationObserver on the app's theme signal
 *   · Interaction manager — pointer tracking, disabled on coarse pointers
 *   · Animation loop      — rAF, visibility-aware, self-halting
 *   · Renderer            — base layer + per-frame active dots
 */

/** Smoothstep on the normalised proximity. Linear falloff reads as a hard-edged disc. */
const smooth = (t: number): number => t * t * (3 - 2 * t);

export class DotFieldEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  /** Resting grid, re-rendered only on resize / DPR / theme change. */
  private base: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;

  private palette: DotPalette = readPalette();

  private width = 0;
  private height = 0;
  private dpr = 1;
  private cols = 0;
  private rows = 0;
  private originX = 0;
  private originY = 0;

  /** Per-dot energy, 0…1. Flat array indexed row * cols + col. */
  private energy = new Float32Array(0);
  /** Indices with energy above epsilon, or newly inside the influence radius. */
  private active = new Set<number>();

  private pointerX = -1e6;
  private pointerY = -1e6;
  private pointerInside = false;

  private frame = 0;
  private lastTime = 0;
  private running = false;

  /** True when the field is drawn once and never animates (reduced motion / touch). */
  private readonly staticOnly: boolean;

  private disposers: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;

    this.base = document.createElement('canvas');
    const baseCtx = this.base.getContext('2d', { alpha: true });
    if (!baseCtx) throw new Error('2D canvas context unavailable');
    this.baseCtx = baseCtx;

    // Reduced motion keeps the AESTHETIC and drops the MOVEMENT — the grid still renders,
    // it simply never reacts. A blank rectangle would be a worse experience, not a more
    // accessible one. Coarse pointers get the same treatment: there is no hover on a
    // touchscreen, so tracking would only burn battery.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    this.staticOnly = reduced || coarse;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  start(): void {
    this.measure();
    this.attachResize();
    this.attachTheme();
    if (!this.staticOnly) {
      this.attachPointer();
      this.attachVisibility();
    }
  }

  destroy(): void {
    this.stopLoop();
    this.disposers.forEach((d) => d());
    this.disposers = [];
  }

  // ── Resize manager ────────────────────────────────────────────────────────

  private attachResize(): void {
    const target = this.canvas.parentElement ?? document.documentElement;
    const ro = new ResizeObserver(() => this.measure());
    ro.observe(target);
    this.disposers.push(() => ro.disconnect());

    // Two things ResizeObserver does not report: a DPR change (dragging a window between
    // monitors) and the host MOVING without resizing (page scroll). Both matter — the second
    // would silently offset every proximity calculation.
    const onViewport = () => this.measure();
    window.addEventListener('resize', onViewport);
    window.addEventListener('scroll', onViewport, { passive: true });
    this.disposers.push(() => {
      window.removeEventListener('resize', onViewport);
      window.removeEventListener('scroll', onViewport);
    });
  }

  /** Host rect in viewport coordinates — pointer events arrive in that space. */
  private hostLeft = 0;
  private hostTop = 0;

  private measure(): void {
    // Size to the HOST element, not the viewport. The field is scoped to a region (the Home
    // stage) rather than the whole app, and an absolutely-positioned canvas inside its own
    // container needs no assumptions about Metronic's stacking contexts or which ancestor
    // paints an opaque background — the two things that make a full-screen fixed canvas
    // fragile in this codebase.
    const host = this.canvas.parentElement;
    const rect = host ? host.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };
    this.hostLeft = rect.left;
    this.hostTop = rect.top;

    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, DOT_FIELD.maxDpr);
    if (w === this.width && h === this.height && dpr === this.dpr) return;

    this.width = w;
    this.height = h;
    this.dpr = dpr;

    for (const c of [this.canvas, this.base]) {
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
    }
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    // Both contexts work in CSS pixels; the backing store is the only thing that knows DPR.
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { spacing } = DOT_FIELD;
    this.cols = Math.ceil(w / spacing) + 1;
    this.rows = Math.ceil(h / spacing) + 1;
    // Centre the lattice so it does not visibly re-anchor to the top-left on resize.
    this.originX = (w - (this.cols - 1) * spacing) / 2;
    this.originY = (h - (this.rows - 1) * spacing) / 2;

    this.energy = new Float32Array(this.cols * this.rows);
    this.active.clear();

    this.renderBase();
    this.paintAll();
  }

  // ── Theme adapter ─────────────────────────────────────────────────────────

  private attachTheme(): void {
    this.disposers.push(observeTheme(() => {
      const next = readPalette();
      if (next === this.palette) return;
      this.palette = next;
      // Rebuild the resting layer and repaint. No remount, no React involvement — the
      // component above never learns that the theme changed.
      this.renderBase();
      this.paintAll();
    }));
  }

  // ── Interaction manager ───────────────────────────────────────────────────

  private attachPointer(): void {
    // Listeners are on window, not the canvas: the canvas is pointer-events:none so it can
    // never intercept a click meant for the application.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      // Pointer events are in VIEWPORT space; the grid is in HOST space. The host can be
      // scrolled or offset, so the rect is re-read rather than cached at mount.
      const host = this.canvas.parentElement;
      if (host) {
        const r = host.getBoundingClientRect();
        this.hostLeft = r.left;
        this.hostTop = r.top;
      }
      this.pointerX = e.clientX - this.hostLeft;
      this.pointerY = e.clientY - this.hostTop;
      this.pointerInside = true;
      this.startLoop();
    };
    const onLeave = () => {
      // Do not stop the loop — let the field settle back, then it halts itself.
      this.pointerInside = false;
      this.startLoop();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    this.disposers.push(() => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    });
  }

  // ── Animation loop ────────────────────────────────────────────────────────

  private attachVisibility(): void {
    const onVisibility = () => {
      if (document.hidden) {
        this.stopLoop();
      } else if (this.active.size > 0 || this.pointerInside) {
        this.startLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.disposers.push(() => document.removeEventListener('visibilitychange', onVisibility));
  }

  private startLoop(): void {
    if (this.running || this.staticOnly || document.hidden) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private stopLoop(): void {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private tick = (now: number): void => {
    // Clamped so a backgrounded tab returning does not apply one enormous step.
    const dt = Math.min(now - this.lastTime, 64);
    this.lastTime = now;

    // Halt on STEADY STATE, not on "the pointer left".
    //
    // A parked cursor still has dots lit around it — they are at their target, so nothing is
    // changing, but they are legitimately non-zero. Halting only when the pointer leaves left
    // the loop redrawing identical pixels at 60fps for as long as someone rested their hand
    // on the mouse, which for a background is the worst possible way to spend a frame.
    // pointermove restarts the loop, so stopping here costs nothing.
    if (this.step(dt)) {
      this.stopLoop();
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  // ── Simulation ────────────────────────────────────────────────────────────

  /**
   * Advances one step and repaints the dirty region.
   * Returns true when the field is at STEADY STATE — every dot is within epsilon of its
   * target, whether that target is zero (decayed away) or not (cursor parked on it).
   */
  private step(dt: number): boolean {
    const { spacing, influence, epsilon, tau } = DOT_FIELD;

    // Everything the cursor now touches joins the active set; everything already in it stays
    // until it has decayed, which is what lets dots ease back out rather than snap off.
    if (this.pointerInside) {
      const c0 = Math.max(0, Math.floor((this.pointerX - influence - this.originX) / spacing));
      const c1 = Math.min(this.cols - 1, Math.ceil((this.pointerX + influence - this.originX) / spacing));
      const r0 = Math.max(0, Math.floor((this.pointerY - influence - this.originY) / spacing));
      const r1 = Math.min(this.rows - 1, Math.ceil((this.pointerY + influence - this.originY) / spacing));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) this.active.add(r * this.cols + c);
      }
    }

    if (this.active.size === 0) return true;

    // Exponential approach: frame-rate independent, and it cannot overshoot — which is the
    // whole "damped drawer, never bouncy" rule the rest of the product's motion follows.
    const k = 1 - Math.exp(-dt / tau);

    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    const settledIndices: number[] = [];
    /** Largest remaining distance to target across the field — the steady-state test. */
    let maxDelta = 0;

    for (const index of this.active) {
      const col = index % this.cols;
      const row = (index - col) / this.cols;
      const x = this.originX + col * spacing;
      const y = this.originY + row * spacing;

      let target = 0;
      if (this.pointerInside) {
        const dx = this.pointerX - x;
        const dy = this.pointerY - y;
        const dist = Math.hypot(dx, dy);
        if (dist < influence) target = smooth(1 - dist / influence);
      }

      const delta = Math.abs(target - this.energy[index]);
      if (delta > maxDelta) maxDelta = delta;

      const e = this.energy[index] + (target - this.energy[index]) * k;
      this.energy[index] = e;

      if (e < epsilon && target === 0) {
        this.energy[index] = 0;
        settledIndices.push(index);
      }

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    for (const index of settledIndices) this.active.delete(index);

    // Pad by the largest a dot can get, so a swollen or drifted dot is never clipped.
    const pad = DOT_FIELD.radiusHot + DOT_FIELD.drift + 1;
    this.paintRegion(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);

    return maxDelta < epsilon;
  }

  // ── Renderer ──────────────────────────────────────────────────────────────

  /** Draws the resting grid into the offscreen layer. Called on resize / DPR / theme only. */
  private renderBase(): void {
    const { spacing, radius } = DOT_FIELD;
    const p = this.palette;
    const ctx = this.baseCtx;

    ctx.clearRect(0, 0, this.width, this.height);

    // 1 — page colour, from the app's own theme tokens.
    if (p.background) {
      ctx.fillStyle = p.background;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2 — the soft wash, so the grid has something to sit on rather than a flat fill.
    // Anchored top-centre and wider than it is tall, which reads as light entering the page
    // rather than as a circle someone drew on it.
    const glow = ctx.createRadialGradient(
      this.width / 2, this.height * -0.08, 0,
      this.width / 2, this.height * -0.08, Math.max(this.width, this.height) * 0.9,
    );
    glow.addColorStop(0, `rgba(${p.glow[0]},${p.glow[1]},${p.glow[2]},${p.glowAlpha})`);
    glow.addColorStop(0.62, `rgba(${p.glow[0]},${p.glow[1]},${p.glow[2]},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);

    // 3 — the grid.
    ctx.fillStyle = `rgba(${p.dot[0]},${p.dot[1]},${p.dot[2]},${p.dotAlpha})`;
    // One path for the entire grid, then a single fill — thousands of individual fill calls
    // is what makes naive versions of this expensive.
    ctx.beginPath();
    for (let r = 0; r < this.rows; r++) {
      const y = this.originY + r * spacing;
      for (let c = 0; c < this.cols; c++) {
        const x = this.originX + c * spacing;
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }

  private paintAll(): void {
    this.paintRegion(0, 0, this.width, this.height);
  }

  /** Restores a region from the resting layer, then re-draws the active dots inside it. */
  private paintRegion(rx: number, ry: number, rw: number, rh: number): void {
    const x = Math.max(0, Math.floor(rx));
    const y = Math.max(0, Math.floor(ry));
    const w = Math.min(this.width - x, Math.ceil(rw));
    const h = Math.min(this.height - y, Math.ceil(rh));
    if (w <= 0 || h <= 0) return;

    const ctx = this.ctx;
    const d = this.dpr;

    ctx.clearRect(x, y, w, h);
    // Source coordinates are in the base layer's DEVICE pixels; destination is in CSS pixels
    // because this context carries the DPR transform.
    ctx.drawImage(this.base, x * d, y * d, w * d, h * d, x, y, w, h);

    if (this.active.size === 0) return;

    const { spacing, radius, radiusHot, drift, influence } = DOT_FIELD;
    const p = this.palette;

    for (const index of this.active) {
      const e = this.energy[index];
      if (e <= 0) continue;

      const col = index % this.cols;
      const row = (index - col) / this.cols;
      let px = this.originX + col * spacing;
      let py = this.originY + row * spacing;
      if (px < x - spacing || px > x + w + spacing) continue;
      if (py < y - spacing || py > y + h + spacing) continue;

      // Subtle attraction toward the cursor. Capped well under the 2px brief so the grid
      // reads as magnetic rather than rippling.
      if (this.pointerInside) {
        const dx = this.pointerX - px;
        const dy = this.pointerY - py;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < influence) {
          const pull = (drift * e) / dist;
          px += dx * pull;
          py += dy * pull;
        }
      }

      const r = radius + (radiusHot - radius) * e;
      const a = p.dotAlpha + (p.hotAlpha - p.dotAlpha) * e;
      const cr = Math.round(p.dot[0] + (p.hot[0] - p.dot[0]) * e);
      const cg = Math.round(p.dot[1] + (p.hot[1] - p.dot[1]) * e);
      const cb = Math.round(p.dot[2] + (p.hot[2] - p.dot[2]) * e);

      ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
