import { useMemo } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import type { LeaveAlert, Holiday, LeaveRecord, CumulativeSummary } from './leaveTypes';
import { computeLeaveBreakdown } from '@utils/leaveCalcEngine';

dayjs.extend(isBetween);

function findHoliday(holidays: Holiday[], iso: string): Holiday | undefined {
  return holidays.find((h) => h.date === iso);
}

function overlapsLeave(
  fromIso: string,
  toIso: string,
  leaves: LeaveRecord[] | undefined,
  excludeLeaveId?: string,
): LeaveRecord | undefined {
  if (!leaves?.length) return undefined;
  const start = dayjs(fromIso);
  const end = dayjs(toIso);
  return leaves.find((l) => {
    if (excludeLeaveId && l.id === excludeLeaveId) return false;
    const ls = dayjs(l.dateFrom);
    const le = dayjs(l.dateTo);
    return (
      start.isBetween(ls, le, 'day', '[]') ||
      end.isBetween(ls, le, 'day', '[]') ||
      ls.isBetween(start, end, 'day', '[]') ||
      le.isBetween(start, end, 'day', '[]')
    );
  });
}

export interface UseLeaveValidationParams {
  clickedIso: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  phase: 'idle' | 'pick-end' | 'committed';
  holidays: Holiday[];
  holidaySet: Set<string>;
  isWeekend: (d: Date) => boolean;
  minDate?: string;
  existingLeaves?: LeaveRecord[];
  cumulativeSummary?: CumulativeSummary | null;
  countTotalLeaves?: number;
  isUnpaidType?: boolean;
  /** True when the selected type is exempt from cumulative pacing (Unpaid OR Maternal). */
  isCumulativeExempt?: boolean;
  excludeLeaveId?: string;
}

export function useLeaveValidation(params: UseLeaveValidationParams): LeaveAlert[] {
  const {
    clickedIso,
    dateFrom,
    dateTo,
    phase,
    holidays,
    holidaySet,
    isWeekend,
    minDate,
    existingLeaves,
    cumulativeSummary,
    countTotalLeaves,
    isUnpaidType,
    isCumulativeExempt,
    excludeLeaveId,
  } = params;

  return useMemo(() => {
    const alerts: LeaveAlert[] = [];
    const push = (id: string, severity: LeaveAlert['severity'], message: string) => {
      if (!alerts.some((a) => a.id === id)) alerts.push({ id, severity, message });
    };

    const evaluateDay = (iso: string) => {
      const d = dayjs(iso);
      if (minDate && d.isBefore(dayjs(minDate), 'day')) {
        push('past', 'warning', 'Past dates cannot be selected.');
        return;
      }
      const hol = findHoliday(holidays, iso);
      if (hol) {
        push(
          `holiday-${iso}`,
          'info',
          `${d.format('D MMM')} is a public holiday (${hol.name}). No leave needed.`,
        );
      } else if (isWeekend(d.toDate())) {
        push('weekend', 'info', 'Weekends are non-working; excluded from leave count.');
      }
    };

    if (clickedIso) evaluateDay(clickedIso);

    if (phase === 'committed' && dateFrom && dateTo) {
      const overlap = overlapsLeave(dateFrom, dateTo, existingLeaves, excludeLeaveId);
      if (overlap) {
        push(
          'overlap',
          'warning',
          `You already have leave on ${dayjs(overlap.dateFrom).format('DD MMM')} – ${dayjs(overlap.dateTo).format('DD MMM')}.`,
        );
      }

      const { chargeable } = computeLeaveBreakdown(
        dayjs(dateFrom).toDate(),
        dayjs(dateTo).toDate(),
        holidaySet,
        isWeekend,
      );

      if (!isUnpaidType && countTotalLeaves === 0) {
        push('type-empty', 'warning', 'No balance remaining for this leave type.');
      }

      if (!isCumulativeExempt && cumulativeSummary && chargeable > cumulativeSummary.remaining) {
        push(
          'cumulative',
          'warning',
          `You have only ${cumulativeSummary.remaining} leave${
            cumulativeSummary.remaining === 1 ? '' : 's'
          } remaining.`,
        );
      } else if (
        !isUnpaidType &&
        countTotalLeaves !== undefined &&
        chargeable > countTotalLeaves
      ) {
        push(
          'type-quota',
          'warning',
          `This range needs ${chargeable} day(s); you have ${countTotalLeaves} left for this type.`,
        );
      }
    }

    return alerts;
  }, [
    clickedIso,
    dateFrom,
    dateTo,
    phase,
    holidays,
    holidaySet,
    isWeekend,
    minDate,
    existingLeaves,
    cumulativeSummary,
    countTotalLeaves,
    isUnpaidType,
    isCumulativeExempt,
    excludeLeaveId,
  ]);
}
