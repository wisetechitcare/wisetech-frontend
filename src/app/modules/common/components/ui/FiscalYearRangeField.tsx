/**
 * FiscalYearRangeField — the one control for editing an org / prefix fiscal year.
 *
 * Visual source of truth: kit Components/DatePicker → Range (`@/ds/ui/date-picker`) —
 * pill field, popover calendar, fiscal preset (default Apr–Mar). Behaviour source of
 * truth: fiscal-year range UX (start/end pick machine, draft until confirm, typed/paste).
 *
 * Value is the stored range string `"YYYY-MM-DD to YYYY-MM-DD"` (see `@utils/fiscalYearRange`).
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
} from 'react';
import { parseDate, type CalendarDate } from '@internationalized/date';

import { Badge } from '@/ds/ui/badge';
import { DateRangePicker, type DateRangePreset } from '@/ds/ui/date-picker';

import { formatDate } from '@utils/dateFormats';
import {
  composeOrderedFiscalYearRange,
  DEFAULT_FISCAL_START_MONTH,
  getDefaultFiscalYear,
  getFiscalPresetLabel,
  isAcceptableFiscalYearRange,
  parseTypedFiscalDate,
  parseTypedFiscalRangeInput,
  splitFiscalYearRange,
  toCanonicalFiscalYearRange,
  type FiscalYearRangeValue,
} from '@utils/fiscalYearRange';
import {
  FiscalYearRangeKeyboardPanel,
  FiscalYearRangeModeToggle,
  FiscalYearRangePopoverHeader,
  type FiscalYearPickerMode,
} from './FiscalYearRangePopover';
import {
  applyFiscalCalendarDayPick,
  type FiscalRangeBound,
} from './fiscalYearRangePick';

/** React Aria calendar grid: Monday-first week + British month names. */
const CALENDAR_LOCALE = 'en-GB';

/**
 * Kit segment typing emits partial years (`0002-…`) before the user finishes.
 * Years below this floor are treated as incomplete and never committed.
 */
const MIN_COMPLETE_YEAR = 1900;

export interface FiscalYearRangeFieldProps {
  /** Stored range (`YYYY-MM-DD to YYYY-MM-DD` or legacy `DD/MM/YYYY to …`). */
  value: FiscalYearRangeValue;
  onChange: (value: FiscalYearRangeValue) => void;
  /** Field label. Default "Fiscal Year". `""` hides it (toolbars) — the field is still named for screen readers. */
  label?: string;
  /** Bound chip / keyboard label for the start side. Default "Fiscal Year Start". */
  startLabel?: string;
  /** Bound chip / keyboard label for the end side. Default "Fiscal Year End". */
  endLabel?: string;
  /**
   * Calendar month the fiscal year starts (1=Jan … 12=Dec). Default 4 (April).
   * Drives the one-click fiscal preset range and its label.
   */
  fiscalStartMonth?: number;
  /**
   * Override the fiscal preset chip label. When omitted, derived from
   * `fiscalStartMonth` (e.g. 4 → `"Apr–Mar"`).
   */
  fiscalPresetLabel?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  /** Shown as the error message while `error`, else as the field's hint. */
  helperText?: string;
  /** Called when the field loses focus or its calendar closes (Formik touched). */
  onBlur?: () => void;
  /** `compact` = the kit's compact density (tighter spacing) for toolbars. */
  density?: 'comfortable' | 'compact';
  /** The value differs from what is saved: shows an "Unsaved" warning badge beside the field. */
  changed?: boolean;
  /** @deprecated The kit field takes its colours from the theme. Kept for call sites. */
  tone?: unknown;
}

type CalendarRange = { start: CalendarDate; end: CalendarDate };

const isAfterDay = (a: CalendarDate, b: CalendarDate): boolean => a.compare(b) > 0;

/** Order a range so start ≤ end (accept writes chronologically). */
export function orderFiscalCalendarRange(range: CalendarRange): CalendarRange {
  if (!isAfterDay(range.start, range.end)) return range;
  return { start: range.end, end: range.start };
}

/** Stored string → kit range value; null when either side is missing or unreadable. */
export function fiscalRangeFromString(value: string | null | undefined): CalendarRange | null {
  const canonical = toCanonicalFiscalYearRange(value) || String(value ?? '');
  const { from, to } = splitFiscalYearRange(canonical);
  if (!from || !to) return null;
  try {
    return orderFiscalCalendarRange({ start: parseDate(from), end: parseDate(to) });
  } catch {
    return null;
  }
}

