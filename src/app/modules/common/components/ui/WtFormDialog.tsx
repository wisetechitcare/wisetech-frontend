import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Stack, Typography, alpha } from '@mui/material';
import { GlassDialog, GlassHeader } from './glass';
import { WtButton } from './buttons';

/**
 * WtFormDialog — the shell for a LONG form in a dialog (a profile, a settings record, a
 * multi-section master). Hand it sections and fields; it owns everything around them:
 *
 *   ┌ header (title, subtitle, icon, optional action) ─────────────────────────┐
 *   │ ┌ nav ──────┐  ┌ WtFormSection ─────────────────────────────────────┐    │
 *   │ │ ● Basic   │  │  [field]            [field]                         │    │
 *   │ │ ○ Bank    │  └─────────────────────────────────────────────────────┘    │
 *   │ └───────────┘  ┌ WtFormSection … ──────────────────────────────────┐    │
 *   ├ footer: unsaved-changes status ··················· [Cancel] [Save] ┤    │
 *   └──────────────────────────────────────────────────────────────────────────┘
 *
 * - The nav lists `sections`, highlights the one in view, jumps on click, and marks a section
 *   with an error dot when `invalid` — so a failed save says WHERE, not just "fix the form".
 * - The footer is sticky and always reachable; it reports saving / unsaved / saved.
 * - It is a real <form>: Enter in a text field submits, and `onSubmit` gets the event —
 *   hand it Formik's `handleSubmit`, or your own handler.
 *
 * Fields go inside `WtFormSection`s as `WtField`, `WtDateField`, `WtImageField`, etc.
 */

export interface WtFormNavItem {
  /** Must match the `id` of the WtFormSection it points at. */
  id: string;
  title: string;
  /** Bootstrap-icon class, e.g. `bi bi-bank`. */
  icon?: string;
  /** Shows an error dot on the nav item. */
  invalid?: boolean;
}

