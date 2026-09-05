/**
 * The day card — what the calendar has never had.
 *
 * Every field rendered here is ALREADY computed today and thrown away:
 * `transformAttendance` derives checkIn, checkOut, duration and workingMethod
 * for all 42 cells, then `setCalendarCells` narrows the row to `{date, status}`
 * one line before render. This component is mostly a matter of not discarding it.
 *
 * MUI earns its place for the Popper only — portalling, flip/shift placement and
 * outside-click are behaviour, not styling. Everything visual is Tailwind.
 */
import { memo } from 'react';
import dayjs from 'dayjs';
import { KTIcon } from '@metronic/helpers';
import { useIsDark, toneSurface } from '@app/modules/common/components/ui/tw/useIsDark';
import { cn } from '@app/modules/common/components/ui/tw/cn';
import { TRIO, type Trio } from '@app/modules/common/components/ui/tw/tokens';
import { MODIFIER_LABEL, STATUS_LABEL, lateBandOf, resolveDayVisual, type DayToneOverrides } from './dayTokens';
import type { CalendarDay } from './types';

export interface DayTooltipProps {
  day: CalendarDay;
  overrides?: DayToneOverrides;
  id?: string;
}

export const DayTooltip = memo(function DayTooltip({ day, overrides, id }: DayTooltipProps) {
  const dark = useIsDark();
  const visual = resolveDayVisual(day.status, day.modifiers, overrides);
  const head = toneSurface(visual.trio, dark);
  const { actual, expected, leave, holiday, request, lateMark } = day;
  const hasPunch = Boolean(actual.checkIn || actual.checkOut);

  return (
    <div
      id={id}
      role="tooltip"
      className={cn(
        'w-[268px] rounded-[14px] border p-3.5 shadow-[0_24px_64px_-12px_rgba(16,24,40,0.28),0_8px_20px_-8px_rgba(16,24,40,0.18)]',
        'bg-white/98 border-[#E6E9EE] dark:bg-[#161b22] dark:border-[#30363d]',
        'backdrop-blur-sm',
      )}
    >
      <header className="flex items-start justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#E6E9EE] dark:border-[#30363d]">
        <div className="min-w-0">
          <p className="m-0 text-[13.5px] font-bold leading-tight text-slate-900 dark:text-slate-100">
            {dayjs(day.date).format('ddd, D MMM')}
          </p>
          <p className="m-0 text-[10.5px] uppercase tracking-[0.05em] font-bold text-slate-400 dark:text-slate-500">
            {dayjs(day.date).format('YYYY')}
          </p>
        </div>
        <span
          className="shrink-0 rounded-2xl border px-2 py-[3px] text-[11px] font-bold leading-[1.3]"
          style={{ backgroundColor: head.bg, borderColor: head.bd, color: head.fg }}
        >
          {STATUS_LABEL[day.status]}
        </span>
      </header>

      <dl className="m-0 flex flex-col gap-[7px]">
        {holiday && <Row k="Holiday" v={holiday.name} />}

        {leave && (
          <Row
            k="Leave"
            v={`${leave.type} · ${leave.fraction === 0.5 ? `half day (${leave.session === 'first_half' ? '1st half' : '2nd half'})` : 'full day'}`}
          />
        )}

        {hasPunch && (
          <>
            {/* Actual against expected. The threshold is what turns a time into a judgement,
                and `expected` costs no extra query — the shift is already resolved server-side. */}
            <Row k="In" v={actual.checkIn ?? '—'} hint={expected.checkIn ? `exp. ${expected.checkIn}` : undefined} warn={lateMark?.isLate} />
            <Row k="Out" v={actual.checkOut ?? '—'} hint={expected.checkOut ? `exp. ${expected.checkOut}` : undefined} warn={day.modifiers.includes('missing_check_out')} />
            <Row k="Duration" v={formatMinutes(actual.minutesWorked)} />
            {day.workMode && <Row k="Mode" v={day.workMode} />}
          </>
        )}

        {!hasPunch && !leave && !holiday && day.status !== 'weekly_off' && day.status !== 'future' && (
          <p className="m-0 text-[12px] italic text-slate-400 dark:text-slate-500">No attendance recorded.</p>
        )}
      </dl>

      {/* Flags — verbatim server verdicts, never recomputed here, so the tooltip
          and the payslip can never disagree about what "late" meant. */}
      {(lateMark?.isLate || request || day.modifiers.length > 0) && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {lateMark?.isLate && (
            // The server's `reason` already reads "Late by 4h 31m", so appending
            // the raw minutes repeated the same number twice. The severity band
            // adds something instead, and it names the grading the day's dot is
            // already showing.
            <Flag trio={lateBandOf(lateMark.lateMinutes).trio} icon="time">
              {lateMark.reason}
              {` · ${lateBandOf(lateMark.lateMinutes).label.toLowerCase()}`}
            </Flag>
          )}
          {day.modifiers
            .filter((m) => m === 'missing_check_in' || m === 'missing_check_out')
            .map((m) => (
              <Flag key={m} trio={TRIO.rose} icon="information-2">
                {MODIFIER_LABEL[m]}
              </Flag>
            ))}
          {request?.status === 'pending' && (
            <Flag trio={TRIO.blue} icon="arrow-circle-right">
              Correction pending{request.stage ? ` · ${request.stage}` : ''}
            </Flag>
          )}
          {request?.status === 'rejected' && (
            <Flag trio={TRIO.rose} icon="cross-circle">
              Correction rejected
            </Flag>
          )}
          {day.modifiers.includes('worked_on_off_day') && (
            <Flag trio={TRIO.blue} icon="calendar-add">
              Worked on an off day
            </Flag>
          )}
        </div>
      )}

      {day.canRaiseCorrection && (
        <footer className="mt-2.5 pt-2.5 border-t border-[#E6E9EE] dark:border-[#30363d]">
          <p className="m-0 text-[11.5px] font-semibold text-[#1E3A8A] dark:text-[#8AA3EC]">
            Click to open · raise a correction
          </p>
        </footer>
      )}
    </div>
  );
});

function Row({ k, v, hint, warn }: { k: string; v: string; hint?: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="m-0 shrink-0 text-[11px] uppercase tracking-[0.04em] font-bold text-slate-400 dark:text-slate-500">{k}</dt>
      <dd className="m-0 min-w-0 text-right">
        <span
          className={cn(
            'text-[12.5px] font-bold tabular-nums',
            warn ? 'text-[#d97706] dark:text-[#f0ae23]' : 'text-slate-900 dark:text-slate-100',
          )}
        >
          {v}
        </span>
        {hint && <span className="ml-1.5 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">{hint}</span>}
      </dd>
    </div>
  );
}

function Flag({ trio, icon, children }: { trio: Trio; icon: string; children: React.ReactNode }) {
  const t = toneSurface(trio, useIsDark());
  return (
    <p
      className="m-0 flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11.5px] font-semibold leading-[1.35]"
      style={{ backgroundColor: t.bg, borderColor: t.bd, color: t.fg }}
    >
      <KTIcon iconName={icon} className="fs-7 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function formatMinutes(m: number | null): string {
  if (m == null || m <= 0) return '—';
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
