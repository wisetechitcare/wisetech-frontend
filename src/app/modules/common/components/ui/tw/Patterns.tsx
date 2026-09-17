import React from 'react';
import { KTIcon } from '@metronic/helpers';
import { cn } from './cn';
import { type Trio } from './tokens';
import { useIsDark, toneSurface } from './useIsDark';
// Dependency-free on purpose, so importing it does not drag MUI into this kit.
import { ICON_BOX_CLASS, TILE_LABEL_CLASS } from '../classNames';

/**
 * Tailwind pattern atoms — IconBox / StatusBadge / Eyebrow / SectionHead,
 * re-platformed off MUI. Same props as the MUI kit so surfaces migrate 1:1.
 * Dynamic per-tone colors come from the `Trio` triple via inline style (a
 * utility class can't express an arbitrary runtime hex triple).
 */

/**
 * Tinted rounded icon tile. `fs` is a Metronic KTIcon size class (e.g. "fs-2").
 *
 * A string `icon` is a KTIcon name, the usual case. Anything else renders as given — for the
 * glyphs the icon font does not have. A currency symbol is the one that forced it: the font
 * ships `dollar` and nothing else, so every money tile showed a `$` whatever the branch bills
 * in. Pass `<CurrencySymbol />`. Kept identical to the MUI kit's IconBox so surfaces still
 * migrate 1:1 between the two.
 */
export function IconBox({ icon, trio, size = 40, fs = 'fs-2', className }: { icon: React.ReactNode; trio: Trio; size?: number; fs?: string; className?: string }) {
  const t = toneSurface(trio, useIsDark());
  return (
    <div
      className={cn(ICON_BOX_CLASS, 'grid place-items-center rounded-[11px] shrink-0 border transition-all duration-200', className)}
      style={{
        width: size, height: size, backgroundColor: t.bg, color: t.fg, borderColor: t.bd,
        // Sized for a text glyph; a KTIcon carries its own `fs-*` class and ignores this.
        fontSize: Math.round(size * 0.45), fontWeight: 700, lineHeight: 1,
      }}
    >
      {typeof icon === 'string' ? <KTIcon iconName={icon} className={fs} /> : icon}
    </div>
  );
}

/** Pill status chip — dot + label, optional live pulse + native tooltip. */
export function StatusBadge({ trio, label, pulse, title, className }: { trio: Trio; label: string; pulse?: boolean; title?: string; className?: string }) {
  const t = toneSurface(trio, useIsDark());
  return (
    <span
      title={title}
      // `max-w-full` so the badge can never overflow its container and get clipped
      // mid-word by the cell ("Approval Pend"). When it runs out of room the LABEL
      // WRAPS to a second line rather than shrinking or ellipsizing — a status is the
      // column people scan, so a partially hidden one is worse than a taller row.
      // `rounded-2xl` instead of `rounded-full`: a full pill radius on a two-line box
      // bows the sides out. Table rows use min-height, so a wrapped badge grows its row
      // instead of overlapping the neighbours.
      className={cn('inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-[4px] border shrink-0 max-w-full select-none', className)}
      style={{ backgroundColor: t.bg, borderColor: t.bd }}
    >
      <span
        className={cn('w-[7px] h-[7px] rounded-full shrink-0', pulse && 'wt-dot-pulse')}
        style={{ backgroundColor: t.fg }}
      />
      <span
        className="text-[11.5px] font-bold leading-[1.3] min-w-0 whitespace-normal break-words"
        style={{ color: t.fg }}
        title={title ?? label}
      >
        {label}
      </span>
    </span>
  );
}

/**
 * KPI tile — tinted IconBox + uppercase label + big value.
 *
 * Hover matches the MUI kit's `hoverTileSx`, which took it from the aside menu: the surface
 * warms toward the accent, the border picks up the tone, the glyph lifts a pixel, the caption
 * sharpens, and the card itself stays put. It used to lift the whole card instead, which is
 * what the aside does NOT do.
 *
 * The tone is a runtime hex and a utility class cannot express one, so the wash and border
 * arrive as custom properties off the same `toneSurface` the IconBox uses.
 */
export function StatTile({ label, value, trio, icon }: { label: string; value: React.ReactNode; trio: Trio; icon: React.ReactNode }) {
  const t = toneSurface(trio, useIsDark());
  return (
    <div
      style={{ '--wt-wash': t.bg, '--wt-bd': t.bd } as React.CSSProperties}
      className={cn(
        'min-w-0 p-3 rounded-[14px] flex items-center gap-3 border transition-all duration-200',
        'bg-white/95 border-[#E6E9EE] dark:bg-[#161b22] dark:border-[#30363d]',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_16px_rgba(15,23,42,0.035)]',
        'hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_14px_22px_rgba(15,23,42,0.055)]',
        'hover:bg-[var(--wt-wash)] hover:border-[var(--wt-bd)]',
        `[&:hover_.${ICON_BOX_CLASS}]:-translate-y-px`,
        // Not `group-hover:` — that needs a `group` class on this element, and adding one here
        // would also fire for every nested `group-hover:` a caller puts inside the tile.
        `[&:hover_.${TILE_LABEL_CLASS}]:text-slate-900 dark:[&:hover_.${TILE_LABEL_CLASS}]:text-slate-100`,
      )}
    >
      <IconBox icon={icon} trio={trio} size={40} fs="fs-2" />
      <div className="min-w-0">
        <p className={cn(TILE_LABEL_CLASS, 'text-[10.5px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] font-bold truncate m-0 transition-colors duration-200')}>{label}</p>
        <p className="text-[16px] sm:text-[19px] font-extrabold leading-tight text-slate-900 dark:text-slate-100 truncate m-0">{value}</p>
      </div>
    </div>
  );
}

/** Uppercase micro-label. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400 m-0', className)}>{children}</p>
  );
}

/** Section header: tinted IconBox + title + optional description. */
export function SectionHead({ tone, icon, title, desc }: { tone: Trio; icon: string; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3">
      <IconBox icon={icon} trio={tone} size={40} fs="fs-2" />
      <div className="min-w-0">
        <p className="text-[15px] font-bold leading-[1.25] text-slate-900 dark:text-slate-100 m-0">{title}</p>
        {desc && <p className="text-[13px] leading-normal text-slate-500 dark:text-slate-400 mt-0.5 m-0">{desc}</p>}
      </div>
    </div>
  );
}
