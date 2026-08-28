import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { KTIcon } from '@metronic/helpers';
import { cn } from './cn';
import { BRAND } from './tokens';
import { WtCloseButton } from './WtCloseButton';

/**
 * Tailwind glass primitives — GlassSurface / GlassCard / GlassHeader /
 * GlassDialog, re-platformed off MUI onto Tailwind + framer-motion. Same public
 * API as the MUI kit so surfaces migrate with import + prop parity.
 *
 * Glass rule (unchanged): exactly ONE `regular` (real backdrop-filter) surface
 * per view — the Dialog Paper or a page shell. Everything else is `thin`
 * (tint-only, no stacked blur).
 */

export type GlassVariant = 'regular' | 'thin';

const SURFACE: Record<GlassVariant, string> = {
  regular:
    'bg-white/80 supports-[backdrop-filter]:bg-white/70 backdrop-blur-xl border border-white/60 ' +
    'shadow-[0_1px_3px_rgba(16,24,40,0.05),0_8px_24px_rgba(16,24,40,0.03)] ' +
    'dark:bg-[#161b22]/92 dark:supports-[backdrop-filter]:bg-[#161b22]/75 dark:border-[#30363d]',
  thin:
    'bg-white/95 border border-[#E6E9EE] ' +
    'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_16px_rgba(15,23,42,0.035)] ' +
    'dark:bg-[#1c2128] dark:border-[#30363d]',
};

export interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  radius?: number;
}

export const GlassSurface = React.forwardRef<HTMLDivElement, GlassSurfaceProps>(function GlassSurface(
  { variant = 'thin', radius = 16, className, style, ...rest }, ref,
) {
  return <div ref={ref} className={cn(SURFACE[variant], className)} style={{ borderRadius: radius, ...style }} {...rest} />;
});

// ─── GlassCard ────────────────────────────────────────────────────────────────
const PRESET: Record<'section' | 'tile' | 'row', string> = {
  section: 'p-4 sm:p-5',
  tile: 'p-4',
  row: 'p-4',
};

export type ToneName = 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan' | 'slate';
const EDGE: Record<ToneName, string> = {
  blue: '#2563eb', green: '#16a34a', purple: '#7c3aed', amber: '#d97706', rose: '#e11d48', cyan: '#0891b2', slate: '#64748b',
};

export interface GlassCardProps extends GlassSurfaceProps {
  preset?: 'section' | 'tile' | 'row';
  interactive?: boolean;
  accentEdge?: ToneName | false;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { preset = 'section', interactive = false, accentEdge = false, className, style, ...rest }, ref,
) {
  return (
    <GlassSurface
      ref={ref}
      variant="thin"
      className={cn(
        PRESET[preset],
        interactive && 'transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_14px_22px_rgba(15,23,42,0.055)]',
        className,
      )}
      style={{ ...(accentEdge ? { borderLeft: `4px solid ${EDGE[accentEdge]}` } : null), ...style }}
      {...rest}
    />
  );
});

// ─── GlassHeader ───────────────────────────────────────────────────────────────
export interface GlassHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  action?: React.ReactNode;
}

export function GlassHeader({ title, subtitle, icon, onClose, action }: GlassHeaderProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0"
      style={{ background: `linear-gradient(135deg, ${BRAND.navyHover} 0%, ${BRAND.navy} 100%)`, borderBottom: `3px solid ${BRAND.accent}` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="grid place-items-center w-10 h-10 sm:w-[46px] sm:h-[46px] rounded-[10px] shrink-0 bg-white/15 border border-white/20">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="m-0 font-bold text-[15.5px] sm:text-[17px] leading-[1.25]">{title}</p>
          {subtitle && <p className="m-0 text-[12.5px] text-white/70 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        {onClose && <WtCloseButton variant="dark" onClick={onClose} />}
      </div>
    </div>
  );
}

// ─── GlassDialog ───────────────────────────────────────────────────────────────
export type DialogMaxWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const MAXW: Record<DialogMaxWidth, string> = {
  xs: 'sm:max-w-[444px]', sm: 'sm:max-w-[600px]', md: 'sm:max-w-[900px]', lg: 'sm:max-w-[1200px]', xl: 'sm:max-w-[1536px]',
};

export interface GlassDialogProps {
  open: boolean;
  onClose?: () => void;
  maxWidth?: DialogMaxWidth;
  /** Kept for API parity with the MUI kit; the panel is always full-width up to maxWidth. */
  fullWidth?: boolean;
  /** Go full-screen on phones. Default true. */
  mobileFullScreen?: boolean;
  header?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  /**
   * Wrap `children` in the dialog's scroll region. Default TRUE.
   *
   * Set false ONLY when the caller lays out its own flex column inside the panel — a `shrink-0`
   * header and a `grow overflow-y-auto` body, say — because wrapping that would put the pinned
   * parts inside the scroller and they would scroll away with the content. This is the tw
   * equivalent of the MUI kit's DialogContent/DialogActions detection, which cannot work here
   * because the tw kit has no such marker components.
   */
  scrollBody?: boolean;
}

export function GlassDialog({
  open, onClose, maxWidth = 'md', mobileFullScreen = true, header, className, children,
  scrollBody = true,
}: GlassDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // ESC to close + body scroll-lock while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[1300] flex justify-center',
            mobileFullScreen ? 'items-stretch sm:items-center sm:p-6' : 'items-center p-6',
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
          style={{ backgroundColor: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative w-full flex flex-col overflow-hidden outline-none',
              GlassSurfaceRegular,
              mobileFullScreen
                ? 'h-full sm:h-auto rounded-none sm:rounded-2xl max-h-full sm:max-h-[92vh]'
                : 'rounded-2xl max-h-[92vh]',
              MAXW[maxWidth],
              className,
            )}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* shrink-0 — the header is chrome and must not be squeezed to make room for a tall
                body, which is what a default flex item would do. */}
            {header ? <div className="shrink-0">{header}</div> : null}
            {/*
              THE SCROLL REGION. Without it, `children` is a plain flex item of a
              `flex flex-col overflow-hidden max-h-[92vh]` panel: it keeps `min-height: auto` and
              `flex-shrink: 1`, so tall content is first SQUEEZED and then CLIPPED, with no
              scrollbar and no keyboard scroll — the bottom of the dialog simply unreachable.

              The MUI twin (ui/glass.tsx) carries this same fix with the same reasoning. This kit
              was re-platformed onto Tailwind "with API parity" and the fix was not ported, so every
              tw GlassDialog whose content exceeds the panel has been silently truncated.

              `min-h-0` is the load-bearing half: a flex item's automatic minimum size otherwise
              refuses to shrink below its content, and `overflow-y-auto` then has nothing to scroll.
              `overscroll-contain` stops a gesture that reaches the end from scrolling the page
              behind the scrim.
            */}
            {scrollBody
              ? <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div>
              : children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// The dialog Paper is the ONE `regular` glass surface (real backdrop-filter).
const GlassSurfaceRegular =
  'bg-white/90 supports-[backdrop-filter]:bg-white/80 backdrop-blur-xl border border-white/60 ' +
  'shadow-[0_24px_64px_-12px_rgba(16,24,40,0.28),0_8px_20px_-8px_rgba(16,24,40,0.18)] ' +
  'dark:bg-[#161b22]/95 dark:supports-[backdrop-filter]:bg-[#161b22]/85 dark:border-[#30363d]';
