import { RootState } from '@redux/store';
import { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { customLeaves, fetchEmpYearlyStatistics } from '@utils/statistics';
import { fetchAllPublicHolidays, fetchCompanyOverview } from '@services/company';
import { fetchEmployeeLeaves, fetchAllSalaryByFiscalYear, fetchAllSalaryDataForDateRangeYearly } from '@services/employee';
import { saveLeaves, savePublicHolidays } from '@redux/slices/attendanceStats';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { Box, Skeleton } from '@mui/material';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import HourglassBottomOutlinedIcon from '@mui/icons-material/HourglassBottomOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import { formatCurrencyDecimal, formatCurrencyRounded } from '@utils/currency';
import YearlyKpiCard from './components/salary/YearlyKpiCard';
import PaymentProgressCard from './components/salary/PaymentProgressCard';
import YearlyOverViewCard from './YearlyOverViewCard';
import SalaryBreakdownTable, { YearlyBreakdownRow } from './components/salary/SalaryBreakdownTable';
import MonthlySalaryComparison from './MonthlySalaryComparison';
import Increments from './Increments';

type YearOverview = {
    startDate: string;
    endDate: string;
    totalPayableDays: number;
    totalPaidAmount: number;
    totalDueAmount: number;
    totalNetAmount: number;
    totalMonths: number;
    totalWorkingDays: number;
    totalPfContribution: number;
    totalGovtDeduction: number;
    hasProfessionalFees: boolean;
    attendancePercent: number;
};

const fiscalMonths = [
    'April', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December', 'January', 'February', 'March',
];

const parseCurrencyOrNumber = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.-]/g, '');
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const normalizeStatus = (status: string, paidAmount: number, pendingAmount: number): 'Paid' | 'Pending' | 'Partial' => {
    const normalizedStatus = String(status || '').toLowerCase();
    if (normalizedStatus.includes('partial')) return 'Partial';
    if (normalizedStatus.includes('full') || normalizedStatus.includes('fully')) return 'Paid';
    if (paidAmount > 0 && pendingAmount > 0) return 'Partial';
    if (paidAmount > 0 && pendingAmount <= 0) return 'Paid';
    return 'Pending';
};

const getFixedDeductionAmount = (row: any, matcher: (key: string) => boolean): number => {
    const fixed = row?.deductionBreakdown?.fixed;
    if (!fixed || typeof fixed !== 'object') return 0;

    return Object.entries(fixed).reduce((sum, [key, item]: [string, any]) => {
        const earned = Number(item?.earned || 0);
        if (item?.isActive === false || earned <= 0) return sum;
        return matcher(key.toLowerCase()) ? sum + earned : sum;
    }, 0);
};

const isPfKey = (key: string) => key.includes('provident fund') || key.includes('pf');
const isProfessionalFeesKey = (key: string) => key.includes('professional fees');

const convertHoursToDays = (time: string) => {
    if (!time || time === '-' || time === '') return 0;
    const [hh, mm, ss] = time.split(':').map(Number);
    return (Number(hh || 0) + Number(mm || 0) / 60 + Number(ss || 0) / 3600) / 8;
};

const buildBreakdownRows = (rows: any[]): YearlyBreakdownRow[] => (
    fiscalMonths.map((month) => {
        const row = rows.find((item: any) => String(item?.month || '').toLowerCase() === month.toLowerCase());
        if (!row) {
            return {
                month,
                basicSalary: '-',
                overtime: '-',
                payable: '-',
                netPayable: '-',
                paid: '-',
                pending: '-',
                pfDeduction: '-',
                govtDeduction: '-',
                status: 'Pending',
                isPlaceholder: true,
            };
        }

        const netPayable = parseCurrencyOrNumber(row.netAmount);
        const paidAmount = parseCurrencyOrNumber(row.amountPaid ?? row.paidAmount);
        const pendingAmount = parseCurrencyOrNumber(row.due);
        const pfDeduction = getFixedDeductionAmount(row, isPfKey);
        const professionalFees = getFixedDeductionAmount(row, isProfessionalFeesKey);
        
        const basicSalary = parseCurrencyOrNumber(row.basicSalary);
        const hourlySalary = parseCurrencyOrNumber(row.hourlySalary);
        const overTimeHours = convertHoursToDays(row.overTime) * 8;
        const overtime = row.overTimeAmount !== undefined ? parseCurrencyOrNumber(row.overTimeAmount) : (overTimeHours * hourlySalary);
        const payable = parseCurrencyOrNumber(row.totalGrossPayAmount);

        return {
            month,
            basicSalary: formatCurrencyDecimal(basicSalary),
            overtime: formatCurrencyDecimal(overtime),
            payable: formatCurrencyDecimal(payable),
            netPayable: formatCurrencyRounded(netPayable),
            paid: formatCurrencyRounded(paidAmount),
            pending: formatCurrencyRounded(pendingAmount),
            pfDeduction: formatCurrencyDecimal(pfDeduction),
            govtDeduction: professionalFees > 0 ? formatCurrencyDecimal(professionalFees) : '',
            status: normalizeStatus(row.status, paidAmount, pendingAmount),
            isPlaceholder: false,
        };
    })
);

