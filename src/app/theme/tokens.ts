import type { CSSProperties } from 'react';

/**
 * ============================================================================
 * WiseTech Design Tokens — canonical source of truth.
 * ============================================================================
 * Structure follows Apple HIG (iOS/macOS 26–27 "Liquid Glass"); brand stays
 * WiseTech navy. See repo-root DESIGN_SYSTEM.md for the full spec + migration.
 *
 * This file is intentionally split into TWO sections:
 *
 *   1. NEW canonical system — `makeTokens(mode)` / `tokens`. The final,
 *      Apple-structured, navy-branded token set. Ready for adoption from
 *      Phase 2 onward. Nothing renders from it yet in Phase 1.
 *
 *   2. LEGACY compatibility — `LEGACY_UIKIT` and `LEGACY_CONFIG_*` hold the
 *      exact pre-revamp values. The two old token files
 *      (ui/tokens.ts, configuration/ConfigDesignSystem.ts) are now thin
 *      shims that re-export these, so every existing import keeps working and
 *      NO pixels move in Phase 1. Phase 2 flips each shim from LEGACY_* to the
 *      new tokens, deleting the legacy pins as it goes.
 *
 * Keep framework-agnostic (plain values) so any component can consume it.
 */

export type ThemeMode = 'light' | 'dark';

// ============================================================================
// 1. NEW CANONICAL SYSTEM
// ============================================================================

/**
 * Reduce a hex color's HSL saturation by `amount` (relative, 0–1).
 * Used to tone Apple's vivid system colors ~10% for a calmer enterprise feel
 * while keeping the exact hue — the single place semantic vividness is tuned.
 */
export function desaturate(hex: string, amount: number): string {
  const m = hex.replace('#', '');
  const int = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
  let r = ((int >> 16) & 255) / 255;
  let g = ((int >> 8) & 255) / 255;
  let b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  s = Math.max(0, s * (1 - amount));
  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number): string => {
    const v = Math.round(x * 255).toString(16);
    return v.length === 1 ? '0' + v : v;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

const SEMANTIC_TONE = 0.1; // ~10% desaturation of Apple system colors

// Apple system source colors (light `base`, `dark`, plus WCAG-safe `fg` for
// text on white and `soft` tint). Only `base`/`dark` get toned; `fg`/`soft` are
// authored directly.
const APPLE = {
  success: { base: '#34C759', dark: '#30D158', fg: '#248A3D', soft: '#EBF7EE', softDark: 'rgba(48,209,88,0.16)' },
  warning: { base: '#FF9500', dark: '#FF9F0A', fg: '#B25000', soft: '#FFF4E5', softDark: 'rgba(255,159,10,0.16)' },
  danger: { base: '#FF3B30', dark: '#FF453A', fg: '#C7362C', soft: '#FDECEA', softDark: 'rgba(255,69,58,0.16)' },
  info: { base: '#007AFF', dark: '#0A84FF', fg: '#0058B8', soft: '#E5F1FF', softDark: 'rgba(10,132,255,0.16)' },
} as const;

type SemanticRole = keyof typeof APPLE;

function semanticFor(mode: ThemeMode) {
  const out = {} as Record<SemanticRole, { base: string; fg: string; soft: string }>;
  (Object.keys(APPLE) as SemanticRole[]).forEach((k) => {
    const a = APPLE[k];
    out[k] = {
      base: desaturate(mode === 'dark' ? a.dark : a.base, SEMANTIC_TONE),
      fg: a.fg,
      soft: mode === 'dark' ? a.softDark : a.soft,
    };
  });
  return out;
}

// Categorical accent set — chips/icons only, never status or large surfaces.
const ACCENT = {
  light: {
    indigo: '#5856D6', purple: '#AF52DE', teal: '#30B0C7',
    pink: '#FF2D55', cyan: '#32ADE6', mint: '#00C7BE', yellow: '#FFCC00',
  },
  dark: {
    indigo: '#5E5CE6', purple: '#BF5AF2', teal: '#40C8E0',
    pink: '#FF375F', cyan: '#64D2FF', mint: '#66D4CF', yellow: '#FFD60A',
  },
} as const;

const BRAND = {
  light: {
    brand: '#1E3A8A', brandHover: '#172554', brandActive: '#14204A',
    brandSoft: '#E9EEF8', brandRing: 'rgba(30,58,138,0.16)',
  },
  dark: {
    brand: '#6E9BFF', brandHover: '#8AB0FF', brandActive: '#A8C5FF',
    brandSoft: 'rgba(110,155,255,0.16)', brandRing: 'rgba(110,155,255,0.24)',
  },
} as const;

// Apple label opacity tiers — ink as one hue at four opacities.
const LABEL = {
  light: {
    primary: 'rgba(0,0,0,1)',
    secondary: 'rgba(60,60,67,0.60)',
    tertiary: 'rgba(60,60,67,0.30)',
    quaternary: 'rgba(60,60,67,0.18)',
  },
  dark: {
    primary: 'rgba(255,255,255,1)',
    secondary: 'rgba(235,235,245,0.60)',
    tertiary: 'rgba(235,235,245,0.30)',
    quaternary: 'rgba(235,235,245,0.18)',
  },
} as const;

// Apple neutral fill tiers.
const FILL = {
  light: {
    primary: 'rgba(120,120,128,0.20)',
    secondary: 'rgba(120,120,128,0.16)',
    tertiary: 'rgba(118,118,128,0.12)',
    quaternary: 'rgba(116,116,128,0.08)',
  },
  dark: {
    primary: 'rgba(120,120,128,0.36)',
    secondary: 'rgba(120,120,128,0.32)',
    tertiary: 'rgba(118,118,128,0.24)',
    quaternary: 'rgba(116,116,128,0.18)',
  },
} as const;

const BG = {
  light: { base: '#FFFFFF', sunken: '#F2F2F7', elevated: '#FFFFFF', grouped: '#F2F2F7' },
  dark: { base: '#000000', sunken: '#1C1C1E', elevated: '#2C2C2E', grouped: '#000000' },
} as const;

const FONT_STACK = {
  body: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", system-ui, sans-serif',
  display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", system-ui, sans-serif',
} as const;

// Apple type ramp. Values are unitless px sizes + em tracking; consumers add units.
const TEXT = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: 700, letterSpacing: '-0.03em' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: 700, letterSpacing: '-0.025em' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: 640, letterSpacing: '-0.02em' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: 620, letterSpacing: '-0.015em' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: 600, letterSpacing: '-0.01em' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: 400, letterSpacing: '-0.01em' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: 400, letterSpacing: '-0.006em' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: 400, letterSpacing: '0' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 400, letterSpacing: '0' },
} as const;

