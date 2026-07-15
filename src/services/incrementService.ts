import dayjs from 'dayjs';
import { fetchAllEmployeeSalaryAllTimeDateRage } from '@services/employee';
import { createSalaryHistory, updateSalaryHistory } from '@services/company';

export interface IncrementRecord {
  id: string;
  effectiveDate: string;
  previousSalary: number;
  newSalary: number;
  incrementAmount: number;
  incrementPercentage: number;
  createdAt: string;
}

/** Analytics scoped to a single selected fiscal year (Apr–Mar). */
export interface YearlyAnalytics {
  startingSalaryForYear: number;    // salary carried in from before Apr 1 of year
  currentSalaryForYear: number;     // salary at year-end (latest revision in year, or carried forward)
  yearIncrementAmount: number;      // total monetary increment in this year
  yearIncrementPercentage: number;  // % growth vs starting salary
  revisionCount: number;            // number of salary revisions in this year
  highestSingleIncrement: number;   // largest single increment amount this year
  lastRevisionMonth: string | null; // e.g. "May 2026"
  avgMonthlySalary: number;         // average of Apr–Mar monthly salary values
  graphData: { label: string; salary: number }[]; // 12 months Apr–Mar
}

/** Analytics covering full career history. */
export interface AllTimeAnalytics {
  joiningSalary: number;                      // first ever salary record
  currentSalary: number;                      // latest active salary
  totalGrowthAmount: number;                  // currentSalary - joiningSalary
  totalGrowthPercentage: number;              // growth % vs joining salary
  totalRevisions: number;                     // total salary revision events
  yearsWithRevisions: number;                 // unique calendar years that had revisions
  highestSingleIncrementAmount: number;       // largest single jump ever
  highestSingleIncrementPercentage: number;   // % of that jump
  lastRevisionDate: string;                   // ISO date of most recent revision
  graphData: { label: string; salary: number }[]; // year-labeled data points
}

/** Fiscal-year month sequence Apr(year)–Mar(year+1). */
function buildFiscalMonthConfigs(year: string): { label: string; month: string; yr: string }[] {
  const next = String(Number(year) + 1);
  return [
    { label: 'Apr', month: '04', yr: year },
    { label: 'May', month: '05', yr: year },
    { label: 'Jun', month: '06', yr: year },
    { label: 'Jul', month: '07', yr: year },
    { label: 'Aug', month: '08', yr: year },
    { label: 'Sep', month: '09', yr: year },
    { label: 'Oct', month: '10', yr: year },
    { label: 'Nov', month: '11', yr: year },
    { label: 'Dec', month: '12', yr: year },
    { label: 'Jan', month: '01', yr: next },
    { label: 'Feb', month: '02', yr: next },
    { label: 'Mar', month: '03', yr: next },
  ];
}

/** Records within the fiscal year (Apr 1 of `year` to Mar 31 of `year`+1), ascending. */
export function filterFiscalYearRecords(history: IncrementRecord[], year: string): IncrementRecord[] {
  const fiscalStart = dayjs(`${year}-04-01`).startOf('day');
  const fiscalEnd = dayjs(`${Number(year) + 1}-03-31`).endOf('day');
  return [...history]
    .sort((a, b) => dayjs(a.effectiveDate).valueOf() - dayjs(b.effectiveDate).valueOf())
    .filter(r => {
      const d = dayjs(r.effectiveDate);
      return (d.isSame(fiscalStart) || d.isAfter(fiscalStart)) &&
             (d.isSame(fiscalEnd) || d.isBefore(fiscalEnd));
    });
}

/** Derive yearly analytics from preloaded history (any order). Pure. */
export function deriveYearlyAnalytics(history: IncrementRecord[], year: string): YearlyAnalytics | null {
  if (history.length === 0) return null;

  const asc = [...history].sort((a, b) => dayjs(a.effectiveDate).valueOf() - dayjs(b.effectiveDate).valueOf());
  const fiscalStart = dayjs(`${year}-04-01`).startOf('day');

  // Salary at the start of the selected year = latest record before Apr 1
  const priorRecords = asc.filter(r => dayjs(r.effectiveDate).isBefore(fiscalStart));
  const startingSalaryForYear = priorRecords.length > 0
    ? priorRecords[priorRecords.length - 1].newSalary
    : 0;

  const yearRecords = filterFiscalYearRecords(asc, year);

  const currentSalaryForYear = yearRecords.length > 0
    ? yearRecords[yearRecords.length - 1].newSalary
    : startingSalaryForYear;

  const yearIncrementAmount = currentSalaryForYear - startingSalaryForYear;
  const yearIncrementPercentage = startingSalaryForYear > 0
    ? Number(((yearIncrementAmount / startingSalaryForYear) * 100).toFixed(2))
    : 0;

  const highestSingleIncrement = yearRecords.length > 0
    ? Math.max(...yearRecords.map(r => r.incrementAmount))
    : 0;

  const lastRevisionMonth = yearRecords.length > 0
    ? dayjs(yearRecords[yearRecords.length - 1].effectiveDate).format('MMM YYYY')
    : null;

  let activeSalary = startingSalaryForYear;
  const graphData = buildFiscalMonthConfigs(year).map((cfg) => {
    const hit = yearRecords.filter(r => {
      const d = dayjs(r.effectiveDate);
      return d.format('MM') === cfg.month && d.format('YYYY') === cfg.yr;
    });
    if (hit.length > 0) activeSalary = hit[hit.length - 1].newSalary;
    return { label: cfg.label, salary: activeSalary };
  });

  const avgMonthlySalary = graphData.reduce((s, d) => s + d.salary, 0) / 12;

  return {
    startingSalaryForYear,
    currentSalaryForYear,
    yearIncrementAmount,
    yearIncrementPercentage,
    revisionCount: yearRecords.length,
    highestSingleIncrement,
    lastRevisionMonth,
    avgMonthlySalary,
    graphData,
  };
}

