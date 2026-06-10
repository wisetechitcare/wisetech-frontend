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

export default { C, FONT, T, SP, RADIUS, BTN, ICON_COLORS, KEYFRAMES };
