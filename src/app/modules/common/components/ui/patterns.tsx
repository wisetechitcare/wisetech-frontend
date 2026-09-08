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
import { Box, Typography, Tooltip, useTheme } from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { KTIcon } from '@metronic/helpers';
import { GlassSurface } from './glass';
import { toTitleCase, titleCaseNode } from './text';

/** Accent tone: foreground / fill / border — drives IconBox, StatusBadge, StatTile, and keylines. */
export type Trio = { c: string; bg: string; bd: string };

/** Resolve a tone's fill/border for the active mode. Light uses the designed pastels; dark derives
 * translucent tints from the tone color so tiles/pills read correctly on a dark surface instead of
 * appearing as near-white blocks. The foreground (icon/text) keeps the vivid tone color in both. */
export function toneSurface(trio: Trio, dark: boolean) {
  return dark
    ? { bg: alpha(trio.c, 0.22), bd: alpha(trio.c, 0.44), fg: trio.c }
    : { bg: trio.bg, bd: trio.bd, fg: trio.c };
}

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

/**
 * Dropdown option colours, for a menu Paper or an Autocomplete listbox.
 *
 * MUI's default selected state is `action.selected` — an ~8% neutral wash that, behind
 * unchanged body text, is nearly invisible on a white menu. The chosen row here states itself
 * in the accent both behind AND in the ink, and hover reads as a rounded pill rather than a
 * full-bleed band, which is what every other surface in this app does.
 *
 *   <TextField select SelectProps={{ MenuProps: { PaperProps: { sx: menuOptionSx } } }} />
 *   <Autocomplete slotProps={{ listbox: { sx: menuOptionSx } }} />
 */
export const menuOptionSx = (theme: Theme) => {
  const dark = theme.palette.mode === 'dark';
  const c = theme.palette.primary.main;
  return {
    '& .MuiMenuItem-root, & .MuiAutocomplete-option': {
      borderRadius: '8px',
      marginLeft: '4px',
      marginRight: '4px',
      marginTop: '2px',
      marginBottom: '2px',
      '&:hover, &.Mui-focused, &.Mui-focusVisible': {
        backgroundColor: alpha(c, dark ? 0.2 : 0.08),
      },
      '&.Mui-selected, &[aria-selected="true"]': {
        backgroundColor: alpha(c, dark ? 0.34 : 0.13),
        color: dark ? theme.palette.primary.light : theme.palette.primary.dark,
        fontWeight: 600,
        '&:hover, &.Mui-focused': { backgroundColor: alpha(c, dark ? 0.42 : 0.18) },
      },
    },
  };
};

/** Card hover physics (shared) — a gentle lift + shadow deepen. */
export const EASE_200 = 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)';
export const SHADOW_REST = '0 1px 2px rgba(15,23,42,0.04), 0 8px 16px rgba(15,23,42,0.035)';
export const SHADOW_HOVER = '0 2px 4px rgba(15,23,42,0.04), 0 14px 22px rgba(15,23,42,0.055)';

/** Tinted leading glyph tile. `fs` is a Metronic icon-font size class (fs-1..fs-5). */
export function IconBox({ icon, trio, size = 40, fs = 'fs-2' }: { icon: string; trio: Trio; size?: number; fs?: string }) {
  const t = toneSurface(trio, useTheme().palette.mode === 'dark');
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '11px', display: 'grid', placeItems: 'center',
      bgcolor: t.bg, color: t.fg, border: `1px solid ${t.bd}`, flexShrink: 0,
    }}>
      <KTIcon iconName={icon} className={fs} />
    </Box>
  );
}

/**
 * Pill status chip — a dot + label, optionally a live pulse (`.sw-dot-pulse` keyframe) and a
 * tooltip.
 *
 * Supplying `onClick` turns it into a real toggle: keyboard-operable (Enter/Space), announced
 * via `aria-pressed`, and it stops `pointerdown` so clicking it inside a draggable row never
 * starts a drag. Promoted from a local copy in SandwhichLeave rather than left there — that
 * copy hardcoded the trio's light-mode hex and so went invisible in dark mode, which is
 * exactly what `toneSurface` exists to prevent.
 */
