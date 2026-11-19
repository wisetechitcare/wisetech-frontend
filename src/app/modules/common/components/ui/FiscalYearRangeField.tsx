/**
 * FiscalYearRangeField — the one control for editing an org / prefix fiscal year.
 *
 * A thin adapter over the kit's Components/DatePicker → Range (`@/ds/ui/date-picker`): the old prop names stay
 * for existing call sites, every pixel comes from the kit. Value is the stored range string
 * `"YYYY-MM-DD to YYYY-MM-DD"` (see `@utils/fiscalYearRange`); legacy `DD/MM/YYYY` values are read and
 * written back as ISO on the next edit.
 *
 * Use this instead of two date fields. Period navigation (lists/dashboards) stays on Period Navigator —
 * this field is for *editing* the range, not browsing by it.
 */
import { useEffect, useMemo, useState } from 'react';
import { parseDate, type CalendarDate } from '@internationalized/date';
import { Badge } from '@/ds/ui/badge';
import { DateRangePicker } from '@/ds/ui/date-picker';
import {
  composeFiscalYearRange,
  getDefaultFiscalYear,
  splitFiscalYearRange,
  type FiscalYearRangeValue,
} from '@utils/fiscalYearRange';

export interface FiscalYearRangeFieldProps {
  /** Stored range (`YYYY-MM-DD to YYYY-MM-DD` or legacy `DD/MM/YYYY to …`). */
  value: FiscalYearRangeValue;
  onChange: (value: FiscalYearRangeValue) => void;
  /** Field label. Default "Fiscal Year". `""` hides it (toolbars) — the field is still named for screen readers. */
  label?: string;
  /** @deprecated The kit range field names its two halves itself ("start date" / "end date"). Kept for call sites. */
  startLabel?: string;
  /** @deprecated See `startLabel`. */
  endLabel?: string;
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

/** Stored string → kit range value; null when either side is missing or unreadable. */
export function fiscalRangeFromString(value: string | null | undefined): CalendarRange | null {
  const { from, to } = splitFiscalYearRange(value);
  if (!from || !to) return null;
  try {
    return { start: parseDate(from), end: parseDate(to) };
  } catch {
    return null;
  }
}

/**
 * Kit range value → stored string, or `undefined` while it is not worth storing yet. The kit field reports
 * every keystroke (typing a year emits `0002-…` first), so a half-typed year is held back instead of saved.
 */
export function fiscalStringFromRange(range: CalendarRange | null): string | undefined {
  if (!range) return '';
  if (range.start.year < 1900 || range.end.year < 1900) return undefined;
  return composeFiscalYearRange(range.start.toString(), range.end.toString());
}

/** The "Apr–Mar" quick range: today's April-to-March fiscal year. */
const aprToMarPreset = () => {
  const range = fiscalRangeFromString(getDefaultFiscalYear());
  return range ? [{ label: 'Apr–Mar', value: range }] : [];
};

export function FiscalYearRangeField({
  value,
  onChange,
  label = 'Fiscal Year',
  required,
  disabled,
  error,
  helperText,
  onBlur,
  density = 'comfortable',
  changed = false,
}: FiscalYearRangeFieldProps) {
  // A local draft so half-typed years stay visible while only complete ranges reach the form.
  const fromProp = useMemo(() => fiscalRangeFromString(value), [value]);
  const [draft, setDraft] = useState<CalendarRange | null>(fromProp);
  useEffect(() => {
    setDraft(fromProp);
  }, [fromProp]);
  const presets = useMemo(aprToMarPreset, []);

  return (
    <div data-density={density === 'compact' ? 'compact' : undefined} className="flex min-w-0 items-center gap-2">
      <DateRangePicker
        className="min-w-0 flex-1"
        label={label || undefined}
        aria-label={label ? undefined : 'Fiscal year'}
        value={draft}
        onChange={(next) => {
          const range = next as CalendarRange | null;
          setDraft(range);
          const stored = fiscalStringFromRange(range);
          if (stored !== undefined && stored !== value) onChange(stored);
        }}
        onBlur={() => onBlur?.()}
        onOpenChange={(open) => {
          if (!open) onBlur?.();
        }}
        isRequired={required}
        isDisabled={disabled}
        isInvalid={error}
        errorMessage={error ? helperText : undefined}
        description={error ? undefined : helperText}
        presets={presets}
      />
      {changed && <Badge variant="warning" dot className="shrink-0">Unsaved</Badge>}
    </div>
  );
}
