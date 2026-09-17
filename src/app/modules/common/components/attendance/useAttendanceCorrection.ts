/**
 * useAttendanceCorrection — the ONE behaviour behind every attendance-correction screen.
 *
 * ---------------------------------------------------------------------------
 * WHY IT EXISTS
 * ---------------------------------------------------------------------------
 * The app had five correction screens, built at different times on three kits:
 *
 *   calendar day panel          MUI kit, shared fields + rules     (Sep 2026)
 *   admin raise-for-employee    MUI kit, shared fields + rules     (Sep 2026)
 *   report table raise          react-bootstrap Modal + Formik     (original)
 *   open-request table edit     react-bootstrap Modal + Formik     (original)
 *   admin overview edit         Tailwind-twin dialog + Formik      (original)
 *
 * The September rebuild moved two of them onto a shared rule set and stopped. The
 * other three kept their own copies — which is how one screen offered "Both" and
 * another did not, one composed times in the employee's timezone and two in the
 * browser's, one blocked a check-out with no check-in and one did not, and an
 * untouched edit failed its own 24-hour validation because it was handed a 12-hour
 * display string. Same question, five answers.
 *
 * This hook is that behaviour, once. The screens differ only in what SURROUNDS it:
 * whether an admin picks the employee and the status, and whether it sits inline in
 * a panel or in a dialog.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE DAY COMES FROM
 * ---------------------------------------------------------------------------
 * `useAttendanceCalendar` — the calendar's own query. Every screen therefore sees the
 * day exactly as the calendar does (recorded punches, the pending request, and the
 * server's `canRaiseCorrection` verdict), usually off an already-warm cache. No
 * screen re-derives what a day holds from a table row's display strings again.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { createUpdateAttendanceRequest } from '@services/employee';
import { fetchWorkingMethods } from '@services/options';
import { useAttendanceCalendar } from '@hooks/useAttendanceCalendar';
import { validatePreviousDaysAttendance } from '@utils/attendanceValidation';
import { parseWorkingDays } from '@utils/workingDays';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { apiErrorMessage } from '@utils/apiError';
import { MUMBAI_TZ, formatTimeString } from '@utils/date';
import {
  applyKind,
  correctionContextFromDay,
  correctionRefusal,
  emptyDraft,
  firstOpenKind,
  kindBlockedReason,
  nothingLeftToRaise,
  recordedOrderProblem,
  seedDraft,
  validateAttendanceRequest,
  type AttendanceRequestDraft,
  type RequestKind,
} from './attendanceRequest';
import { buildCorrectionPayload, draftFromRequest, type CorrectionMode } from './correctionPayload';

/** Offered in this order: correcting ONE punch is the common case. */
export const CORRECTION_KINDS: readonly RequestKind[] = ['checkin', 'checkout', 'both'];

/** An existing request being edited. Raw stored instants only — never display strings. */
export interface EditableAttendanceRequest {
  id: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workingMethodId?: string | null;
  remarks?: string | null;
  status?: number | string | null;
}

export interface CorrectionSaveResult {
  id: string;
  employeeId: string;
  status: number;
  mode: CorrectionMode;
}

export interface UseAttendanceCorrectionArgs {
  /** The form is on screen. Seeding and the earlier-days gate run when this turns true. */
  open: boolean;
  /** The business day, `YYYY-MM-DD`. */
  date: string;
  /** Whose day. Empty until an admin has picked someone. */
  employeeId: string;
  /** Present: edit this request. Absent: raise a new one. */
  request?: EditableAttendanceRequest | null;
  /**
   * An admin acting for someone else: the approval status is chosen, the
   * earlier-days gate is skipped (it describes the employee's own obligation), and
   * the save is flagged as an admin update. The server decides what the actor may
   * actually set.
   */
  asAdmin?: boolean;
  /** Kind to open on, when it is open. */
  preferredKind?: RequestKind;
  /** Where the day was recorded, when the caller knows. */
  location?: { latitude?: number | null; longitude?: number | null } | null;
  successMessage?: string;
  onSaved?: (result: CorrectionSaveResult) => void | Promise<void>;
}

interface GateState {
  checking: boolean;
  blocked: boolean;
  blockingDate: string;
}

