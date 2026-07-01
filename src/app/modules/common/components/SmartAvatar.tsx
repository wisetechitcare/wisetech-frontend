import React, { useEffect, useMemo, useState } from "react";

/**
 * SmartAvatar — a premium, brand-aware avatar for companies/contacts.
 *
 * - With a logo/photo: extracts the dominant colour (cached) and wraps it in a
 *   subtle gradient brand ring. Falls back to a neutral premium ring if extraction
 *   fails (e.g. CORS-tainted image).
 * - Without one: deterministically generates a unique premium gradient + geometric
 *   pattern + initials avatar from the id/name.
 * - Optional status dot and an onDominantColor callback.
 */

export type AvatarStatus = "active" | "inactive" | "verified" | "premium";

type BrandPalette = {
  primary: string;
  secondary: string;
};

interface Props {
  name?: string | null;
  id?: string | null;
  imageUrl?: string | null;
  size?: number;
  status?: AvatarStatus | null;
  imageFit?: "contain" | "cover";
  /** Fired once with the resolved brand colour ("r, g, b") for header tinting. */
  onDominantColor?: (rgb: string) => void;
  className?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const colorCache = new Map<string, BrandPalette | null>();

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
  active: "#10b981",    // Emerald 500
  inactive: "#64748b",  // Slate 500
  verified: "#3b82f6",  // Blue 500
  premium: "#8b5cf6",   // Violet 500
};

// Curated premium SaaS gradient palettes
const PREMIUM_GRADIENTS = [
  { from: "#1e293b", to: "#0f172a", ringStart: "#475569", ringEnd: "#334155", text: "#f8fafc" }, // Slate/Graphite
  { from: "#312e81", to: "#1e1b4b", ringStart: "#6366f1", ringEnd: "#4f46e5", text: "#f5f3ff" }, // Indigo
  { from: "#164e63", to: "#083344", ringStart: "#06b6d4", ringEnd: "#0891b2", text: "#ecfeff" }, // Cyan
  { from: "#115e59", to: "#042f2e", ringStart: "#14b8a6", ringEnd: "#0d9488", text: "#f0fdfa" }, // Teal
  { from: "#14532d", to: "#052e16", ringStart: "#22c55e", ringEnd: "#16a34a", text: "#f0fdf4" }, // Green
  { from: "#7c2d12", to: "#431407", ringStart: "#f97316", ringEnd: "#ea580c", text: "#fff7ed" }, // Terracotta
  { from: "#581c87", to: "#2e1065", ringStart: "#a855f7", ringEnd: "#9333ea", text: "#faf5ff" }, // Purple
  { from: "#1e3a8a", to: "#172554", ringStart: "#3b82f6", ringEnd: "#2563eb", text: "#eff6ff" }, // Blue
  { from: "#701a75", to: "#4a044e", ringStart: "#d946ef", ringEnd: "#c084fc", text: "#faf5ff" }, // Plum
  { from: "#854d0e", to: "#422006", ringStart: "#eab308", ringEnd: "#ca8a04", text: "#fef9c3" }, // Gold
  { from: "#9f1239", to: "#4c0519", ringStart: "#f43f5e", ringEnd: "#e11d48", text: "#fff1f2" }, // Crimson
  { from: "#3f3f46", to: "#18181b", ringStart: "#71717a", ringEnd: "#52525b", text: "#fafafa" }, // Zinc
];

const getPremiumPalette = (seed: string) => {
  const h = hashStr(seed);
  const idx = h % PREMIUM_GRADIENTS.length;
  return PREMIUM_GRADIENTS[idx];
};

