

import { RootState } from '@redux/store';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { customLeaves } from '@utils/statistics';
import { fetchAllPublicHolidays, fetchCompanyOverview } from '@services/company';
import { fetchAllEmployeeSalaryAllTimeDateRage, fetchAllSalaryDataForDateRangeYearly, fetchEmployeeLeaves } from '@services/employee';
import { saveLeaves, savePublicHolidays } from '@redux/slices/attendanceStats';
import AllTimeIncrements from './AllTimeIncrements';
import YearlyOverViewCard from './YearlyOverViewCard';
import { generateFiscalYearFromGivenYear } from '@utils/file';

const AllTime = ({ fromAdmin = false, showSensitiveData, year }: { fromAdmin?: boolean, showSensitiveData: boolean, year: any }) => {
    const dispatch = useDispatch();
    const employeeId = useSelector((state: RootState) => fromAdmin ? state.employee?.selectedEmployee.id : state.employee.currentEmployee.id);
    const employee = useSelector((state: RootState) => fromAdmin ? state.employee?.selectedEmployee : state.employee.currentEmployee);
    const toggleChange = useSelector((state: RootState) => state.attendanceStats?.toggleChange);

    const [allTimeSalaryData, setAllTimeSalaryData] = useState<any[]>([]);
    const [ctcGraphData, setCtcGraphData] = useState<any[]>([]);
    const [yearOverview, setYearOverview] = useState<any>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Loading states
    const [isLoadingOverview, setIsLoadingOverview] = useState<boolean>(true);
    const [isLoadingSalaryData, setIsLoadingSalaryData] = useState<boolean>(true);

    // compute fiscal start/end from year prop
    useEffect(() => {
        if (!year) return;
        (async () => {
            const { startDate: s, endDate: e } = await generateFiscalYearFromGivenYear(year);
            setStartDate(s);
            setEndDate(e);
        })();
    }, [year]);

    useEffect(() => {
        const fetchCTC = async () => {
            try {
                setIsLoadingSalaryData(true);
                const response = await fetchAllEmployeeSalaryAllTimeDateRage(employeeId);
                const history = response?.message?.employeeIncrementHistory || [];
                const formatted = history.map((item: any) => {
                    const monthlyCTC = Number(item.ctcInLpa) / 12;
                    const date = new Date(item.effectiveFrom);
                    const monthName = date.toLocaleString("en-US", { month: "long" });
                    const yearNum = date.getFullYear();
                    return {
                        month: monthName,
                        year: yearNum,
                        monthlyCTC
                    };
                });

                setCtcGraphData(formatted);
                setAllTimeSalaryData(response?.message?.salaryData || []);
            } catch (error) {
                console.log("CTC fetch error:", error);
            } finally {
                setIsLoadingSalaryData(false);
            }
        };

        if (employeeId) fetchCTC();
    }, [employeeId, toggleChange]);

    // useEffect(() => {
    //     const fetchSalaryDataForDateRangeAllTime = async () => {
    //         try {
    //             // const response = await fetchAllEmployeeSalaryAllTimeDateRage(employeeId);
    //             // you can setAllTimeSalaryData here if needed
    //         } catch (error) {
    //             console.error('Error in fetchAllSalaryDataForDateRangeYearly:', error);
    //         }
    //     };

    //     if (employeeId) fetchSalaryDataForDateRangeAllTime();
    // }, [employeeId]);

    useEffect(() => {
        if (!allTimeSalaryData || allTimeSalaryData.length === 0) {
            setIsLoadingOverview(true);
            setYearOverview({
                startDate,
                endDate,
                totalPayableDays: 0,
                totalPaidAmount: 0,
                totalDueAmount: 0,
                totalNetAmount: 0,
                totalMonths: 0
            });
            return;
        }

        setIsLoadingOverview(true);

        const cleanNumber = (value: any) => {
            if (value == null) return 0;
            if (typeof value === 'number') return value;
            return parseFloat(String(value).replace(/[₹,]/g, '')) || 0;
        };

        let totalPaidAmount = 0;
        let totalDueAmount = 0;
        let totalNetAmount = 0;
        let totalPayableDays = 0;

        allTimeSalaryData.forEach((item: any) => {
            totalPaidAmount += cleanNumber(item.paidAmount ?? item.amountPaid ?? item.paid_amount);
            totalDueAmount += cleanNumber(item.due);
            totalNetAmount += cleanNumber(item.netAmount ?? item.net_amount ?? item.netPayable);
            // If you have payableHours, convert to days (same logic as Yearly)
            if (item.payableHours) {
                const [hh = 0, mm = 0, ss = 0] = String(item.payableHours).split(':').map(Number);
                const hours = hh + (mm || 0) / 60 + (ss || 0) / 3600;
                totalPayableDays += hours / 8;
            }
        });

        setYearOverview({
            startDate,
            endDate,
            totalPayableDays: Number(totalPayableDays.toFixed(2)),
            totalPaidAmount,
            totalDueAmount,
            totalNetAmount,
            totalMonths: allTimeSalaryData.length
        });

        setIsLoadingOverview(false);
    }, [allTimeSalaryData, startDate, endDate]);

    return (
        <>
            {/* <YearlyOverViewCard overview={yearOverview} loading={isLoadingOverview} /> */}
            <AllTimeIncrements salaryData={allTimeSalaryData} SalaryDataCtc={ctcGraphData} loading={isLoadingSalaryData} />
            {/* <h1>welcome to pages</h1> */}
        </>
    );
};

export default AllTime;
