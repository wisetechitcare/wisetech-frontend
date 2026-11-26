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
import type { CalendarDate } from '@internationalized/date';

import { Badge } from '@/ds/ui/badge';
import {
  DateRangePicker,
  type DateRangePreset,
  type PickerCalendarOptions,
} from '@/ds/ui/date-picker';
import {
  FiscalYearRangeKeyboardPanel,
  FiscalYearRangeModeToggle,
  FiscalYearRangePopoverHeader,
  type FiscalYearPickerMode,
} from './FiscalYearRangePopover';

import { isAllowedDate, toCalendarConstraints, type IsoDateConstraints } from '@/ds/lib/iso-date';
import { formatDate } from '@utils/dateFormats';
import {
  DEFAULT_FISCAL_START_MONTH,
  fiscalRangeFromString,
  fiscalStringFromRange,
  getDefaultFiscalYear,
  getFiscalPresetLabel,
  isCompleteFiscalYear,
  orderFiscalCalendarRange,
  parseFiscalCalendarDate,
  parseTypedFiscalDate,
  parseTypedFiscalRangeInput,
  type FiscalCalendarRange,
  type FiscalYearRangeValue,
} from '@utils/fiscalYearRange';
import {
  applyFiscalCalendarDayPick,
  EMPTY_FISCAL_DRAFT,
  type FiscalCalendarRangeDraft,
  type FiscalRangeBound,
} from './fiscalYearRangePick';

