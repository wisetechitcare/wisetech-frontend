import React, { useEffect, useMemo, useState } from "react";

/**
 * SmartAvatar — premium, brand-aware avatar for companies and contacts.
 *
 * With a logo/photo: extracts one or two dominant colors (cached, muted for
 * professionalism) and wraps it in a thin gradient ring. Falls back to a
 * neutral silver/platinum ring on CORS-tainted images.
 *
 * Without a logo: deterministically generates a unique premium avatar per
 * company from its id/name — consistent hash → curated dark gradient palette
 * + subtle geometric SVG accent + initials. Feels designed, not placeholder.
 *
 * Static, no hover/animation effects. Fires onDominantColor once for optional
 * very-subtle header tinting by the parent.
 */

export type AvatarStatus = "active" | "inactive" | "verified" | "premium";

type BrandPalette = { primary: string; secondary: string };

interface Props {
  name?: string | null;
  id?: string | null;
  imageUrl?: string | null;
  size?: number;
  status?: AvatarStatus | null;
  imageFit?: "contain" | "cover";
  /** Fired once with "r, g, b" for optional header tinting by the parent. */
  onDominantColor?: (rgb: string) => void;
  className?: string;
}

// ── module-level cache (persists across re-renders & re-mounts) ───────────────
const colorCache = new Map<string, BrandPalette | null>();

// ── FNV-1a hash (deterministic, fast, good distribution) ─────────────────────
const hashStr = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const getInitials = (name?: string | null): string => {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const clean = (w: string) => (w.match(/[A-Za-z0-9]/)?.[0] || "").toUpperCase();
  if (words.length === 1) {
    const letters = words[0].replace(/[^A-Za-z0-9]/g, "");
    return (letters.slice(0, 2) || letters.slice(0, 1) || "?").toUpperCase();
  }
  return (clean(words[0]) + clean(words[1])) || "?";
};

const STATUS_COLORS: Record<AvatarStatus, string> = {
  active:   "#10b981", // Emerald 500
  inactive: "#64748b", // Slate 500
  verified: "#3b82f6", // Blue 500
  premium:  "#8b5cf6", // Violet 500
};

// ── Curated premium SaaS-grade dark gradient palettes ────────────────────────
// Each entry: gradient fill + ring accent colors + text color for initials.
const PREMIUM_GRADIENTS = [
  { from: "#1e293b", to: "#0f172a", ringA: "#475569", ringB: "#334155", text: "#f8fafc" }, // Graphite/Slate
  { from: "#312e81", to: "#1e1b4b", ringA: "#6366f1", ringB: "#4f46e5", text: "#f5f3ff" }, // Indigo
  { from: "#164e63", to: "#083344", ringA: "#06b6d4", ringB: "#0891b2", text: "#ecfeff" }, // Cyan
  { from: "#115e59", to: "#042f2e", ringA: "#14b8a6", ringB: "#0d9488", text: "#f0fdfa" }, // Teal
  { from: "#14532d", to: "#052e16", ringA: "#22c55e", ringB: "#16a34a", text: "#f0fdf4" }, // Forest
  { from: "#7c2d12", to: "#431407", ringA: "#f97316", ringB: "#ea580c", text: "#fff7ed" }, // Terracotta
  { from: "#581c87", to: "#2e1065", ringA: "#a855f7", ringB: "#9333ea", text: "#faf5ff" }, // Purple
  { from: "#1e3a8a", to: "#172554", ringA: "#3b82f6", ringB: "#2563eb", text: "#eff6ff" }, // Navy
  { from: "#701a75", to: "#4a044e", ringA: "#d946ef", ringB: "#c084fc", text: "#faf5ff" }, // Plum
  { from: "#854d0e", to: "#422006", ringA: "#eab308", ringB: "#ca8a04", text: "#fef9c3" }, // Gold
  { from: "#9f1239", to: "#4c0519", ringA: "#f43f5e", ringB: "#e11d48", text: "#fff1f2" }, // Crimson
  { from: "#3f3f46", to: "#18181b", ringA: "#71717a", ringB: "#52525b", text: "#fafafa" }, // Zinc
];