const renderGeometricPattern = (seed: string, opacity = 0.08) => {
  const h = hashStr(seed);
  const patternIndex = h % 4;
  
  switch (patternIndex) {
    case 0: // Concentric & Crosshair
      return (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, color: "inherit" }} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1" />
          <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="1" />
          <circle cx="50" cy="50" r="14" stroke="currentColor" strokeWidth="1" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
    case 1: // Grid Pattern
      return (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, color: "inherit" }} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,25 L100,25 M0,50 L100,50 M0,75 L100,75 M25,0 L25,100 M50,0 L50,100 M75,0 L75,100" stroke="currentColor" strokeWidth="1" />
          <path d="M0,0 L100,100 M100,0 L0,100" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      );
    case 2: // Intersecting Arcs
      return (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, color: "inherit" }} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="0" cy="0" r="50" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="0" r="50" stroke="currentColor" strokeWidth="1" />
          <circle cx="0" cy="100" r="50" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="1" />
          <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
    case 3: // Diagonal Facets
    default:
      return (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, color: "inherit" }} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="1" />
          <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1" />
          <line x1="50" y1="0" x2="100" y2="50" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="50" x2="50" y2="100" stroke="currentColor" strokeWidth="1" />
          <line x1="50" y1="0" x2="0" y2="50" stroke="currentColor" strokeWidth="1" />
          <line x1="100" y1="50" x2="50" y2="100" stroke="currentColor" strokeWidth="1" />
        </svg>
      );
  }
};

const averageRgb = (pixels: Array<[number, number, number]>): [number, number, number] => {
  const total = pixels.reduce<[number, number, number]>(
    (acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b],
    [0, 0, 0]
  );
  return [
    Math.round(total[0] / pixels.length),
    Math.round(total[1] / pixels.length),
    Math.round(total[2] / pixels.length),
  ];
};

const rgbDistance = (a: [number, number, number], b: [number, number, number]): number => {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
};

const softenRgb = ([r, g, b]: [number, number, number], amount: number): [number, number, number] => [
  Math.round(r + (248 - r) * amount),
  Math.round(g + (248 - g) * amount),
  Math.round(b + (248 - b) * amount),
];

const muteRgb = ([r, g, b]: [number, number, number]): [number, number, number] => {
  const avg = (r + g + b) / 3;
  const mix = 0.35; // slightly more muted for premium feel
  return [
    Math.round((r * (1 - mix)) + (avg * mix)),
    Math.round((g * (1 - mix)) + (avg * mix)),
    Math.round((b * (1 - mix)) + (avg * mix)),
  ];
};

const formatRgb = ([r, g, b]: [number, number, number]): string => `${r}, ${g}, ${b}`;