export interface WtFormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Right side of the header — e.g. a "Manage fields" button. */
  headerAction?: React.ReactNode;
  /** Section navigator. Omit (or pass fewer than 3) for a short form; the nav is skipped. */
  sections?: WtFormNavItem[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  saving?: boolean;
  /** Has the user changed anything? Drives the footer status and the Save button. */
  dirty?: boolean;
  /** Extra veto on Save beyond `dirty` / `saving` (e.g. an upload still running). */
  canSubmit?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function WtFormDialog({
  open, onClose, title, subtitle, icon, headerAction, sections = [], onSubmit,
  submitLabel = 'Save changes', saving = false, dirty = true, canSubmit = true, maxWidth = 'lg', children,
}: WtFormDialogProps) {
  const showNav = sections.length >= 3;
  const [active, setActive] = useState(sections[0]?.id);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Scroll-spy: the section whose top has most recently crossed the upper third is "active".
  useEffect(() => {
    if (!open || !showNav) return;
    const nodes = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [open, showNav, sections.map((s) => s.id).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const jump = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  const close = () => { if (!saving) onClose(); };

  return (
    <GlassDialog
      open={open}
      onClose={close}
      maxWidth={maxWidth}
      plain
      header={<GlassHeader title={title} subtitle={subtitle} icon={icon} onClose={close} action={headerAction} />}
    >
      <Box component="form" noValidate onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <Box
          ref={bodyRef}
          sx={{
            flex: 1, display: 'grid', gap: 3, p: { xs: 2, md: 3 }, bgcolor: 'background.default',
            gridTemplateColumns: showNav ? { xs: 'minmax(0,1fr)', md: '200px minmax(0,1fr)' } : 'minmax(0,1fr)',
            alignItems: 'start',
          }}
        >
          {showNav && (
            <Box component="nav" aria-label="Form sections" sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 0 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', px: 1.25, mb: 1 }}>Sections</Typography>
              <Stack gap={0.25}>
                {sections.map((s) => {
                  const on = s.id === active;
                  return (
                    <Box
                      key={s.id}
                      component="button"
                      type="button"
                      onClick={() => jump(s.id)}
                      aria-current={on ? 'true' : undefined}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1, width: '100%', textAlign: 'left',
                        px: 1.25, py: 0.9, border: 0, borderRadius: '9px', cursor: 'pointer', font: 'inherit',
                        fontSize: 13, fontWeight: on ? 700 : 500,
                        color: on ? 'primary.main' : 'text.secondary',
                        bgcolor: on ? (t) => alpha(t.palette.primary.main, 0.08) : 'transparent',
                        boxShadow: on ? (t) => `inset 3px 0 0 ${t.palette.primary.main}` : 'none',
                        transition: 'background-color .15s ease, color .15s ease',
                        '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, on ? 0.1 : 0.05), color: on ? 'primary.main' : 'text.primary' },
                        '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: -2 },
                      }}
                    >
                      {s.icon && <Box component="i" className={s.icon} aria-hidden sx={{ fontSize: 14, width: 16, flexShrink: 0, color: 'inherit' }} />}
                      <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</Box>
                      {s.invalid && <Box component="span" aria-label="Has errors" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'error.main', flexShrink: 0 }} />}
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}
          <Stack gap={2.5} sx={{ minWidth: 0 }}>{children}</Stack>
        </Box>

        {/* Sticky footer — the save action never scrolls out of reach. */}
        <Stack
          direction="row"
          alignItems="center"
          gap={1.5}
          sx={{
            position: 'sticky', bottom: 0, zIndex: 2, px: { xs: 2, md: 3 }, py: 1.5,
            bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider',
          }}
        >
          <Stack direction="row" alignItems="center" gap={0.75} sx={{ flex: 1, minWidth: 0 }} aria-live="polite">
            {saving ? (
              <>
                <CircularProgress size={14} />
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Saving…</Typography>
              </>
            ) : dirty ? (
              <>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'warning.main' }} />
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Unsaved changes</Typography>
              </>
            ) : (
              <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>No changes yet</Typography>
            )}
          </Stack>
          <WtButton inverted onClick={close} disabled={saving}>Cancel</WtButton>
          <WtButton type="submit" disabled={saving || !dirty || !canSubmit}>{saving ? 'Saving…' : submitLabel}</WtButton>
        </Stack>
      </Box>
    </GlassDialog>
  );
}

export interface WtFormSectionProps {
  /** Anchor for the dialog's section nav. */
  id: string;
  title: string;
  description?: string;
  /** Bootstrap-icon class, e.g. `bi bi-bank`. */
  icon?: string;
  /** Accent colour for the icon tile and top rule. */
  tone?: string;
  /** Field columns on desktop. Default 2. Phones always get 1. */
  columns?: 1 | 2 | 3;
  /** Right side of the section header (a small action). */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** A titled group of fields. Children are laid out in a responsive grid; wrap one in `WtFormSpan` to take a full row. */
export function WtFormSection({ id, title, description, icon, tone = '#1E3A8A', columns = 2, action, children }: WtFormSectionProps) {
  return (
    <Box
      id={id}
      component="section"
      aria-labelledby={`${id}-title`}
      sx={{
        scrollMarginTop: 16, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '14px',
        overflow: 'hidden', boxShadow: `inset 0 3px 0 ${tone}`,
      }}
    >
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: { xs: 2, md: 2.5 }, pt: 2.25, pb: 1.75 }}>
        {icon && (
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', flexShrink: 0, display: 'grid', placeItems: 'center', color: tone, bgcolor: alpha(tone, 0.1) }}>
            <Box component="i" className={icon} aria-hidden sx={{ fontSize: 16, color: 'inherit' }} />
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={`${id}-title`} component="h3" sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{title}</Typography>
          {description && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>{description}</Typography>}
        </Box>
        {action}
      </Stack>
      <Box
        sx={{
          px: { xs: 2, md: 2.5 }, pb: 2.5, pt: 0.75, display: 'grid', columnGap: 2, rowGap: 2.25,
          gridTemplateColumns: { xs: 'minmax(0,1fr)', md: `repeat(${columns}, minmax(0,1fr))` },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** Makes one child of a WtFormSection span the whole row (an address, an upload, a note). */
export function WtFormSpan({ children }: { children: React.ReactNode }) {
  return <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>{children}</Box>;
}

export default WtFormDialog;
