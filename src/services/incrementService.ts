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

/** Analytics scoped to a single selected year. */
export interface YearlyAnalytics {
  startingSalaryForYear: number;    // salary carried in from before Jan 1 of year
  currentSalaryForYear: number;     // salary at year-end (latest revision in year, or carried forward)
  yearIncrementAmount: number;      // total monetary increment in this year
  yearIncrementPercentage: number;  // % growth vs starting salary
  revisionCount: number;            // number of salary revisions in this year
  highestSingleIncrement: number;   // largest single increment amount this year
  lastRevisionMonth: string | null; // e.g. "May 2026"
  avgMonthlySalary: number;         // average of Jan–Dec monthly salary values
  graphData: { label: string; salary: number }[]; // 12 months Jan–Dec
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

/** Legacy shape kept for backward compatibility with IncrementReportToggle salary fetch. */
export interface IncrementAnalytics {
  currentSalary: number;
  totalIncrementAmount: number;
  totalIncrementPercentage: number;
  lastIncrementDate: string;
  yearsActive: number;
  graphData: { label: string; salary: number }[];
}

export const incrementService = {
    fetchIncrementHistory: async (employeeId: string): Promise<IncrementRecord[]> => {
        try {
            const response = await fetchAllEmployeeSalaryAllTimeDateRage(employeeId);
            const history = response?.message?.employeeIncrementHistory || [];

            const sortedHistory = [...history].sort((a: any, b: any) =>
                dayjs(a.effectiveFrom).valueOf() - dayjs(b.effectiveFrom).valueOf()
            );

            const records: IncrementRecord[] = [];
            let currentSalary = 0;

            for (let i = 0; i < sortedHistory.length; i++) {
                const item = sortedHistory[i];
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
        } catch (error) {
            console.error('Error fetching increment history:', error);
            return [];
        }
    },

    fetchYearlyAnalytics: async (
        employeeId: string,
        year: string
    ): Promise<YearlyAnalytics | null> => {
        const fullHistory = await incrementService.fetchIncrementHistory(employeeId);
        if (fullHistory.length === 0) return null;

        // ascending order for processing
        const asc = [...fullHistory].reverse();

        // Salary at the start of the selected year = latest record before Jan 1
        const priorRecords = asc.filter(r => dayjs(r.effectiveDate).format('YYYY') < year);
        const startingSalaryForYear = priorRecords.length > 0
            ? priorRecords[priorRecords.length - 1].newSalary
            : 0;

        const yearRecords = asc.filter(r => dayjs(r.effectiveDate).format('YYYY') === year);

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

        // Build month-by-month graph Jan–Dec
        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let activeSalary = startingSalaryForYear;
        const graphData = monthLabels.map((label, i) => {
            const mm = String(i + 1).padStart(2, '0');
            const hit = yearRecords.find(r => dayjs(r.effectiveDate).format('MM') === mm);
            if (hit) activeSalary = hit.newSalary;
            return { label, salary: activeSalary };
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
    },

    fetchAllTimeAnalytics: async (employeeId: string): Promise<AllTimeAnalytics | null> => {
        const fullHistory = await incrementService.fetchIncrementHistory(employeeId);
        if (fullHistory.length === 0) return null;

        // fullHistory is descending; index 0 = latest
        const currentSalary = fullHistory[0].newSalary;
        const asc = [...fullHistory].reverse();
        const joiningSalary = asc[0].newSalary;

        const totalGrowthAmount = currentSalary - joiningSalary;
        const totalGrowthPercentage = joiningSalary > 0
            ? Number(((totalGrowthAmount / joiningSalary) * 100).toFixed(2))
            : 0;

        const highestSingleIncrementAmount = Math.max(...asc.map(r => r.incrementAmount));
        const highestRecord = asc.find(r => r.incrementAmount === highestSingleIncrementAmount);
        const highestSingleIncrementPercentage = highestRecord?.incrementPercentage || 0;

        const yearsWithRevisions = new Set(asc.map(r => dayjs(r.effectiveDate).format('YYYY'))).size;

        // Year-grouped graph data
        const years = Array.from(new Set(asc.map(r => dayjs(r.effectiveDate).format('YYYY'))));
        const graphData: { label: string; salary: number }[] = [];

        // Add a baseline point one year before first revision
        if (years.length > 0) {
            const firstYear = Number(years[0]);
            graphData.push({ label: String(firstYear), salary: joiningSalary });
        }

        for (const yr of years) {
            const recordsInYear = asc.filter(r => dayjs(r.effectiveDate).format('YYYY') === yr);
            const endingSalary = recordsInYear[recordsInYear.length - 1].newSalary;
            // Replace the base year entry or push new one
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
            totalRevisions: fullHistory.length,
            yearsWithRevisions,
            highestSingleIncrementAmount,
            highestSingleIncrementPercentage,
            lastRevisionDate: fullHistory[0].effectiveDate,
            graphData,
        };
    },

    // Legacy method — kept for backward compat with IncrementReportToggle salary fetch
    fetchIncrementAnalytics: async (
        employeeId: string,
        mode: 'AllTime' | 'Yearly',
        specificYear?: string
    ): Promise<IncrementAnalytics | null> => {
        const fullHistory = await incrementService.fetchIncrementHistory(employeeId);
        if (fullHistory.length === 0) return null;

        const currentSalary = fullHistory[0].newSalary;
        const initialSalary = fullHistory[fullHistory.length - 1].newSalary;
        const totalIncrementAmount = currentSalary - initialSalary;
        const totalIncrementPercentage = initialSalary > 0
            ? Number(((totalIncrementAmount / initialSalary) * 100).toFixed(2))
            : 0;

        const asc = [...fullHistory].reverse();
        let graphData: { label: string; salary: number }[] = [];

        if (mode === 'AllTime') {
            const years = Array.from(new Set(asc.map(r => dayjs(r.effectiveDate).format('YYYY'))));
            if (years.length > 0) {
                graphData.push({ label: String(Number(years[0]) - 1), salary: initialSalary });
            }
            for (const yr of years) {
                const recordsInYear = asc.filter(r => dayjs(r.effectiveDate).format('YYYY') === yr);
                const endingSalary = recordsInYear[recordsInYear.length - 1].newSalary;
                graphData.push({ label: yr, salary: endingSalary });
            }
        } else if (mode === 'Yearly' && specificYear) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const prior = asc.filter(r => dayjs(r.effectiveDate).format('YYYY') < specificYear);
            let active = prior.length > 0 ? prior[prior.length - 1].newSalary : 0;
            const inYear = asc.filter(r => dayjs(r.effectiveDate).format('YYYY') === specificYear);
            for (let i = 0; i < 12; i++) {
                const mm = String(i + 1).padStart(2, '0');
                const hit = inYear.find(r => dayjs(r.effectiveDate).format('MM') === mm);
                if (hit) active = hit.newSalary;
                graphData.push({ label: months[i], salary: active });
            }
        }

        return {
            currentSalary,
            totalIncrementAmount,
            totalIncrementPercentage,
            lastIncrementDate: fullHistory[0].effectiveDate,
            yearsActive: new Set(asc.map(r => dayjs(r.effectiveDate).format('YYYY'))).size,
            graphData,
        };
    },

    createIncrement: async (employeeId: string, payload: Partial<IncrementRecord>): Promise<IncrementRecord> => {
        const createPayload = {
            employeeId,
            effectiveFrom: dayjs(payload.effectiveDate).format('YYYY-MM-DD'),
            ctcInLpa: (payload.newSalary || 0) * 12,
        };
        const response = await createSalaryHistory(createPayload);
        return { ...payload, id: response?.data?.id || Math.random().toString() } as IncrementRecord;
    },

    updateIncrement: async (employeeId: string, id: string, payload: Partial<IncrementRecord>): Promise<IncrementRecord> => {
        const updatePayload = {
            employeeId,
            effectiveFrom: dayjs(payload.effectiveDate).format('YYYY-MM-DD'),
            ctcInLpa: (payload.newSalary || 0) * 12,
        };
        await updateSalaryHistory(id, updatePayload);
        return { ...payload, id } as IncrementRecord;
    },

    deleteIncrement: async (_employeeId: string, _id: string): Promise<void> => {
        console.warn('Delete increment not implemented in backend API');
    },
};
