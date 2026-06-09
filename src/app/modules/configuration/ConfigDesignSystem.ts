import type { CSSProperties } from 'react';

/**
 * Global Configuration Design System
 * Master design tokens for all configuration pages.
 * Based on SalaryConfiguration as the reference design.
 */

// ─── Color Palette ────────────────────────────────────────────────────────────

export const C = {
  // Primary brand accent – Burgundy
  primary: '#9d4141',
  primaryLight: '#fdf3f4',
  primaryMid: '#b85555',
  primaryShadow: 'rgba(157, 65, 65, 0.15)',
  primaryShadowMd: 'rgba(157, 65, 65, 0.22)',

  // Semantic status
  success: '#17c964',
  successLight: '#f0fdf4',
  warning: '#f5a623',
  warningLight: '#fffbeb',
  danger: '#f1416c',
  dangerLight: '#fff5f8',
  info: '#0085db',
  infoLight: '#e1f0fa',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
  teal: '#0d9488',
  tealLight: '#f0fdfa',
  amber: '#d97706',
  amberLight: '#fffbeb',

  // Text hierarchy
  textPrimary: '#181C32',
  textSecondary: '#7E8299',
  textMuted: '#A1A5B7',
  textInverse: '#ffffff',

  // Surface / backgrounds
  bgPage: '#f7f8fc',
  bgCard: '#ffffff',
  bgSection: '#f8f9fa',
  bgHover: '#f9f9f9',

  // Borders
  border: '#E1E3EA',
  borderFocus: '#9d4141',
  borderDark: '#d1d3e2',

  // Shadows
  shadowSm: '0 1px 3px rgba(0,0,0,0.06)',
  shadowCard: '0 4px 16px rgba(0,0,0,0.04)',
  shadowCardHover: '0 8px 28px rgba(0,0,0,0.08)',
  shadowModal: '0 24px 48px rgba(0,0,0,0.12)',
};

// ─── Typography ───────────────────────────────────────────────────────────────

export const FONT = {
  heading: "'Barlow', sans-serif",
  body: "'Inter', sans-serif",
};

export const T = {
  // Page-level headings
  pageTitle: {
    fontFamily: FONT.heading,
    fontWeight: 700,
    fontSize: '28px',
    color: C.textPrimary,
    letterSpacing: '-0.5px',
    lineHeight: 1.2,
  } as CSSProperties,

  sectionTitle: {
    fontFamily: FONT.heading,
    fontWeight: 700,
    fontSize: '22px',
    color: C.textPrimary,
    letterSpacing: '-0.3px',
    margin: 0,
  } as CSSProperties,

  cardTitle: {
    fontFamily: FONT.body,
    fontWeight: 600,
    fontSize: '16px',
    color: C.textPrimary,
    margin: 0,
  } as CSSProperties,

  label: {
    fontFamily: FONT.body,
    fontWeight: 600,
    fontSize: '14px',
    color: C.textPrimary,
  } as CSSProperties,

  value: {
    fontFamily: FONT.body,
    fontWeight: 500,
    fontSize: '14px',
    color: C.textSecondary,
  } as CSSProperties,

  caption: {
    fontFamily: FONT.body,
    fontWeight: 500,
    fontSize: '12px',
    color: C.textMuted,
  } as CSSProperties,

  tabActive: {
    fontFamily: FONT.body,
    fontWeight: 600,
    fontSize: '14px',
    color: C.primary,
  } as CSSProperties,

  tabInactive: {
    fontFamily: FONT.body,
    fontWeight: 500,
    fontSize: '14px',
    color: C.textSecondary,
  } as CSSProperties,
};

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const SP = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

// ─── Border Radius ────────────────────────────────────────────────────────────

export const RADIUS = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// ─── Reusable Button Styles ───────────────────────────────────────────────────

export const BTN = {
  primary: {
    backgroundColor: C.primary,
    color: C.textInverse,
    border: 'none',
    borderRadius: RADIUS.md,
    padding: '10px 20px',
    fontFamily: FONT.body,
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: `0 4px 12px ${C.primaryShadow}`,
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  } as CSSProperties,

  secondary: {
    backgroundColor: C.bgCard,
    color: C.textPrimary,
    border: `1px solid ${C.border}`,
    borderRadius: RADIUS.md,
    padding: '10px 20px',
    fontFamily: FONT.body,
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
    color: C.primary,
    border: `1px solid ${C.primary}`,
    borderRadius: RADIUS.md,
    padding: '8px 18px',
    fontFamily: FONT.body,
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
    color: C.textSecondary,
    border: 'none',
    borderRadius: RADIUS.md,
    padding: '8px 12px',
    fontFamily: FONT.body,
    fontWeight: 500,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  } as CSSProperties,
};

// ─── Section Icon Background Colors ──────────────────────────────────────────

export const ICON_COLORS: Record<string, { bg: string; color: string }> = {
  primary: { bg: C.primaryLight, color: C.primary },
  blue: { bg: C.infoLight, color: C.info },
  green: { bg: C.successLight, color: '#16a34a' },
  purple: { bg: C.purpleLight, color: C.purple },
  amber: { bg: C.amberLight, color: C.amber },
  teal: { bg: C.tealLight, color: C.teal },
  danger: { bg: C.dangerLight, color: C.danger },
  warning: { bg: C.warningLight, color: C.warning },
};

// ─── Keyframe CSS string ──────────────────────────────────────────────────────

export const KEYFRAMES = `
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
  .cfg-fade-in { animation: cfgFadeIn 0.3s ease; }
  .cfg-slide-in { animation: cfgSlideIn 0.25s ease; }
`;

export default { C, FONT, T, SP, RADIUS, BTN, ICON_COLORS, KEYFRAMES };
