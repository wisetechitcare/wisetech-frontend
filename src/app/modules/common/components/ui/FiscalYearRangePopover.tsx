import type { CalendarDate } from '@internationalized/date';
import { ArrowRight, CalendarDays, Keyboard } from 'lucide-react';
import { cn } from 'cn';

import { Button } from '@/ds/ui/button';
import { Input } from '@/ds/ui/input';

import { DATE_FORMATS, formatDate } from '@utils/dateFormats';
import type { FiscalRangeBound } from './fiscalYearRangePick';

export type FiscalYearPickerMode = 'calendar' | 'keyboard';

export interface FiscalYearRangePopoverHeaderProps {
  mode: FiscalYearPickerMode;
  bound: FiscalRangeBound;
  draftFrom: CalendarDate | null;
  draftTo: CalendarDate | null;
  startLabel: string;
  endLabel: string;
  onBoundChange: (bound: FiscalRangeBound) => void;
}

export interface FiscalYearRangeKeyboardPanelProps {
  startLabel: string;
  endLabel: string;
  textFrom: string;
  textTo: string;
  onTextFromChange: (value: string) => void;
  onTextToChange: (value: string) => void;
  onBoundChange: (bound: FiscalRangeBound) => void;
}

export interface FiscalYearRangeModeToggleProps {
  mode: FiscalYearPickerMode;
  onModeChange: (mode: FiscalYearPickerMode) => void;
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

const formatCapValue = (day: CalendarDate | null): string =>
  day ? formatDate(day.toString()) : '—';

/** Compact eyebrow for the bound chip — full label stays on `title` / aria. */
const boundEyebrow = (label: string, fallback: string): string => {
  const trimmed = label.trim();
  if (!trimmed) return fallback;
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1] || fallback;
};

export function FiscalYearRangePopoverHeader({
  mode,
  bound,
  draftFrom,
  draftTo,
  startLabel,
  endLabel,
  onBoundChange,
}: FiscalYearRangePopoverHeaderProps) {
  const endDisabled = !draftFrom;

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
        <button
          type="button"
          data-slot="fiscal-year-bound"
          title={startLabel}
          aria-label={startLabel}
          data-active={bound === 'start' || undefined}
          className={cn(
            'min-w-0 flex-1 rounded-full px-2.5 py-1.5 text-start transition-colors',
            bound === 'start'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-foreground hover:bg-background/80',
          )}
          onClick={() => onBoundChange('start')}
        >
          <span className="block text-xs font-bold tracking-wide uppercase opacity-80">
            {boundEyebrow(startLabel, 'Start')}
          </span>
          <span className="block truncate text-sm font-medium tabular-nums">
            {formatCapValue(draftFrom)}
          </span>
        </button>

        <span
          aria-hidden="true"
          className={cn(
            'flex shrink-0 items-center justify-center px-0.5',
            draftFrom && draftTo ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <ArrowRight className="size-3.5 shrink-0" />
        </span>

        <button
          type="button"
          data-slot="fiscal-year-bound"
          title={endLabel}
          aria-label={endLabel}
          data-active={bound === 'end' || undefined}
          disabled={endDisabled}
          className={cn(
            'min-w-0 flex-1 rounded-full px-2.5 py-1.5 text-start transition-colors',
            endDisabled && 'pointer-events-none opacity-50',
            bound === 'end'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-foreground hover:bg-background/80',
          )}
          onClick={() => {
            if (endDisabled) return;
            onBoundChange('end');
          }}
        >
          <span className="block text-xs font-bold tracking-wide uppercase opacity-80">
            {boundEyebrow(endLabel, 'End')}
          </span>
          <span className="block truncate text-sm font-medium tabular-nums">
            {formatCapValue(draftTo)}
          </span>
        </button>
      </div>
    </div>
  );
}

export function FiscalYearRangeKeyboardPanel({
  startLabel,
  endLabel,
  textFrom,
  textTo,
  onTextFromChange,
  onTextToChange,
  onBoundChange,
}: FiscalYearRangeKeyboardPanelProps) {
  return (
    <div data-slot="fiscal-year-keyboard-panel" className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 space-y-1">
          <span className="block truncate text-xs font-medium text-muted-foreground">
            {startLabel}
          </span>
          <Input
            inputMode="numeric"
            placeholder={DATE_FORMATS.DISPLAY}
            value={textFrom}
            className="tabular-nums"
            onFocus={() => onBoundChange('start')}
            onChange={(event) => onTextFromChange(event.target.value)}
          />
        </label>
        <label className="min-w-0 space-y-1">
          <span className="block truncate text-xs font-medium text-muted-foreground">
            {endLabel}
          </span>
          <Input
            inputMode="numeric"
            placeholder={DATE_FORMATS.DISPLAY}
            value={textTo}
            className="tabular-nums"
            onFocus={() => onBoundChange('end')}
            onChange={(event) => onTextToChange(event.target.value)}
          />
        </label>
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
  const nextMode: FiscalYearPickerMode = mode === 'calendar' ? 'keyboard' : 'calendar';
  const label =
    mode === 'calendar' ? 'Switch to text input' : 'Switch to calendar';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0"
      title={label}
      aria-label={label}
      onClick={() => onModeChange(nextMode)}
    >
      {mode === 'calendar' ? <Keyboard /> : <CalendarDays />}
    </Button>
  );
}
