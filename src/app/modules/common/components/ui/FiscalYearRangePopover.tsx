import type { CalendarDate } from '@internationalized/date';
import { ArrowRight, CalendarDays, Keyboard } from 'lucide-react';

import { Button } from '@/ds/ui/button';
import { Input } from '@/ds/ui/input';

import { cn } from 'cn';
import { DATE_FORMATS, formatDate } from '@utils/dateFormats';
import type { FiscalRangeBound } from './fiscalYearRangePick';

export type FiscalYearPickerMode = 'calendar' | 'keyboard';

interface FiscalYearRangePopoverHeaderProps {
  mode: FiscalYearPickerMode;
  bound: FiscalRangeBound;
  draftFrom: CalendarDate | null;
  draftTo: CalendarDate | null;
  startLabel: string;
  endLabel: string;
  onBoundChange: (bound: FiscalRangeBound) => void;
}

interface FiscalYearRangeKeyboardPanelProps {
  startLabel: string;
  endLabel: string;
  textFrom: string;
  textTo: string;
  onTextChange: (bound: FiscalRangeBound, value: string) => void;
  onBoundChange: (bound: FiscalRangeBound) => void;
}

interface FiscalYearRangeModeToggleProps {
  mode: FiscalYearPickerMode;
  onModeChange: (mode: FiscalYearPickerMode) => void;
}

interface BoundCapProps {
  label: string;
  fallbackEyebrow: string;
  day: CalendarDate | null;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

interface BoundInputProps {
  label: string;
  value: string;
  onFocus: () => void;
  onChange: (value: string) => void;
}

const stepHint = (
  mode: FiscalYearPickerMode,
  from: CalendarDate | null,
  to: CalendarDate | null,
): string => {
  if (mode === 'keyboard') {
    return `Type dates as ${DATE_FORMATS.DISPLAY} or 1 Apr 2026`;
  }
  if (!from) return 'Choose the start of the fiscal year';
  if (!to) return 'Now choose the end date';
  return 'Tap Start or End to adjust either bound';
};

/** Compact eyebrow for the bound chip — full label stays on `title` / aria. */
const boundEyebrow = (label: string, fallback: string): string =>
  label.trim().split(/\s+/).pop() || fallback;

function BoundCap({ label, fallbackEyebrow, day, active, disabled = false, onSelect }: BoundCapProps) {
  return (
    <button
      type="button"
      data-slot="fiscal-year-bound"
      title={label}
      aria-label={label}
      data-active={active || undefined}
      disabled={disabled}
      className={cn(
        'min-w-0 flex-1 rounded-full px-2.5 py-1.5 text-start transition-colors',
        disabled && 'pointer-events-none opacity-50',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-transparent text-foreground hover:bg-background/80',
      )}
      onClick={onSelect}
    >
      <span className="block text-xs font-bold tracking-wide uppercase opacity-80">
        {boundEyebrow(label, fallbackEyebrow)}
      </span>
      <span className="block truncate text-sm font-medium tabular-nums">
        {day ? formatDate(day.toString()) : '—'}
      </span>
    </button>
  );
}

export function FiscalYearRangePopoverHeader({
  mode,
  bound,
  draftFrom,
  draftTo,
  startLabel,
  endLabel,
  onBoundChange,
}: FiscalYearRangePopoverHeaderProps) {
  return (
    <div data-slot="fiscal-year-popover-header" className="space-y-2">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-foreground">
          {mode === 'calendar' ? 'Select fiscal year' : 'Enter fiscal year'}
        </p>
        <p className="text-xs leading-snug text-muted-foreground">
          {stepHint(mode, draftFrom, draftTo)}
        </p>
      </div>

      <div className="flex items-stretch gap-1 rounded-full bg-muted/60 p-1">
        <BoundCap
          label={startLabel}
          fallbackEyebrow="Start"
          day={draftFrom}
          active={bound === 'start'}
          onSelect={() => onBoundChange('start')}
        />

        <span
          aria-hidden="true"
          className={cn(
            'flex shrink-0 items-center justify-center px-0.5',
            draftFrom && draftTo ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <ArrowRight className="size-3.5 shrink-0" />
        </span>

        <BoundCap
          label={endLabel}
          fallbackEyebrow="End"
          day={draftTo}
          active={bound === 'end'}
          disabled={!draftFrom}
          onSelect={() => onBoundChange('end')}
        />
      </div>
    </div>
  );
}

function BoundInput({ label, value, onFocus, onChange }: BoundInputProps) {
  return (
    <label className="min-w-0 space-y-1">
      <span className="block truncate text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        inputMode="numeric"
        placeholder={DATE_FORMATS.DISPLAY}
        value={value}
        className="tabular-nums"
        onFocus={onFocus}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function FiscalYearRangeKeyboardPanel({
  startLabel,
  endLabel,
  textFrom,
  textTo,
  onTextChange,
  onBoundChange,
}: FiscalYearRangeKeyboardPanelProps) {
  return (
    <div data-slot="fiscal-year-keyboard-panel" className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <BoundInput
          label={startLabel}
          value={textFrom}
          onFocus={() => onBoundChange('start')}
          onChange={(value) => onTextChange('start', value)}
        />
        <BoundInput
          label={endLabel}
          value={textTo}
          onFocus={() => onBoundChange('end')}
          onChange={(value) => onTextChange('end', value)}
        />
      </div>
      <p className="text-xs leading-snug text-muted-foreground">
        Accepts {DATE_FORMATS.DISPLAY} or e.g. 1 Apr 2026. Saved as ISO on OK.
      </p>
    </div>
  );
}

export function FiscalYearRangeModeToggle({
  mode,
  onModeChange,
}: FiscalYearRangeModeToggleProps) {
  const isCalendar = mode === 'calendar';
  const label = isCalendar ? 'Switch to text input' : 'Switch to calendar';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0"
      title={label}
      aria-label={label}
      onClick={() => onModeChange(isCalendar ? 'keyboard' : 'calendar')}
    >
      {isCalendar ? <Keyboard /> : <CalendarDays />}
    </Button>
  );
}