// 4pt grid (px numbers).
const SPACE = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 } as const;

// Continuous-corner radii (px numbers).
const RADIUS_N = { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, card: 22, pill: 999 } as const;

// Liquid-Glass material tiers. `thin`/`regular` reuse the shipping kit values
// verbatim; `ultraThin`/`thick` are additive.
const MATERIAL = {
  light: {
    ultraThin: { bg: 'rgba(255,255,255,0.50)', blur: 12, saturate: 150, border: '1px solid rgba(255,255,255,0.45)', highlight: 'inset 0 1px 0 rgba(255,255,255,0.50)', shadow: '0 2px 10px rgba(16,24,40,0.06)', radius: 12, fallbackBg: 'rgba(250,250,252,0.88)' },
    thin: { bg: 'rgba(255,255,255,0.58)', blur: 14, saturate: 150, border: '1px solid rgba(230,233,238,0.70)', highlight: 'inset 0 1px 0 rgba(255,255,255,0.55)', shadow: '0 4px 16px rgba(16,24,40,0.08)', radius: 12, fallbackBg: 'rgba(255,255,255,0.90)' },
    regular: { bg: 'rgba(255,255,255,0.72)', blur: 28, saturate: 190, border: '1px solid rgba(255,255,255,0.55)', highlight: 'inset 0 1px 0 rgba(255,255,255,0.65)', shadow: '0 12px 40px rgba(16,24,40,0.16)', radius: 16, fallbackBg: 'rgba(246,247,249,0.94)' },
    thick: { bg: 'rgba(255,255,255,0.82)', blur: 40, saturate: 200, border: '1px solid rgba(255,255,255,0.60)', highlight: 'inset 0 1px 0 rgba(255,255,255,0.70)', shadow: '0 28px 70px rgba(8,10,18,0.30)', radius: 20, fallbackBg: 'rgba(248,249,251,0.97)' },
    scrim: 'rgba(16,24,40,0.32)', scrimBlur: 4,
  },
  dark: {
    ultraThin: { bg: 'rgba(40,46,58,0.44)', blur: 12, saturate: 150, border: '1px solid rgba(255,255,255,0.07)', highlight: 'inset 0 1px 0 rgba(255,255,255,0.08)', shadow: '0 2px 10px rgba(0,0,0,0.36)', radius: 12, fallbackBg: 'rgba(36,42,54,0.90)' },
    thin: { bg: 'rgba(48,54,66,0.52)', blur: 16, saturate: 160, border: '1px solid rgba(255,255,255,0.08)', highlight: 'inset 0 1px 0 rgba(255,255,255,0.10)', shadow: '0 4px 16px rgba(0,0,0,0.40)', radius: 12, fallbackBg: 'rgba(40,46,58,0.94)' },
    regular: { bg: 'rgba(30,34,44,0.68)', blur: 30, saturate: 180, border: '1px solid rgba(255,255,255,0.10)', highlight: 'inset 0 1px 0 rgba(255,255,255,0.14)', shadow: '0 16px 48px rgba(0,0,0,0.55)', radius: 16, fallbackBg: 'rgba(28,32,42,0.96)' },
    thick: { bg: 'rgba(28,30,38,0.82)', blur: 40, saturate: 200, border: '1px solid rgba(255,255,255,0.12)', highlight: 'inset 0 1px 0 rgba(255,255,255,0.16)', shadow: '0 28px 70px rgba(0,0,0,0.62)', radius: 20, fallbackBg: 'rgba(24,26,34,0.98)' },
    scrim: 'rgba(0,0,0,0.55)', scrimBlur: 4,
  },
} as const;

