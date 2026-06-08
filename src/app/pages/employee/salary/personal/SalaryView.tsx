import { Dayjs } from "dayjs";
import dayjs from "dayjs";
import SalaryReportToggle from "./views/my-salary/Toggle/SalaryReportToggle";
import { fetchEmpMonthlyStatistics, fetchEmpYearlyStatistics } from "@utils/statistics";
import EmployeeDetailsCard from "./views/my-salary/EmployeeDetailsCard";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { useEffect, useState } from "react";
import { fetchAppSettings } from "@redux/slices/appSettings";
import { fetchSalaryDataForDateRangeMonthly } from "@services/company";
import { setMonthlyApiData, setLoading, setError, setLastFetchedMonth } from "@redux/slices/salaryData";

export type SalaryToggleItemsCallBackFunctions = {
  monthly: (date: Dayjs) => void;
  yearly: (date: Dayjs) => void;
  alltime: () => void;
};

function SalaryView({ fromAdmin = false }: { fromAdmin?: boolean }) {
  const dispatch = useDispatch();
  const stats = useSelector((state: RootState) => state.attendanceStats.monthly);
  const employee = useSelector((state: RootState) => 
    fromAdmin ? state.employee?.selectedEmployee : state.employee.currentEmployee
  );
  
  // Get salary data from Redux
  const { monthlyApiData, isLoading: isApiDataLoading } = useSelector(
    (state: RootState) => state.salaryData
  );
  
  // Privacy state for sensitive data visibility
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const toggleSensitiveData = () => {
    setShowSensitiveData(!showSensitiveData);
  };

  // Function to fetch monthly salary data
  const fetchMonthlySalaryData = async (date: Dayjs) => {
    if (!employee?.id) return;
    
    dispatch(setLoading(true));
    
    try {
      const startDate = date.startOf('month').format('YYYY-MM-DD');
      const endDate = date.endOf('month').format('YYYY-MM-DD');
      const monthKey = date.format('YYYY-MM');
      
      console.log('📊 [SalaryView] Fetching salary data for month:', monthKey);
      
      const response = await fetchSalaryDataForDateRangeMonthly({
        employeeId: employee.id,
        startDate,
        endDate
      });
      
      if (response?.message?.salaryData) {
        dispatch(setMonthlyApiData(response.message));
        dispatch(setLastFetchedMonth(monthKey));
        console.log('✅ [SalaryView] Salary data fetched successfully');
      } else {
        console.warn('⚠️ [SalaryView] No salary data found in response');
        dispatch(setError('No salary data available'));
      }
    } catch (error) {
      console.error('❌ [SalaryView] Error fetching salary data:', error);
      dispatch(setError((error as Error)?.message || 'Failed to fetch salary data'));
    }
  };

  // Refresh salary data after form submissions
  const refreshSalaryData = async () => {
    if (!employee?.id || !currentMonth) return;
    
    console.log('🔄 [SalaryView] Refreshing salary data after form submission');
    setIsRefreshing(true);
    
    try {
      await fetchMonthlySalaryData(currentMonth);
      console.log('✅ [SalaryView] Salary data refreshed successfully');
    } catch (error) {
      // Fail silently as requested
      console.error('❌ [SalaryView] Failed to refresh salary data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleItemsActions: SalaryToggleItemsCallBackFunctions = {
    monthly: function (month: Dayjs): void {
      setCurrentMonth(month);
      fetchEmpMonthlyStatistics(month);
      // Fetch salary data when month changes
      fetchMonthlySalaryData(month);
    },
    yearly: function (year: Dayjs): void {
      fetchEmpYearlyStatistics(year);
    },
    alltime: function (): void {
      // All time statistics fetch will be handled in AllTime component
    }
  };

  // Initial load - fetch current month data
  useEffect(() => {
    dispatch(fetchAppSettings() as any);
    if (employee?.id) {
      fetchMonthlySalaryData(currentMonth);
    }
  }, [employee?.id]);

  return (
    <>
      <EmployeeDetailsCard 
        fromAdmin={fromAdmin} 
        stats={stats} 
        showSensitiveData={showSensitiveData}
        onToggleSensitiveData={toggleSensitiveData}
        monthlyApiData={monthlyApiData}
      />
      <SalaryReportToggle 
        toggleItemsActions={toggleItemsActions} 
        fromAdmin={fromAdmin} 
        showSensitiveData={showSensitiveData}
        monthlyApiData={monthlyApiData}
        isApiDataLoading={isApiDataLoading}
        onRefreshSalaryData={refreshSalaryData}
        isRefreshing={isRefreshing}
      />
    </>
  );
}

export default SalaryView;