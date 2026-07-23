import React from 'react';
import { KTIcon } from '@metronic/helpers';
import { cn } from './cn';
import { type Trio } from './tokens';

/**
 * Tailwind pattern atoms — IconBox / StatusBadge / Eyebrow / SectionHead,
 * re-platformed off MUI. Same props as the MUI kit so surfaces migrate 1:1.
 * Dynamic per-tone colors come from the `Trio` triple via inline style (a
 * utility class can't express an arbitrary runtime hex triple).
 */

/** Tinted rounded icon tile. `fs` is a Metronic KTIcon size class (e.g. "fs-2"). */
export function IconBox({ icon, trio, size = 40, fs = 'fs-2', className }: { icon: string; trio: Trio; size?: number; fs?: string; className?: string }) {
  return (
    <div
      className={cn('grid place-items-center rounded-[11px] shrink-0 border', className)}
      style={{ width: size, height: size, backgroundColor: trio.bg, color: trio.c, borderColor: trio.bd }}
    >
      <KTIcon iconName={icon} className={fs} />
    </div>
  );
}

/** Pill status chip — dot + label, optional live pulse + native tooltip. */
export function StatusBadge({ trio, label, pulse, title, className }: { trio: Trio; label: string; pulse?: boolean; title?: string; className?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] border shrink-0 select-none', className)}
      style={{ backgroundColor: trio.bg, borderColor: trio.bd }}
    >
      <span
        className={cn('w-[7px] h-[7px] rounded-full', pulse && 'wt-dot-pulse')}
        style={{ backgroundColor: trio.c }}
      />
      <span className="text-[11.5px] font-bold leading-none whitespace-nowrap" style={{ color: trio.c }}>{label}</span>
    </span>
  );
}

/** KPI tile — tinted IconBox + uppercase label + big value; thin glass, hover lift. */
export function StatTile({ label, value, trio, icon }: { label: string; value: React.ReactNode; trio: Trio; icon: string }) {
  return (
    <div className="min-w-0 p-3 rounded-[14px] flex items-center gap-3 bg-white/95 border border-[#E6E9EE] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_16px_rgba(15,23,42,0.035)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_14px_22px_rgba(15,23,42,0.055)]">
      <IconBox icon={icon} trio={trio} size={40} fs="fs-2" />
      <div className="min-w-0">
        <p className="text-[10.5px] text-slate-500 uppercase tracking-[0.04em] font-bold truncate m-0">{label}</p>
        <p className="text-[16px] sm:text-[19px] font-extrabold leading-tight text-slate-900 truncate m-0">{value}</p>
      </div>
    </div>
  );
}

/** Uppercase micro-label. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 m-0', className)}>{children}</p>
  );
}

/** Section header: tinted IconBox + title + optional description. */
export function SectionHead({ tone, icon, title, desc }: { tone: Trio; icon: string; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3">
      <IconBox icon={icon} trio={tone} size={40} fs="fs-2" />
      <div className="min-w-0">
        <p className="text-[15px] font-bold leading-[1.25] text-slate-900 m-0">{title}</p>
        {desc && <p className="text-[13px] leading-normal text-slate-500 mt-0.5 m-0">{desc}</p>}
      </div>
    </div>
  );
}