/**
 * Kit range value → stored string, or `undefined` while it is not worth storing yet.
 * Complete ranges are always written chronologically as ISO `"YYYY-MM-DD to YYYY-MM-DD"`.
 */
const isCompleteCalendarYear = (day: CalendarDate): boolean => day.year >= MIN_COMPLETE_YEAR;

export function fiscalStringFromRange(range: CalendarRange | null): string | undefined {
  if (!range) return '';
  if (!isCompleteCalendarYear(range.start) || !isCompleteCalendarYear(range.end)) {
    return undefined;
  }
  const ordered = orderFiscalCalendarRange(range);
  const wire = composeOrderedFiscalYearRange(ordered.start.toString(), ordered.end.toString());
  if (!wire) return '';
  const { from, to } = splitFiscalYearRange(wire);
  if (!isAcceptableFiscalYearRange(from, to)) return undefined;
  return wire;
}

/** One-click fiscal preset for the kit range picker (default Apr–Mar). */
export function buildFiscalYearPresets(
  fiscalStartMonth: number = DEFAULT_FISCAL_START_MONTH,
  presetLabel?: string,
): DateRangePreset[] {
  const range = fiscalRangeFromString(getDefaultFiscalYear(fiscalStartMonth));
  if (!range) return [];
  const label = presetLabel?.trim() || getFiscalPresetLabel(fiscalStartMonth);
  return [
    {
      label,
      value: range,
      title: `Set to current ${label} fiscal year`,
    },
  ];
}

const seedFromValue = (value: FiscalYearRangeValue): {
  from: CalendarDate | null;
  to: CalendarDate | null;
  bound: FiscalRangeBound;
} => {
  const range = fiscalRangeFromString(value);
  if (!range) return { from: null, to: null, bound: 'start' };
  return { from: range.start, to: range.end, bound: 'start' };
};

/** Picker-visible value: incomplete end is painted as a same-day anchor so hover-preview still works. */
const toPickerValue = (
  from: CalendarDate | null,
  to: CalendarDate | null,
): CalendarRange | null => {
  if (!from) return null;
  if (!to) return { start: from, end: from };
  return orderFiscalCalendarRange({ start: from, end: to });
};

const toDisplayText = (day: CalendarDate | null): string =>
  day ? formatDate(day.toString(), '') : '';

const canAcceptDraft = (from: CalendarDate | null, to: CalendarDate | null): boolean => {
  if (!from || !to) return false;
  return from.compare(to) <= 0;
};

