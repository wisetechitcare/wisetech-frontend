import { RootState } from '@redux/store';
import { Dayjs } from 'dayjs';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SalaryReport from '../SalaryReport';
import { customLeaves, fetchEmpMonthlyStatistics } from '@utils/statistics';
import { fetchAllPublicHolidays, fetchCompanyOverview } from '@services/company';
import { fetchEmployeeLeaves } from '@services/employee';
import { saveLeaves, savePublicHolidays } from '@redux/slices/attendanceStats';
import { MONTH } from '@constants/statistics';
import { IMonthlyApiResponse } from '@redux/slices/salaryData';

interface MonthlyProps {
    month: Dayjs;
    fromAdmin?: boolean;
    showSensitiveData: boolean;
    monthlyApiData?: IMonthlyApiResponse | null;
    isApiDataLoading?: boolean;
    onRefreshSalaryData?: () => void;
    isRefreshing?: boolean;
}

const Monthly = ({ month, fromAdmin = false, showSensitiveData, monthlyApiData, isApiDataLoading, onRefreshSalaryData, isRefreshing }: MonthlyProps) => {
    const dispatch = useDispatch();
    const employeeId = useSelector((state: RootState) => fromAdmin ? state.employee?.selectedEmployee.id : state.employee.currentEmployee.id);
    const employee = useSelector((state: RootState) => fromAdmin ? state.employee?.selectedEmployee : state.employee.currentEmployee);

    const monthlyStats = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.monthly;
    });

    useEffect(() => {
        async function fetchStats() {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;

            const { data: { leaves } } = await fetchEmployeeLeaves(employeeId);
            const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', companyId);

            const totalLeaves = await customLeaves(leaves);

            dispatch(saveLeaves(totalLeaves));
            dispatch(savePublicHolidays(publicHolidays));

            fetchEmpMonthlyStatistics(month, fromAdmin);
        }

        fetchStats();
    }, [month, employeeId]);

    return (
        <>
            <SalaryReport stats={monthlyStats} keyword={MONTH} date={month.format('MMM YYYY')}
                month={month.format('MM')} year={month.format('YYYY')} employee={employee} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} monthlyApiData={monthlyApiData} isApiDataLoading={isApiDataLoading} onRefreshSalaryData={onRefreshSalaryData} isRefreshing={isRefreshing} />
        </>
    );
}

export default Monthly;