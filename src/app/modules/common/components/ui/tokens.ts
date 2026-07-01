/**
 * Design tokens for the premium UI kit.
 * Single source of truth for color, spacing, radius, shadow and type.
 * Keep this framework-agnostic (plain values) so any component can consume it.
 */
export const T = {
  color: {
    // Brand — navy blue (logo "WISE") as primary, red (logo "TECH") as accent.
    brand: '#1E3A8A',
    brandHover: '#172554',
    brandActive: '#14204A',
    brandSoft: '#E9EEF8',
    brandRing: 'rgba(30, 58, 138, 0.16)',
    // Accent — brand red (logo "TECH"); used for the header stripe & highlights.
    accent: '#C0392B',
    accentSoft: '#FBEBE9',

    // Surfaces & ink — cool slate neutrals
    surface: '#FFFFFF',
    panel: '#F6F7F9',
    panelAlt: '#EFF1F4',
    ink: '#1B2230',
    inkSoft: '#5A6573',
    inkFaint: '#97A1AF',
    line: '#E6E9EE',
    lineSoft: '#F0F2F5',

    // Semantic (fg / soft-bg pairs) — desaturated for a calmer, restrained look
    success: '#2F7D5F', successSoft: '#EBF4EF',
    danger: '#B23A30', dangerSoft: '#FAEDEB',
    warning: '#A66A2A', warningSoft: '#FAF1E3',
    indigo: '#46499B', indigoSoft: '#EDEEF6',
    cyan: '#2C7385', cyanSoft: '#E9F2F4',
    neutral: '#5A6573', neutralSoft: '#EFF1F4',
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
} as const;

export type SemanticTone = 'brand' | 'success' | 'danger' | 'warning' | 'indigo' | 'cyan' | 'neutral';

/** Resolve a semantic tone to its { fg, soft } color pair. */
export function tonePair(tone: SemanticTone): { fg: string; soft: string } {
  const c = T.color;
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
