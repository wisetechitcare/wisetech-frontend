import React from "react";

/**
 * Animated golden gradient border for the rank-1 podium card.
 *
 * Uses the injected-<style> technique (as in MonthlySalaryComparison.tsx) to
 * register a single keyframe globally, then exposes a wrapper style. We animate
 * `background-position` on a linear-gradient (not conic + @property, which has
 * Safari gaps). Under reduced motion the caller passes `animate=false` and the
 * gradient stays static — rank 1 is still visually distinguished.
 */
const STYLE_ID = "wt-gold-sheen-keyframes";
const KEYFRAMES = `
@keyframes wt-gold-sheen {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}`;

export function ensureGoldenBorderKeyframes(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
}

/** Outer wrapper style — the animated gold "border" (3px gradient frame). */
export function goldenBorderWrapperStyle(animate: boolean): React.CSSProperties {
  return {
    padding: "3px",
    borderRadius: "20px",
    background: "linear-gradient(90deg,#FFD700,#FDE68A,#B8860B,#FFD700)",
    backgroundSize: "200% 100%",
    animation: animate ? "wt-gold-sheen 3s linear infinite" : "none",
    boxShadow: "0 8px 28px rgba(255,215,0,0.35)",
  };
}

// Medal gradients for the personalized container border (gold / silver / bronze).
const MEDAL_GRADIENT: Record<number, string> = {
  1: "linear-gradient(90deg,#FFD700,#FDE68A,#B8860B,#FFD700)",
  2: "linear-gradient(90deg,#B8BCC4,#EDEFF2,#8A8D94,#B8BCC4)",
  3: "linear-gradient(90deg,#CD7F32,#E8B478,#8C5A2B,#CD7F32)",
};
const MEDAL_GLOW: Record<number, string> = {
  1: "rgba(255,215,0,0.35)",
  2: "rgba(168,169,173,0.35)",
  3: "rgba(205,127,50,0.35)",
};

/**
 * Animated moving border for the whole Top Performers container, coloured by the
 * logged-in user's own rank (1 gold, 2 silver, 3 bronze). Wrap the card in a div
 * with this style; the inner card sits on white so the moving gradient reads as a
 * border frame.
 */
export function movingBorderStyle(rank: number, animate: boolean): React.CSSProperties {
  return {
    padding: "4px",
    borderRadius: "14px",
    background: MEDAL_GRADIENT[rank] ?? MEDAL_GRADIENT[1],
    backgroundSize: "200% 100%",
    animation: animate ? "wt-gold-sheen 3.5s linear infinite" : "none",
    boxShadow: `0 8px 30px ${MEDAL_GLOW[rank] ?? MEDAL_GLOW[1]}`,
  };
}

// ── Roaming glow border ────────────────────────────────────────────────────────
// A bright arc of light that travels AROUND the container's perimeter, using an
// animated conic-gradient border (via the CSS `--angle` custom property). The
// arc's colour is the logged-in user's medal (gold / silver / bronze).
const GLOW_STYLE_ID = "wt-glow-border-styles";
const GLOW_CSS = `
@property --wt-glow-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes wt-glow-rotate { to { --wt-glow-angle: 360deg; } }
.wt-glow-border {
  position: relative;
  border: 3px solid transparent;
  border-radius: 16px;
  background:
    linear-gradient(#ffffff,#ffffff) padding-box,
    conic-gradient(from var(--wt-glow-angle),
      var(--wt-glow-dim) 0deg,
      var(--wt-glow-bright) 28deg,
      #ffffff 42deg,
      var(--wt-glow-dim) 70deg,
      var(--wt-glow-dim) 360deg) border-box;
  animation: wt-glow-rotate 3.2s linear infinite;
  box-shadow: 0 0 22px var(--wt-glow-shadow);
}
@media (prefers-reduced-motion: reduce) {
  .wt-glow-border { animation: none; }
}`;

export function ensureGlowBorderStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(GLOW_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = GLOW_STYLE_ID;
  el.textContent = GLOW_CSS;
  document.head.appendChild(el);
}

const GLOW_COLORS: Record<number, { bright: string; dim: string; shadow: string }> = {
  1: { bright: "#FFD700", dim: "rgba(255,215,0,0.20)", shadow: "rgba(255,215,0,0.40)" },
  2: { bright: "#D9DDE3", dim: "rgba(168,169,173,0.22)", shadow: "rgba(168,169,173,0.38)" },
  3: { bright: "#CD7F32", dim: "rgba(205,127,50,0.22)", shadow: "rgba(205,127,50,0.36)" },
};

/** Inline CSS custom-property values that colour the `.wt-glow-border` class per rank. */
export function glowBorderVars(rank: number): React.CSSProperties {
  const c = GLOW_COLORS[rank] ?? GLOW_COLORS[1];
  return {
    "--wt-glow-bright": c.bright,
    "--wt-glow-dim": c.dim,
    "--wt-glow-shadow": c.shadow,
  } as React.CSSProperties;
}
