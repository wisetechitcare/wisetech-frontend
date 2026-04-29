import React, { useState, useCallback, useEffect, useMemo } from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { toAbsoluteUrl } from "@metronic/helpers";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { fetchSalaryRecordsBasedOnDateRange } from "@services/employee";
import MonthlySalary from "./MonthlySalary";
import YearlySalary from "./YearlySalary";

const SalaryEmployeeData = () => {
  const [alignment, setAlignment] = useState<"monthly" | "yearly">("monthly");
  const [month, setMonth] = useState(dayjs());
  const [year, setYear] = useState(dayjs());
  const [fiscalYear, setFiscalYear] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [employeesData, setEmployeesData] = useState<any[]>([]);

  const handleToggleChange = useCallback((_: React.MouseEvent<HTMLElement>, newValue: "monthly" | "yearly") => {
    if (newValue !== null) setAlignment(newValue);
  }, []);

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
    } else if (fiscalYear) {
      const [fiscalStartDate, fiscalEndDate] = fiscalYear.split(' to ');
      return {
        startDate: fiscalStartDate,
        endDate: fiscalEndDate
      };
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
  }, [dateRanges]);

  return (
    <>
      <h3 className="fw-bold fs-1 mb-5 font-barlow">Salary Employee Data</h3>

      {/* Toggle and Date Selection */}
      <div className="d-flex flex-md-row justify-content-lg-between flex-column align-items-lg-center mb-8 gap-5 gap-lg-0">
        <ToggleButtonGroup
          value={alignment}
          exclusive
          onChange={handleToggleChange}
          aria-label="View Selection"
          sx={{
            '& .MuiToggleButton-root': {
              borderRadius: '20px',
              borderColor: '#B0BEC5 !important',
              color: '#000 !important',
              padding: '6px 16px',
              borderWidth: '2px',
              fontWeight: '600',
              marginRight:"10px"
            },
            '& .Mui-selected': {
              borderColor: '#9D4141 !important',
              color: '#9D4141 !important'
            },
            '& .MuiToggleButton-root:hover': {
              borderColor: '#9D4141 !important',
              color: '#9D4141 !important'
            },
          }}
        >
          <ToggleButton value="monthly">Monthly</ToggleButton>
          <ToggleButton value="yearly">Yearly</ToggleButton>
        </ToggleButtonGroup>

        {/* Month Selector */}
        {alignment === 'monthly' && (
          <div className="d-flex align-items-center">
            <button
              className="btn btn-sm p-0"
              onClick={handlePrevMonth}
              disabled={isLoading}
            >
              <img src={toAbsoluteUrl('media/svg/misc/back.svg')} alt="Previous Month" />
            </button>
            <span className="mx-2 my-5">{month.format('MMM, YYYY')}</span>
            <button
              className="btn btn-sm p-0"
              onClick={handleNextMonth}
              disabled={isLoading}
            >
              <img src={toAbsoluteUrl('media/svg/misc/next.svg')} alt="Next Month" />
            </button>
          </div>
        )}

        {/* Yearly Selector */}
        {alignment === 'yearly' && (
          <div className="d-flex align-items-center">
            <button
              className="btn btn-sm p-0"
              onClick={handlePrevYear}
              disabled={isLoading}
            >
              <img src={toAbsoluteUrl('media/svg/misc/back.svg')} alt="Previous Year" />
            </button>
            <span className="mx-2 my-5">{fiscalYear}</span>
            <button
              className="btn btn-sm p-0"
              onClick={handleNextYear}
              disabled={isLoading}
            >
              <img src={toAbsoluteUrl('media/svg/misc/next.svg')} alt="Next Year" />
            </button>
          </div>
        )}
      </div>

      {/* Conditional Rendering */}
      {alignment === 'monthly' ? (
        <MonthlySalary month={month} employeesData={employeesData} isLoading={isLoading} />
      ) : (
        <YearlySalary year={year} fiscalYear={fiscalYear} employeesData={employeesData} isLoading={isLoading} />
      )}
    </>
  );
};

export default SalaryEmployeeData;