const OPEN_GATE: GateState = { checking: false, blocked: false, blockingDate: '' };

export function useAttendanceCorrection(args: UseAttendanceCorrectionArgs) {
  const { open, date, employeeId, request, asAdmin = false, preferredKind, location, successMessage, onSaved } = args;
  const mode: CorrectionMode = request ? 'edit' : 'raise';

  const me = useSelector((s: RootState) => s.employee?.currentEmployee);
  const companyId = me?.companyId ?? '';

  const [methods, setMethods] = useState<Array<{ value: string; label: string }>>([]);
  const [draft, setDraft] = useState<AttendanceRequestDraft>(() => emptyDraft('checkin'));
  const [status, setStatus] = useState('0');
  const [gate, setGate] = useState<GateState>(OPEN_GATE);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── The day, from the calendar's own query ─────────────────────────────── */
  const { data: calendar, isLoading: loadingDay } = useAttendanceCalendar(employeeId, dayjs(date).format('YYYY-MM'));
  const day = useMemo(() => calendar?.days?.find((d) => d.date === date) ?? null, [calendar, date]);
  const timezone = calendar?.timezone || me?.branches?.timezone || MUMBAI_TZ;

  const context = useMemo(() => correctionContextFromDay(day, request?.id), [day, request?.id]);
  // An admin raising for someone else is exempt from the window server-side, so the dialog
  // must not refuse what the server would accept. The server still decides authority: an
  // admin-flow user who is not actually an approver gets the server's refusal on submit.
  const refusal = useMemo(
    () => correctionRefusal(day, (iso) => dayjs(iso).format('D MMM YYYY'), { exemptFromWindow: asAdmin }),
    [day, asAdmin],
  );
  // Editing a request cannot be "nothing left": the halves on the form are its own.
  const nothingLeft = mode === 'raise' && nothingLeftToRaise(context);
  const kindBlocked = useCallback((k: RequestKind) => kindBlockedReason(k, context), [context]);

  /** The recorded day as the seeding rule wants it. */
  const record = useMemo(() => (day ? { ...day.actual, workMode: day.workMode } : null), [day]);

  /* ── Working methods — once, on first open ──────────────────────────────── */
  useEffect(() => {
    if (!open || methods.length) return;
    (async () => {
      try {
        const { data: { workingMethods } } = await fetchWorkingMethods();
        setMethods((workingMethods ?? []).map((m: { id: string; type: string }) => ({ value: m.id, label: m.type })));
      } catch {
        /* The dropdown stays empty and the form blocks on it — better than a silent wrong value. */
      }
    })();
  }, [open, methods.length]);

  /* ── A fresh sheet per opening ──────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    setAttempted(false);
    setGate(OPEN_GATE);
    setStatus(String(request?.status ?? 0));
  }, [open, date, employeeId, request?.id, request?.status]);

  /**
   * Seed ONCE per opening, when both the day and the methods have arrived.
   *
   * A key rather than a dependency list: the effect re-runs on every query settle,
   * and seeding again would overwrite a time the person had already typed.
   */
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      return;
    }
    if (!employeeId || loadingDay || !methods.length) return;
    const key = `${employeeId}:${date}:${request?.id ?? 'new'}`;
    if (seededFor.current === key) return;
    seededFor.current = key;

    if (request) {
      const fromRequest = draftFromRequest(request, timezone);
      setDraft(seedDraft(fromRequest, fromRequest.kind, { ...record, ...pickTimes(fromRequest) }, methods));
      return;
    }
    const kind = firstOpenKind(CORRECTION_KINDS, context, preferredKind);
    setDraft(seedDraft(emptyDraft(kind), kind, record, methods));
  }, [open, employeeId, date, request, loadingDay, methods, record, context, preferredKind, timezone]);

  /**
   * Kind changes re-seed; every other edit passes straight through. The shared fields
   * clear the half a kind no longer wants but cannot refill it from a record they
   * were never given — so this finishes the job, preferring the request's own times.
   */
  const onDraftChange = useCallback(
    (next: AttendanceRequestDraft) => {
      if (next.kind === draft.kind) return setDraft(next);
      const own = request ? pickTimes(draftFromRequest(request, timezone)) : {};
      setDraft(seedDraft(applyKind(next, next.kind), next.kind, { ...record, ...own }, methods));
    },
    [draft.kind, request, timezone, record, methods],
  );

  /* ── "Earlier gaps first" — the employee's own obligation, never an admin's ── */
  useEffect(() => {
    if (!open || asAdmin || !employeeId || employeeId !== me?.id) return;
    let cancelled = false;
    setGate({ checking: true, blocked: false, blockingDate: '' });
    (async () => {
      try {
        const result = await validatePreviousDaysAttendance({
          employeeId,
          selectedDate: date,
          dateOfJoining: String(me?.dateOfJoining ?? ''),
          workingAndOfDays: parseWorkingDays(me?.branches?.workingAndOffDays) || {},
          offDaysForTheBranch: [],
        });
        if (!cancelled) setGate({ checking: false, blocked: !result.canRaiseRequest, blockingDate: result.blockingDate });
      } catch {
        // Fail OPEN: a validation outage must not lock anyone out of correcting attendance.
        if (!cancelled) setGate(OPEN_GATE);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, asAdmin, employeeId, date, me?.id, me?.dateOfJoining, me?.branches?.workingAndOffDays]);

  /** Anything that makes the form itself pointless to show. */
  const blocked = Boolean(refusal) || gate.blocked || nothingLeft;
  const canSubmit = Boolean(employeeId) && !saving && !loadingDay && !gate.checking && !blocked;

  const submit = useCallback(async () => {
    setAttempted(true);

    if (!employeeId) return errorConfirmation('Select who this request is for.');
    if (!companyId) return errorConfirmation('Company ID is missing. Please refresh and try again.');
    if (refusal) return errorConfirmation(refusal);
    if (gate.blocked) return undefined;

    const problem =
      validateAttendanceRequest(draft) ??
      kindBlockedReason(draft.kind, context) ??
      recordedOrderProblem(draft, context, (t) => formatTimeString(t));
    if (problem) return errorConfirmation(problem);

    const effectiveStatus = asAdmin ? Number(status) || 0 : 0;
    setSaving(true);
    try {
      const payload = buildCorrectionPayload({
        mode,
        requestId: request?.id,
        draft,
        date,
        timezone,
        employeeId,
        companyId,
        status: effectiveStatus,
        location,
        updatedById: asAdmin ? me?.id : undefined,
      });
      const res = await createUpdateAttendanceRequest(payload as never, asAdmin);
      successConfirmation(successMessage ?? (mode === 'edit' ? 'Attendance request updated successfully' : 'Attendance request raised successfully'));
      await onSaved?.({
        id: (res as { data?: { id?: string } })?.data?.id || request?.id || '',
        employeeId,
        status: effectiveStatus,
        mode,
      });
    } catch (err) {
      // The policy's refusal is in the envelope's `detail`; `message` is only the status name
      // ("Bad request"). The shared extractor reads the right field.
      errorConfirmation(apiErrorMessage(err, 'Attendance request failed. Please try again later.'));
    } finally {
      setSaving(false);
    }
    return undefined;
  }, [employeeId, companyId, refusal, gate.blocked, draft, context, asAdmin, status, mode, request?.id, date, timezone, location, me?.id, successMessage, onSaved]);

  return {
    mode,
    asAdmin,
    date,
    employeeId,
    day,
    loadingDay: Boolean(employeeId) && loadingDay,
    timezone,
    methods,
    draft,
    onDraftChange,
    kinds: CORRECTION_KINDS,
    kindBlocked,
    context,
    refusal,
    nothingLeft,
    gate,
    blocked,
    status,
    setStatus,
    attempted,
    saving,
    canSubmit,
    submit,
  };
}

export type AttendanceCorrection = ReturnType<typeof useAttendanceCorrection>;

/** Only the halves a draft actually carries, as a record `seedDraft` can read. */
function pickTimes(d: AttendanceRequestDraft) {
  return {
    ...(d.checkIn ? { checkIn: d.checkIn } : {}),
    ...(d.checkOut ? { checkOut: d.checkOut } : {}),
  };
}