const initialOverview: YearOverview = {
    startDate: '',
    endDate: '',
    totalPayableDays: 0,
    totalPaidAmount: 0,
    totalDueAmount: 0,
    totalNetAmount: 0,
    totalMonths: 0,
    totalWorkingDays: 0,
    totalPfContribution: 0,
    totalGovtDeduction: 0,
    hasProfessionalFees: false,
    attendancePercent: 0,
};

const Yearly = ({
    year,
    fromAdmin = false,
    showSensitiveData = false,
}: {
    year: Dayjs;
    fromAdmin?: boolean;
    showSensitiveData?: boolean;
}) => {
    void showSensitiveData;

    const dispatch = useDispatch();
    const employeeId = useSelector((state: RootState) =>
        fromAdmin ? state.employee?.selectedEmployee?.id : state.employee?.currentEmployee?.id
    );

    const [companyId, setCompanyId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [startDaySalaryData, setStartDaySalaryData] = useState<any[]>([]);
    const [salaryData, setSalaryData] = useState<any[]>([]);
    const [yearOverview, setYearOverview] = useState<YearOverview>(initialOverview);

    const [isLoadingOverview, setIsLoadingOverview] = useState<boolean>(true);
    const [isLoadingSalaryData, setIsLoadingSalaryData] = useState<boolean>(true);

    useEffect(() => {
        if (!year) return;

        setIsLoadingOverview(true);
        setIsLoadingSalaryData(true);
        setStartDaySalaryData([]);
        setSalaryData([]);
        setYearOverview(initialOverview);

        async function getFiscalYear() {
            const dates = await generateFiscalYearFromGivenYear(year);
            setStartDate(dates.startDate);
            setEndDate(dates.endDate);
        }

        getFiscalYear();
    }, [year]);

    useEffect(() => {
        if (!employeeId) return;

        let mounted = true;
        async function fetchStats() {
            try {
                const { data: { companyOverview } = { companyOverview: [] } } = await fetchCompanyOverview();
                if (!mounted) return;

                if (companyOverview?.length > 0) {
                    setCompanyId(companyOverview[0].id);
                }

                const { data: { leaves } = { leaves: [] } } = await fetchEmployeeLeaves(employeeId);

                let publicHolidays: any[] = [];
                if (companyOverview?.length > 0) {
                    const { data: { publicHolidays: ph = [] } = { publicHolidays: [] } } =
                        await fetchAllPublicHolidays('India', companyOverview[0].id);
                    publicHolidays = ph;
                }

                const totalLeaves = await customLeaves(leaves || []);
                dispatch(saveLeaves(totalLeaves));
                dispatch(savePublicHolidays(publicHolidays || []));
                fetchEmpYearlyStatistics(year, fromAdmin);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        }

        fetchStats();
        return () => {
            mounted = false;
        };
    }, [year, employeeId, dispatch, fromAdmin]);

    useEffect(() => {
        if (!startDate || !endDate || !employeeId || !companyId) return;

        let mounted = true;
        async function fetchSalaryRows() {
            try {
                const response = await fetchAllSalaryByFiscalYear(employeeId, companyId, startDate, endDate);
                if (!mounted) return;
                if (response?.success && response?.data?.data) {
                    setSalaryData(response.data.data);
                } else {
                    setSalaryData([]);
                }
            } catch (error) {
                console.error('Error fetching salary data:', error);
            }
        }

        fetchSalaryRows();
        return () => {
            mounted = false;
        };
    }, [employeeId, companyId, startDate, endDate]);

    useEffect(() => {
        if (!startDate || !endDate || !employeeId) {
            setIsLoadingSalaryData(false);
            setStartDaySalaryData([]);
            return;
        }

        let mounted = true;

        const loadData = async () => {
            try {
                setIsLoadingSalaryData(true);
                const response = await fetchAllSalaryDataForDateRangeYearly(employeeId, startDate, endDate);
                if (!mounted) return;
                setStartDaySalaryData(response.message.salaryData || []);
                setIsLoadingSalaryData(false);
            } catch (error) {
                console.error('Error in fetchAllSalaryDataForDateRangeYearly:', error);
                if (mounted) {
                    setStartDaySalaryData([]);
                    setIsLoadingSalaryData(false);
                }
            }
        };

        loadData();
        return () => {
            mounted = false;
        };
    }, [employeeId, startDate, endDate]);

    useEffect(() => {
        setIsLoadingOverview(isLoadingSalaryData);

        if (!startDaySalaryData || startDaySalaryData.length === 0) {
            setYearOverview({
                ...initialOverview,
                startDate,
                endDate,
            });
            return;
        }

        const totals = startDaySalaryData.reduce((acc, item) => {
            const payableDays = convertHoursToDays(item.payableHours);
            const workingDays = Number(item.workingdays || item.workingDays || 0);
            const paidAmount = parseCurrencyOrNumber(item.amountPaid ?? item.paidAmount);
            const dueAmount = parseCurrencyOrNumber(item.due);
            const netAmount = parseCurrencyOrNumber(item.netAmount);
            const pf = getFixedDeductionAmount(item, isPfKey);
            const professionalFees = getFixedDeductionAmount(item, isProfessionalFeesKey);

            return {
                payableDays: acc.payableDays + payableDays,
                workingDays: acc.workingDays + workingDays,
                paidAmount: acc.paidAmount + paidAmount,
                dueAmount: acc.dueAmount + dueAmount,
                netAmount: acc.netAmount + netAmount,
                pfAmount: acc.pfAmount + pf,
                govtAmount: acc.govtAmount + professionalFees,
            };
        }, {
            payableDays: 0,
            workingDays: 0,
            paidAmount: 0,
            dueAmount: 0,
            netAmount: 0,
            pfAmount: 0,
            govtAmount: 0,
        });

        const attendancePercent = totals.workingDays > 0
            ? Number(((totals.payableDays / totals.workingDays) * 100).toFixed(0))
            : 0;

        setYearOverview({
            startDate,
            endDate,
            totalPayableDays: Number(totals.payableDays.toFixed(2)),
            totalPaidAmount: totals.paidAmount,
            totalDueAmount: totals.dueAmount,
            totalNetAmount: totals.netAmount,
            totalMonths: startDaySalaryData.length,
            totalWorkingDays: totals.workingDays,
            totalPfContribution: totals.pfAmount,
            totalGovtDeduction: totals.govtAmount,
            hasProfessionalFees: totals.govtAmount > 0,
            attendancePercent,
        });
    }, [startDaySalaryData, startDate, endDate, isLoadingSalaryData]);

    const startYear = yearOverview.startDate ? new Date(yearOverview.startDate).getFullYear() : '';
    const endYear = yearOverview.endDate ? new Date(yearOverview.endDate).getFullYear() : '';
    const financialYear = startYear && endYear ? `${startYear}-${endYear}` : '-';
    const paidPercent = yearOverview.totalNetAmount > 0
        ? Math.round((yearOverview.totalPaidAmount / yearOverview.totalNetAmount) * 100)
        : 0;
    const hasProfessionalFees = yearOverview.hasProfessionalFees;
    const yearlySalaryRows = startDaySalaryData.length > 0 ? startDaySalaryData : salaryData;
    const breakdownRows = buildBreakdownRows(yearlySalaryRows);

    const kpis = [
        {
            label: 'NET PAYABLE (THIS YEAR)',
            value: formatCurrencyDecimal(yearOverview.totalNetAmount),
            footer: financialYear !== '-' ? `FY ${financialYear}` : 'Financial Year',
            tone: 'green' as const,
            icon: <AccountBalanceWalletOutlinedIcon fontSize="small" />,
        },
        {
            label: 'PAID AMOUNT',
            value: formatCurrencyDecimal(yearOverview.totalPaidAmount),
            footer: `${paidPercent}% Paid`,
            tone: 'blue' as const,
            icon: <CheckCircleOutlineOutlinedIcon fontSize="small" />,
        },
        {
            label: 'REMAINING AMOUNT',
            value: formatCurrencyDecimal(yearOverview.totalDueAmount),
            footer: yearOverview.totalDueAmount > 0 ? 'Pending' : 'Cleared',
            tone: 'amber' as const,
            icon: <HourglassBottomOutlinedIcon fontSize="small" />,
        },
        ...(hasProfessionalFees ? [{
            label: 'PF / GOVT DEDUCTION',
            value: formatCurrencyDecimal(yearOverview.totalGovtDeduction),
            footer: 'Professional Fees',
            tone: 'purple' as const,
            icon: <AccountBalanceOutlinedIcon fontSize="small" />,
        }] : []),
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, minmax(0, 1fr))',
                        lg: `repeat(${hasProfessionalFees ? 4 : 3}, minmax(0, 1fr))`,
                    },
                    gap: 1.25,
                }}
            >
                {isLoadingOverview
                    ? Array.from({ length: hasProfessionalFees ? 4 : 3 }).map((_, index) => (
                        <Skeleton key={index} variant="rounded" height={106} sx={{ borderRadius: '16px' }} />
                    ))
                    : kpis.map((item) => <YearlyKpiCard key={item.label} {...item} />)}
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: 'repeat(2, minmax(0, 1fr))',
                        lg: 'minmax(0, 1.6fr) minmax(320px, 1fr)',
                    },
                    gap: 1.25,
                    alignItems: 'start',
                }}
            >
                {isLoadingOverview ? (
                    <>
                        <Skeleton variant="rounded" height={276} sx={{ borderRadius: '16px' }} />
                        <Skeleton variant="rounded" height={276} sx={{ borderRadius: '16px' }} />
                    </>
                ) : (
                    <>
                        <YearlyOverViewCard
                            title="Yearly Overview"
                            fiscalYear={financialYear}
                            fiscalMonth={yearOverview.totalMonths ? `${yearOverview.totalMonths} Months` : '-'}
                            payableDays={yearOverview.totalPayableDays.toFixed(2)}
                            workingDays={yearOverview.totalWorkingDays.toString()}
                            attendance={`${yearOverview.attendancePercent}%`}
                            leavePercentage={`${100 - yearOverview.attendancePercent}%`}
                            netPayable={formatCurrencyDecimal(yearOverview.totalNetAmount)}
                        />
                        <PaymentProgressCard
                            percentPaid={paidPercent}
                            paidAmount={formatCurrencyDecimal(yearOverview.totalPaidAmount)}
                            remainingAmount={formatCurrencyDecimal(yearOverview.totalDueAmount)}
                        />
                    </>
                )}
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        lg: 'repeat(2, minmax(0, 1fr))',
                    },
                    gap: 1.25,
                    alignItems: 'stretch',
                }}
            >
                <Box sx={{ minWidth: 0, '& > .card': { height: '100%', mb: '0 !important' } }}>
                    <MonthlySalaryComparison ComparisonData={yearlySalaryRows} loading={isLoadingSalaryData} compact />
                </Box>
                <Box sx={{ minWidth: 0, '& > .card': { height: '100%', mb: '0 !important' } }}>
                    <Increments salaryData={yearlySalaryRows} loading={isLoadingSalaryData} compact />
                </Box>
            </Box>

            <SalaryBreakdownTable rows={breakdownRows} loading={isLoadingSalaryData} showGovtDeduction={hasProfessionalFees} />
        </Box>
    );
};

export default Yearly;
