import dayjs from 'dayjs';

export interface SandwichPreviewResult {
  baseChargeable: number;
  sandwichDaysAdded: number;
  totalChargeable: number;
  affectedDates: string[];
  bridgeDescription: string | null;
}

function isChargeableWorkday(
  date: dayjs.Dayjs,
  holidaySet: Set<string>,
  isWeekend: (d: Date) => boolean,
): boolean {
  const iso = date.format('YYYY-MM-DD');
  return !isWeekend(date.toDate()) && !holidaySet.has(iso);
}

/**
 * Preview sandwich rule: non-working days between the first and last chargeable
 * workday in the selected range are counted as paid leave.
 */
export function previewSandwichImpact(
  dateFrom: string,
  dateTo: string,
  holidaySet: Set<string>,
  isWeekend: (d: Date) => boolean,
): SandwichPreviewResult {
  const start = dayjs(dateFrom);
  const end = dayjs(dateTo);
  const rangeStart = start.isBefore(end) ? start : end;
  const rangeEnd = start.isBefore(end) ? end : start;

  const days: dayjs.Dayjs[] = [];
  let cur = rangeStart;
  while (cur.isBefore(rangeEnd) || cur.isSame(rangeEnd, 'day')) {
    days.push(cur);
    cur = cur.add(1, 'day');
  }

  if (days.length === 0) {
    return {
      baseChargeable: 0,
      sandwichDaysAdded: 0,
      totalChargeable: 0,
      affectedDates: [],
      bridgeDescription: null,
    };
  }

  const chargeableFlags = days.map((d) => isChargeableWorkday(d, holidaySet, isWeekend));
  let firstIdx = -1;
  let lastIdx = -1;
  chargeableFlags.forEach((ok, i) => {
    if (ok) {
      if (firstIdx === -1) firstIdx = i;
      lastIdx = i;
    }
  });

  if (firstIdx === -1) {
    return {
      baseChargeable: 0,
      sandwichDaysAdded: 0,
      totalChargeable: 0,
      affectedDates: [],
      bridgeDescription: null,
    };
  }

  const baseChargeable = chargeableFlags.filter(Boolean).length;
  const affectedDates: string[] = [];

  for (let i = firstIdx; i <= lastIdx; i++) {
    if (!chargeableFlags[i]) {
      affectedDates.push(days[i].format('YYYY-MM-DD'));
    }
  }

  const sandwichDaysAdded = affectedDates.length;
  const totalChargeable = baseChargeable + sandwichDaysAdded;

  let bridgeDescription: string | null = null;
  if (sandwichDaysAdded > 0) {
    const firstWork = days[firstIdx].format('ddd D MMM');
    const lastWork = days[lastIdx].format('ddd D MMM');
    bridgeDescription = `${firstWork} – ${lastWork}`;
  }

  return {
    baseChargeable,
    sandwichDaysAdded,
    totalChargeable,
    affectedDates,
    bridgeDescription,
  };
}

/** Dates in range that fall in the sandwich bridge (for calendar S badge). */
export function getSandwichRiskDateSet(preview: SandwichPreviewResult | null): Set<string> {
  return new Set(preview?.affectedDates ?? []);
}
