/**
 * ApplyLeave.tsx — pixel-perfect match to Apply Leave (standalone-src).dc.html
 *
 * Visual deltas from the previous version:
 *  - Plus Jakarta Sans loaded + applied to all headings / big numbers
 *  - Right-rail heading: "LEAVE SUMMARY" (matches design)
 *  - Allocation title: "How this applies"
 *  - Financial card: big numbers with PJK, correct green/red coloring
 *  - LOP ack: custom styled button-checkbox (not native <input>)
 *  - Approval chain: initials avatar + ring shadow on first level
 *  - Sandbox note in dates card (when sandwich days > 0)
 *  - Fiscal year hint in header subtitle
 *  - No recap text above submit button (matches design)
 *  - Full 8-state calendar legend
 *  - Per-type solid tint bands + unpaid hatch + inset border rings
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { useApplyLeave, type ApplyLeaveState } from './useApplyLeave';
import { fetchSandwichPreview } from '@services/sandwichRule';
import { getSocket } from '@utils/socketClient';
import { parseWorkingDays } from '@utils/workingDays';
import { formatCurrencyDecimal } from '@utils/currency';
import { rgba, tintOf, borderOf, resolveLeaveTypeColor } from '@utils/leaveTypeColors';
import ApprovalStatusTracker from '@pages/approvals/ApprovalStatusTracker';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const ACCENT   = '#1E3A8A';
const RED      = '#A64652';
const RED_DARK = '#9C3F48';
const GREEN    = '#3E8E6E';
const PJK      = "'Plus Jakarta Sans', system-ui, sans-serif";

const BLANK: ApplyLeaveState = {
    from: null, to: null, isHalfDay: false, halfDaySession: null, firstDayHalf: null, lastDayHalf: null,
    leaveTypeId: undefined, leaveTypeName: undefined, excludeSick: false, reason: '', files: [],
};

/** Clear every half-day marker — used whenever the selected range changes. */
const HALF_RESET: Partial<ApplyLeaveState> = { isHalfDay: false, halfDaySession: null, firstDayHalf: null, lastDayHalf: null };

// ── Pure helpers ──────────────────────────────────────────────────────────────
const pad       = (n: number) => String(n).padStart(2, '0');
const isoOf     = (d: Date)   => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmt       = (iso?: string | null) => iso ? new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleString('en-US', { month: 'short', day: 'numeric' }) : '—';
const daysLabel = (n: number) => n === 1 ? '1 day' : `${n} days`;
const initialsOf = (name: string) =>
    (name || '').split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('');