const MOTION_N = {
  easing: {
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    springSoft: 'cubic-bezier(0.22, 1, 0.36, 1)',
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0.16, 1, 0.3, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  duration: { quick: 150, standard: 200, moderate: 260, emphasized: 360, slow: 480 },
} as const;

const SHADOW = {
  light: {
    xs: '0 1px 2px rgba(16,24,40,0.05)',
    card: '0 1px 2px rgba(16,24,40,0.04), 0 2px 6px rgba(16,24,40,0.06)',
    cardHover: '0 10px 28px rgba(16,24,40,0.12)',
    pop: '0 8px 24px rgba(16,24,40,0.14)',
    modal: '0 28px 70px rgba(8,10,18,0.30)',
  },
  dark: {
    xs: '0 1px 2px rgba(0,0,0,0.40)',
    card: '0 1px 2px rgba(0,0,0,0.40), 0 2px 6px rgba(0,0,0,0.50)',
    cardHover: '0 10px 28px rgba(0,0,0,0.60)',
    pop: '0 8px 24px rgba(0,0,0,0.62)',
    modal: '0 28px 70px rgba(0,0,0,0.70)',
  },
} as const;

/** Build the fully-resolved canonical token set for a theme mode. */
export function makeTokens(mode: ThemeMode = 'light') {
  return {
    mode,
    brand: BRAND[mode],
    semantic: semanticFor(mode),
    accent: ACCENT[mode],
    label: LABEL[mode],
    fill: FILL[mode],
    bg: BG[mode],
    text: TEXT,
    font: FONT_STACK,
    space: SPACE,
    radius: RADIUS_N,
    material: MATERIAL[mode],
    motion: MOTION_N,
    shadow: SHADOW[mode],
  };
}

/** Default (light) canonical tokens. */
export const tokens = makeTokens('light');

export type Tokens = ReturnType<typeof makeTokens>;
export type SemanticColorRole = SemanticRole;
export type AccentTone = keyof typeof ACCENT.light;
export type TextRole = keyof typeof TEXT;
export type SpaceKey = keyof typeof SPACE;
export type RadiusKey = keyof typeof RADIUS_N;

// ============================================================================
// 2. LEGACY COMPATIBILITY  (Phase-1 pins — byte-identical to pre-revamp)
// ============================================================================
// These reproduce the exact objects the two old token files used to define.
// The old files now re-export from here. Do NOT add new tokens below — add to
// the canonical system above. Removed phase-by-phase per DESIGN_SYSTEM.md.

// ─── UI kit (`ui/tokens.ts`) ────────────────────────────────────────────────

export const LEGACY_UIKIT = {
  color: {
    brand: '#1E3A8A',
    brandHover: '#172554',
    brandActive: '#14204A',
    brandSoft: '#E9EEF8',
    brandRing: 'rgba(30, 58, 138, 0.16)',
    // Navy brand gradient (90deg, left→right) — referenced by MaterialHeaderTab.
    brandGradientLeftToRight: 'linear-gradient(90deg, #2C56C4 0%, #1E3A8A 55%, #15265C 100%)',
    accent: '#C0392B',
    accentSoft: '#FBEBE9',

    surface: '#FFFFFF',
    panel: '#F6F7F9',
    panelAlt: '#EFF1F4',
    ink: '#1B2230',
    inkSoft: '#5A6573',
    inkFaint: '#97A1AF',
    line: '#E6E9EE',
    lineSoft: '#F0F2F5',

    success: '#2F7D5F', successSoft: '#EBF4EF',
    danger: '#B23A30', dangerSoft: '#FAEDEB',
    warning: '#A66A2A', warningSoft: '#FAF1E3',
    indigo: '#46499B', indigoSoft: '#EDEEF6',
    cyan: '#2C7385', cyanSoft: '#E9F2F4',
    neutral: '#5A6573', neutralSoft: '#EFF1F4',

    vivid: {
      blue: '#2563eb',
      green: '#16a34a',
      purple: '#7c3aed',
      amber: '#d97706',
      rose: '#e11d48',
      cyan: '#0891b2',
      slate: '#64748b',
    },
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  shadow: {
    xs: '0 1px 2px rgba(16,24,40,0.05)',
    card: '0 1px 2px rgba(16,24,40,0.04), 0 2px 6px rgba(16,24,40,0.06)',
    cardHover: '0 10px 28px rgba(16,24,40,0.12)',
    pop: '0 8px 24px rgba(16,24,40,0.14)',
    modal: '0 28px 70px rgba(8,10,18,0.30)',
  },
  font: {
    family: "'Inter', 'Barlow', system-ui, -apple-system, sans-serif",
  },
  vibrantLabel: {
    light: {
      primary: 'rgba(0,0,0,0.85)',
      secondary: 'rgba(0,0,0,0.50)',
      tertiary: 'rgba(0,0,0,0.26)',
      quaternary: 'rgba(0,0,0,0.12)',
    },
    dark: {
      primary: 'rgba(255,255,255,0.92)',
      secondary: 'rgba(255,255,255,0.55)',
      tertiary: 'rgba(255,255,255,0.28)',
      quaternary: 'rgba(255,255,255,0.12)',
    },
  },
  motion: {
    easing: {
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      springSoft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      decelerate: 'cubic-bezier(0.16, 1, 0.3, 1)',
      accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    },
    duration: { quick: 150, standard: 260, emphasized: 360, slow: 480 },
  },
  glass: {
    light: {
      regular: {
        bg: 'rgba(255,255,255,0.72)',
        blur: 28,
        saturate: 190,
        border: '1px solid rgba(255,255,255,0.55)',
        highlight: 'inset 0 1px 0 rgba(255,255,255,0.65)',
        shadow: '0 12px 40px rgba(16,24,40,0.16)',
        radius: 16,
        fallbackBg: 'rgba(246,247,249,0.94)',
      },
      thin: {
        bg: 'rgba(255,255,255,0.58)',
        blur: 14,
        saturate: 150,
        border: '1px solid rgba(230,233,238,0.70)',
        highlight: 'inset 0 1px 0 rgba(255,255,255,0.55)',
        shadow: '0 4px 16px rgba(16,24,40,0.08)',
        radius: 12,
        fallbackBg: 'rgba(255,255,255,0.90)',
      },
      scrim: 'rgba(16,24,40,0.32)',
      scrimBlur: 4,
    },
    dark: {
      regular: {
        bg: 'rgba(30,34,44,0.68)',
        blur: 30,
        saturate: 180,
        border: '1px solid rgba(255,255,255,0.10)',
        highlight: 'inset 0 1px 0 rgba(255,255,255,0.14)',
        shadow: '0 16px 48px rgba(0,0,0,0.55)',
        radius: 16,
        fallbackBg: 'rgba(28,32,42,0.96)',
      },
      thin: {
        bg: 'rgba(48,54,66,0.52)',
        blur: 16,
        saturate: 160,
        border: '1px solid rgba(255,255,255,0.08)',
        highlight: 'inset 0 1px 0 rgba(255,255,255,0.10)',
        shadow: '0 4px 16px rgba(0,0,0,0.40)',
        radius: 12,
        fallbackBg: 'rgba(40,46,58,0.94)',
      },
      scrim: 'rgba(0,0,0,0.55)',
      scrimBlur: 4,
    },
  },
} as const;

export type SemanticTone = 'brand' | 'success' | 'danger' | 'warning' | 'indigo' | 'cyan' | 'neutral';
export type VividTone = keyof typeof LEGACY_UIKIT.color.vivid;
export type GlassVariant = 'regular' | 'thin';
export type LabelTier = keyof typeof LEGACY_UIKIT.vibrantLabel.light;

/** Resolve a vibrant label color for the current theme mode + tier (macOS opacity tiers). */
export function label(mode: ThemeMode, tier: LabelTier = 'primary'): string {
  return LEGACY_UIKIT.vibrantLabel[mode][tier];
}

/** Resolve the glass token set for a mode + variant. */
export function glassTokens(mode: ThemeMode, variant: GlassVariant) {
  return LEGACY_UIKIT.glass[mode][variant];
}

/** Resolve a semantic tone to its { fg, soft } color pair. */
export function tonePair(tone: SemanticTone): { fg: string; soft: string } {
  const c = LEGACY_UIKIT.color;
  const map: Record<SemanticTone, { fg: string; soft: string }> = {
    brand: { fg: c.brand, soft: c.brandSoft },
    success: { fg: c.success, soft: c.successSoft },
    danger: { fg: c.danger, soft: c.dangerSoft },
    warning: { fg: c.warning, soft: c.warningSoft },
    indigo: { fg: c.indigo, soft: c.indigoSoft },
    cyan: { fg: c.cyan, soft: c.cyanSoft },
    neutral: { fg: c.neutral, soft: c.neutralSoft },
  };
  return map[tone];
}

// ─── Configuration (`ConfigDesignSystem.ts`) ────────────────────────────────

export const LEGACY_CONFIG_C = {
  primary: '#9d4141',
  primaryLight: '#fdf3f4',
  primaryMid: '#b85555',
  primaryShadow: 'rgba(157, 65, 65, 0.15)',
  primaryShadowMd: 'rgba(157, 65, 65, 0.22)',

  success: '#17c964',
  successLight: '#f0fdf4',
  warning: '#f5a623',
  warningLight: '#fffbeb',
  danger: '#f1416c',
  dangerLight: '#fff5f8',
  info: '#0085db',
  infoLight: '#e1f0fa',
  infoShadowMd: 'rgba(0, 133, 219, 0.3)',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
  teal: '#0d9488',
  tealLight: '#f0fdfa',
  amber: '#d97706',
  amberLight: '#fffbeb',

  textPrimary: '#181C32',
  textSecondary: '#7E8299',
  textMuted: '#A1A5B7',
  textInverse: '#ffffff',

  bgPage: '#f7f8fc',
  bgCard: '#ffffff',
  bgSection: '#f8f9fa',
  bgHover: '#f9f9f9',

  border: '#E1E3EA',
  borderFocus: '#9d4141',
  borderDark: '#d1d3e2',

  shadowSm: '0 1px 3px rgba(0,0,0,0.06)',
  shadowCard: '0 4px 16px rgba(0,0,0,0.04)',
  shadowCardHover: '0 8px 28px rgba(0,0,0,0.08)',
  shadowModal: '0 24px 48px rgba(0,0,0,0.12)',
};

export const LEGACY_CONFIG_FONT = {
  heading: "'Barlow', sans-serif",
  body: "'Inter', sans-serif",
};

export const LEGACY_CONFIG_TYPE = {
  pageTitle: {
    fontFamily: LEGACY_CONFIG_FONT.heading,
    fontWeight: 700,
    fontSize: '28px',
    color: LEGACY_CONFIG_C.textPrimary,
    letterSpacing: '-0.5px',
    lineHeight: 1.2,
  } as CSSProperties,

  sectionTitle: {
    fontFamily: LEGACY_CONFIG_FONT.heading,
    fontWeight: 700,
    fontSize: '22px',
    color: LEGACY_CONFIG_C.textPrimary,
    letterSpacing: '-0.3px',
    margin: 0,
  } as CSSProperties,

  cardTitle: {
    fontFamily: LEGACY_CONFIG_FONT.body,
    fontWeight: 600,
    fontSize: '16px',
    color: LEGACY_CONFIG_C.textPrimary,
    margin: 0,
  } as CSSProperties,

  label: {
    fontFamily: LEGACY_CONFIG_FONT.body,
    fontWeight: 600,
    fontSize: '14px',
    color: LEGACY_CONFIG_C.textPrimary,
  } as CSSProperties,

  value: {
    fontFamily: LEGACY_CONFIG_FONT.body,
    fontWeight: 500,
    fontSize: '14px',
    color: LEGACY_CONFIG_C.textSecondary,
  } as CSSProperties,

  caption: {
    fontFamily: LEGACY_CONFIG_FONT.body,
    fontWeight: 500,
    fontSize: '12px',
    color: LEGACY_CONFIG_C.textMuted,
  } as CSSProperties,

  tabActive: {
    fontFamily: LEGACY_CONFIG_FONT.body,
    fontWeight: 600,
    fontSize: '14px',
    color: LEGACY_CONFIG_C.primary,
  } as CSSProperties,

  tabInactive: {
    fontFamily: LEGACY_CONFIG_FONT.body,
    fontWeight: 500,
    fontSize: '14px',
    color: LEGACY_CONFIG_C.textSecondary,
  } as CSSProperties,
};

export const LEGACY_CONFIG_SP = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const LEGACY_CONFIG_RADIUS = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const LEGACY_CONFIG_BTN = {
  primary: {
    backgroundColor: LEGACY_CONFIG_C.primary,
    color: LEGACY_CONFIG_C.textInverse,
    border: 'none',
    borderRadius: LEGACY_CONFIG_RADIUS.md,
    padding: '10px 20px',
    fontFamily: LEGACY_CONFIG_FONT.body,
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: `0 4px 12px ${LEGACY_CONFIG_C.primaryShadow}`,
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  } as CSSProperties,

  secondary: {
    backgroundColor: LEGACY_CONFIG_C.bgCard,
    color: LEGACY_CONFIG_C.textPrimary,
    border: `1px solid ${LEGACY_CONFIG_C.border}`,
    borderRadius: LEGACY_CONFIG_RADIUS.md,
    padding: '10px 20px',
    fontFamily: LEGACY_CONFIG_FONT.body,
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  } as CSSProperties,

  outline: {
    backgroundColor: 'transparent',
    color: LEGACY_CONFIG_C.primary,
    border: `1px solid ${LEGACY_CONFIG_C.primary}`,
    borderRadius: LEGACY_CONFIG_RADIUS.md,
    padding: '8px 18px',
    fontFamily: LEGACY_CONFIG_FONT.body,
    fontWeight: 500,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  } as CSSProperties,

  ghost: {
    backgroundColor: 'transparent',
    color: LEGACY_CONFIG_C.textSecondary,
    border: 'none',
    borderRadius: LEGACY_CONFIG_RADIUS.md,
    padding: '8px 12px',
    fontFamily: LEGACY_CONFIG_FONT.body,
    fontWeight: 500,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  } as CSSProperties,
};

export const LEGACY_CONFIG_MOTION = {
  duration: {
    quick: '150ms',
    standard: '250ms',
    emphasized: '400ms',
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    entrance: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  },
};

export const MIN_TOUCH_TARGET_PX = 44;

export const LEGACY_CONFIG_ICON_COLORS: Record<string, { bg: string; color: string }> = {
  primary: { bg: LEGACY_CONFIG_C.primaryLight, color: LEGACY_CONFIG_C.primary },
  blue: { bg: LEGACY_CONFIG_C.infoLight, color: LEGACY_CONFIG_C.info },
  green: { bg: LEGACY_CONFIG_C.successLight, color: '#16a34a' },
  purple: { bg: LEGACY_CONFIG_C.purpleLight, color: LEGACY_CONFIG_C.purple },
  amber: { bg: LEGACY_CONFIG_C.amberLight, color: LEGACY_CONFIG_C.amber },
  teal: { bg: LEGACY_CONFIG_C.tealLight, color: LEGACY_CONFIG_C.teal },
  danger: { bg: LEGACY_CONFIG_C.dangerLight, color: LEGACY_CONFIG_C.danger },
  warning: { bg: LEGACY_CONFIG_C.warningLight, color: LEGACY_CONFIG_C.warning },
};

export const LEGACY_CONFIG_KEYFRAMES = `
  @keyframes cfgFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cfgSlideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes cfgPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
  .cfg-fade-in  { animation: cfgFadeIn  0.3s ease; }
  .cfg-slide-in { animation: cfgSlideIn 0.25s ease; }

  /* ─── Base: remove browser focus outline on tab buttons ─────────── */
  .cfg-tab-btn { outline: none !important; }
  .cfg-tab-btn:focus { outline: none !important; box-shadow: none !important; }

  /* ─── Responsive: Tablet (≤ 768px) ───────────────────────────────── */
  @media (max-width: 767.98px) {
    .cfg-header-row {
      padding: 18px 16px 8px 16px !important;
      gap: 10px !important;
    }
    .cfg-header-icon {
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
    }
    .cfg-header-icon i { font-size: 17px !important; }
    .cfg-header-title  { font-size: 18px !important; }

    /* ── Pill-style tab bar ── */
    .cfg-tab-bar {
      background: #f1f3f8 !important;
      border-radius: 12px !important;
      border-bottom: none !important;
      padding: 5px !important;
      margin: 12px 16px 16px !important;
      gap: 4px !important;
      flex-wrap: wrap !important;
      overflow-x: visible !important;
    }
    .cfg-tab-btn {
      border-radius: 8px !important;
      padding: 8px 12px !important;
      font-size: 12.5px !important;
      flex: 1 1 auto !important;
      justify-content: center !important;
      white-space: nowrap !important;
      min-width: 0 !important;
    }
    .cfg-tab-btn[data-active="true"] {
      background: #fff !important;
      box-shadow: 0 2px 8px rgba(24,28,50,0.10), 0 1px 3px rgba(24,28,50,0.06) !important;
      border-radius: 8px !important;
      color: #9d4141 !important;
      font-weight: 600 !important;
    }
    .cfg-tab-btn[data-active="false"] {
      background: transparent !important;
      color: #7E8299 !important;
    }
    .cfg-tab-active-line { display: none !important; }

    .cfg-body-wrap { padding: 16px !important; }
    .cfg-section-header { padding: 14px 16px 8px 20px !important; }
    .cfg-settings-row   { padding: 14px 16px !important; }
    .cfg-section-desc {
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
    }
  }

  /* ─── Responsive: Phone (≤ 576px) ────────────────────────────────── */
  @media (max-width: 575.98px) {
    .cfg-header-row {
      padding: 14px 12px 6px 12px !important;
      gap: 8px !important;
    }
    .cfg-header-icon {
      width: 32px !important;
      height: 32px !important;
      min-width: 32px !important;
    }
    .cfg-header-icon i { font-size: 14px !important; }
    .cfg-header-title  { font-size: 15px !important; }
    .cfg-tab-bar   { padding: 4px !important; margin: 10px 12px 14px !important; gap: 3px !important; }
    .cfg-tab-btn   { font-size: 11.5px !important; padding: 7px 10px !important; }
    .cfg-body-wrap { padding: 12px !important; }
    .cfg-section-header {
      padding: 12px 12px 8px 18px !important;
      flex-wrap: wrap !important;
    }
    .cfg-section-actions {
      width: 100% !important;
      flex-shrink: unset !important;
      justify-content: flex-end !important;
    }
    .cfg-settings-row {
      flex-wrap: wrap !important;
      align-items: flex-start !important;
      padding: 12px 12px !important;
    }
    .cfg-row-right {
      width: 100% !important;
      flex-shrink: unset !important;
      justify-content: flex-end !important;
      padding-left: 54px !important;
    }
    .cfg-row-label { white-space: normal !important; overflow: visible !important; }
    .cfg-row-desc  { white-space: normal !important; overflow: visible !important; }
  }

  /* ─── Responsive: Small phone (≤ 400px) ──────────────────────────── */
  @media (max-width: 400px) {
    .cfg-header-title  { font-size: 13px !important; }
    .cfg-tab-bar       { margin: 8px 10px 12px !important; gap: 2px !important; }
    .cfg-tab-btn       { font-size: 11px !important; padding: 6px 8px !important; }
    .cfg-row-right     { padding-left: 46px !important; }
  }
`;