export interface FiscalYearRangeFieldProps
  extends IsoDateConstraints,
    Pick<
      PickerCalendarOptions,
      'firstDayOfWeek' | 'hideOutsideDays' | 'showWeekends' | 'showMonthYearSelect' | 'calendarLocale'
    > {
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
  /** Shows the value without allowing edits (the calendar stays closed). */
  readOnly?: boolean;
  /** Show a clear button while the field holds a range. */
  clearable?: boolean;
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

type DraftText = Record<FiscalRangeBound, string>;

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

const seedFromValue = (value: FiscalYearRangeValue): FiscalCalendarRangeDraft => {
  const range = fiscalRangeFromString(value);
  return range ? { from: range.start, to: range.end, bound: 'start' } : EMPTY_FISCAL_DRAFT;
};

const toDisplayText = (day: CalendarDate | null): string =>
  day ? formatDate(day.toString(), '') : '';

const toDraftText = ({ from, to }: FiscalCalendarRangeDraft): DraftText => ({
  start: toDisplayText(from),
  end: toDisplayText(to),
});

/** Picker-visible value: incomplete end is painted as a same-day anchor so hover-preview still works. */
const toPickerValue = ({ from, to }: FiscalCalendarRangeDraft): FiscalCalendarRange | null => {
  if (!from) return null;
  if (!to) return { start: from, end: from };
  return orderFiscalCalendarRange({ start: from, end: to });
};

const canAcceptDraft = (
  { from, to }: FiscalCalendarRangeDraft,
  constraints: IsoDateConstraints,
): boolean =>
  Boolean(
    from &&
      to &&
      from.compare(to) <= 0 &&
      isAllowedDate(from, constraints) &&
      isAllowedDate(to, constraints),
  );

const parseTypedDay = (raw: string): CalendarDate | null => {
  const iso = parseTypedFiscalDate(raw);
  return iso ? parseFiscalCalendarDate(iso) : null;
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
  readOnly,
  clearable = false,
  error,
  helperText,
  onBlur,
  density = 'comfortable',
  changed = false,
  minValue,
  maxValue,
  isDateUnavailable,
  firstDayOfWeek,
  hideOutsideDays,
  showWeekends,
  showMonthYearSelect,
  calendarLocale,
}: FiscalYearRangeFieldProps) {
  const presets = useMemo(
    () => buildFiscalYearPresets(fiscalStartMonth, fiscalPresetLabel),
    [fiscalStartMonth, fiscalPresetLabel],
  );
  const constraints: IsoDateConstraints = { minValue, maxValue, isDateUnavailable };
  const calendarConstraints = useMemo(
    () => toCalendarConstraints({ minValue, maxValue, isDateUnavailable }),
    [minValue, maxValue, isDateUnavailable],
  );

  const [draft, setDraft] = useState<FiscalCalendarRangeDraft>(() => seedFromValue(value));
  const [text, setText] = useState<DraftText>(() => toDraftText(draft));
  const [mode, setMode] = useState<FiscalYearPickerMode>('calendar');

  // React Aria can fire onChange and onOpenChange in one tick, before a re-render: handlers read these.
  const draftRef = useRef<FiscalCalendarRangeDraft>(draft);
  const openRef = useRef<boolean>(false);
  const pendingCommitRef = useRef<boolean>(false);
  const snapshotRef = useRef<FiscalYearRangeValue>(value);

  const syncDraft = (next: FiscalCalendarRangeDraft, syncText = true) => {
    draftRef.current = next;
    setDraft(next);
    if (syncText) setText(toDraftText(next));
  };

  const setActiveBound = (bound: FiscalRangeBound) => {
    if (draftRef.current.bound !== bound) syncDraft({ ...draftRef.current, bound }, false);
  };

  useEffect(() => {
    // Outside an open session, keep draft aligned with the committed prop.
    if (!openRef.current) syncDraft(seedFromValue(value));
  }, [value]);

  const commitIfAcceptable = (from: CalendarDate | null, to: CalendarDate | null) => {
    if (!from || !to) {
      if (!from && !to && value) onChange('');
      return;
    }
    const ordered = orderFiscalCalendarRange({ start: from, end: to });
    if (!canAcceptDraft({ from: ordered.start, to: ordered.end, bound: 'start' }, constraints)) return;
    const stored = fiscalStringFromRange(ordered);
    if (!stored) return;
    syncDraft({ from: ordered.start, to: ordered.end, bound: 'start' });
    if (stored !== value) onChange(stored);
  };

  /**
   * Calendar / preset path while the popover is open: apply the fiscal pick machine,
   * keep changes in draft only (commit happens on OK).
   */
  const applyCalendarRange = (next: FiscalCalendarRange | null) => {
    if (!next) {
      syncDraft(EMPTY_FISCAL_DRAFT);
      return;
    }
    // Segment typing emits partial years (0002-…) — never treat those as calendar picks.
    if (!isCompleteFiscalYear(next.start) || !isCompleteFiscalYear(next.end)) return;

    const previous = draftRef.current;
    const isSameDay = next.start.compare(next.end) === 0;
    // Completing a pending end: start was anchored, RAC returns {start: from, end: clicked}.
    const completesPendingEnd = Boolean(
      previous.from && !previous.to && !isSameDay && next.start.compare(previous.from) === 0,
    );

    // One-shot full range (fiscal preset / wholesale replace) — not a day-pick step.
    if (!isSameDay && !completesPendingEnd) {
      const ordered = orderFiscalCalendarRange(next);
      syncDraft({ from: ordered.start, to: ordered.end, bound: 'start' });
      return;
    }

    // Either way the clicked day is `end`: {anchor, clicked} or a same-day {clicked, clicked}.
    syncDraft(applyFiscalCalendarDayPick(previous, next.end));
  };

  /**
   * Segment typing while the popover is closed commits a complete valid range immediately
   * (keyboard confirmation). Incomplete years stay local.
   */
  const applyTypedRange = (next: FiscalCalendarRange | null) => {
    if (!next) {
      syncDraft(EMPTY_FISCAL_DRAFT);
      if (value) onChange('');
      return;
    }
    const isStartComplete = isCompleteFiscalYear(next.start);
    const isEndComplete = isCompleteFiscalYear(next.end);
    if (!isStartComplete || !isEndComplete) {
      // Half-typed: keep whatever sides are plausible without writing.
      syncDraft({
        from: isStartComplete ? next.start : draftRef.current.from,
        to: isEndComplete ? next.end : null,
        bound: draftRef.current.bound,
      });
      return;
    }
    commitIfAcceptable(next.start, next.end);
  };

  const applyTypedSide = (side: FiscalRangeBound, raw: string) => {
    setText((current) => ({ ...current, [side]: raw }));
    const day = parseTypedDay(raw);
    if (!day) return;

    const { from, to } = draftRef.current;
    if (side === 'start') {
      syncDraft({ from: day, to, bound: 'start' }, false);
    } else if (!from) {
      // End typed first: treat it as the start and wait for the other bound.
      syncDraft({ from: day, to: null, bound: 'end' }, false);
    } else {
      syncDraft({ from, to: day, bound: 'end' }, false);
    }
  };

  const applyPastedRange = (event: ClipboardEvent<HTMLDivElement>) => {
    if (disabled || readOnly) return;
    const pasted = event.clipboardData.getData('text');
    if (!pasted.trim()) return;

    // Full range paste: `1 Apr 2026 to 31 Mar 2027` / dotted / ISO.
    const wire = parseTypedFiscalRangeInput(pasted);
    if (wire) {
      const range = fiscalRangeFromString(wire);
      if (!range) return;
      event.preventDefault();
      syncDraft({ from: range.start, to: range.end, bound: 'start' });
      if (!openRef.current) commitIfAcceptable(range.start, range.end);
      return;
    }

    // Single-date paste into the active bound (natural or dotted).
    const day = parseTypedDay(pasted);
    if (!day) return;
    event.preventDefault();
    const { from, bound } = draftRef.current;
    if (bound === 'end' && from) {
      syncDraft({ from, to: day, bound: 'start' });
      if (!openRef.current) commitIfAcceptable(from, day);
      return;
    }
    syncDraft({ from: day, to: null, bound: 'end' });
  };

  const resolveBoundFromFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const input = event.target.closest('[data-slot="date-input"]');
    const group = input?.closest('[data-slot="date-range-picker-group"]');
    if (!input || !group) return;
    const index = Array.from(group.querySelectorAll('[data-slot="date-input"]')).indexOf(input);
    if (index === 0) setActiveBound('start');
    else if (index === 1) setActiveBound('end');
  };

  const handleModeChange = (nextMode: FiscalYearPickerMode) => {
    if (nextMode === 'keyboard') setText(toDraftText(draftRef.current));
    setMode(nextMode);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      snapshotRef.current = value;
      pendingCommitRef.current = false;
      syncDraft(seedFromValue(value));
      setMode('calendar');
      openRef.current = true;
      return;
    }

    // OK sets pendingCommit; Cancel / outside / Esc discard.
    if (pendingCommitRef.current) {
      commitIfAcceptable(draftRef.current.from, draftRef.current.to);
    } else {
      syncDraft(seedFromValue(snapshotRef.current));
    }
    pendingCommitRef.current = false;
    openRef.current = false;
    onBlur?.();
  };

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
        {...calendarConstraints}
        firstDayOfWeek={firstDayOfWeek}
        hideOutsideDays={hideOutsideDays}
        showWeekends={showWeekends}
        showMonthYearSelect={showMonthYearSelect}
        calendarLocale={calendarLocale}
        isClearable={clearable}
        value={toPickerValue(draft)}
        onChange={(next) => {
          if (openRef.current) applyCalendarRange(next);
          else applyTypedRange(next);
        }}
        onBlur={() => {
          if (!openRef.current) onBlur?.();
        }}
        onOpenChange={handleOpenChange}
        isRequired={required}
        isDisabled={disabled}
        isReadOnly={readOnly}
        isInvalid={error}
        errorMessage={error ? helperText : undefined}
        description={error ? undefined : helperText}
        presets={presets}
        confirmSelection
        closeOnPresetSelect={false}
        canConfirm={canAcceptDraft(draft, constraints)}
        onConfirm={() => {
          pendingCommitRef.current = true;
        }}
        onCancel={() => {
          pendingCommitRef.current = false;
        }}
        popoverHeader={
          <FiscalYearRangePopoverHeader
            mode={mode}
            bound={draft.bound}
            draftFrom={draft.from}
            draftTo={draft.to}
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
              textFrom={text.start}
              textTo={text.end}
              onTextChange={applyTypedSide}
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