// Calendar colour system — the SINGLE source of truth lives in utils/leaveTypeColors.
// rgba / tintOf / borderOf are imported; colorOf (below) delegates to resolveLeaveTypeColor.

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function expandRange(fromISO: string, toISO: string): string[] {
    const out: string[] = [];
    for (let d = new Date(fromISO + 'T00:00:00'); d <= new Date(toISO + 'T00:00:00'); d.setDate(d.getDate() + 1))
        out.push(isoOf(d));
    return out;
}
function useIsMobile(bp = 768) {
    const [m, setM] = useState(() => typeof window !== 'undefined' ? window.innerWidth < bp : false);
    useEffect(() => { const f = () => setM(window.innerWidth < bp); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, [bp]);
    return m;
}

const fmtCutoff = (hhmm: string): string => {
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

// One modal, three modes: apply (new), view (readonly detail of an existing request), edit
// (pre-filled + editable). `existing` seeds view/edit; `existing.segments` colours the calendar
// with what was actually booked (not a fresh preview). onEdit lets the host switch view→edit.
export interface ExistingLeaveSegment {
    id?: string;
    leaveType: string;
    days: number;
    isPaid: boolean;
    dateFrom?: string | null;
    dateTo?: string | null;
    isHalfDay?: boolean;               // this segment is a single-day half row
    halfDaySession?: 'AM' | 'PM' | null;
    status?: number;   // per-segment bifurcated decision: 0 pending · 1 approved · 2 rejected
}
export interface ExistingLeaveView {
    id?: string;               // a LeaveTracker segment id — used for the group-aware edit PUT
    requestGroupId?: string;
    dateFrom: string;   // YYYY-MM-DD
    dateTo: string;     // YYYY-MM-DD
    reason?: string | null;
    isHalfDay?: boolean;
    halfDaySession?: 'AM' | 'PM' | null;
    status?: number;    // 0 pending · 1 approved · 2 rejected (only pending is editable)
    canDelete?: boolean;       // group-level delete gate (lifecycle)
    segments?: ExistingLeaveSegment[];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ApplyLeave({ onClose, mode = 'apply', existing, onEdit, onDeleteSegment, initialDate, target, reviewActions, approvalInstanceId }: {
    onClose: () => void;
    mode?: 'apply' | 'view' | 'edit';
    existing?: ExistingLeaveView;
    onEdit?: () => void;
    onDeleteSegment?: (segmentId: string) => void;
    /** Pre-select a day when opening in apply mode (e.g. from a calendar cell). YYYY-MM-DD. */
    initialDate?: string;
    /** Apply/edit on behalf of another employee (admin). When set, overrides the Redux currentEmployee. */
    target?: { employeeId: string; branchId?: string; dateOfJoining?: string | Date | null; workingAndOffDays?: string | Record<string, string> | null };
    /**
     * Host-supplied action row rendered in the footer in VIEW mode only (above the primary
     * button). ApplyLeave stays domain-agnostic — the approval queue passes Approve/Reject here so
     * an approver can review and decide in one place. Empty for the employee's own view.
     */
    reviewActions?: React.ReactNode;
    /**
     * The REAL approval instance id for an existing request. In view mode this renders the actual
     * persisted chain (real approvers + who has acted) via ApprovalStatusTracker, instead of the
     * "who would approve if I applied" preview — which is resolved for the LOGGED-IN user (the
     * self-readable endpoint), so an approver reviewing someone else's leave would otherwise see
     * their OWN chain. Omit for apply mode (there's no instance yet → preview is correct).
     */
    approvalInstanceId?: string;
}) {
    // Load Plus Jakarta Sans once — matches the design's Google Fonts import
    useEffect(() => {
        if (!document.getElementById('__pjs-font')) {
            const l = document.createElement('link');
            l.id = '__pjs-font'; l.rel = 'stylesheet';
            l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap';
            document.head.appendChild(l);
        }
    }, []);

    // ── Redux data (overridable by `target` for admin apply-on-behalf) ──────────
    const ceId                 = useSelector((s: RootState) => s.employee.currentEmployee?.id) || '';
    const ceBranchId           = useSelector((s: RootState) => s.employee.currentEmployee?.branchId) || undefined;
    const ceDoj                = useSelector((s: RootState) => s.employee.currentEmployee?.dateOfJoining) || undefined;
    const ceWod                = useSelector((s: RootState) => s.employee.currentEmployee?.branches?.workingAndOffDays);
    const employeeId           = target?.employeeId || ceId;
    const branchId             = target?.branchId ?? ceBranchId;
    const dateOfJoiningRaw      = target?.dateOfJoining ?? ceDoj;
    const workingAndOffDaysRaw = target?.workingAndOffDays ?? ceWod;
    const publicHolidays       = useSelector((s: RootState) => s.attendanceStats?.publicHolidays) || [];
    const personalLeaves       = useSelector((s: RootState) => s.leaves.personalLeaves) || [];
    // ── Configurable color palette (single source of truth for all calendar & leave colours) ──
    const leaveTypeColors = useSelector((s: RootState) => (s as any).customColors?.leaveTypes);
    const calColors       = useSelector((s: RootState) => (s as any).customColors?.attendanceCalendar);
    const overviewColors  = useSelector((s: RootState) => (s as any).customColors?.attendanceOverview);

    const dateOfJoining = dateOfJoiningRaw ? String(dateOfJoiningRaw).slice(0, 10) : null;
    // Use the shared parseWorkingDays() helper (same as every other consumer of this value)
    // so a working-Saturday config survives whether the API delivers workingAndOffDays as a
    // JSON string or an already-parsed object. A raw JSON.parse threw on the object shape and
    // silently fell back to {}, which made the calendar treat every Saturday as an off-day.
    // Off-day/sandwich semantics are governed by wisetech-backend/src/utils/SANDWICH_RULES.md
    // (§2 "Off-day", Invariant I-9) — keep this parse path in lockstep with that spec.
    const workingAndOffDays = useMemo<Record<string, string>>(
        () => parseWorkingDays(workingAndOffDaysRaw),
        [workingAndOffDaysRaw],
    );
    const holidays = useMemo(
        () => (publicHolidays || []).map((h: any) => String(h?.date ?? '').slice(0, 10)).filter(Boolean),
        [publicHolidays],
    );
    // Maps a leave type name → its configured colour via the shared canonical resolver.
    const colorOf = useCallback((name: string): string => resolveLeaveTypeColor(name, leaveTypeColors as any), [leaveTypeColors]);
    // Config-derived calendar state colour tokens
    const sandwichCol  = leaveTypeColors?.sandwichColor  || '#92400E';
    const holidayCol   = overviewColors?.holidayColor    || '#9B59B6';
    const weekendCol   = calColors?.weekendColor         || '#9B59B6';

    const isMobile  = useIsMobile();
    const { loading, submitting, types, balances, priority, chain, myLeaves, holidayInfo, preview, submit, update, fetchStatus, lopPerDay, sameDayPenalty } = useApplyLeave({
        employeeId, branchId, dateOfJoining, workingAndOffDays, holidays,
    });

    const blockedDates = useMemo(() => {
        const s = new Set<string>();
        // Union of the shared slice (transformed rows from other views) and the modal's own
        // fresh fetch (raw rows). Both expose dateFrom/dateTo; raw rows also carry a numeric
        // status so rejected leaves are correctly excluded.
        [...(personalLeaves || []), ...(myLeaves || [])].forEach((l: any) => {
            if (Number(l?.status ?? l?.leaveStatus ?? 0) === 2) return;
            const from = String(l?.dateFrom ?? l?.fromDate ?? '').slice(0, 10);
            const to   = String(l?.dateTo   ?? l?.toDate   ?? from).slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(from)) expandRange(from, /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : from).forEach(d => s.add(d));
        });
        // View/edit: the request being viewed/edited must NOT count as a blocking overlap of itself.
        if (existing?.dateFrom) {
            const ef = existing.dateFrom.slice(0, 10);
            const et = (existing.dateTo || existing.dateFrom).slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(ef)) expandRange(ef, /^\d{4}-\d{2}-\d{2}$/.test(et) ? et : ef).forEach(d => s.delete(d));
        }
        return s;
    }, [personalLeaves, myLeaves, existing]);

    const [s,             setS]             = useState<ApplyLeaveState>(BLANK);
    const [cal,           setCal]           = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
    const [sickConfirmed, setSickConfirmed] = useState<null | boolean>(null);
    const [lopAck,        setLopAck]        = useState(false);
    const [penaltyAck,    setPenaltyAck]    = useState(false);
    const [hoverDate,     setHoverDate]     = useState<string | null>(null);
    const [hoverTip,      setHoverTip]      = useState<{ x: number; y: number; text: string; color: string | null } | null>(null);
    const [priorityOpen,  setPriorityOpen]  = useState(false);
    const [editing,       setEditing]       = useState(mode === 'edit');
    // View = readonly detail; edit = interactive (either opened directly or toggled from view).
    const isView = mode === 'view' && !editing;
    const isEdit = mode === 'edit' || editing;
    const canEditExisting = existing?.status === undefined || existing.status === 0; // pending only
    const [result,        setResult]        = useState<any>(null);
    const [status,        setStatus]        = useState<any>(null);
    const [error,         setError]         = useState<string | null>(null);
    const [pv,            setPv]            = useState<{ url: string; name: string; isImage: boolean } | null>(null);

    const reshape = (patch: Partial<ApplyLeaveState>) => { if (isView) return; setS(p => ({ ...p, ...patch })); setSickConfirmed(null); setLopAck(false); setPenaltyAck(false); };
    // Seed the calendar + form: from an existing request (view/edit), or a pre-selected day (apply).
    useEffect(() => {
        if ((mode === 'view' || mode === 'edit') && existing?.dateFrom) {
            // Restore boundary halves from the group's segments so the edit modal shows (and re-books)
            // the correct total, not a full-day span. A boundary half segment sits on the group's
            // first (dateFrom) or last (dateTo) day and carries isHalfDay + its session.
            const segs = existing.segments ?? [];
            const firstHalfSeg = segs.find(sg => sg.isHalfDay && sg.dateFrom === existing.dateFrom);
            const lastHalfSeg = segs.find(sg => sg.isHalfDay && (sg.dateTo ?? sg.dateFrom) === (existing.dateTo || existing.dateFrom));
            setS(p => ({
                ...p, from: existing.dateFrom, to: existing.dateTo || existing.dateFrom, reason: existing.reason ?? '',
                isHalfDay: !!existing.isHalfDay, halfDaySession: (existing.halfDaySession as any) ?? null,
                firstDayHalf: (firstHalfSeg?.halfDaySession as any) ?? null,
                lastDayHalf: (lastHalfSeg?.halfDaySession as any) ?? null,
            }));
            const d = new Date(existing.dateFrom + 'T00:00:00');
            setCal({ y: d.getFullYear(), m: d.getMonth() });
        } else if (mode === 'apply' && initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
            setS(p => ({ ...p, from: initialDate, to: initialDate }));
            const d = new Date(initialDate + 'T00:00:00');
            setCal({ y: d.getFullYear(), m: d.getMonth() });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Union of Redux-sourced holiday dates and the modal's own fresh fetch, so holidays always
    // mark even if no other screen pre-loaded them. Names come from the fresh fetch.
    const holidaySet  = useMemo(() => new Set([...(holidays || []), ...(holidayInfo?.dates || [])]), [holidays, holidayInfo]);
    const holidayNames = holidayInfo?.names ?? {};
    const holidayColors = holidayInfo?.colors ?? {};
    const unpaidLabel = useMemo(() => balances.find(b => !b.isPaid)?.leaveType ?? 'Unpaid', [balances]);
    const allocSubtitle = useMemo(
        () => (priority.length ? [...priority, unpaidLabel] : ['Unpaid']).join(' → '),
        [priority, unpaidLabel],
    );
    // Ordered fill chain for the expandable selector: paid priority types then Unpaid, each with
    // its live available balance (matched by name against the employee's balances).
    const priorityChips = useMemo(() => {
        const byName = new Map(balances.map((b) => [b.leaveType, b]));
        return [...priority, unpaidLabel].map((name, i) => {
            const b = byName.get(name);
            const isPaid = b ? b.isPaid : !/unpaid/i.test(name);
            return { name, order: i + 1, available: b?.available ?? 0, isPaid, known: !!b };
        });
    }, [balances, priority, unpaidLabel]);
    const today      = isoOf(new Date());
    const tomorrow   = isoOf(new Date(Date.now() + 864e5));

    const isPenaltyActive = useMemo(() => {
        if (!sameDayPenalty?.enabled || s.isHalfDay || !s.from) return false;
        // Backdated ("missed to apply") leaves are inherently late → penalty always applies.
        if (s.from < today) return true;
        // Future dates are never penalised.
        if (s.from !== today) return false;
        // Same-day: penalised only past the configured cutoff time. Mirrors the backend
        // (createLeaveRequest late-apply block).
        const [cutH, cutM] = sameDayPenalty.cutoffTime.split(':').map(Number);
        const now = new Date();
        return now.getHours() > cutH || (now.getHours() === cutH && now.getMinutes() >= cutM);
    }, [sameDayPenalty, s.from, s.isHalfDay, today]);
    useEffect(() => { if (!isPenaltyActive) setPenaltyAck(false); }, [isPenaltyActive]);
    // Configurable magnitude of the two day-based penalties (0.5 → "half-day", 1 → "full-day"); the
    // fixed-₹ type ignores it. Drives the acknowledgement notice so the employee sees the real charge.
    const penaltyDayWord = sameDayPenalty?.penaltyDays === 1 ? 'full-day' : 'half-day';

    // Sandwich preview: the BACKEND rule engine is the single source of truth for which interior
    // off-days get docked as Unpaid. Fetch on span change (debounced) and refetch live when the
    // rules are edited anywhere (sandwichRules:updated). Empty under the default rule set, so an
    // interior weekend simply counts (strictly rule-driven).
    const [sandwichExcluded, setSandwichExcluded] = useState<string[]>([]);
    useEffect(() => {
        // View mode is read-only: the persisted segments already encode the sandwich outcome, so
        // skip the preview fetch entirely (no network round-trip just to re-derive what's booked).
        if (isView) { setSandwichExcluded([]); return; }
        const from = s.from, to = s.to || s.from;
        if (!from || !to) { setSandwichExcluded([]); return; }
        let alive = true;
        const load = () => {
            fetchSandwichPreview({ dateFrom: from, dateTo: to, employeeId: employeeId || undefined, isHalfDay: s.isHalfDay })
                .then(r => { if (alive) setSandwichExcluded(r.excludedOffDayDates); })
                .catch(() => { if (alive) setSandwichExcluded([]); });
        };
        const t = setTimeout(load, 250);
        const socket = getSocket();
        const onRules = () => load();
        socket.on('sandwichRules:updated', onRules);
        return () => { alive = false; clearTimeout(t); socket.off('sandwichRules:updated', onRules); };
    }, [s.from, s.to, s.isHalfDay, employeeId]);

    // When editing, credit the request's own persisted days back into the balance + cumulative pool
    // before re-allocating — otherwise its still-pending days make its own leave type look
    // exhausted and the SAME span re-allocates to Unpaid, contradicting the view screen.
    const creditBack = useMemo(
        () => (isEdit && existing?.segments?.length
            ? existing.segments.map(seg => ({ leaveType: seg.leaveType, days: seg.days, isPaid: seg.isPaid }))
            : []),
        [isEdit, existing],
    );
    // View mode renders from the PERSISTED segments (viewTotals / viewSegByDate / mergedSegments),
    // so the allocation preview is pure wasted compute there — skip it when we have segments to show.
    // (Falls through to preview() only in the defensive case of a view with no segments.)
    const alloc = useMemo(
        () => (isView && existing?.segments?.length)
            ? null
            : preview({ ...s, excludeSick: sickConfirmed === false }, sandwichExcluded, creditBack),
        [isView, existing, s, sickConfirmed, preview, sandwichExcluded, creditBack],
    );
    const segByDate = useMemo(() => {
        const map = new Map<string, { leaveType: string; isPaid: boolean }>();
        // View mode: colour the calendar by what was actually booked (persisted segments).
        if (isView && existing?.segments) {
            for (const seg of existing.segments) {
                const from = String(seg.dateFrom || '').slice(0, 10);
                const to = String(seg.dateTo || seg.dateFrom || '').slice(0, 10);
                if (/^\d{4}-\d{2}-\d{2}$/.test(from)) expandRange(from, to || from).forEach(d => map.set(d, { leaveType: seg.leaveType, isPaid: seg.isPaid }));
            }
            return map;
        }
        alloc?.segments.forEach(seg => seg.dates.forEach(d => map.set(d, { leaveType: seg.leaveType, isPaid: seg.isPaid })));
        return map;
    }, [alloc, isView, existing]);
    // Merge segments with the same leaveType (e.g. two Unpaid rows: balance-exhaustion + sandwich).
    const mergedSegments = useMemo(() => {
        const src = (isView && existing?.segments)
            ? existing.segments.map(seg => ({ leaveType: seg.leaveType, days: seg.days, isPaid: seg.isPaid }))
            : alloc?.segments;
        if (!src) return [];
        const map = new Map<string, { leaveType: string; days: number; isPaid: boolean }>();
        for (const seg of src) {
            const ex = map.get(seg.leaveType);
            if (ex) ex.days += seg.days;
            else map.set(seg.leaveType, { leaveType: seg.leaveType, days: seg.days, isPaid: seg.isPaid });
        }
        return [...map.values()];
    }, [alloc?.segments, isView, existing]);

    // In view mode the totals come from the persisted segments, not a fresh preview.
    const viewTotals = useMemo(() => {
        if (!(isView && existing?.segments)) return null;
        const total = existing.segments.reduce((a, seg) => a + seg.days, 0);
        const paid = existing.segments.filter(seg => seg.isPaid).reduce((a, seg) => a + seg.days, 0);
        return { total, paid, unpaid: total - paid };
    }, [isView, existing]);

    const isSingleDay     = !!(s.from && (!s.to || s.to === s.from));
    const N               = viewTotals ? viewTotals.total : (alloc?.totalDays ?? 0);
    const sickDays        = alloc?.segments.find(x => /sick/i.test(x.leaveType))?.days ?? 0;
    const unpaidDays      = viewTotals ? viewTotals.unpaid : (alloc?.segments.filter(x => !x.isPaid).reduce((a, b) => a + b.days, 0) ?? 0);
    const paidDays        = viewTotals ? viewTotals.paid : (alloc?.paidDays ?? 0);
    const lopEstimate     = lopPerDay > 0 ? formatCurrencyDecimal(unpaidDays * lopPerDay) : '—';
    const sickPromptShow  = sickDays > 0 && sickConfirmed === null;
    const overlapConflict = useMemo(() => {
        if (!s.from) return false;
        return expandRange(s.from, s.to || s.from).some(d => blockedDates.has(d));
    }, [s.from, s.to, blockedDates]);
    const canSubmit = !!s.from && N > 0 && !alloc?.blocked && !overlapConflict &&
        !(s.isHalfDay && !s.halfDaySession) && !sickPromptShow && !(unpaidDays > 0 && !lopAck) &&
        (!isPenaltyActive || penaltyAck);

    // Sandwich days: interior off-days the backend rule engine excludes from SALARY (Model B —
    // salary-only, never booked as a leave-balance row; rule-driven, both bracketing leaves unpaid).
    const sandwichDateSet = useMemo(() => new Set(sandwichExcluded), [sandwichExcluded]);
    const sandwichDays = sandwichDateSet.size;

    // Fiscal year hint (Apr–Mar)
    const fiscalHint = useMemo(() => {
        const fy = cal.m >= 3 ? cal.y : cal.y - 1;
        return `FY ${fy}–${String(fy + 1).slice(2)} · Apr–Mar`;
    }, [cal]);

    const pick = useCallback((iso: string) => {
        setSickConfirmed(null); setLopAck(false); setPenaltyAck(false);
        setHoverDate(null);
        setS(p => {
            // Idle — first selection → single day (immediately submittable)
            if (!p.from) return { ...p, from: iso, to: iso, ...HALF_RESET };
            // Committed range → reset to a new single day
            if (p.to && p.to !== p.from) return { ...p, from: iso, to: iso, ...HALF_RESET };
            // Single day phase → tap same = deselect, tap other = extend range. Extending to a
            // multi-day range clears the single-day half flag (a boundary half is chosen separately).
            if (iso === p.from) return { ...p, from: null, to: null };
            if (iso < p.from) return { ...p, from: iso, to: p.from, ...HALF_RESET };
            return { ...p, to: iso, ...HALF_RESET };
        });
    }, []);
    // Quick-pick: set a single day and navigate to its month
    const pickQuick = useCallback((iso: string) => {
        if (blockedDates.has(iso)) return;
        setSickConfirmed(null); setLopAck(false); setPenaltyAck(false); setHoverDate(null);
        setS(p => ({ ...p, from: iso, to: iso, ...HALF_RESET }));
        const d = new Date(iso + 'T00:00:00');
        setCal({ y: d.getFullYear(), m: d.getMonth() });
    }, [blockedDates]);
    const nav = (d: number) => setCal(c => { let m = c.m + d, y = c.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } return { y, m }; });

    const onSubmit = async () => {
        if (!canSubmit) return; setError(null);
        try {
            const editId = existing?.id ?? existing?.requestGroupId;
            const r = (isEdit && editId)
                ? await update(editId, { ...s, excludeSick: sickConfirmed === false })
                : await submit({ ...s, excludeSick: sickConfirmed === false });
            setResult(r);
            const reqId = r?.requestGroupId ?? r?.id ?? existing?.requestGroupId;
            if (reqId) fetchStatus(reqId).then(setStatus).catch(() => {});
        } catch (e: any) { setError(e?.message ?? (isEdit ? 'Failed to update leave' : 'Failed to apply for leave')); }
    };
    const applyAnother = () => { setResult(null); setStatus(null); setS(BLANK); setSickConfirmed(null); setLopAck(false); setPenaltyAck(false); setError(null); };

    // Mode-aware header + primary button. View shows an Edit affordance (pending only); edit shows
    // Update; apply shows Submit. onPrimary routes accordingly (view→edit toggles the same modal).
    const headerTitle  = isView ? 'Leave Request' : isEdit ? 'Edit Leave Request' : 'Apply for Leave';
    const primaryLabel = submitting ? (isEdit ? 'Updating…' : 'Submitting…')
        : isView ? (canEditExisting ? 'Edit Request' : 'Close')
        : isEdit ? 'Update Request' : 'Submit Request';
    const primaryDisabled = isView ? false : (!canSubmit || submitting);
    const primaryActive   = isView ? true : canSubmit;
    const onPrimary = () => {
        if (isView) { if (canEditExisting) { onEdit ? onEdit() : setEditing(true); } else { onClose(); } return; }
        onSubmit();
    };

    // ── Sub-renderers ─────────────────────────────────────────────────────────

    // Auto-only selector — no individual type pills (matches design)
    const TypeSelector = ({ compact }: { compact?: boolean }) => compact ? (
        <button onClick={() => reshape({ leaveTypeId: undefined, leaveTypeName: undefined })} style={pillSt(true, ACCENT)}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'linear-gradient(135deg,#2F5E8C,#C2606B,#3E8E6E)' }} />Auto · paid first
        </button>
    ) : (
        <div style={{ borderRadius: 13, border: `1.5px solid ${ACCENT}`, background: rgba(ACCENT, 0.06), overflow: 'hidden' }}>
            <button onClick={() => setPriorityOpen((o) => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', cursor: 'pointer', width: '100%', boxSizing: 'border-box', border: 'none', background: 'transparent' }}>
                <span style={{ width: 13, height: 13, borderRadius: '50%', background: 'linear-gradient(135deg,#2F5E8C,#C2606B,#3E8E6E)', flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: '#2b2e30' }}>Auto · paid first</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#8b8e91', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Fills {allocSubtitle}</span>
                </span>
                <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, transition: 'transform .2s ease', transform: priorityOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▾</span>
            </button>
            {priorityOpen && (
                <div style={{ padding: '2px 14px 13px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {priorityChips.map((c) => (
                        <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 10px', borderRadius: 9, background: '#fff', border: '1px solid #eceef0' }}>
                            <span style={{ width: 19, height: 19, borderRadius: '50%', background: rgba(colorOf(c.name), 0.15), color: colorOf(c.name), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{c.order}</span>
                            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#3a3d40' }}>{c.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: !c.isPaid ? '#9aa0a6' : c.available > 0 ? GREEN : '#c0563f' }}>
                                {!c.isPaid ? 'Fallback' : c.known ? `${c.available} left` : '—'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const Calendar = ({ small }: { small?: boolean }) => {
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
            // Backdating is allowed but bounded to the CURRENT calendar month: a past date on/after
            // the joining date AND on/after the 1st of this month is SELECTABLE so an employee can
            // record a leave they forgot to apply for (the backend charges the late-apply penalty).
            // Dates in a prior month, before joining, or already taken stay blocked.
            const beforeMonth = iso < (today.slice(0, 7) + '-01');
            const backdated = iso < today && !beforeDoj && !beforeMonth;
            const blocked  = blockedDates.has(iso);
            const disabled = beforeDoj || blocked || beforeMonth;
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
                width: '100%', height: sz, border: 'none', background: '#fff', color: '#2b2e30',
                fontSize: small ? 13 : 14, fontWeight: 500, borderRadius: rad, cursor: disabled ? 'default' : 'pointer',
            };
            if (past)  { st.opacity = 0.4; st.color = '#a6a8ab'; }
            if (blocked && !past) { st.background = '#f3eaec'; st.color = RED; st.textDecoration = 'line-through'; }
            // Holiday — colour from customColors.attendanceOverview.holidayColor
            if (holiday && !charged && !blocked) {
                st.background = rgba(holidayCol, 0.12); st.color = holidayCol; st.boxShadow = `inset 0 0 0 1px ${rgba(holidayCol, 0.30)}`;
            }
            // Off-days — Sunday=RED (matches column header), Saturday/other=weekendCol from config
            if (offDay && !charged && !blocked && !holiday) {
                const isSun   = wd === 0;
                const offCol  = isSun ? RED : weekendCol;
                const offAlpha = isSun ? 0.07 : 0.10;
                st.background = rgba(offCol, offAlpha);
                st.color      = offCol;
                st.boxShadow  = `inset 0 0 0 1px ${rgba(offCol, isSun ? 0.20 : 0.25)}`;
                if (teamOff) st.borderBottom = '2px solid #c9ccd1';
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
            if (iso === today && !past && !blocked) {
                st.background   = ACCENT;
                st.color        = '#fff';
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

            const tip = beforeDoj ? 'Before joining date' : blocked ? 'Already have a leave here' : beforeMonth ? 'Backdating is limited to the current month' : backdated ? 'Backdated — late-apply penalty may apply'
                : isEp     ? `Selected${seg ? ` · ${seg.leaveType}` : ''}`
                : sandwichCharged ? 'Sandwich — excluded from salary (not a leave-balance day)'
                : charged  ? `Leave day — ${seg!.leaveType}`
                : holiday  ? (holidayNames[iso] ? `${holidayNames[iso]} · ${new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}` : 'Public holiday') : teamOff ? 'Team off — not charged'
                : weekend  ? (wd === 0 ? 'Sunday' : 'Saturday') + ' — not charged' : 'Available';

            const tipColor = isEp ? dtColor
                : charged ? colorOf(seg!.leaveType)
                : sandwichCharged ? sandwichCol
                : holiday ? (holidayColors[iso] || holidayCol)
                : null;
            cells.push(
                <button key={iso} title={small ? tip : undefined} style={st}
                    onClick={() => {
                        // In view mode, clicking a date flips the same modal straight into edit (if
                        // the request is still editable) — no separate button needed.
                        if (isView) { if (canEditExisting && !past) { onEdit ? onEdit() : setEditing(true); } return; }
                        if (!disabled) pick(iso);
                    }}
                    onMouseEnter={(e) => {
                        if (!disabled && isPickingRange) setHoverDate(iso);
                        if (!small) setHoverTip({ x: e.clientX, y: e.clientY, text: tip, color: tipColor });
                    }}
                    onMouseMove={(e) => { if (!small) setHoverTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t)); }}
                    onMouseLeave={() => { setHoverDate(null); setHoverTip(null); }}
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
            <div style={{ border: '1px solid #e6e6e8', borderTop: small ? '1px solid #e6e6e8' : `3px solid ${ACCENT}`, borderRadius: 13, padding: small ? 12 : '15px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: small ? 10 : 12 }}>
                    <button onClick={() => nav(-1)} style={navBtnSt(small)}>‹</button>
                    <span style={{ fontSize: small ? 14 : 15, fontWeight: 700, color: '#2b2e30', fontFamily: PJK }}>{monthLabel}</span>
                    <button onClick={() => nav(1)} style={navBtnSt(small)}>›</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: small ? 2 : 4, marginBottom: small ? 2 : 4 }}>
                    {labels.map((w, i) => <div key={i} style={{ textAlign: 'center', fontSize: small ? 10 : 11, fontWeight: 600, color: i === 6 ? RED : '#727577', textTransform: 'uppercase' }}>{w}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', columnGap: 0, rowGap: small ? 2 : 4 }}>{cells}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginTop: 13, paddingTop: 11, borderTop: '1px solid #f0f0f1' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#727577', fontWeight: 500 }}><span style={{ width: 13, height: 13, borderRadius: 4, border: `1.5px solid ${ACCENT}`, flexShrink: 0 }} />Today</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#727577', fontWeight: 500 }}><span style={{ width: 20, height: 12, borderRadius: 3, background: tintOf('casual', colorOf), border: `1px solid ${borderOf('casual', colorOf)}`, flexShrink: 0 }} />Charged</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#727577', fontWeight: 500 }}><span style={{ width: 20, height: 12, borderRadius: 3, background: rgba(weekendCol, 0.10), border: `1px solid ${rgba(weekendCol, 0.25)}`, borderBottom: '2px solid #c9ccd1', flexShrink: 0 }} />Team Off</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#727577', fontWeight: 500 }}><span style={{ width: 20, height: 12, borderRadius: 3, background: rgba(holidayCol, 0.12), border: `1px solid ${rgba(holidayCol, 0.30)}`, flexShrink: 0 }} />Holiday</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#727577', fontWeight: 500 }}><span style={{ width: 20, height: 12, borderRadius: 3, background: rgba(weekendCol, 0.10), border: `1px solid ${rgba(weekendCol, 0.25)}`, flexShrink: 0 }} />Saturday</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#727577', fontWeight: 500 }}><span style={{ width: 20, height: 12, borderRadius: 3, background: rgba(RED, 0.07), border: `1px solid ${rgba(RED, 0.20)}`, flexShrink: 0 }} />Sunday</span>
                    {sandwichDays > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#727577', fontWeight: 500 }}><span style={{ position: 'relative', width: 20, height: 12, borderRadius: 3, background: tintOf('unpaid', colorOf), border: `1px solid ${borderOf('unpaid', colorOf)}`, borderBottom: `2px solid ${sandwichCol}`, flexShrink: 0, overflow: 'hidden' }}><span style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: `6px solid ${sandwichCol}`, borderLeft: '6px solid transparent' }} /></span>Sandwich · Unpaid</span>}
                </div>
                {small && monthHolidays.length > 0 && (
                    <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid #f0f0f1' }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#8b8e91', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                            Holidays in {new Date(y, m, 1).toLocaleString('en-US', { month: 'long' })}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {monthHolidays.map((h) => (
                                <div key={h.iso} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 12px', borderRadius: 999, border: '1px solid #eceef0', background: '#fff', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' }}>
                                    <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: rgba(h.color, 0.15), boxShadow: `inset 0 0 0 1px ${rgba(h.color, 0.25)}`, fontSize: 17, flexShrink: 0 }}>🎉</span>
                                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#2b2e30', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
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
    };

    // View mode is a read-only review (the approver/employee is inspecting a booked leave, not
    // applying) — the half-day toggle is an applicant input, so it disappears. The persisted
    // half-day state is already reflected in the ViewBreakdown.
    // Session picker (AM/PM) shared by the single-day toggle and the boundary-half pickers.
    const SessionButtons = ({ value, onPick }: { value: 'AM' | 'PM' | null; onPick: (v: 'AM' | 'PM') => void }) => (
        <div style={{ display: 'flex', gap: isMobile ? 7 : 8, marginTop: isMobile ? 9 : 8 }}>
            {(['AM', 'PM'] as const).map(ss => (
                <button key={ss} onClick={() => onPick(ss)}
                    style={{ flex: 1, padding: 9, borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: value === ss ? `1.5px solid ${ACCENT}` : '1px solid #e6e6e8', background: value === ss ? rgba(ACCENT, 0.08) : '#fff', color: value === ss ? ACCENT : '#5f6266' }}>
                    {ss === 'AM' ? 'First half · AM' : 'Second half · PM'}
                </button>
            ))}
        </div>
    );

    // A half-day toggle for one boundary day of a multi-day range (first or last).
    const BoundaryHalf = ({ label, value, onChange }: { label: string; value: 'AM' | 'PM' | null; onChange: (v: 'AM' | 'PM' | null) => void }) => (
        <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: isMobile ? 12.5 : 13, fontWeight: 600, color: '#2b2e30' }}>{label} half <span style={{ color: '#8b8e91', fontWeight: 500 }}>· 0.5 day</span></span>
                <Toggle on={!!value} color={ACCENT} onClick={() => onChange(value ? null : 'AM')} />
            </div>
            {value && <SessionButtons value={value} onPick={onChange} />}
        </div>
    );

    const HalfDay = () => (isView || !s.from) ? null : (
        <div style={{ marginTop: isMobile ? 11 : 12, padding: isMobile ? '11px 13px' : '12px 14px', border: '1px solid #e6e6e8', borderRadius: isMobile ? 11 : 12 }}>
            {isSingleDay ? (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 600, color: '#2b2e30' }}>
                            {isMobile ? 'Half day' : <>Apply as half day <span style={{ color: '#8b8e91', fontWeight: 500 }}>· 0.5 day</span></>}
                        </span>
                        <Toggle on={s.isHalfDay} color={ACCENT} onClick={() => reshape({ isHalfDay: !s.isHalfDay, halfDaySession: null })} />
                    </div>
                    {s.isHalfDay && (
                        <>
                            {!isMobile && <div style={{ fontSize: 11.5, fontWeight: 600, color: '#8b8e91', margin: '11px 0 7px' }}>Which half? <span style={{ color: RED }}>*</span></div>}
                            <SessionButtons value={s.halfDaySession} onPick={(ss) => setS(p => ({ ...p, halfDaySession: ss }))} />
                        </>
                    )}
                </>
            ) : (
                <>
                    <div style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 600, color: '#2b2e30' }}>
                        Half-day boundary <span style={{ color: '#8b8e91', fontWeight: 500 }}>· optional</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#8b8e91', marginTop: 3 }}>Take a half-day on the first and/or last day of the range.</div>
                    <BoundaryHalf label="First day" value={s.firstDayHalf ?? null} onChange={(v) => reshape({ firstDayHalf: v })} />
                    <BoundaryHalf label="Last day" value={s.lastDayHalf ?? null} onChange={(v) => reshape({ lastDayHalf: v })} />
                </>
            )}
        </div>
    );

    const Allocation = ({ compact }: { compact?: boolean }) => (N <= 0 || !alloc) ? null : (
        <div style={compact ? { border: '1px solid #e9e9eb', borderRadius: 11, padding: '9px 11px', background: '#fff' } : railCardSt()}>
            {!compact && <CardHead icon="🧮" title="How this applies" tint={ACCENT} />}
            <div style={{ height: compact ? 8 : 11, borderRadius: 999, overflow: 'hidden', display: 'flex', background: '#eef0f2', marginBottom: compact ? 7 : 11 }}>
                {mergedSegments.map((seg, i) => <span key={i} style={{ width: `${(seg.days / N) * 100}%`, background: colorOf(seg.leaveType) }} />)}
            </div>
            {compact ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 13px' }}>
                    {mergedSegments.map((seg, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: '#5f6266' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorOf(seg.leaveType) }} />
                            {seg.isPaid ? seg.leaveType.replace(/ Leaves?$/i, '') : 'Unpaid'} · <strong style={{ color: '#2b2e30' }}>{daysLabel(seg.days)}</strong>
                        </span>
                    ))}
                </div>
            ) : (
                mergedSegments.map((seg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 7 : 0 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorOf(seg.leaveType), flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: seg.isPaid ? '#5f6266' : RED_DARK }}>{seg.isPaid ? seg.leaveType : 'Unpaid (LOP)'}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2b2e30' }}>{daysLabel(seg.days)}</span>
                    </div>
                ))
            )}
        </div>
    );

    const SickConfirm = () => !sickPromptShow ? null : (
        <div style={{ background: '#f4f6f9', border: '1px solid #e3e7ed', borderRadius: isMobile ? 12 : 13, padding: isMobile ? '12px 13px' : '13px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: RED, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2b2e30' }}>Includes {daysLabel(sickDays)} of Sick{isMobile ? '' : ' Leave'}</span>
            </div>
            {!isMobile && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, lineHeight: 1.45 }}>Sick leave is meant for illness. Use it for these days?</div>}
            <div style={{ display: 'flex', gap: 7, marginTop: isMobile ? 9 : 10 }}>
                <button onClick={() => setSickConfirmed(true)} style={{ flex: 1, padding: 8, borderRadius: 9, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Yes, sick</button>
                <button onClick={() => setSickConfirmed(false)} style={{ flex: 1, padding: 8, borderRadius: 9, border: '1px solid #d8dce2', background: '#fff', color: '#5f6266', fontWeight: 700, cursor: 'pointer' }}>Use other</button>
            </div>
        </div>
    );

    // Consistent section header for the right-rail summary cards: tinted icon chip + uppercase title.
    const CardHead = ({ icon, title, tint, right }: { icon: React.ReactNode; title: string; tint: string; right?: React.ReactNode }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <span style={{ width: 27, height: 27, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: rgba(tint, 0.12), fontSize: 13, flexShrink: 0 }}>{icon}</span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#2b2e30', fontFamily: PJK, textTransform: 'uppercase', letterSpacing: '.035em' }}>{title}</span>
            {right}
        </div>
    );
    const railCardSt = (accentBg?: boolean, accentBorder?: boolean): React.CSSProperties => ({
        background: accentBg ? '#fbeef0' : '#fff',
        border: `1px solid ${accentBorder ? '#eccdd2' : '#e9e9eb'}`,
        borderRadius: 14,
        padding: '14px 15px',
        boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
    });

    // View-mode per-segment breakdown — what was actually booked, with per-segment bifurcated
    // status and per-segment delete (migrated from the old detail modal so ApplyLeave view fully
    // replaces it). Delete/status are gated exactly as the group list gates them.
    const ViewBreakdown = () => {
        const segs = existing?.segments ?? [];
        if (!segs.length) return null;
        return (
            <div style={railCardSt()}>
                <CardHead icon="🧮" title="Allocation breakdown" tint={ACCENT} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {segs.map((seg, i) => (
                        <div key={seg.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 11px', border: '1px solid #eceef0', borderLeft: `3px solid ${colorOf(seg.leaveType)}`, borderRadius: 9 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: colorOf(seg.leaveType), borderRadius: 8, padding: '3px 9px' }}>{seg.leaveType}</span>
                            <span style={{ fontSize: 11, color: '#8b8e91' }}>{seg.dateFrom ? fmt(seg.dateFrom) : ''}{seg.dateTo && seg.dateTo !== seg.dateFrom ? ` – ${fmt(seg.dateTo)}` : ''}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, marginLeft: 'auto' }}>{seg.days} {seg.days === 1 ? 'day' : 'days'}</span>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: seg.isPaid ? GREEN : RED, background: rgba(seg.isPaid ? GREEN : RED, 0.10), borderRadius: 99, padding: '1px 8px' }}>{seg.isPaid ? 'Paid' : 'Unpaid'}</span>
                            {seg.status === 1 && <span style={{ fontSize: 10.5, fontWeight: 700, color: GREEN }}>✓ Approved</span>}
                            {seg.status === 2 && <span style={{ fontSize: 10.5, fontWeight: 700, color: RED }}>✕ Rejected</span>}
                            {existing?.canDelete && segs.length > 1 && (seg.status === 0 || seg.status === undefined) && seg.id && onDeleteSegment && (
                                <button onClick={() => onDeleteSegment(seg.id!)} title="Remove this segment"
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: RED, fontSize: 15, lineHeight: 1, padding: '0 2px' }}>×</button>
                            )}
                        </div>
                    ))}
                </div>
                {existing?.reason && <div style={{ marginTop: 10, fontSize: 12, color: '#5f6266' }}><span style={{ fontWeight: 700, color: '#8b8e91' }}>Remark: </span>{existing.reason}</div>}
            </div>
        );
    };

    const Financial = ({ compact }: { compact?: boolean }) => {
        const hasUnpaid    = unpaidDays > 0;
        const finColor     = hasUnpaid ? RED_DARK : GREEN;
        const deductColor  = hasUnpaid ? RED_DARK : GREEN;
        const unpaidColor  = hasUnpaid ? RED_DARK : '#bfbec1';
        return (
            <div style={compact ? { background: hasUnpaid ? '#fbeef0' : '#fff', border: `1px solid ${hasUnpaid ? '#eccdd2' : '#e9e9eb'}`, borderRadius: 11, padding: '11px 13px' } : railCardSt(hasUnpaid, hasUnpaid)}>
                {compact ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: finColor }}>{hasUnpaid ? '⚠️' : '✓'} Financial impact</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: deductColor, fontFamily: PJK }}>{lopEstimate}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#5f6266', marginTop: 3 }}>
                            {N <= 0 ? 'Select dates to see impact' : hasUnpaid ? `${daysLabel(unpaidDays)} not covered` : 'Fully covered by paid leave'}
                        </div>
                    </>
                ) : (
                    <>
                        <CardHead icon={hasUnpaid ? '⚠️' : '✓'} title="Financial impact" tint={finColor} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <div style={{ fontSize: 19, fontWeight: 800, color: ACCENT, lineHeight: 1, fontFamily: PJK }}>{N > 0 ? paidDays : '0'}</div>
                                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#8b8e91', textTransform: 'uppercase', letterSpacing: '.03em', marginTop: 4 }}>Paid days</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 19, fontWeight: 800, color: unpaidColor, lineHeight: 1, fontFamily: PJK }}>{N > 0 ? unpaidDays : '0'}</div>
                                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#8b8e91', textTransform: 'uppercase', letterSpacing: '.03em', marginTop: 4 }}>Unpaid days</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 11, borderTop: `1px solid ${hasUnpaid ? '#eccdd2' : '#ececed'}` }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#5f6266' }}>Est. salary deduction</span>
                            <span style={{ fontSize: 15, fontWeight: 800, color: deductColor, fontFamily: PJK }}>{lopEstimate}</span>
                        </div>
                    </>
                )}
                {unpaidDays > 0 && (
                    /* Custom styled checkbox-button matching the design */
                    <button onClick={() => setLopAck(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 9, marginTop: compact ? 9 : 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                        <span style={{ width: 19, height: 19, borderRadius: 5, border: lopAck ? 'none' : `1.5px solid ${RED}`, background: lopAck ? RED : '#fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {lopAck ? '✓' : ''}
                        </span>
                        <span style={{ fontSize: compact ? 11.5 : 12, fontWeight: 600, color: '#7e333f' }}>
                            {compact ? 'I understand' : `I understand ${daysLabel(unpaidDays)} will be unpaid`}
                        </span>
                    </button>
                )}
            </div>
        );
    };

    const Attachments = ({ idSuffix }: { idSuffix: string }) => isView ? null : (
        <div>
            <input id={`leave-files-${idSuffix}`} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }}
                onChange={e => setS(p => ({ ...p, files: [...p.files, ...Array.from(e.target.files ?? [])] }))} />
            {s.files.length > 0 && !isMobile && (
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8b8e91', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 7 }}>
                    Attachments · {s.files.length}
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 7 }}>
                {s.files.map((f, i) => {
                    const isImage = f.type.startsWith('image/'), url = URL.createObjectURL(f);
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: isMobile ? '8px 10px' : '9px 11px', border: '1px solid #e6e6e8', borderRadius: 10 }}>
                            <div onClick={() => setPv({ url, name: f.name, isImage })} style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                                {isImage
                                    ? <img src={url} alt={f.name} style={{ width: isMobile ? 28 : 30, height: isMobile ? 28 : 30, borderRadius: 7, objectFit: 'cover', border: '1px solid #e6e6e8' }} />
                                    : <span style={{ width: isMobile ? 28 : 30, height: isMobile ? 28 : 30, borderRadius: 7, background: '#eaf0f6', color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📄</span>}
                                <span style={{ flex: 1, minWidth: 0, fontSize: isMobile ? 12.5 : 13, fontWeight: 600, color: '#2b2e30', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                                <span style={{ fontSize: 11.5, color: '#9aa0a6', flexShrink: 0 }}>{Math.round(f.size / 1024)} KB</span>
                                {!isMobile && <span style={{ fontSize: 11, color: '#2F5E8C', fontWeight: 700, flexShrink: 0 }}>Preview</span>}
                            </div>
                            <span onClick={() => setS(p => ({ ...p, files: p.files.filter((_, j) => j !== i) }))}
                                style={{ cursor: 'pointer', color: RED, fontSize: 17, lineHeight: 1, flexShrink: 0, padding: '0 4px' }}>×</span>
                        </div>
                    );
                })}
                <label htmlFor={`leave-files-${idSuffix}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: isMobile ? '9px 12px' : '9px 13px', borderRadius: 10, border: '1px dashed #cdd0d4', color: '#727577', fontSize: isMobile ? 12.5 : 13, fontWeight: 600, cursor: 'pointer', width: 'max-content', marginTop: isMobile ? 8 : 0 }}>
                    ＋ {s.files.length ? 'Add another document' : 'Attach document'}
                </label>
            </div>
        </div>
    );

    const ApprovalChain = ({ compact }: { compact?: boolean }) => {
        const displayChain = chain.length ? chain : [{ level: 1, approverName: 'Reporting manager', approverRole: '', approverId: '' } as any];
        return (
            <div style={compact ? { background: '#fff', border: '1px solid #e9e9eb', borderRadius: 11, padding: '11px 12px' } : railCardSt()}>
                {compact ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8b8e91', textTransform: 'uppercase', letterSpacing: '.03em' }}>Approval flow</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#2F5E8C' }}>{displayChain.length} level{displayChain.length !== 1 ? 's' : ''}</span>
                    </div>
                ) : (
                    <CardHead icon="👤" title="Approval flow" tint={ACCENT}
                        right={<span style={{ fontSize: 11, fontWeight: 700, color: '#2F5E8C' }}>{displayChain.length} level{displayChain.length !== 1 ? 's' : ''}</span>} />
                )}
                {compact ? (
                    <span style={{ fontSize: 12, color: '#5f6266', fontWeight: 600 }}>{displayChain.map(c => c.approverName).join('  →  ')}</span>
                ) : (
                    displayChain.map((c, i) => {
                        const first = i === 0, last = i === displayChain.length - 1;
                        const initials = initialsOf(c.approverName);
                        return (
                            <div key={c.level ?? i} style={{ display: 'flex', gap: 11 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                    <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: first ? ACCENT : '#eef1f5', color: first ? '#fff' : '#8b8e91', boxShadow: first ? `0 0 0 3px ${rgba(ACCENT, 0.14)}` : 'none' }}>
                                        {initials || c.level}
                                    </div>
                                    {!last && <div style={{ width: 2, flexGrow: 1, minHeight: 14, background: '#e6e8ec', margin: '3px 0' }} />}
                                </div>
                                <div style={{ paddingBottom: last ? 0 : 13, minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2b2e30', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.approverName}</span>
                                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap', color: first ? ACCENT : '#9aa0a6', background: first ? rgba(ACCENT, 0.12) : '#f2f3f4' }}>
                                            {first ? 'Next to review' : `Level ${c.level ?? i + 1}`}
                                        </span>
                                    </div>
                                    {c.approverRole && <div style={{ fontSize: 11, color: '#8b8e91', marginTop: 1 }}>{c.approverRole}</div>}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        );
    };

    // View mode with a real instance → the actual persisted chain (real approvers + who's acted),
    // not the self-resolved preview. Apply/edit or no instance → the preview ApprovalChain.
    const ApprovalFlowView = ({ compact }: { compact?: boolean }) =>
        (isView && approvalInstanceId)
            ? <div style={railCardSt()}><ApprovalStatusTracker instanceId={approvalInstanceId} compact /></div>
            : <ApprovalChain compact={compact} />;

    const Lightbox = () => !pv ? null : (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(20,24,33,.74)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 22 : 30, borderRadius: isMobile ? '24px 24px 0 0' : 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 560, marginBottom: 12 }}>
                <span style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pv.name}</span>
                <button onClick={() => setPv(null)} style={{ width: 32, height: 32, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,.16)', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>×</button>
            </div>
            {pv.isImage
                ? <img src={pv.url} alt={pv.name} style={{ maxWidth: '100%', maxHeight: '62vh', borderRadius: 12, boxShadow: '0 18px 50px rgba(0,0,0,.45)' }} />
                : <div style={{ background: '#fff', borderRadius: 14, padding: '34px 40px', textAlign: 'center' }}>
                    <div style={{ fontSize: 44, marginBottom: 10 }}>📄</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#2b2e30', marginBottom: 14 }}>{pv.name}</div>
                    <a href={pv.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 10, background: ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>Open in new tab</a>
                </div>}
        </div>
    );

    const Header = () => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 22px', background: 'linear-gradient(120deg, #16224a 0%, #1E3A8A 100%)', borderBottom: '3px solid #3B82F6' }}>
            <div>
                <div style={{ color: '#fff', fontSize: 16.5, fontWeight: 700, fontFamily: PJK }}>{headerTitle}</div>
                <div style={{ color: 'rgba(255,255,255,.72)', fontSize: 12, fontWeight: 500, marginTop: 1 }}>{fiscalHint}</div>
            </div>
            <button onClick={onClose} style={{ width: 31, height: 31, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,.14)', color: '#fff', cursor: 'pointer', fontSize: 17 }}>×</button>
        </div>
    );

    const Success = ({ sheet }: { sheet?: boolean }) => {
        const segs = (result.segments ?? []).map((x: any) => `${x.leaveType} ${x.days}`).join(' · ');
        return (
            <div style={{ padding: sheet ? '30px 26px 40px' : '48px 32px 44px', textAlign: 'center' }}>
                <div style={{ width: sheet ? 56 : 58, height: sheet ? 56 : 58, borderRadius: '50%', background: rgba(ACCENT, 0.1), color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: sheet ? 28 : 30, fontWeight: 700, margin: '0 auto 14px' }}>✓</div>
                <div style={{ fontSize: sheet ? 18 : 21, fontWeight: 800, color: '#2b2e30', fontFamily: PJK }}>Leave request submitted</div>
                <div style={{ color: '#727577', marginTop: 7, fontSize: sheet ? 13 : 14 }}>Routed through {chain.length || 1} approval level(s){chain[0]?.approverName ? ` — starting with ${chain[0].approverName}` : ''}.</div>
                <div style={{ marginTop: 12, fontWeight: 600, color: '#5f6266', fontSize: 13 }}>{segs}</div>
                {result.unpaidDays > 0 && (
                    <div style={{ color: RED_DARK, marginTop: 6, fontWeight: 600, fontSize: 13 }}>
                        Includes {result.unpaidDays} unpaid day(s){lopPerDay > 0 ? ` · est. ${formatCurrencyDecimal(result.unpaidDays * lopPerDay)}` : ''}.
                    </div>
                )}
                {status?.levels && !sheet && (
                    <div style={{ marginTop: 18, textAlign: 'left', maxWidth: 360, margin: '18px auto 0' }}>
                        {status.levels.map((l: any) => (
                            <div key={l.level} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f0f0f1' }}>
                                <span>{l.level}. {l.approverName ?? chain.find(c => c.level === l.level)?.approverName ?? l.approverId}</span>
                                <span style={{ fontWeight: 700, color: l.status === 'approved' ? GREEN : l.status === 'rejected' ? RED : '#9aa0a6' }}>{l.status ?? 'pending'}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
                    <button onClick={applyAnother} style={{ padding: '11px 22px', borderRadius: 11, border: '1px solid #e6e6e8', background: '#fff', color: '#5f6266', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Apply another</button>
                    <button onClick={onClose} style={{ padding: '11px 22px', borderRadius: 11, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Done</button>
                </div>
            </div>
        );
    };

    // ── Mobile layout ─────────────────────────────────────────────────────────
    if (isMobile) {
        const sheet: React.CSSProperties = { background: '#fff', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', maxHeight: '92vh', width: '100%', overflow: 'hidden', position: 'relative' };
        const grab = <div style={{ padding: '11px 0 4px', flexShrink: 0 }}><div style={{ width: 38, height: 4, borderRadius: 99, background: '#dcdee1', margin: '0 auto' }} /></div>;
        if (loading) return <div style={sheet}>{grab}<div style={{ padding: 40, textAlign: 'center', color: '#727577' }}>Loading…</div></div>;
        if (result)  return <div style={sheet}>{grab}<Success sheet /></div>;
        return (
            <div style={sheet}>
                {grab}
                <Lightbox />
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#2b2e30', fontFamily: PJK }}>{headerTitle}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#727577' }}>{!s.from ? '' : N === 0 ? '0 days' : daysLabel(N)}</span>
                    </div>
                    {!isView && <div style={{ marginBottom: 13 }}><TypeSelector /></div>}
                    <div style={{ display: isView ? 'none' : 'flex', gap: 8, marginBottom: 10 }}>
                        {[{ label: 'Today', iso: today }, { label: 'Tomorrow', iso: tomorrow }].map(({ label, iso }) => {
                            const active = s.from === iso && s.to === iso;
                            const off = blockedDates.has(iso);
                            return (
                                <button key={label} onClick={() => pickQuick(iso)} disabled={off}
                                    style={{ padding: '6px 16px', borderRadius: 99, border: `1.5px solid ${active ? ACCENT : '#e0e2e4'}`, background: active ? rgba(ACCENT, 0.10) : '#fff', color: active ? ACCENT : off ? '#c0c2c5' : '#5f6266', fontSize: 13, fontWeight: active ? 700 : 500, cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.5 : 1 }}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    <Calendar small />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11, padding: '10px 12px', border: '1px solid #e6e6e8', borderRadius: 11 }}>
                        <span style={{ fontSize: 12.5, color: '#5f6266' }}><span style={{ color: '#8b8e91' }}>Dates: </span><strong>{!s.from ? 'None' : s.to && s.to !== s.from ? `${fmt(s.from)} → ${fmt(s.to)}` : fmt(s.from)}</strong></span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#2b2e30' }}>{!s.from ? '—' : N === 0 ? '0 days' : daysLabel(N)}</span>
                    </div>
                    <HalfDay />
                    <div style={{ marginTop: 11 }}>{isView ? <ViewBreakdown /> : <Allocation compact />}</div>
                    <div style={{ marginTop: 11 }}><SickConfirm /></div>
                    {isPenaltyActive && sameDayPenalty && (
                        <div style={{ marginTop: 11, padding: '11px 13px', borderRadius: 11, border: '1px solid #f5c518', background: '#fffbea' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#7a5c00', marginBottom: 5 }}>Late Leave Apply Notice</div>
                            <p style={{ fontSize: 12, color: '#5f6266', margin: '0 0 8px' }}>
                                This leave request is being submitted after the{' '}
                                <strong>{fmtCutoff(sameDayPenalty.cutoffTime)}</strong> same-day deadline.
                                As per company policy, a{' '}
                                <strong>
                                    {sameDayPenalty.penaltyType === 'halfDaySalaryDeduction'
                                        ? `${penaltyDayWord} salary deduction (Loss of Pay)`
                                        : sameDayPenalty.penaltyType === 'halfPaidLeave'
                                        ? `${penaltyDayWord} paid leave deduction`
                                        : `₹${(sameDayPenalty.fixedDeductionAmount ?? 0).toLocaleString('en-IN')} salary deduction`}
                                </strong>{' '}
                                will be automatically applied to this request.
                            </p>
                            <button onClick={() => setPenaltyAck(v => !v)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                <span style={{ width: 18, height: 18, borderRadius: 4, border: penaltyAck ? 'none' : '1.5px solid #c9a100', background: penaltyAck ? '#c9a100' : '#fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                    {penaltyAck ? '✓' : ''}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#7a5c00' }}>I acknowledge the late apply penalty</span>
                            </button>
                        </div>
                    )}
                    {!isView && (
                        <textarea value={s.reason} onChange={e => setS(p => ({ ...p, reason: e.target.value }))} placeholder="Reason (optional)…"
                            style={{ width: '100%', minHeight: 48, resize: 'none', border: '1px solid #e6e6e8', borderRadius: 11, padding: '10px 12px', fontSize: 13, outline: 'none', marginTop: 11, lineHeight: 1.5 }} />
                    )}
                    <div style={{ marginTop: 8 }}><Attachments idSuffix="m" /></div>
                    <div style={{ marginTop: 12 }}><ApprovalFlowView compact /></div>
                </div>
                <div style={{ flexShrink: 0, padding: '11px 16px 16px', borderTop: '1px solid #eef0f1', background: '#fff' }}>
                    <div style={{ marginBottom: 10 }}><Financial compact /></div>
                    {isView && reviewActions && <div style={{ marginBottom: 10 }}>{reviewActions}</div>}
                    {error && <div style={errBox}>{error}</div>}
                    <button disabled={primaryDisabled} onClick={onPrimary}
                        style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, background: primaryActive ? ACCENT : '#cdd0d4', cursor: !primaryDisabled ? 'pointer' : 'not-allowed' }}>
                        {primaryLabel}
                    </button>
                </div>
            </div>
        );
    }

    // ── Desktop layout ────────────────────────────────────────────────────────
    const card: React.CSSProperties = { width: 960, maxWidth: '100%', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 18px 48px rgba(43,46,48,.16)', position: 'relative' };
    if (loading) return <div style={card}><Header /><div style={{ padding: 48, textAlign: 'center', color: '#727577' }}>Loading…</div></div>;
    if (result)  return <div style={card}><Header /><Success /></div>;
    return (
        <div style={card}>
            <Header />
            <Lightbox />
            {hoverTip && createPortal(
                <div style={{ position: 'fixed', left: Math.min(hoverTip.x + 14, window.innerWidth - 270), top: hoverTip.y + 16, zIndex: 100000, pointerEvents: 'none', background: '#2b2e30', color: '#fff', padding: '7px 11px', borderRadius: 9, fontSize: 12, fontWeight: 600, lineHeight: 1.3, boxShadow: '0 8px 24px rgba(0,0,0,0.24)', display: 'flex', alignItems: 'center', gap: 7, maxWidth: 250, fontFamily: PJK }}>
                    {hoverTip.color && <span style={{ width: 9, height: 9, borderRadius: '50%', background: hoverTip.color, flexShrink: 0 }} />}
                    <span>{hoverTip.text}</span>
                </div>,
                document.body,
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 332px' }}>
                {/* Left — form */}
                <div style={{ padding: '22px 24px', maxHeight: '78vh', overflowY: 'auto' }}>
                    {/* "Apply using" is the allocation-strategy chooser for a NEW request. In view
                        mode there is nothing to allocate — the ViewBreakdown on the right shows what
                        was actually booked — so it (and the applicant chrome below) is hidden. */}
                    {!isView && (
                        <>
                            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#8b8e91', marginBottom: 10, fontFamily: PJK }}>Apply using</div>
                            <TypeSelector />
                        </>
                    )}
                    <div style={{ display: isView ? 'none' : 'flex', gap: 8, marginTop: 16, marginBottom: 4 }}>
                        {[{ label: 'Today', iso: today }, { label: 'Tomorrow', iso: tomorrow }].map(({ label, iso }) => {
                            const active = s.from === iso && s.to === iso;
                            const off = blockedDates.has(iso);
                            return (
                                <button key={label} onClick={() => pickQuick(iso)} disabled={off}
                                    style={{ padding: '6px 16px', borderRadius: 99, border: `1.5px solid ${active ? ACCENT : '#e0e2e4'}`, background: active ? rgba(ACCENT, 0.10) : '#fff', color: active ? ACCENT : off ? '#c0c2c5' : '#5f6266', fontSize: 13, fontWeight: active ? 700 : 500, cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.5 : 1 }}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: 8 }}><Calendar /></div>
                    <HalfDay />
                    {/* Sick confirm — appears in left column below calendar (matches design) */}
                    {sickPromptShow && <div style={{ marginTop: 12 }}><SickConfirm /></div>}
                    {/* Late leave penalty warning */}
                    {isPenaltyActive && sameDayPenalty && (
                        <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 11, border: '1px solid #f5c518', background: '#fffbea' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#7a5c00', marginBottom: 5 }}>Late Leave Apply Notice</div>
                            <p style={{ fontSize: 12.5, color: '#5f6266', margin: '0 0 9px' }}>
                                This leave request is being submitted after the{' '}
                                <strong>{fmtCutoff(sameDayPenalty.cutoffTime)}</strong> same-day deadline.
                                As per company policy, a{' '}
                                <strong>
                                    {sameDayPenalty.penaltyType === 'halfDaySalaryDeduction'
                                        ? `${penaltyDayWord} salary deduction (Loss of Pay)`
                                        : sameDayPenalty.penaltyType === 'halfPaidLeave'
                                        ? `${penaltyDayWord} paid leave deduction`
                                        : `₹${(sameDayPenalty.fixedDeductionAmount ?? 0).toLocaleString('en-IN')} salary deduction`}
                                </strong>{' '}
                                will be automatically applied to this request.
                            </p>
                            <button onClick={() => setPenaltyAck(v => !v)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                <span style={{ width: 18, height: 18, borderRadius: 4, border: penaltyAck ? 'none' : '1.5px solid #c9a100', background: penaltyAck ? '#c9a100' : '#fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                    {penaltyAck ? '✓' : ''}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#7a5c00' }}>I acknowledge the late apply penalty</span>
                            </button>
                        </div>
                    )}
                    {/* Remarks — an applicant input; view mode shows the persisted remark inside
                        the ViewBreakdown instead. */}
                    {!isView && (
                        <div style={{ marginTop: 14 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5f6266', marginBottom: 6 }}>Remarks</label>
                            <textarea value={s.reason} onChange={e => setS(p => ({ ...p, reason: e.target.value }))} placeholder="Add a note for your manager (optional)…"
                                style={{ width: '100%', minHeight: 58, resize: 'none', border: '1px solid #e6e6e8', borderRadius: 11, padding: '10px 13px', fontSize: 13.5, color: '#2b2e30', outline: 'none', lineHeight: 1.5 }} />
                        </div>
                    )}
                    <div style={{ marginTop: 12 }}><Attachments idSuffix="d" /></div>
                </div>

                {/* Right — summary rail */}
                <div style={{ background: '#f6f7f9', borderLeft: '1px solid #ececed', padding: 20, display: 'flex', flexDirection: 'column', gap: 13, maxHeight: '78vh', overflowY: 'auto' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#8b8e91', fontFamily: PJK }}>Leave summary</div>

                    {/* Dates + sandwich note */}
                    <div style={railCardSt()}>
                        <CardHead icon="📅" title="Dates & Duration" tint={ACCENT} />
                        <DRow label="Dates" value={!s.from ? 'None' : s.to && s.to !== s.from ? `${fmt(s.from)} → ${fmt(s.to)}` : fmt(s.from)} />
                        <DRow label="Chargeable days" value={!s.from ? '—' : N === 0 ? '0 days' : daysLabel(N)} mt />
                        {sandwichDays > 0 && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 9, paddingTop: 9, borderTop: '1px solid #f0f0f1' }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'repeating-linear-gradient(45deg,#fbf0d9 0 3px,#f6e4be 3px 6px)', flexShrink: 0, marginTop: 1 }} />
                                <span style={{ fontSize: 11.5, color: '#8a5a1e', fontWeight: 500, lineHeight: 1.4 }}>{daysLabel(sandwichDays)} of weekend/holiday between your dates — excluded from salary (sandwich rule). Not added to your leave balance.</span>
                            </div>
                        )}
                    </div>

                    {/* Allocation */}
                    {isView ? <ViewBreakdown /> : <Allocation />}
                    {/* Financial impact */}
                    <Financial />
                    {/* Overlap / block errors */}
                    {overlapConflict && <div style={errBox}>This range overlaps a leave you already have.</div>}
                    {alloc?.blocked && <div style={errBox}>{alloc.blocked.reason}</div>}
                    {/* Approval flow */}
                    <ApprovalFlowView />
                    {error && <div style={errBox}>{error}</div>}

                    {/* Primary action — sticky so it's always visible without scrolling the rail. */}
                    <div style={{ position: 'sticky', bottom: 0, zIndex: 2, marginTop: 'auto', paddingTop: 12, paddingBottom: 2, background: '#f6f7f9', borderTop: '1px solid #ececed' }}>
                        {isView && reviewActions && <div style={{ marginBottom: 10 }}>{reviewActions}</div>}
                        <button disabled={primaryDisabled} onClick={onPrimary}
                            style={{ width: '100%', padding: 13, borderRadius: 11, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, background: primaryActive ? ACCENT : '#cdd0d4', cursor: !primaryDisabled ? 'pointer' : 'not-allowed' }}>
                            {primaryLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Tiny shared atoms ─────────────────────────────────────────────────────────
const pillSt = (sel: boolean, color: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 999,
    cursor: 'pointer', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
    border: sel ? `1.5px solid ${color}` : '1px solid #e6e6e8',
    background: sel ? `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.08)` : '#fff',
    color: sel ? color : '#5f6266',
});
const navBtnSt = (small?: boolean): React.CSSProperties => ({
    width: small ? 34 : 38, height: small ? 34 : 38,
    border: '1px solid #e6e6e8', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 16,
});
const errBox: React.CSSProperties = {
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: '#991b1b',
};
const Toggle = ({ on, color, onClick }: { on: boolean; color: string; onClick: () => void }) => (
    <button onClick={onClick} style={{ width: 42, height: 24, borderRadius: 999, background: on ? color : '#d9d9d9', position: 'relative', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.25)', transition: 'left .15s' }} />
    </button>
);
const DRow = ({ label, value, mt }: { label: string; value: string; mt?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: mt ? 7 : 0 }}>
        <span style={{ fontSize: 12, color: '#8b8e91', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2b2e30' }}>{value}</span>
    </div>
);