export function StatusBadge({ trio, label, pulse, title, onClick, disabled }: {
  trio: Trio; label: string; pulse?: boolean; title?: string;
  /** Present = interactive toggle. Absent = static chip, unchanged. */
  onClick?: () => void;
  disabled?: boolean;
}) {
  const t = toneSurface(trio, useTheme().palette.mode === 'dark');
  const interactive = !!onClick;
  const badge = (
    <Box
      role={interactive ? 'button' : undefined}
      tabIndex={interactive && !disabled ? 0 : undefined}
      aria-pressed={interactive ? pulse : undefined}
      aria-disabled={interactive ? disabled : undefined}
      onClick={interactive && !disabled ? onClick : undefined}
      onKeyDown={interactive && !disabled ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!(); }
      } : undefined}
      onPointerDown={interactive ? (e: React.PointerEvent) => e.stopPropagation() : undefined}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', px: '10px', py: '3px',
        borderRadius: 999, bgcolor: t.bg, border: `1px solid ${t.bd}`, flexShrink: 0, userSelect: 'none',
        ...(interactive && {
          cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1, transition: EASE_200,
          '&:hover': disabled ? {} : { filter: 'brightness(0.96)', boxShadow: SHADOW_REST },
          '&:active': disabled ? {} : { transform: 'scale(0.95)' },
          '&:focus-visible': { outline: `2px solid ${t.fg}`, outlineOffset: 2 },
        }),
      }}
    >
      <Box className={pulse ? 'sw-dot-pulse' : undefined} sx={{ width: 7, height: 7, borderRadius: 999, bgcolor: t.fg }} />
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: t.fg, lineHeight: 1, whiteSpace: 'nowrap' }}>{label}</Typography>
    </Box>
  );
  return title ? <Tooltip title={title}>{badge}</Tooltip> : badge;
}

/** KPI stat tile (icon + uppercase eyebrow + big value) on a thin glass surface.
 * Value font is responsive ({xs:16, sm:19}) so it doesn't truncate in 2-up mobile grids. */
export function StatTile({ label, value, trio, icon }: { label: string; value: React.ReactNode; trio: Trio; icon: string }) {
  const hoverBd = toneSurface(trio, useTheme().palette.mode === 'dark').bd;
  return (
    <GlassSurface variant="thin" sx={{
      minWidth: 0, p: 1.5, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: 1.25,
      borderColor: 'divider', boxShadow: SHADOW_REST, transition: EASE_200,
      '&:hover': { transform: 'translateY(-2px)', boxShadow: SHADOW_HOVER, borderColor: hoverBd },
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
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', lineHeight: 1.25 }}>{toTitleCase(title)}</Typography>
        {desc && <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5, mt: 0.25 }}>{desc}</Typography>}
      </Box>
    </Box>
  );
}

export interface StatusCycleOption<T extends string> {
  value: T;
  label: string;
  /** Text/dot colour. Fill and border are derived from it. */
  color: string;
  /** Optional tally, rendered dimmer after the label, e.g. `Active (37)`. */
  count?: number;
}

/**
 * One button, N states: it names the view that is CURRENTLY on screen and cycles
 * to the next on click.
 *
 * The **standard status filter** for a list toolbar (documents directory, employee
 * roster). Prefer it over a segmented control or a select whenever the options are
 * a short rotation and only one matters at a time — it costs one control's width
 * instead of three, which is what makes a phone toolbar fit, and the colour states
 * what you are looking at without reading it.
 *
 * Tint is derived from one `color` per option (10% fill, 35% border) so a caller
 * picks a hue rather than three matching values.
 */
export function StatusCyclePill<T extends string>({
  options, value, onChange, sx,
}: {
  options: ReadonlyArray<StatusCycleOption<T>>;
  value: T;
  onChange: (value: T) => void;
  sx?: SxProps<Theme>;
}) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const current = options[index];
  const next = options[(index + 1) % options.length];
  if (!current) return null;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onChange(next.value)}
      title={`Showing ${current.label.toLowerCase()} — click to show ${next.label.toLowerCase()}`}
      sx={[{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.875,
        px: 1.5,
        height: 38,
        flexShrink: 0,
        border: '1px solid',
        // Metronic's unlayered Bootstrap button rules outrank a utility class.
        borderRadius: '10px',
        cursor: 'pointer',
        font: 'inherit',
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        transition: 'background-color .15s, color .15s, border-color .15s',
        borderColor: alpha(current.color, 0.35),
        bgcolor: alpha(current.color, 0.1),
        color: current.color,
        '&:hover': { bgcolor: alpha(current.color, 0.18) },
      }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
    >
      <Box
        component="span"
        aria-hidden
        sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'currentColor', flexShrink: 0 }}
      />
      {current.label}
      {typeof current.count === 'number' && (
        // Hidden on a phone, in CSS rather than by not passing it: the tally is the
        // widest part of this pill and the toolbar row it shares needs those ~34px
        // for the search and New buttons. The count is still one breakpoint away.
        <Box
          component="span"
          sx={{ display: { xs: 'none', sm: 'inline' }, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}
        >
          ({current.count})
        </Box>
      )}
    </Box>
  );
}

