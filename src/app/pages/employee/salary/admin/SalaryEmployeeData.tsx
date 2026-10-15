import React, { useState, useCallback, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { formatFiscalYearLabel } from "@utils/fiscalYearHelper";
import { fetchSalaryRecordsBasedOnDateRange } from "@services/employee";
import MonthlySalary from "./MonthlySalary";
import YearlySalary from "./YearlySalary";
import SalaryPeriodToolbar from "../components/SalaryPeriodToolbar";
import SupportRemoteSalary from "./SupportRemoteSalary";
import { useSecurityPin } from "@app/modules/common/components/SecurityPin";
import { supportCoversArea } from "@utils/securityPinBus";

const SalaryEmployeeData = () => {
  const { supportGrant } = useSecurityPin();
  const supportRemote =
    !!supportGrant
    && supportCoversArea("finance.salary/employee-payrolls")
    && !!supportGrant.targetEmployeeId;

  const [alignment, setAlignment] = useState<"monthly" | "yearly" | "allTime">("monthly");
  const [month, setMonth] = useState(dayjs());
  const [year, setYear] = useState(dayjs());
  const [fiscalYear, setFiscalYear] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [employeesData, setEmployeesData] = useState<any[]>([]);
  const [employeeStatus, setEmployeeStatus] = useState<'active' | 'inactive' | 'all'>('active');

  const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);

  const handleStatusFilterChange = useCallback((status: 'Active' | 'Deactive' | 'All') => {
    setEmployeeStatus(status === 'Active' ? 'active' : status === 'Deactive' ? 'inactive' : 'all');
  }, []);

  const handlePrevMonth = useCallback(() => {
    setMonth(prevMonth => prevMonth.subtract(1, 'month'));
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonth(prevMonth => prevMonth.add(1, 'month'));
  }, []);

  const handlePrevYear = useCallback(() => {
    setYear(prevYear => prevYear.subtract(1, 'year'));
  }, []);

  const handleNextYear = useCallback(() => {
    setYear(prevYear => prevYear.add(1, 'year'));
  }, []);

  useEffect(() => {
    if (!year || supportRemote) return;

    async function fetchFiscalYear() {
      try {
        const { startDate, endDate } = await generateFiscalYearFromGivenYear(year);
        setFiscalYear(`${startDate} to ${endDate}`);
      } catch (error) {
        console.error("Error generating fiscal year:", error);
      }
    }
    fetchFiscalYear();
  }, [year, supportRemote]);

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

  useEffect(() => {
    if (supportRemote) return;
    if (!dateRanges.startDate || !dateRanges.endDate) return;

    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetchSalaryRecordsBasedOnDateRange(
          dateRanges.startDate,
          dateRanges.endDate,
          employeeStatus
        );
        setEmployeesData(response || []);
      } catch (error) {
        console.error("Error fetching salary records:", error);
        setEmployeesData([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [dateRanges, toggleChange, employeeStatus, supportRemote]);

  if (supportRemote) {
    return (
      <SupportRemoteSalary
        targetEmployeeId={supportGrant!.targetEmployeeId}
        targetName={supportGrant!.targetName}
      />
    );
  }

  return (
    <>
      <SalaryPeriodToolbar
        alignment={alignment}
        options={[
          { label: 'Monthly', value: 'monthly' },
          { label: 'Yearly', value: 'yearly' },
          { label: 'All Time', value: 'allTime' },
        ]}
        onAlignmentChange={(value) => setAlignment(value as "monthly" | "yearly" | "allTime")}
        periodLabel={alignment === 'monthly' ? month.format('MMM YYYY') : alignment === 'yearly' ? formatFiscalYearLabel(fiscalYear) : undefined}
        onPrevious={alignment === 'monthly' ? handlePrevMonth : alignment === 'yearly' ? handlePrevYear : undefined}
        onNext={alignment === 'monthly' ? handleNextMonth : alignment === 'yearly' ? handleNextYear : undefined}
        disablePrevious={isLoading}
        disableNext={isLoading}
        pickGranularity={alignment === 'monthly' ? 'month' : alignment === 'yearly' ? 'year' : undefined}
        pickValue={
          alignment === 'monthly' ? month.startOf('month').format('YYYY-MM-DD')
            : alignment === 'yearly' ? year.startOf('year').format('YYYY-MM-DD')
              : undefined
        }
        onPickDate={
          alignment === 'monthly' ? (v) => setMonth(dayjs(v).startOf('month'))
            : alignment === 'yearly' ? (v) => setYear(dayjs(v).startOf('year'))
              : undefined
        }
      />

      {alignment === 'monthly' && (
        <MonthlySalary
          month={month}
          employeesData={employeesData}
          isLoading={isLoading}
          onStatusFilterChange={handleStatusFilterChange}
        />
      )}
      {alignment === 'yearly' && (
        <YearlySalary
          year={year}
          fiscalYear={fiscalYear}
          employeesData={employeesData}
          isLoading={isLoading}
          onStatusFilterChange={handleStatusFilterChange}
        />
      )}
      {alignment === 'allTime' && (
        <YearlySalary
          year={year}
          fiscalYear="All Time"
          employeesData={employeesData}
          isLoading={isLoading}
          title="All Time Salary"
          onStatusFilterChange={handleStatusFilterChange}
        />
      )}
    </>
  );
};

export default SalaryEmployeeData;
