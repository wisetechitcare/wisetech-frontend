/**
 * Shared UI pattern atoms — **app-wide** primitives for the glassmorphism design system.
 *
 * Single source of truth for the small building blocks that were being copy-pasted across modals
 * (settings, leave, approvals, admin, …). Import from the kit barrel anywhere in the app:
 *
 *   import { IconBox, StatusBadge, StatTile, Eyebrow, SectionHead, TRIO } from '@app/modules/common/components/ui';
 *
 * All are presentation-only, framework-consistent (MUI `sx` + the glass kit), and mobile-aware.
 * Reuse these instead of re-declaring them in any feature.
 */
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { KTIcon } from '@metronic/helpers';
import { GlassSurface } from './glass';

/** Accent tone: foreground / fill / border — drives IconBox, StatusBadge, StatTile, and keylines. */
export type Trio = { c: string; bg: string; bd: string };

/** The shared accent palette (mirrors the Sandwich Leave benchmark). Semantics: green=success/active,
 * rose=danger/derived, amber=warning, blue=info, slate=neutral/inactive, purple=category. */
export const TRIO: Record<'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan' | 'slate', Trio> = {
  blue:   { c: '#2563eb', bg: '#eff6ff', bd: '#dbeafe' },
  green:  { c: '#16a34a', bg: '#f0fdf4', bd: '#dcfce7' },
  purple: { c: '#7c3aed', bg: '#f5f3ff', bd: '#ede9fe' },
  amber:  { c: '#d97706', bg: '#fffbeb', bd: '#fde68a' },
  rose:   { c: '#e11d48', bg: '#fff1f2', bd: '#fecdd3' },
  cyan:   { c: '#0891b2', bg: '#ecfeff', bd: '#cffafe' },
  slate:  { c: '#64748b', bg: '#f8fafc', bd: '#e2e8f0' },
};

/** Card hover physics (shared) — a gentle lift + shadow deepen. */
export const EASE_200 = 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)';
export const SHADOW_REST = '0 1px 2px rgba(15,23,42,0.04), 0 8px 16px rgba(15,23,42,0.035)';
export const SHADOW_HOVER = '0 2px 4px rgba(15,23,42,0.04), 0 14px 22px rgba(15,23,42,0.055)';

/** Tinted leading glyph tile. `fs` is a Metronic icon-font size class (fs-1..fs-5). */
export function IconBox({ icon, trio, size = 40, fs = 'fs-2' }: { icon: string; trio: Trio; size?: number; fs?: string }) {
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '11px', display: 'grid', placeItems: 'center',
      bgcolor: trio.bg, color: trio.c, border: `1px solid ${trio.bd}`, flexShrink: 0,
    }}>
      <KTIcon iconName={icon} className={fs} />
    </Box>
  );
}

/** Pill status chip — a dot + label, optionally a live pulse (`.sw-dot-pulse` keyframe) and a tooltip. */
export function StatusBadge({ trio, label, pulse, title }: { trio: Trio; label: string; pulse?: boolean; title?: string }) {
  const badge = (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', px: '10px', py: '3px',
      borderRadius: 999, bgcolor: trio.bg, border: `1px solid ${trio.bd}`, flexShrink: 0, userSelect: 'none',
    }}>
      <Box className={pulse ? 'sw-dot-pulse' : undefined} sx={{ width: 7, height: 7, borderRadius: 999, bgcolor: trio.c }} />
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: trio.c, lineHeight: 1, whiteSpace: 'nowrap' }}>{label}</Typography>
    </Box>
  );
  return title ? <Tooltip title={title}>{badge}</Tooltip> : badge;
}

/** KPI stat tile (icon + uppercase eyebrow + big value) on a thin glass surface.
 * Value font is responsive ({xs:16, sm:19}) so it doesn't truncate in 2-up mobile grids. */
export function StatTile({ label, value, trio, icon }: { label: string; value: React.ReactNode; trio: Trio; icon: string }) {
  return (
    <GlassSurface variant="thin" sx={{
      minWidth: 0, p: 1.5, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: 1.25,
      borderColor: 'divider', boxShadow: SHADOW_REST, transition: EASE_200,
      '&:hover': { transform: 'translateY(-2px)', boxShadow: SHADOW_HOVER, borderColor: trio.bd },
    }}>
      <IconBox icon={icon} trio={trio} size={40} fs="fs-2" />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{label}</Typography>
        <Typography noWrap sx={{ fontSize: { xs: 16, sm: 19 }, fontWeight: 800, lineHeight: 1.2, color: 'text.primary' }}>{value}</Typography>
      </Box>
    </GlassSurface>
  );
}

/** Small uppercase eyebrow label (stat/section/tile headers). */
export function Eyebrow({ children, sx }: { children: React.ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Typography sx={[{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}>
      {children}
    </Typography>
  );
}

/** Section header: tinted IconBox + title + optional description — the standard card/section lead-in. */
export function SectionHead({ tone, icon, title, desc }: { tone: Trio; icon: string; title: string; desc?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
      <IconBox icon={icon} trio={tone} size={40} fs="fs-2" />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', lineHeight: 1.25 }}>{title}</Typography>
        {desc && <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5, mt: 0.25 }}>{desc}</Typography>}
      </Box>
    </Box>
  );
}
