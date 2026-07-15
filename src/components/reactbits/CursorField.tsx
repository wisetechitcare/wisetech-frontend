import { useEffect, useRef } from "react";

/**
 * CursorField — Antigravity-style interactive particle field.
 *
 * A canvas of small colored "dashes" scattered across the surface. Each dash has
 * a home position; when the pointer comes near, dashes are pushed away (a local
 * gravity/repulsion force) and spring back when it leaves. This is the technique
 * behind antigravity.google's cursor effect — replicated (not cloned) and tuned
 * to the WiseTech palette.
 *
 * Pure canvas 2D — no dependency. Listens on `window` for pointer moves so it
 * reacts everywhere (even behind opaque cards) while staying `pointer-events:none`.
 * Honors `prefers-reduced-motion` (renders a calm static field, no animation).
 */
export interface CursorFieldProps {
  /** dash colors (cycled) */
  colors?: string[];
  /** approx. one dash per this many px² of surface (lower = denser) */
  areaPerParticle?: number;
  /** hard cap on particle count (perf guard) */
  maxParticles?: number;
  /** pointer influence radius in px */
  radius?: number;
  /** push strength */
  force?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface Dash {
  hx: number; // home x
  hy: number; // home y
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  angle: number;
  drift: number; // phase for idle drift
  color: string;
}

const DEFAULT_COLORS = ["#1E3A8A", "#5856D6", "#30B0C7", "#AF52DE", "#FF9500", "#FF3B30"];

const CursorField: React.FC<CursorFieldProps> = ({
  colors = DEFAULT_COLORS,
  areaPerParticle = 9000,
  maxParticles = 260,
  radius = 130,
  force = 0.9,
  className,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let dashes: Dash[] = [];
    const mouse = { x: -9999, y: -9999 };
    // Smoothed pointer — eases toward the real pointer each frame so the field
    // reacts fluidly (this is what makes it feel "smooth" like antigravity).
    const sm = { x: -9999, y: -9999 };
    let raf = 0;
    let t = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const build = () => {
      const parent = canvas.parentElement;
      const rect = parent
        ? parent.getBoundingClientRect()
        : { width: window.innerWidth, height: window.innerHeight };
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(maxParticles, Math.round((width * height) / areaPerParticle));
      dashes = Array.from({ length: count }, () => {
        const hx = Math.random() * width;
        const hy = Math.random() * height;
        return {
          hx,
          hy,
          x: hx,
          y: hy,
          vx: 0,
          vy: 0,
          len: rand(6, 14),
          angle: rand(0, Math.PI),
          drift: rand(0, Math.PI * 2),
          color: colors[Math.floor(Math.random() * colors.length)],
        };
      });
    };

    const drawDash = (d: Dash, alpha: number) => {
      const cos = Math.cos(d.angle);
      const sin = Math.sin(d.angle);
      const hl = d.len / 2;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(d.x - cos * hl, d.y - sin * hl);
      ctx.lineTo(d.x + cos * hl, d.y + sin * hl);
      ctx.stroke();
    };

    const renderStatic = () => {
      ctx.clearRect(0, 0, width, height);
      dashes.forEach((d) => drawDash(d, 0.5));
      ctx.globalAlpha = 1;
    };

    const frame = () => {
      t += 0.005;
      // ease the smoothed pointer toward the real one — the core of the "smooth" feel
      if (mouse.x < -9000) {
        sm.x = mouse.x;
        sm.y = mouse.y;
      } else {
        sm.x += (mouse.x - sm.x) * 0.12;
        sm.y += (mouse.y - sm.y) * 0.12;
      }

      ctx.clearRect(0, 0, width, height);
      for (const d of dashes) {
        // very subtle idle drift around home (dashes stay mostly still)
        const targetX = d.hx + Math.sin(t + d.drift) * 1.4;
        const targetY = d.hy + Math.cos(t * 0.8 + d.drift) * 1.4;

        // pointer repulsion using the smoothed pointer, soft (eased) falloff
        const dx = d.x - sm.x;
        const dy = d.y - sm.y;
        const dist = Math.hypot(dx, dy);
        if (dist < radius && dist > 0.001) {
          const n = (radius - dist) / radius;
          const push = n * n * force; // quadratic → gentle near the edge
          d.vx += (dx / dist) * push;
          d.vy += (dy / dist) * push;
        }

        // gentle spring back home + high damping = smooth settle
        d.vx += (targetX - d.x) * 0.016;
        d.vy += (targetY - d.y) * 0.016;
        d.vx *= 0.9;
        d.vy *= 0.9;
        d.x += d.vx;
        d.y += d.vy;

        const speed = Math.hypot(d.vx, d.vy);
        drawDash(d, Math.min(0.82, 0.4 + speed * 0.14));
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    build();
    if (reduce) {
      renderStatic();
    } else {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseout", onLeave);
      raf = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(() => {
      build();
      if (reduce) renderStatic();
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      ro.disconnect();
    };
  }, [colors, areaPerParticle, maxParticles, radius, force]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
};

export default CursorField;