const getPremiumPalette = (seed: string) => PREMIUM_GRADIENTS[hashStr(seed) % PREMIUM_GRADIENTS.length];

// ── Geometric SVG accent (4 styles, deterministic by seed) ───────────────────
const GeometricAccent: React.FC<{ seed: string }> = ({ seed }) => {
  const idx = hashStr(seed) % 4;
  const shared: React.CSSProperties = {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    opacity: 0.1, color: "currentColor",
  };
  if (idx === 0) return (
    <svg style={shared} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="27" stroke="currentColor" strokeWidth="1.2" />
      <line x1="50" y1="8"  x2="50"  y2="92" stroke="currentColor" strokeWidth="1" />
      <line x1="8"  y1="50" x2="92"  y2="50" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
  if (idx === 1) return (
    <svg style={shared} viewBox="0 0 100 100" fill="none">
      <path d="M0,25 L100,25 M0,50 L100,50 M0,75 L100,75 M25,0 L25,100 M50,0 L50,100 M75,0 L75,100" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
  if (idx === 2) return (
    <svg style={shared} viewBox="0 0 100 100" fill="none">
      <circle cx="0"   cy="0"   r="55" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="100" cy="0"   r="55" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="0"   cy="100" r="55" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="100" cy="100" r="55" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
  return (
    <svg style={shared} viewBox="0 0 100 100" fill="none">
      <line x1="0"  y1="0"  x2="100" y2="100" stroke="currentColor" strokeWidth="1" />
      <line x1="100" y1="0" x2="0"   y2="100" stroke="currentColor" strokeWidth="1" />
      <line x1="50" y1="0"  x2="100" y2="50"  stroke="currentColor" strokeWidth="1" />
      <line x1="0"  y1="50" x2="50"  y2="100" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
};

// ── Color helpers ─────────────────────────────────────────────────────────────
type Rgb = [number, number, number];

const avgRgb = (px: Rgb[]): Rgb => {
  const t = px.reduce<Rgb>((a, [r, g, b]) => [a[0] + r, a[1] + g, a[2] + b], [0, 0, 0]);
  return [Math.round(t[0] / px.length), Math.round(t[1] / px.length), Math.round(t[2] / px.length)];
};

const dist = (a: Rgb, b: Rgb): number => {
  const [dr, dg, db] = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

// Push color toward #f8f8f8 (lighten/soften).
const soften = ([r, g, b]: Rgb, t: number): Rgb => [
  Math.round(r + (248 - r) * t),
  Math.round(g + (248 - g) * t),
  Math.round(b + (248 - b) * t),
];

// Mix with grey to desaturate — keeps colors recognisable without being gaudy.
const mute = ([r, g, b]: Rgb): Rgb => {
  const avg = (r + g + b) / 3;
  const mix = 0.32;
  return [
    Math.round(r * (1 - mix) + avg * mix),
    Math.round(g * (1 - mix) + avg * mix),
    Math.round(b * (1 - mix) + avg * mix),
  ];
};

const fmtRgb = ([r, g, b]: Rgb) => `${r}, ${g}, ${b}`;

const hexToRgb = (hex: string): Rgb | null => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
};

// Extract two muted representative colors from logo pixels via canvas.
const extractBrandPalette = (url: string): Promise<BrandPalette | null> =>
  new Promise((resolve) => {
    if (colorCache.has(url)) return resolve(colorCache.get(url)!);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const S = 20;
        const cv = document.createElement("canvas");
        cv.width = S; cv.height = S;
        const ctx = cv.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.drawImage(img, 0, 0, S, S);
        const { data } = ctx.getImageData(0, 0, S, S);
        const pixels: Rgb[] = [];
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;                         // transparent
          const [cr, cg, cb] = [data[i], data[i + 1], data[i + 2]];
          if (Math.max(cr, cg, cb) > 245 && Math.min(cr, cg, cb) > 240) continue; // near-white
          if (Math.max(cr, cg, cb) < 15) continue;                 // near-black
          pixels.push([cr, cg, cb]);
        }
        if (!pixels.length) throw new Error("no salient pixels");
        const primary = avgRgb(pixels);
        const secondaryPool = pixels.filter((p) => dist(p, primary) > 45);
        const secondary = secondaryPool.length > Math.max(4, pixels.length * 0.08)
          ? avgRgb(secondaryPool)
          : soften(primary, 0.72);
        const palette: BrandPalette = { primary: fmtRgb(mute(primary)), secondary: fmtRgb(mute(secondary)) };
        colorCache.set(url, palette);
        resolve(palette);
      } catch {
        colorCache.set(url, null);
        resolve(null);
      }
    };
    img.onerror = () => { colorCache.set(url, null); resolve(null); };
    img.src = url;
  });

// ── Component ─────────────────────────────────────────────────────────────────
const SmartAvatar: React.FC<Props> = ({
  name, id, imageUrl, size = 56, status, imageFit = "contain",
  onDominantColor, className,
}) => {
  const cleanUrl = imageUrl?.trim() || null;
  const [imageFailed, setImageFailed] = useState(false);
  const [brand, setBrand] = useState<BrandPalette | null>(() =>
    cleanUrl ? colorCache.get(cleanUrl) ?? null : null
  );

  const seed = (id || name || "company").toString();
  const palette = useMemo(() => getPremiumPalette(seed), [seed]);
  const initials = useMemo(() => getInitials(name), [name]);
  const hasImage = Boolean(cleanUrl && !imageFailed);

  useEffect(() => {
    setImageFailed(false);
    setBrand(cleanUrl ? colorCache.get(cleanUrl) ?? null : null);
  }, [cleanUrl]);

  useEffect(() => {
    let alive = true;
    if (cleanUrl && !imageFailed) {
      extractBrandPalette(cleanUrl).then((p) => {
        if (!alive) return;
        setBrand(p);
        if (p && onDominantColor) onDominantColor(p.primary);
      });
    } else if (onDominantColor) {
      const rgb = hexToRgb(palette.from);
      if (rgb) onDominantColor(fmtRgb(rgb));
    }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanUrl, imageFailed, seed]);

  const sz = Math.max(28, size);
  const ring = hasImage
    ? brand
      ? `linear-gradient(135deg, rgba(${brand.primary}, 0.82), rgba(${brand.secondary}, 0.52))`
      : "linear-gradient(135deg, #e2e8f0, #cbd5e1 50%, #94a3b8)"
    : `linear-gradient(135deg, ${palette.ringA}, ${palette.ringB})`;

  const badge = status ? STATUS_COLORS[status] : null;

  // Contain-mode logos get a small inset so the image doesn't press against the ring.
  const innerPad = hasImage && imageFit === "contain" ? Math.max(3, Math.round(sz * 0.08)) : 0;

  // Badge dimensions — large enough to be legible at small table sizes.
  const badgeSz = Math.max(11, Math.round(sz * 0.24));
  const badgeBorder = Math.max(2, Math.round(sz * 0.04));

  return (
    <div
      className={className}
      role="img"
      aria-label={`${name || "Record"} avatar${status ? `, ${status}` : ""}`}
      title={name || undefined}
      style={{
        position: "relative",
        width: sz,
        height: sz,
        borderRadius: "50%",           // always circular
        padding: 2.5,
        background: ring,
        flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",          // inner circle
          overflow: "hidden",
          background: hasImage
            ? "#ffffff"
            : `linear-gradient(140deg, ${palette.from}, ${palette.to})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: innerPad,
          position: "relative",
        }}
      >
        {!hasImage && <GeometricAccent seed={seed} />}

        {hasImage ? (
          <img
            src={cleanUrl || undefined}
            alt=""
            onError={() => setImageFailed(true)}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: imageFit,      // "contain" keeps logo uncropped; "cover" fills profile photos
              objectPosition: "center",
              display: "block",
            }}
          />
        ) : (
          <span
            aria-hidden
            style={{
              position: "relative",
              zIndex: 1,
              color: palette.text,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              fontSize: sz * 0.34,
              fontFamily: "Inter, system-ui, sans-serif",
              lineHeight: 1,
            }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Status badge — sits at the bottom-right corner, outside the inner circle */}
      {badge && (
        <span
          title={status || undefined}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: badgeSz,
            height: badgeSz,
            borderRadius: "50%",
            background: badge,
            border: `${badgeBorder}px solid #fff`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
};

export default SmartAvatar;
