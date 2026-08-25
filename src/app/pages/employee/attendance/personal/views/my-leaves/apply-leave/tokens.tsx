/**
 * Shared tokens + primitives for the Apply-Leave modal.
 *
 * These lived as module-scope consts inside ApplyLeave.tsx. They moved here so the modal's
 * extracted sub-components (LeaveCalendar and the ones that follow it) can share ONE definition
 * instead of each re-declaring a brand colour or a date helper. Nothing here holds state or reads
 * Redux — it is deliberately importable from anywhere without pulling the modal in behind it.
 *
 * NOT a barrel: import this file directly. The `ui/` barrel is a known tsc-timeout trap in this
 * codebase, and re-exporting the modal's parts through an index would recreate it.
 */
import React from 'react';
import { leavePalette, type LeavePalette } from './theme';

// ── Brand tokens ──────────────────────────────────────────────────────────────
export const ACCENT   = '#1E3A8A';
/** Probation / locked state. Matches the amber the My-Leaves probation banner already uses. */
export const AMBER    = '#8a5a1e';
export const RED      = '#A64652';
export const RED_DARK = '#9C3F48';
export const GREEN    = '#3E8E6E';
export const PJK      = "'Plus Jakarta Sans', system-ui, sans-serif";

/** JS `Date.getDay()` index → the key shape branch working/off-day config uses. */
export const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// ── Pure date helpers ─────────────────────────────────────────────────────────
export const pad   = (n: number) => String(n).padStart(2, '0');
/** Local-calendar ISO day. Local (not UTC) on purpose: every date in this modal is a business day
 *  the employee picked in their own timezone, never an instant. */
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function expandRange(fromISO: string, toISO: string): string[] {
    const out: string[] = [];
    for (let d = new Date(fromISO + 'T00:00:00'); d <= new Date(toISO + 'T00:00:00'); d.setDate(d.getDate() + 1))
        out.push(isoOf(d));
    return out;
}

// ── Style atoms ───────────────────────────────────────────────────────────────
export const navBtnSt = (small?: boolean, P: LeavePalette = leavePalette(false)): React.CSSProperties => ({
    width: small ? 34 : 38, height: small ? 34 : 38,
    border: `1px solid ${P.line}`, borderRadius: 10, background: P.surface, color: P.ink,
    cursor: 'pointer', fontSize: 16,
});

/** Error/blocking notice. Dark keeps the same rose hue at a weight that reads on a dark surface,
 *  rather than inverting to a light box that would glare. */
export const errBoxOf = (dark: boolean): React.CSSProperties => dark
    ? { background: 'rgba(225,29,72,.14)', border: '1px solid rgba(225,29,72,.34)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: '#fda4af' }
    /* eslint-disable-next-line no-restricted-syntax -- this IS the light branch of a function that
       takes `dark`; the dark branch is the line above. The rule matches a literal and cannot see
       the branch, so the token it asks for is the thing this function already implements. */
    : { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: '#991b1b' };

/** Light-mode default, kept so existing call sites compile unchanged. */
export const errBox: React.CSSProperties = errBoxOf(false);

// ── Primitives ────────────────────────────────────────────────────────────────
/** Inline padlock. Kept local to the modal so this adds no icon-kit import — the `ui/` barrel is a
 *  known tsc-timeout trap and this is the only icon the probation state needs. */
export const LockGlyph = ({ size = 12, color = AMBER }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

export const Toggle = ({ on, color, onClick, disabled }: { on: boolean; color: string; onClick: () => void; disabled?: boolean }) => (
    <button onClick={() => { if (!disabled) onClick(); }} disabled={disabled} style={{ width: 42, height: 24, borderRadius: 999, background: on ? color : 'rgba(128,134,142,.45)', position: 'relative', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, flexShrink: 0, transition: 'background .15s' }}>
        {/* The knob is white against BOTH the brand-on and the neutral-off track, so it is contrast
            against the track rather than against the page and correctly does not follow the palette. */}
        {/* eslint-disable-next-line no-restricted-syntax -- see above: contrast against the track, not the surface. */}
        <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.25)', transition: 'left .15s' }} />
    </button>
);

export const DRow = ({ label, value, mt }: { label: string; value: string; mt?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: mt ? 7 : 0 }}>
        <span style={{ fontSize: 12, color: '#8b8e91', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2b2e30' }}>{value}</span>
    </div>
);
