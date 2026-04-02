


import { RootState } from '@redux/store';
import { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { customLeaves, fetchEmpYearlyStatistics } from '@utils/statistics';
import { fetchAllPublicHolidays, fetchCompanyOverview } from '@services/company';
import { fetchEmployeeLeaves, fetchAllSalaryByFiscalYear, fetchAllSalaryDataForDateRangeYearly } from '@services/employee';
import { saveLeaves, savePublicHolidays } from '@redux/slices/attendanceStats';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import Increments from './Increments';
import MonthlySalaryComparison from './MonthlySalaryComparison';
import DetailedReports from './DetailedReports';
import { set } from 'lodash';
import { start } from 'repl';
import YearlyOverViewCard from './YearlyOverViewCard';

const Yearly = ({
    year,
    fromAdmin = false,
    showSensitiveData = false,
}: {
    year: Dayjs;
    fromAdmin?: boolean;
    showSensitiveData?: boolean;
}) => {
    // console.log("Yearly Component Rendered with year: ===================>", year);

    const dispatch = useDispatch();
    const employeeId = useSelector((state: RootState) =>
        fromAdmin ? state.employee?.selectedEmployee?.id : state.employee?.currentEmployee?.id
    );

    const [companyId, setCompanyId] = useState<string>('');
    const [fiscalYear, setFiscalYear] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [startDaySalaryData, setStartDaySalaryData] = useState<any[]>([]);
    const [endDaySalaryData, setEndDaySalaryData] = useState<any[]>([]);

    const [salaryData, setSalaryData] = useState<any[]>([]);
    const [detailedReportsData, setDetailedReportsData] = useState<any[]>([]);
    const [yearOverview,setYearOverview] = useState<any>([]);

    // Loading states
    const [isLoadingOverview, setIsLoadingOverview] = useState<boolean>(true);
    const [isLoadingSalaryData, setIsLoadingSalaryData] = useState<boolean>(true);

    // console.log("setFiscalYear called with: ===================>", startDate, endDate );

    // Compute fiscal year start/end
    useEffect(() => {
        if (!year) return;

        console.log("Year changed, resetting data:", year.format('YYYY'));

        // Reset loading states and clear old data when year changes
        setIsLoadingOverview(true);
        setIsLoadingSalaryData(true);
        setStartDaySalaryData([]);  // Clear old data immediately
        setSalaryData([]);
        setDetailedReportsData([]);
        setYearOverview([]);

        async function getFiscalYear() {
            const { startDate, endDate } = await generateFiscalYearFromGivenYear(year);
            console.log("New fiscal year calculated:", { startDate, endDate });
            setFiscalYear(`${startDate} to ${endDate}`);
            setStartDate(startDate);
            setEndDate(endDate);
        }
        getFiscalYear();
    }, [year]);

    // Fetch company overview, leaves, public holidays, and yearly statistics
    useEffect(() => {
        if (!employeeId) return;

        let mounted = true;
        async function fetchStats() {
            try {
                const { data: { companyOverview } = { companyOverview: [] } } = await fetchCompanyOverview();
                if (!mounted) return;

                if (companyOverview && companyOverview.length > 0) {
                    setCompanyId(companyOverview[0].id);
                }

                const { data: { leaves } = { leaves: [] } } = await fetchEmployeeLeaves(employeeId);

                // only call public holidays when we have a company id
                let publicHolidays: any[] = [];
                if (companyOverview && companyOverview.length > 0) {
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
        return () => { mounted = false; };
    }, [year, employeeId, dispatch, fromAdmin]);

    // Fetch salary data for Increments / DetailedReports using startDate & endDate
    useEffect(() => {
        if (!startDate || !endDate || !employeeId || !companyId) return;

        let mounted = true;
        async function fetchSalaryData() {
            try {
                const response = await fetchAllSalaryByFiscalYear(
                    employeeId,
                    companyId,
                    startDate,
                    endDate
                );

                if (!mounted) return;

                if (response?.success && response?.data?.data) {
                    const salaryEntries = response.data.data;
                    setSalaryData(salaryEntries);

                    // Prepare detailed reports data (same logic you had)
                    const fiscalMonths = [
                        'April','May','June','July','August','September',
                        'October','November','December','January','February','March'
                    ];

                    const reportsData = fiscalMonths.map((month) => {
                        const salaryEntry = salaryEntries.find((item: any) => item.month === month);

                        if (salaryEntry) {
                            return {
                                month,
                                basicSalary: salaryEntry.basicSalary ?? 40000,
                                payableHours: salaryEntry.payableHours ?? '32:12:32',
                                workingHours: salaryEntry.workingHours ?? '32:12:32',
                                overtime: salaryEntry.overtime ?? null,
                                remainingTime: salaryEntry.remainingTime ?? null,
                                totalGrossPay: salaryEntry.totalGrossPay ?? 38000,
                                totalDeducted: salaryEntry.totalDeducted ?? 4000,
                                netAmount: salaryEntry.netAmount ?? 32000,
                                paidAmount: parseFloat(salaryEntry.amountPaid) || 0,
                                due: salaryEntry.due ?? null,
                                status: salaryEntry.status ?? 'Full Paid',
                            };
                        } else {
                            return {
                                month,
                                basicSalary: null,
                                payableHours: null,
                                workingHours: null,
                                overtime: null,
                                remainingTime: null,
                                totalGrossPay: null,
                                totalDeducted: null,
                                netAmount: null,
                                paidAmount: 0,
                                due: null,
                                status: 'Pending',
                            };
                        }
                    });

                    setDetailedReportsData(reportsData);
                } else {
                    console.warn("No valid salary data found for fiscal year.");
                }
            } catch (error) {
                console.error("Error fetching salary data:", error);
            }
        }

        fetchSalaryData();
        return () => { mounted = false; };
    }, [employeeId, companyId, startDate, endDate]);

    // Another API that expects date range — use startDate/endDate as well
    useEffect(() => {
        if (!startDate || !endDate || !employeeId) {
            console.log('Skipping fetch - missing required params:', { startDate, endDate, employeeId });
            setIsLoadingSalaryData(false);
            setStartDaySalaryData([]);
            return;
        }

        let mounted = true;
        const controller = new AbortController();

        const loadData = async () => {
            try {
                setIsLoadingSalaryData(true);
                console.log('Fetching salary data with params:', { employeeId, startDate, endDate });

                const response = await fetchAllSalaryDataForDateRangeYearly(
                    employeeId,
                    startDate,
                    endDate
                );

                if (!mounted) return;

                const data = response.message.salaryData || [];
                console.log('Received salary data - length:', data.length);

                // Batch state updates
                setStartDaySalaryData(data);
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
            controller.abort();
        };
    }, [employeeId, startDate, endDate]);

    // Memoize year overview calculation for better performance
    useEffect(() => {
        setIsLoadingOverview(isLoadingSalaryData);

        if (!startDaySalaryData || startDaySalaryData.length === 0) {
            setYearOverview({
                startDate,
                endDate,
                totalPayableDays: 0,
                totalPaidAmount: 0,
                totalDueAmount: 0,
                totalNetAmount: 0,
                totalMonths: 0,
            });
            return;
        }

        const convertToHours = (time: string) => {
            if (!time || time === "-" || time === "") return 0;
            const [hh, mm, ss] = time.split(":").map(Number);
            return hh + mm / 60 + ss / 3600;
        };

        const cleanNumber = (value: string) => {
            if (!value) return 0;
            return parseFloat(value.replace(/[₹,]/g, ""));
        };

        // Calculate totals in a single pass
        const totals = startDaySalaryData.reduce((acc, item) => {
            const totalHours = convertToHours(item.payableHours);
            return {
                payableDays: acc.payableDays + totalHours / 8,
                paidAmount: acc.paidAmount + cleanNumber(item.paidAmount),
                dueAmount: acc.dueAmount + cleanNumber(item.due),
                netAmount: acc.netAmount + cleanNumber(item.netAmount)
            };
        }, { payableDays: 0, paidAmount: 0, dueAmount: 0, netAmount: 0 });

        setYearOverview({
            startDate,
            endDate,
            totalPayableDays: Number(totals.payableDays.toFixed(2)),
            totalPaidAmount: totals.paidAmount,
            totalDueAmount: totals.dueAmount,
            totalNetAmount: totals.netAmount,
            totalMonths: startDaySalaryData.length,
        });
    }, [startDaySalaryData, startDate, endDate, isLoadingSalaryData]);

    console.log("Salary Data for Yearly View: ===================>", startDaySalaryData);
    console.log("isLoadingSalaryData: ===================>", isLoadingSalaryData);
    console.log("isLoadingOverview: ===================>", isLoadingOverview);

    return (
        <>
            <YearlyOverViewCard overview={yearOverview} loading={isLoadingOverview} />

            {/* Monthly Salary Comparison */}
            <MonthlySalaryComparison ComparisonData={startDaySalaryData} loading={isLoadingSalaryData} />

            {/* Increments Chart */}
            <Increments salaryData={startDaySalaryData} loading={isLoadingSalaryData} />

            {/* Detailed Reports Table */}
            <DetailedReports data={startDaySalaryData} loading={isLoadingSalaryData} />
        </>
    );
}

export default Yearly;