// Extract muted representative colors from salient logo pixels.
const extractBrandPalette = (url: string): Promise<BrandPalette | null> =>
  new Promise((resolve) => {
    if (colorCache.has(url)) return resolve(colorCache.get(url)!);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const s = 18;
        const canvas = document.createElement("canvas");
        canvas.width = s;
        canvas.height = s;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.drawImage(img, 0, 0, s, s);
        const { data } = ctx.getImageData(0, 0, s, s);
        const pixels: Array<[number, number, number]> = [];
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue; // skip transparent
          const cr = data[i], cg = data[i + 1], cb = data[i + 2];
          const max = Math.max(cr, cg, cb), min = Math.min(cr, cg, cb);
          if (max > 245 && min > 245) continue; // skip near-white
          if (max < 18) continue; // skip near-black
          pixels.push([cr, cg, cb]);
        }
        if (!pixels.length) throw new Error("no salient pixels");

        const primary = averageRgb(pixels);
        const secondaryPixels = pixels.filter((pixel) => rgbDistance(pixel, primary) > 42);
        const secondary = secondaryPixels.length > Math.max(4, pixels.length * 0.08)
          ? averageRgb(secondaryPixels)
          : softenRgb(primary, 0.78);
        const palette = {
          primary: formatRgb(muteRgb(primary)),
          secondary: formatRgb(muteRgb(secondary)),
        };
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

const SmartAvatar: React.FC<Props> = ({
  name,
  id,
  imageUrl,
  size = 56,
  status,
  imageFit = "contain",
  onDominantColor,
  className,
}) => {
  const cleanImageUrl = imageUrl?.trim() || null;
  const [imageFailed, setImageFailed] = useState(false);
  const [brandPalette, setBrandPalette] = useState<BrandPalette | null>(() =>
    cleanImageUrl ? colorCache.get(cleanImageUrl) ?? null : null
  );

  const seed = (id || name || "company").toString();
  const palette = useMemo(() => getPremiumPalette(seed), [seed]);
  const initials = useMemo(() => getInitials(name), [name]);
  const hasImage = Boolean(cleanImageUrl && !imageFailed);

  useEffect(() => {
    setImageFailed(false);
    setBrandPalette(cleanImageUrl ? colorCache.get(cleanImageUrl) ?? null : null);
  }, [cleanImageUrl]);

  useEffect(() => {
    let alive = true;
    if (cleanImageUrl && !imageFailed) {
      extractBrandPalette(cleanImageUrl).then((palette) => {
        if (!alive) return;
        setBrandPalette(palette);
        if (palette && onDominantColor) onDominantColor(palette.primary);
      });
    } else if (onDominantColor) {
      // No logo → tint from the generated palette's primary.
      const rgb = hexToRgb(palette.from);
      if (rgb) onDominantColor(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanImageUrl, imageFailed, seed]);

  const safeSize = Math.max(28, size);
  const thickness = 2.5; // Thin, professional gradient border (approx 2-3px)

  // Ring: extracted brand color (logo) → neutral premium fallback; palette (no logo).
  const ring = hasImage
    ? brandPalette
      ? `linear-gradient(135deg, rgba(${brandPalette.primary}, 0.8), rgba(${brandPalette.secondary}, 0.5))`
      : "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)" // Premium neutral silver/platinum fallback
    : `linear-gradient(135deg, ${palette.ringStart}, ${palette.ringEnd})`;

  const badge = status ? STATUS_COLORS[status] : null;
  const innerPadding = hasImage && imageFit === "contain" ? Math.max(3, Math.round(safeSize * 0.08)) : 0;
  const label = `${name || "Record"} avatar${status ? `, ${status}` : ""}`;

  return (
    <div
      className={className}
      role="img"
      aria-label={label}
      title={name || undefined}
      style={{
        position: "relative",
        width: safeSize,
        height: safeSize,
        borderRadius: "50%",
        padding: thickness,
        background: ring,
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)", // Soft, minimal depth
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          overflow: "hidden",
          background: hasImage
            ? "linear-gradient(145deg, #ffffff, #f8fafc)"
            : `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: innerPadding,
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
          position: "relative",
        }}
      >
        {/* Subtle geometric pattern overlay for intelligent default avatar */}
        {!hasImage && renderGeometricPattern(seed, 0.12)}

        {hasImage ? (
          <img
            src={cleanImageUrl || undefined}
            alt=""
            onError={() => setImageFailed(true)}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: imageFit,
              objectPosition: "center",
              display: "block",
              borderRadius: imageFit === "cover" ? "50%" : 0,
              filter: imageFit === "contain" ? "saturate(1.02) contrast(1.01)" : undefined,
            }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: palette.text,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              fontSize: safeSize * 0.35,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {badge && (
        <span
          title={status || undefined}
          style={{
            position: "absolute",
            right: Math.round(safeSize * 0.01),
            bottom: Math.round(safeSize * 0.01),
            width: Math.max(10, Math.round(safeSize * 0.2)),
            height: Math.max(10, Math.round(safeSize * 0.2)),
            borderRadius: "50%",
            background: badge,
            border: `${Math.max(2, Math.round(safeSize * 0.035))}px solid #fff`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        />
      )}
    </div>
  );
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export default SmartAvatar;

// Small HSL→"r, g, b" helper (so the header tint can reuse the same hue).
function hslToRgb(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `${Math.round(f(0) * 255)}, ${Math.round(f(8) * 255)}, ${Math.round(f(4) * 255)}`;
}

export default SmartAvatar;
