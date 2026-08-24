/**
 * LeaveCalendar — the month grid, its day-state colouring, the anchored tooltip, the legend and
 * the holiday chips.
 *
 * WHY THIS IS A MODULE-SCOPE COMPONENT.
 *
 * It used to be declared inside ApplyLeave's render body. A component declared there gets a NEW
 * function identity on every parent render, so React cannot reconcile it — it unmounts the old
 * subtree and mounts a fresh one. For this grid that meant tearing down and rebuilding 42 day
 * buttons, the legend and the holiday chips on EVERY parent state change: each keystroke in the
 * reason field, each half-day toggle, each hover before the hover state was moved down here.
 *
 * Hoisted to module scope and wrapped in React.memo, the identity is now stable, so the grid
 * re-renders only when one of its inputs actually changes and never remounts. That is also why the
 * props below are deliberately explicit rather than a context read: memo can only do its job if the
 * inputs are visible and referentially stable, and the caller keeps them memoised for exactly that
 * reason.
 *
 * Hover state (`hoverDate` for the range preview, `hoverTip` for the label) stays LOCAL. Lifting it
 * to the parent is what made pointer movement across the grid re-render the whole modal.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { rgba, tintOf, borderOf } from '@utils/leaveTypeColors';
import { ACCENT, RED, PJK, DAY_NAMES, pad, navBtnSt } from './tokens';
import { useLeavePalette } from './theme';

export interface LeaveCalendarProps {
    /** Displayed month. */
    cal: { y: number; m: number };
    /** Move the displayed month by `d` months. */
    nav: (d: number) => void;
    /** Current selection (`from`/`to` are inclusive ISO days; `to === from` means one day). */
    sel: { from: string | null; to: string | null };
    /** Commit a day to the selection (single tap = pick, second tap = extend/clear). */
    pick: (iso: string) => void;

    /** Today, and the backdating floor (1 Apr of the current fiscal year). Both ISO days. */
    today: string;
    fyStart: string;
    /** Today is already worked end to end — it cannot be taken as leave. */
    todayDone: boolean;
    /** Today has an open check-in — only its PM half can be taken. */
    todayHalfPM: boolean;
    dateOfJoining: string | null;

    /** Days already covered by another request (this one excluded when editing). */
    blockedDates: Set<string>;
    /** ISO day → the type it is booked/previewed as, for the per-type colour band. */
    segByDate: Map<string, { leaveType: string; isPaid: boolean }>;
    /** Interior off-days the backend rule engine docks as Unpaid (Model B — salary only). */
    sandwichDateSet: Set<string>;
    sandwichDays: number;

    holidaySet: Set<string>;
    holidayNames: Record<string, string>;
    holidayColors: Record<string, string>;
    /** Branch working-week config: day name → '1' working / '0' off. */
    workingAndOffDays: Record<string, string>;

    /** Leave type name → configured colour (the canonical resolver, bound by the caller). */
    colorOf: (name: string) => string;
    holidayCol: string;
    weekendCol: string;
    teamOffCol: string;
    sandwichCol: string;

    /** Read-only review of a booked request: a day click offers edit instead of re-picking. */
    isView: boolean;
    canEditExisting: boolean;
    onEditRequest: () => void;

    /** Compact grid for the mobile sheet. */
    small?: boolean;
}