export function FiscalYearRangeField({
  value,
  onChange,
  label = 'Fiscal Year',
  startLabel = 'Fiscal Year Start',
  endLabel = 'Fiscal Year End',
  fiscalStartMonth = DEFAULT_FISCAL_START_MONTH,
  fiscalPresetLabel,
  required,
  disabled,
  error,
  helperText,
  onBlur,
  density = 'comfortable',
  changed = false,
}: FiscalYearRangeFieldProps) {
  const seeded = useMemo(() => seedFromValue(value), [value]);
  const presets = useMemo(
    () => buildFiscalYearPresets(fiscalStartMonth, fiscalPresetLabel),
    [fiscalStartMonth, fiscalPresetLabel],
  );

  const [draftFrom, setDraftFrom] = useState<CalendarDate | null>(seeded.from);
  const [draftTo, setDraftTo] = useState<CalendarDate | null>(seeded.to);
  const [bound, setBound] = useState<FiscalRangeBound>(seeded.bound);
  const [mode, setMode] = useState<FiscalYearPickerMode>('calendar');
  const [textFrom, setTextFrom] = useState<string>(toDisplayText(seeded.from));
  const [textTo, setTextTo] = useState<string>(toDisplayText(seeded.to));

  const openRef = useRef<boolean>(false);
  const pendingCommitRef = useRef<boolean>(false);
  const snapshotRef = useRef<FiscalYearRangeValue>(value);
  const draftFromRef = useRef<CalendarDate | null>(draftFrom);
  const draftToRef = useRef<CalendarDate | null>(draftTo);
  const boundRef = useRef<FiscalRangeBound>(bound);

  const syncDraft = (
    from: CalendarDate | null,
    to: CalendarDate | null,
    nextBound: FiscalRangeBound,
    syncText = true,
  ) => {
    draftFromRef.current = from;
    draftToRef.current = to;
    boundRef.current = nextBound;
    setDraftFrom(from);
    setDraftTo(to);
    setBound(nextBound);
    if (syncText) {
      setTextFrom(toDisplayText(from));
      setTextTo(toDisplayText(to));
    }
  };

  const setActiveBound = (nextBound: FiscalRangeBound) => {
    boundRef.current = nextBound;
    setBound(nextBound);
  };

  useEffect(() => {
    // Outside an open session, keep draft aligned with the committed prop.
    if (openRef.current) return;
    const next = seedFromValue(value);
    syncDraft(next.from, next.to, next.bound);
  }, [value]);

  const commitIfAcceptable = (from: CalendarDate | null, to: CalendarDate | null): boolean => {
    if (!from || !to) {
      if (!from && !to && value) {
        onChange('');
        return true;
      }
      return false;
    }
    const ordered = orderFiscalCalendarRange({ start: from, end: to });
    const stored = fiscalStringFromRange(ordered);
    if (stored === undefined || stored === '') return false;
    syncDraft(ordered.start, ordered.end, 'start');
    if (stored !== value) onChange(stored);
    return true;
  };

  const discardToSnapshot = () => {
    const next = seedFromValue(snapshotRef.current);
    syncDraft(next.from, next.to, next.bound);
  };

  /**
   * Calendar / preset path while the popover is open: apply the fiscal pick machine,
   * keep changes in draft only (commit happens on OK).
   */
  const applyCalendarRange = (next: CalendarRange | null) => {
    if (!next) {
      syncDraft(null, null, 'start');
      return;
    }
    // Segment typing emits partial years (0002-…) — never treat those as calendar picks.
    if (!isCompleteCalendarYear(next.start) || !isCompleteCalendarYear(next.end)) return;

    const prevFrom = draftFromRef.current;
    const prevTo = draftToRef.current;
    const activeBound = boundRef.current;
    const sameDay = next.start.compare(next.end) === 0;
    const ordered = orderFiscalCalendarRange(next);

    // Completing a pending end: start was anchored, RAC returns {start: from, end: clicked}.
    const isPendingEndComplete = Boolean(
      prevFrom && !prevTo && !sameDay && next.start.compare(prevFrom) === 0,
    );

    // One-shot full range (fiscal preset / wholesale replace) — not a day-pick step.
    if (!sameDay && !isPendingEndComplete) {
      syncDraft(ordered.start, ordered.end, 'start');
      return;
    }

    // End bound + complete range + RAC "restart" click → replace End only.
    if (activeBound === 'end' && prevFrom && prevTo && sameDay) {
      syncDraft(prevFrom, next.start, 'start');
      return;
    }

    const clicked: CalendarDate = isPendingEndComplete || !sameDay ? next.end : next.start;
    const picked = applyFiscalCalendarDayPick(
      { from: prevFrom, to: prevTo, bound: activeBound },
      clicked,
    );
    syncDraft(picked.from, picked.to, picked.bound);
  };

  /**
   * Segment typing while the popover is closed commits a complete valid range immediately
   * (keyboard confirmation). Incomplete years stay local.
   */
  const applyTypedRange = (next: CalendarRange | null) => {
    if (!next) {
      syncDraft(null, null, 'start');
      if (value) onChange('');
      return;
    }
    if (!isCompleteCalendarYear(next.start) || !isCompleteCalendarYear(next.end)) {
      // Half-typed: keep whatever sides are plausible without writing.
      syncDraft(
        isCompleteCalendarYear(next.start) ? next.start : draftFromRef.current,
        isCompleteCalendarYear(next.end) ? next.end : null,
        boundRef.current,
      );
      return;
    }
    const ordered = orderFiscalCalendarRange(next);
    syncDraft(ordered.start, ordered.end, 'start');
    commitIfAcceptable(ordered.start, ordered.end);
  };

  const applyTypedSide = (side: FiscalRangeBound, raw: string) => {
    if (side === 'start') setTextFrom(raw);
    else setTextTo(raw);

    const iso = parseTypedFiscalDate(raw);
    if (!iso) return;

    try {
      const day = parseDate(iso);
      if (side === 'start') {
        syncDraft(day, draftToRef.current, 'start', false);
        setTextFrom(raw);
        return;
      }
      const from = draftFromRef.current;
      if (!from) {
        // End typed first: treat it as the start and wait for the other bound.
        syncDraft(day, null, 'end', false);
        setTextTo(raw);
        return;
      }
      syncDraft(from, day, 'end', false);
      setTextTo(raw);
    } catch {
      // ignore unparseable calendar days
    }
  };

  const applyPastedRange = (event: ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const text = event.clipboardData.getData('text');
    if (!text?.trim()) return;

    // Full range paste: `1 Apr 2026 to 31 Mar 2027` / dotted / ISO.
    const wire = parseTypedFiscalRangeInput(text);
    if (wire) {
      const range = fiscalRangeFromString(wire);
      if (!range) return;
      event.preventDefault();
      syncDraft(range.start, range.end, 'start');
      if (!openRef.current) commitIfAcceptable(range.start, range.end);
      return;
    }

    // Single-date paste into the active bound (natural or dotted).
    const iso = parseTypedFiscalDate(text);
    if (!iso) return;
    try {
      const day = parseDate(iso);
      event.preventDefault();
      if (boundRef.current === 'end') {
        const from = draftFromRef.current;
        if (!from) {
          syncDraft(day, null, 'end');
        } else {
          syncDraft(from, day, 'start');
          if (!openRef.current) commitIfAcceptable(from, day);
        }
        return;
      }
      syncDraft(day, null, 'end');
    } catch {
      // ignore unparseable
    }
  };

  const resolveBoundFromFocus = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const group = target.closest('[data-slot="date-range-picker-group"]');
    if (!group) return;
    const inputs = group.querySelectorAll('[data-slot="date-input"]');
    if (inputs.length < 2) return;
    if (inputs[0]?.contains(target)) {
      setActiveBound('start');
      return;
    }
    if (inputs[1]?.contains(target)) {
      setActiveBound('end');
    }
  };

  const handleModeChange = (nextMode: FiscalYearPickerMode) => {
    if (nextMode === 'keyboard') {
      setTextFrom(toDisplayText(draftFromRef.current));
      setTextTo(toDisplayText(draftToRef.current));
    }
    setMode(nextMode);
  };

  const pickerValue = toPickerValue(draftFrom, draftTo);
  const canConfirm = canAcceptDraft(draftFrom, draftTo);

  return (
    <div
      data-density={density === 'compact' ? 'compact' : undefined}
      className="flex w-full min-w-0 items-center gap-2"
      onPaste={applyPastedRange}
      onFocusCapture={resolveBoundFromFocus}
    >
      <DateRangePicker
        className="w-full min-w-0 flex-1"
        label={label || undefined}
        aria-label={label ? undefined : 'Fiscal year'}
        calendarLocale={CALENDAR_LOCALE}
        value={pickerValue}
        onChange={(next) => {
          const range =
            next?.start && next?.end
              ? { start: next.start, end: next.end }
              : null;
          if (openRef.current) applyCalendarRange(range);
          else applyTypedRange(range);
        }}
        onBlur={() => {
          if (!openRef.current) onBlur?.();
        }}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            snapshotRef.current = value;
            pendingCommitRef.current = false;
            const seededOpen = seedFromValue(value);
            const openBound: FiscalRangeBound =
              seededOpen.from && !seededOpen.to ? 'end' : 'start';
            syncDraft(seededOpen.from, seededOpen.to, openBound);
            setMode('calendar');
            openRef.current = true;
            return;
          }

          // OK sets pendingCommit; Cancel / outside / Esc discard.
          if (pendingCommitRef.current) {
            commitIfAcceptable(draftFromRef.current, draftToRef.current);
          } else {
            discardToSnapshot();
          }
          pendingCommitRef.current = false;
          openRef.current = false;
          setMode('calendar');
          onBlur?.();
        }}
        isRequired={required}
        isDisabled={disabled}
        isInvalid={error}
        errorMessage={error ? helperText : undefined}
        description={error ? undefined : helperText}
        presets={presets}
        confirmSelection
        closeOnPresetSelect={false}
        canConfirm={canConfirm}
        onConfirm={() => {
          pendingCommitRef.current = true;
        }}
        onCancel={() => {
          pendingCommitRef.current = false;
        }}
        popoverHeader={
          <FiscalYearRangePopoverHeader
            mode={mode}
            bound={bound}
            draftFrom={draftFrom}
            draftTo={draftTo}
            startLabel={startLabel}
            endLabel={endLabel}
            onBoundChange={setActiveBound}
          />
        }
        popoverBody={
          mode === 'keyboard' ? (
            <FiscalYearRangeKeyboardPanel
              startLabel={startLabel}
              endLabel={endLabel}
              textFrom={textFrom}
              textTo={textTo}
              onTextFromChange={(raw) => applyTypedSide('start', raw)}
              onTextToChange={(raw) => applyTypedSide('end', raw)}
              onBoundChange={setActiveBound}
            />
          ) : undefined
        }
        popoverFooterStart={
          <FiscalYearRangeModeToggle mode={mode} onModeChange={handleModeChange} />
        }
      />
      {changed && (
        <Badge variant="warning" dot className="shrink-0">
          Unsaved
        </Badge>
      )}
    </div>
  );
}