/** Derive all-time analytics from preloaded history (any order). Pure. */
export function deriveAllTimeAnalytics(history: IncrementRecord[]): AllTimeAnalytics | null {
  if (history.length === 0) return null;

  const asc = [...history].sort((a, b) => dayjs(a.effectiveDate).valueOf() - dayjs(b.effectiveDate).valueOf());
  const joiningSalary = asc[0].newSalary;
  const currentSalary = asc[asc.length - 1].newSalary;

  const totalGrowthAmount = currentSalary - joiningSalary;
  const totalGrowthPercentage = joiningSalary > 0
    ? Number(((totalGrowthAmount / joiningSalary) * 100).toFixed(2))
    : 0;

  const highestSingleIncrementAmount = Math.max(...asc.map(r => r.incrementAmount));
  const highestRecord = asc.find(r => r.incrementAmount === highestSingleIncrementAmount);
  const highestSingleIncrementPercentage = highestRecord?.incrementPercentage || 0;

  const years = Array.from(new Set(asc.map(r => dayjs(r.effectiveDate).format('YYYY'))));
  const yearsWithRevisions = years.length;

  const graphData: { label: string; salary: number }[] = [];
  if (years.length > 0) {
    graphData.push({ label: years[0], salary: joiningSalary });
  }
  for (const yr of years) {
    const recordsInYear = asc.filter(r => dayjs(r.effectiveDate).format('YYYY') === yr);
    const endingSalary = recordsInYear[recordsInYear.length - 1].newSalary;
    if (graphData.length > 0 && graphData[graphData.length - 1].label === yr) {
      graphData[graphData.length - 1].salary = endingSalary;
    } else {
      graphData.push({ label: yr, salary: endingSalary });
    }
  }

  // Ensure at least 2 points for the chart to render a line
  if (graphData.length === 1) {
    const existingYear = Number(graphData[0].label);
    const currentYear = Number(dayjs().format('YYYY'));
    if (currentYear > existingYear) {
      graphData.push({ label: String(currentYear), salary: currentSalary });
    } else {
      graphData.unshift({ label: String(existingYear - 1), salary: joiningSalary });
    }
  }

  return {
    joiningSalary,
    currentSalary,
    totalGrowthAmount,
    totalGrowthPercentage,
    totalRevisions: history.length,
    yearsWithRevisions,
    highestSingleIncrementAmount,
    highestSingleIncrementPercentage,
    lastRevisionDate: asc[asc.length - 1].effectiveDate,
    graphData,
  };
}

export const incrementService = {
  /** Full salary-revision history for an employee, newest first. Throws on API failure. */
  fetchIncrementHistory: async (employeeId: string): Promise<IncrementRecord[]> => {
    const response = await fetchAllEmployeeSalaryAllTimeDateRage(employeeId);
    const history = response?.message?.employeeIncrementHistory || [];

    const sortedHistory = [...history].sort((a: any, b: any) =>
      dayjs(a.effectiveFrom).valueOf() - dayjs(b.effectiveFrom).valueOf()
    );

    const records: IncrementRecord[] = [];
    let currentSalary = 0;

    for (const item of sortedHistory) {
      const newSalary = (Number(item.ctcInLpa) || 0) / 12;
      const incrementAmount = Math.max(0, newSalary - currentSalary);
      const incrementPercentage = currentSalary > 0
        ? Number(((incrementAmount / currentSalary) * 100).toFixed(2))
        : 0;

      records.push({
        id: item.id,
        effectiveDate: item.effectiveFrom,
        previousSalary: currentSalary,
        newSalary,
        incrementAmount,
        incrementPercentage,
        createdAt: item.createdAt || item.effectiveFrom,
      });

      currentSalary = newSalary;
    }

    return records.reverse(); // descending: newest first
  },

  createIncrement: async (employeeId: string, payload: Partial<IncrementRecord>): Promise<void> => {
    await createSalaryHistory({
      employeeId,
      effectiveFrom: dayjs(payload.effectiveDate).format('YYYY-MM-DD'),
      ctcInLpa: (payload.newSalary || 0) * 12,
    });
  },

  updateIncrement: async (employeeId: string, id: string, payload: Partial<IncrementRecord>): Promise<void> => {
    await updateSalaryHistory(id, {
      employeeId,
      effectiveFrom: dayjs(payload.effectiveDate).format('YYYY-MM-DD'),
      ctcInLpa: (payload.newSalary || 0) * 12,
    });
  },
};