function LeaveCalendarBase({
    cal, nav, sel, pick,
    today, fyStart, todayDone, todayHalfPM, dateOfJoining,
    blockedDates, segByDate, sandwichDateSet, sandwichDays,
    holidaySet, holidayNames, holidayColors, workingAndOffDays,
    colorOf, holidayCol, weekendCol, teamOffCol, sandwichCol,
    isView, canEditExisting, onEditRequest,
    small,
}: LeaveCalendarProps) {
    const s = sel;
    // Neutrals only. Leave-type colours stay as configured — they are admin-set identity, not
    // surface, and must not be theme-swapped behind the admin's back.
    const P = useLeavePalette();
    const [hoverDate, setHoverDate] = useState<string | null>(null);
    const [hoverTip, setHoverTip] = useState<{ x: number; y: number; below: boolean; text: string; color: string | null } | null>(null);
    const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (tipTimer.current) clearTimeout(tipTimer.current); }, []);
    /**
     * Anchor the tooltip to the CELL, not the cursor: a cursor-following label jitters on every
     * mousemove and always lags the pointer. It sits above the day, flipping below when the cell
     * is too near the top of the viewport for the label to fit.
     *
     * `transient` is the touch path — there is no hover on a phone, so tapping an unavailable
     * day reveals WHY it is unavailable and the label clears itself.
     */
    const showTip = (el: HTMLElement, text: string, color: string | null, transient = false) => {
        const r = el.getBoundingClientRect();
        const below = r.top < 76;
        if (tipTimer.current) clearTimeout(tipTimer.current);
        setHoverTip({ x: r.left + r.width / 2, y: below ? r.bottom + 10 : r.top - 10, below, text, color });
        if (transient) tipTimer.current = setTimeout(() => setHoverTip(null), 2400);
    };
    const hideTip = () => { if (tipTimer.current) clearTimeout(tipTimer.current); setHoverTip(null); };
    const { y, m } = cal;
    // Monday-first week: shift the JS Sun=0 lead so Monday occupies column 0.
    const lead = (new Date(y, m, 1).getDay() + 6) % 7, dim = new Date(y, m + 1, 0).getDate();
    // Hover preview: only active while a single day is selected (awaiting range extension)
    const isPickingRange = !!(s.from && s.to === s.from);
    const previewEnd = isPickingRange && hoverDate && hoverDate > s.from! ? hoverDate : null;
    const end = previewEnd ?? s.to ?? s.from;
    const sz = small ? 40 : 44, rad = small ? 9 : 10;
    const hasWod = Object.keys(workingAndOffDays).length > 0;
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < lead; i++) cells.push(<div key={'l' + i} />);
    for (let d = 1; d <= dim; d++) {
        const iso      = `${y}-${pad(m + 1)}-${pad(d)}`;
        const beforeDoj = !!dateOfJoining && iso < dateOfJoining;
        const past     = iso < today || beforeDoj;
        // Backdating is allowed across the whole CURRENT fiscal year: any past date on/after the
        // joining date and on/after 1 April is SELECTABLE so an employee can record a leave they
        // forgot to apply for (the backend charges the late-apply penalty). Dates before the
        // fiscal year, before joining, or already taken stay blocked.
        const beforeFy = iso < fyStart;
        const backdated = iso < today && !beforeDoj && !beforeFy;
        const blocked  = blockedDates.has(iso);
        // Today is already fully worked (check-in AND check-out) - there is no day left to take.
        const workedToday = iso === today && todayDone;
        const disabled = beforeDoj || blocked || beforeFy || workedToday;
        const isEp       = iso === s.from || iso === s.to;
        const isHoverEnd = !isEp && !!previewEnd && iso === previewEnd;
        const inRange    = !!(s.from && end && iso > s.from && iso < end);
        const wd         = new Date(iso + 'T00:00:00').getDay();
        const weekend  = wd === 0 || wd === 6;
        const offDay   = hasWod ? workingAndOffDays[DAY_NAMES[wd]] === '0' : weekend;
        const teamOff  = offDay && !weekend;
        const holiday  = holidaySet.has(iso);
        const seg      = segByDate.get(iso), charged = !!seg;
        // sandwichCharged: interior off-day excluded from salary (Model B — not booked as leave)
        const sandwichCharged = sandwichDateSet.has(iso);
        const dtColor  = charged ? colorOf(seg!.leaveType) : ACCENT;

        const st: React.CSSProperties = {
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: sz, border: 'none', background: P.surface, color: P.ink,
            fontSize: small ? 13 : 14, fontWeight: 500, borderRadius: rad, cursor: disabled ? 'default' : 'pointer',
        };
        if (past || workedToday)  { st.opacity = 0.4; st.color = P.inkDisabled; }
        if (blocked && !past) { st.background = rgba(RED, P.dark ? 0.22 : 0.09); st.color = RED; st.textDecoration = 'line-through'; }
        // Holiday — colour from customColors.attendanceOverview.holidayColor
        if (holiday && !charged && !blocked) {
            st.background = rgba(holidayCol, 0.12); st.color = holidayCol; st.boxShadow = `inset 0 0 0 1px ${rgba(holidayCol, 0.30)}`;
        }
        // Off-days — three distinct identities so they never read as the same swatch:
        //  • Team Off (branch-configured weekday off) → teal tint + dashed ring (its own colour,
        //    plus a non-colour cue for accessibility)
        //  • Sunday → RED (matches the column header)
        //  • Saturday / other weekend → weekendCol from config
        if (offDay && !charged && !blocked && !holiday) {
            if (teamOff) {
                st.background     = rgba(teamOffCol, 0.12);
                st.color          = teamOffCol;
                // Dashed ring (via outline → no layout shift) is the non-colour cue that sets
                // Team Off apart from the SOLID rings on weekend/holiday cells.
                st.outline        = `1.5px dashed ${rgba(teamOffCol, 0.55)}`;
                st.outlineOffset  = '-3px';
                st.borderRadius   = rad;
            } else {
                const isSun   = wd === 0;
                const offCol  = isSun ? RED : weekendCol;
                const offAlpha = isSun ? 0.07 : 0.10;
                st.background = rgba(offCol, offAlpha);
                st.color      = offCol;
                st.boxShadow  = `inset 0 0 0 1px ${rgba(offCol, isSun ? 0.20 : 0.25)}`;
            }
        }
        // In-range uncharged — light accent band so the selection reads cohesively.
        if (inRange && !charged && !blocked && !holiday) {
            st.background = rgba(ACCENT, 0.07); st.color = ACCENT; st.borderRadius = 0;
            st.boxShadow  = `inset 0 0 0 1px ${rgba(ACCENT, 0.16)}`;
        }
        // Charged by leave type — solid config colour for all types including Unpaid.
        // Selected days are shown purely by this allocation colouring (no separate endpoint mark).
        if (charged) {
            st.background   = tintOf(seg!.leaveType, colorOf);
            st.color        = dtColor;
            st.borderRadius = 0;
            st.borderTop    = `1px solid ${borderOf(seg!.leaveType, colorOf)}`;
            st.borderBottom = `1px solid ${borderOf(seg!.leaveType, colorOf)}`;
        }
        // Sandwich — premium: soft Unpaid tint, readable dark numeral, 2px accent underline
        // (a small corner ribbon marks it in the cell body). Overrides the off-day tint.
        if (sandwichCharged) {
            const uBorder = borderOf('unpaid', colorOf);
            st.background   = tintOf('unpaid', colorOf);
            st.color        = sandwichCol;
            st.fontWeight   = 700;
            st.borderRadius = 0;
            st.boxShadow    = 'none';
            st.borderTop    = `1px solid ${uBorder}`;
            st.borderBottom = `2px solid ${sandwichCol}`;
        }
        // Today — solid ACCENT filled background with white numeral.
        if (iso === today && !past && !blocked && !workedToday) {
            st.background   = ACCENT;
            st.color        = '#fff'; // white on the solid ACCENT fill, in both themes
            st.fontWeight   = 700;
            st.borderRadius = rad;
            st.boxShadow    = 'none';
            st.borderTop    = 'none';
            st.borderBottom = 'none';
        }
        // Selection endpoints (Start/End) — CONNECTED caps so the range reads as ONE continuous
        // band from start to end. Keep the band/charged fill (never a detached white pill),
        // round only the OUTER edge (left for start, right for end), and mark it with a 2px ring
        // in the day's leave-type colour (navy when uncharged). A single-day selection is fully
        // rounded.
        if (isEp) {
            const isStartPt = iso === s.from;
            const isEndPt   = iso === s.to;
            const singleDay = !!(s.from && s.to && s.from === s.to);
            if (!charged && !sandwichCharged) {
                st.background = rgba(ACCENT, 0.10);
                st.color      = dtColor;
            }
            st.fontWeight   = 800;
            st.boxShadow    = `inset 0 0 0 2px ${dtColor}`;
            st.borderRadius = singleDay ? rad
                : isStartPt ? `${rad}px 0 0 ${rad}px`
                : isEndPt   ? `0 ${rad}px ${rad}px 0`
                : rad;
            st.borderTop    = 'none';
            st.borderBottom = 'none';
        }
        // Hover preview end — ghost highlight, indicates where range would end
        if (isHoverEnd) {
            st.background   = rgba(ACCENT, 0.18); st.color = ACCENT; st.fontWeight = 700;
            st.boxShadow    = `inset 0 0 0 2px ${rgba(ACCENT, 0.45)}`;
            st.borderRadius = `0 ${rad}px ${rad}px 0`;
            st.borderTop    = 'none'; st.borderBottom = 'none';
        }

        const tip = beforeDoj ? 'Before joining date' : blocked ? 'Already have a leave here'
            : workedToday ? 'Already checked in and out today — nothing left to take as leave'
            : beforeFy ? 'Backdating is limited to this financial year'
            : iso === today && todayHalfPM ? 'Checked in today — only the PM half can be taken'
            : backdated ? 'Backdated — late-apply penalty may apply'
            : isEp     ? `Selected${seg ? ` · ${seg.leaveType}` : ''}`
            : sandwichCharged ? 'Sandwich — excluded from salary (not a leave-balance day)'
            : charged  ? `Leave day — ${seg!.leaveType}`
            /* eslint-disable-next-line no-restricted-syntax -- calendar chrome, not data: this must read as a weekday + month name ("Mon, 24 Aug"); formatDate()'s YYYY.MM.DD would make the tooltip and the screen-reader label worse, not compliant. */
            : holiday  ? (holidayNames[iso] ? `${holidayNames[iso]} · ${new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}` : 'Public holiday') : teamOff ? 'Team off — not charged'
            : weekend  ? (wd === 0 ? 'Sunday' : 'Saturday') + ' — not charged' : 'Available';

        const tipColor = isEp ? dtColor
            : charged ? colorOf(seg!.leaveType)
            : sandwichCharged ? sandwichCol
            : holiday ? (holidayColors[iso] || holidayCol)
            : teamOff ? teamOffCol
            : null;
        cells.push(
            <button key={iso} type="button" style={st}
                aria-pressed={isEp || undefined}
                /* eslint-disable-next-line no-restricted-syntax -- calendar chrome, not data: this must read as a weekday + month name ("Mon, 24 Aug"); formatDate()'s YYYY.MM.DD would make the tooltip and the screen-reader label worse, not compliant. */
                aria-label={`${new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} — ${tip}`}
                onClick={(e) => {
                    // In view mode, clicking a date flips the same modal straight into edit (if
                    // the request is still editable) — no separate button needed.
                    if (isView) { if (canEditExisting && !past) onEditRequest(); return; }
                    // Touch has no hover: tapping an unavailable day explains itself rather than
                    // doing nothing at all.
                    if (disabled) { showTip(e.currentTarget, tip, tipColor, true); return; }
                    pick(iso);
                }}
                onMouseEnter={(e) => {
                    if (!disabled && isPickingRange) setHoverDate(iso);
                    if (!small) showTip(e.currentTarget, tip, tipColor);
                }}
                onMouseLeave={() => { setHoverDate(null); hideTip(); }}
                // Keyboard parity: tabbing through the grid surfaces the same label a mouse gets.
                onFocus={(e) => { if (!small) showTip(e.currentTarget, tip, tipColor); }}
                onBlur={hideTip}
            >
                {sandwichCharged && (
                    <span style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: `8px solid ${sandwichCol}`, borderLeft: '8px solid transparent' }} />
                )}
                {d}
            </button>
        );
    }

    const monthLabel = new Date(y, m, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const labels     = small ? ['M','T','W','T','F','S','S'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    // A day is non-working if it's a holiday or a configured off-day (weekend/team-off).
    const isNonWorkingISO = (i: string): boolean => {
        if (holidaySet.has(i)) return true;
        const w = new Date(i + 'T00:00:00').getDay();
        return hasWod ? workingAndOffDays[DAY_NAMES[w]] === '0' : (w === 0 || w === 6);
    };
    // The consecutive non-working run a holiday sits in — its span + length (≥3 ⇒ long weekend).
    const longWeekendRun = (i: string): { len: number; startISO: string; endISO: string } => {
        let len = 1, startISO = i, endISO = i;
        let cur = new Date(i + 'T00:00:00');
        for (;;) { const p = new Date(cur); p.setDate(p.getDate() - 1); const pi = `${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(p.getDate())}`; if (isNonWorkingISO(pi)) { len++; cur = p; startISO = pi; } else break; }
        cur = new Date(i + 'T00:00:00');
        for (;;) { const n = new Date(cur); n.setDate(n.getDate() + 1); const ni = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; if (isNonWorkingISO(ni)) { len++; cur = n; endISO = ni; } else break; }
        return { len, startISO, endISO };
    };
    /* eslint-disable-next-line no-restricted-syntax -- calendar chrome, not data: this must read as a weekday + month name ("Mon, 24 Aug"); formatDate()'s YYYY.MM.DD would make the tooltip and the screen-reader label worse, not compliant. */
    const fmtChipDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    // Holidays falling in the displayed month — rendered as rich chips below the calendar so the
    // configured name + duration are visible without hovering (important on touch devices).
    const monthHolidays = [...holidaySet]
        .filter((iso) => { const dt = new Date(iso + 'T00:00:00'); return dt.getFullYear() === y && dt.getMonth() === m; })
        .sort()
        .map((iso) => {
            const run  = longWeekendRun(iso);
            const long = run.len >= 3;
            return {
                iso,
                name: holidayNames[iso] || 'Public holiday',
                color: holidayColors[iso] || holidayCol,
                long,
                subtitle: long
                    ? `${fmtChipDate(run.startISO)} – ${fmtChipDate(run.endISO)} · ${run.len} Days`
                    : `${fmtChipDate(iso)} · 1 Day`,
            };
        });

    return (
        <div style={{ border: `1px solid ${P.line}`, borderTop: small ? `1px solid ${P.line}` : `3px solid ${ACCENT}`, borderRadius: 13, padding: small ? 12 : '15px 16px' }}>
            {hoverTip && createPortal(
                <div role="tooltip" style={{ position: 'fixed', left: Math.max(8, Math.min(hoverTip.x, window.innerWidth - 8)), top: hoverTip.y, transform: `translate(-50%, ${hoverTip.below ? '0' : '-100%'})`, zIndex: 100000, pointerEvents: 'none', background: P.tooltipBg, color: P.tooltipInk, padding: '7px 11px', borderRadius: 9, fontSize: 12, fontWeight: 600, lineHeight: 1.35, textAlign: 'left', boxShadow: '0 8px 24px rgba(0,0,0,0.24)', display: 'flex', alignItems: 'center', gap: 7, width: 'max-content', maxWidth: 250, fontFamily: PJK }}>
                    {hoverTip.color && <span style={{ width: 9, height: 9, borderRadius: '50%', background: hoverTip.color, flexShrink: 0 }} />}
                    <span>{hoverTip.text}</span>
                </div>,
                document.body,
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: small ? 10 : 12 }}>
                <button onClick={() => nav(-1)} style={navBtnSt(small, P)}>‹</button>
                <span style={{ fontSize: small ? 14 : 15, fontWeight: 700, color: P.ink, fontFamily: PJK }}>{monthLabel}</span>
                <button onClick={() => nav(1)} style={navBtnSt(small, P)}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: small ? 2 : 4, marginBottom: small ? 2 : 4 }}>
                {labels.map((w, i) => <div key={i} style={{ textAlign: 'center', fontSize: small ? 10 : 11, fontWeight: 600, color: i === 6 ? RED : P.inkMuted, textTransform: 'uppercase' }}>{w}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', columnGap: 0, rowGap: small ? 2 : 4 }}>{cells}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginTop: 13, paddingTop: 11, borderTop: `1px solid ${P.lineSoft}` }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: P.inkMuted, fontWeight: 500 }}><span style={{ width: 13, height: 13, borderRadius: 4, border: `1.5px solid ${ACCENT}`, flexShrink: 0 }} />Today</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: P.inkMuted, fontWeight: 500 }}><span style={{ width: 20, height: 12, borderRadius: 3, background: tintOf('casual', colorOf), border: `1px solid ${borderOf('casual', colorOf)}`, flexShrink: 0 }} />Charged</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: P.inkMuted, fontWeight: 500 }}><span style={{ width: 20, height: 12, borderRadius: 3, background: rgba(teamOffCol, 0.12), outline: `1.5px dashed ${rgba(teamOffCol, 0.55)}`, outlineOffset: '-2px', flexShrink: 0 }} />Team Off</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: P.inkMuted, fontWeight: 500 }}><span style={{ width: 20, height: 12, borderRadius: 3, background: rgba(holidayCol, 0.12), border: `1px solid ${rgba(holidayCol, 0.30)}`, flexShrink: 0 }} />Holiday</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: P.inkMuted, fontWeight: 500 }}><span style={{ width: 20, height: 12, borderRadius: 3, background: rgba(weekendCol, 0.10), border: `1px solid ${rgba(weekendCol, 0.25)}`, flexShrink: 0 }} />Saturday</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: P.inkMuted, fontWeight: 500 }}><span style={{ width: 20, height: 12, borderRadius: 3, background: rgba(RED, 0.07), border: `1px solid ${rgba(RED, 0.20)}`, flexShrink: 0 }} />Sunday</span>
                {sandwichDays > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: P.inkMuted, fontWeight: 500 }}><span style={{ position: 'relative', width: 20, height: 12, borderRadius: 3, background: tintOf('unpaid', colorOf), border: `1px solid ${borderOf('unpaid', colorOf)}`, borderBottom: `2px solid ${sandwichCol}`, flexShrink: 0, overflow: 'hidden' }}><span style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: `6px solid ${sandwichCol}`, borderLeft: '6px solid transparent' }} /></span>Sandwich · Unpaid</span>}
            </div>
            {small && monthHolidays.length > 0 && (
                <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${P.lineSoft}` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: P.inkFaint, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                        Holidays in {new Date(y, m, 1).toLocaleString('en-US', { month: 'long' })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {monthHolidays.map((h) => (
                            <div key={h.iso} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 12px', borderRadius: 999, border: `1px solid ${P.line}`, background: P.surfaceAlt, boxShadow: P.dark ? 'none' : '0 1px 2px rgba(16,24,40,0.05)' }}>
                                <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: rgba(h.color, 0.15), boxShadow: `inset 0 0 0 1px ${rgba(h.color, 0.25)}`, fontSize: 17, flexShrink: 0 }}>🎉</span>
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: P.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
                                        {h.long && <span style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 700, color: '#1d7a4d', background: 'rgba(29,122,77,0.10)', border: '1px solid rgba(29,122,77,0.22)', borderRadius: 99, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '.02em' }}>Long weekend</span>}
                                    </span>
                                    <span style={{ fontSize: 11.5, fontWeight: 600, color: h.color }}>{h.subtitle}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Memoised on a shallow prop compare. The caller keeps every non-primitive prop referentially
 * stable (useMemo for the sets/maps, useCallback for the handlers), so a parent render that does
 * not touch the calendar's inputs — typing a reason, opening the allocation panel, acknowledging a
 * penalty — costs nothing here.
 */
const LeaveCalendar = React.memo(LeaveCalendarBase);
export default LeaveCalendar;