export interface ViewModeOption<T extends string> {
  value: T;
  /** Bootstrap Icon class, e.g. `bi-grid-3x3-gap-fill`. */
  icon: string;
  /** Tooltip + accessible name, e.g. "Grid view". */
  label: string;
}

/**
 * Icon-only layout switch — the file-explorer grid/list control.
 *
 * The **standard** way to offer "same data, different layout" (documents vault,
 * employee roster). Use `SegmentedControl` instead when the choice has a *name*
 * worth reading — a status filter, a time period. A layout is recognised by its
 * glyph, and two words of chrome next to a real filter reads as a second filter.
 *
 * `icon` is a Bootstrap Icon CLASS, not an `AppIcon` name: the mapped keenicons
 * (`element-plus`, `text-align-left`) do not read as "grid" and "list", which is
 * the one thing an icon-only control has to get right.
 */
export function ViewModeSwitch<T extends string>({
  options, value, onChange, ariaLabel, sx,
}: {
  options: ReadonlyArray<ViewModeOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={[{
        display: 'inline-flex',
        p: 0.375,
        gap: 0.375,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        flexShrink: 0,
      }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
    >
      {options.map(({ value: optionValue, icon, label }) => {
        const active = optionValue === value;
        return (
          <Box
            key={optionValue}
            component="button"
            type="button"
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={() => onChange(optionValue)}
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 30,
              height: 26,
              border: 0,
              // Metronic's unlayered Bootstrap button rules outrank a utility class
              // here, so the radius has to be stated in `sx` to hold.
              borderRadius: '7px',
              cursor: 'pointer',
              transition: 'background-color .12s ease, color .12s ease',
              bgcolor: active ? 'background.paper' : 'transparent',
              color: active ? 'text.primary' : 'text.secondary',
              boxShadow: active ? '0 1px 2px rgba(16, 24, 40, 0.10)' : 'none',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <Box component="i" className={icon} aria-hidden sx={{ fontSize: 13 }} />
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Responsive auto-fit card grid — the **standard list/collection layout**. Fills wide screens with
 * as many columns as fit (so there's no dead whitespace / big right-hand gutter) and collapses
 * cleanly to a single column on mobile. `min` = each card's minimum width before the grid drops a
 * column. Reuse this instead of hand-rolling `gridTemplateColumns` breakpoints per feature.
 *
 *   <AutoGrid min={320}>{items.map(i => <GlassCard key={i.id} preset="row" …/>)}</AutoGrid>
 */
export function AutoGrid({
  children, min = 300, gap = 12, sx,
}: { children: React.ReactNode; min?: number; gap?: number | string; sx?: SxProps<Theme> }) {
  return (
    <Box
      sx={[{
        display: 'grid',
        gap: typeof gap === 'number' ? `${gap}px` : gap,
        // `min(min, 100%)` clamps the track on very narrow screens so a card never forces horizontal scroll.
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
        alignItems: 'stretch',
      }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
    >
      {children}
    </Box>
  );
}

/**
 * Standard list/page header: title (+ optional subtitle) on the left, actions on the right. Wraps
 * to a stacked layout on mobile so the action buttons never overflow or clip. Use at the top of
 * every list view for a consistent, readable, responsive toolbar (replaces the copy-pasted
 * `<Stack direction="row" justifyContent="space-between" flexWrap>` header). */
export function ListHeader({
  title, subtitle, actions, sx,
}: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box
      sx={[{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 1, mb: 2,
      }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: 16, sm: 18 }, lineHeight: 1.25 }}>{titleCaseNode(title)}</Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.45, mt: 0.25 }}>{subtitle}</Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', flexShrink: 0 }}>{actions}</Box>
      )}
    </Box>
  );
}
