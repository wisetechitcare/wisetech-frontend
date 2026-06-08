import React, { useState, useCallback, useEffect, useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { fetchSalaryRecordsBasedOnDateRange } from "@services/employee";
import MonthlySalary from "./MonthlySalary";
import YearlySalary from "./YearlySalary";
import SalaryPeriodToolbar from "../components/SalaryPeriodToolbar";

const SalaryEmployeeData = () => {
  const [alignment, setAlignment] = useState<"monthly" | "yearly" | "allTime">("monthly");
  const [month, setMonth] = useState(dayjs());
  const [year, setYear] = useState(dayjs());
  const [fiscalYear, setFiscalYear] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [employeesData, setEmployeesData] = useState<any[]>([]);

  const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);

  // Handle previous month
  const handlePrevMonth = useCallback(() => {
    setMonth(prevMonth => prevMonth.subtract(1, 'month'));
  }, []);

  // Handle next month
  const handleNextMonth = useCallback(() => {
    setMonth(prevMonth => prevMonth.add(1, 'month'));
  }, []);

  // Handle previous year
  const handlePrevYear = useCallback(() => {
    setYear(prevYear => prevYear.subtract(1, 'year'));
  }, []);

  // Handle next year
  const handleNextYear = useCallback(() => {
    setYear(prevYear => prevYear.add(1, 'year'));
  }, []);

  // Fetch Fiscal Year
  useEffect(() => {
    if (!year) return;

    async function fetchFiscalYear() {
      try {
        const { startDate, endDate } = await generateFiscalYearFromGivenYear(year);
        setFiscalYear(`${startDate} to ${endDate}`);
      } catch (error) {
        console.error("Error generating fiscal year:", error);
      }
    }
    fetchFiscalYear();
  }, [year]);

  // Memoized date ranges
  const dateRanges = useMemo(() => {
    if (alignment === 'monthly') {
      return {
        startDate: month.startOf('month').format('YYYY-MM-DD'),
        endDate: month.endOf('month').format('YYYY-MM-DD')
      };
    } else if (alignment === 'yearly' && fiscalYear) {
      const [fiscalStartDate, fiscalEndDate] = fiscalYear.split(' to ');
      return {
        startDate: fiscalStartDate,
        endDate: fiscalEndDate
      };
    } else if (alignment === 'allTime') {
      return { startDate: '1970-01-01', endDate: dayjs().format('YYYY-MM-DD') };
    }
    return { startDate: '', endDate: '' };
  }, [alignment, month, fiscalYear]);

  // Fetch employee salary data
  useEffect(() => {
    if (!dateRanges.startDate || !dateRanges.endDate) return;

    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetchSalaryRecordsBasedOnDateRange(
          dateRanges.startDate,
          dateRanges.endDate
        );

        // console.log("Fetched salary records:==================>", response);
        setEmployeesData(response || []);
      } catch (error) {
        console.error("Error fetching salary records:", error);
        setEmployeesData([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [dateRanges, toggleChange]);

  return (
    <>
      <h3 className="fw-bold fs-1 mb-5 font-barlow">Employee Payrolls Data</h3>

      {/* Toggle and Date Selection */}
      <SalaryPeriodToolbar
        alignment={alignment}
        options={[
          { label: 'Monthly', value: 'monthly' },
          { label: 'Yearly', value: 'yearly' },
          { label: 'All Time', value: 'allTime' },
        ]}
        onAlignmentChange={(value) => setAlignment(value as "monthly" | "yearly" | "allTime")}
        periodLabel={alignment === 'monthly' ? month.format('MMM YYYY') : alignment === 'yearly' ? fiscalYear : undefined}
        onPrevious={alignment === 'monthly' ? handlePrevMonth : alignment === 'yearly' ? handlePrevYear : undefined}
        onNext={alignment === 'monthly' ? handleNextMonth : alignment === 'yearly' ? handleNextYear : undefined}
        disablePrevious={isLoading}
        disableNext={isLoading}
      />

      {/* Conditional Rendering */}
      {alignment === 'monthly' && (
        <MonthlySalary month={month} employeesData={employeesData} isLoading={isLoading} />
      )}
      {alignment === 'yearly' && (
        <YearlySalary year={year} fiscalYear={fiscalYear} employeesData={employeesData} isLoading={isLoading} />
      )}
      {alignment === 'allTime' && (
        <YearlySalary year={year} fiscalYear="All Time" employeesData={employeesData} isLoading={isLoading} title="All Time Salary" />
      )}
    </>
  );
};

export default SalaryEmployeeData;
