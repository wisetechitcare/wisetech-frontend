import React, { useEffect, useMemo, useState } from "react";
import CurrentYearOverview from "./CurrentYearOverview";
import StatisticsOverview from "./StatisticsOverview";
import AllTimeRecords from "./AllTimeRecords";
import dayjs, { Dayjs } from "dayjs";
import { fetchEmpAttendanceStatistics } from "@services/employee";
import { RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import { Attendance } from "@models/employee";
import { resourceNameMapWithCamelCase } from "@constants/statistics";
import { fetchConfiguration } from "@services/company";
import { DATE_SETTINGS_KEY, DISABLE_LAUNCH_DEDUCTION_TIME_KEY, LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { setFeatureConfiguration } from "@redux/slices/featureConfiguration";

const AttendanceGraphicalOverview: React.FC = () => {
    const year = useMemo(() => dayjs(), []);

    // const endDate = dayjs().endOf('year').format('YYYY-MM-DD');
 
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const dateOfJoining = useSelector((state:RootState) => state?.employee?.currentEmployee?.dateOfJoining);
    
    const checkInCheckOut = useSelector((state: RootState) => state.attendance.openModal);

    const [yearlyStats, setYearlyStats] = useState<Attendance[]>([]);
    const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
    const [yearStart, setYearStart] = useState<Dayjs | null>(null);
    const [yearEnd, setYearEnd] = useState<Dayjs | null>(null);
    const [fiscalYearDisplay, setFiscalYearDisplay] = useState("");
    const [isConfigLoading, setIsConfigLoading] = useState(true);
    const dispatch = useDispatch();

    
        useEffect(() => {
            async function fetchDateSettings() {
                try {
                    const { data: { configuration } } = await fetchConfiguration(DATE_SETTINGS_KEY);
                    const parsed = typeof configuration.configuration === "string"
                        ? JSON.parse(configuration.configuration)
                        : configuration.configuration;
                    setDateSettingsEnabled(parsed?.useDateSettings ?? false);
                } catch (err) {
                    console.error("Error fetching date settings", err);
                    setDateSettingsEnabled(false);
                } 
            }
    
            fetchDateSettings();
        }, []);

             // Fetch configuration
              const loadConfiguration = async () => {
                try {
                  setIsConfigLoading(true);
                  const res = await fetchConfiguration(DISABLE_LAUNCH_DEDUCTION_TIME_KEY);
                  const lunchTime = await fetchConfiguration(LEAVE_MANAGEMENT);

                  const configStr = res?.data?.configuration?.configuration;
                  const lunchTimeStr = lunchTime?.data?.configuration?.configuration;

                  const parsedConfig = JSON.parse(configStr);

                  const parsedLunchTime = JSON.parse(lunchTimeStr);

                  // Priority: disableLaunchDeductionTime (correct) -> disableLunchDeductionTime (fallback) -> false
                  const lunchDeductionValue = parsedConfig.disableLaunchDeductionTime ?? parsedConfig.disableLunchDeductionTime ?? false;

                  dispatch(
                    setFeatureConfiguration({
                      disableLaunchDeductionTime: lunchDeductionValue,
                      leaveManagement: parsedLunchTime ?? {},
                    })
                  );
                } catch (error) {
                  console.error("Error fetching configuration", error);
                } finally {
                  setIsConfigLoading(false);
                }
              };

              useEffect(() => {
                loadConfiguration();
              }, []);



        const isCurrentFiscalYear = (
            fiscalStart: Dayjs,
            fiscalEnd: Dayjs
          ): boolean => {
            return (
              year.isSameOrAfter(fiscalStart, "day") &&
              year.isSameOrBefore(fiscalEnd, "day")
            );
          };
        
        
          useEffect(() => {
            if (!year) return;
        
            async function calculateFiscalYear() {
              const { startDate, endDate } = await generateFiscalYearFromGivenYear(
                year
              );
              
              const originalFiscalStart = dayjs(startDate);
              const originalFiscalEnd = isCurrentFiscalYear(originalFiscalStart, dayjs(endDate)) && dateSettingsEnabled
                ? dayjs() // Use current date if date settings enabled
                : dayjs(endDate);
              
              // For data fetching, respect date of joining
              let fiscalStart = originalFiscalStart;
              const joiningDate = dayjs(dateOfJoining);
              
              // If joining date is after fiscal start and before today, use joining date as start for data fetching
              // if (joiningDate.isAfter(fiscalStart) && joiningDate.isBefore(dayjs())) {
              //   fiscalStart = joiningDate;
              // }
              
              setYearStart(fiscalStart);
              setYearEnd(originalFiscalEnd);
              
              const displayEndDate = isCurrentFiscalYear(originalFiscalStart, dayjs(endDate)) && dateSettingsEnabled
                ? dayjs().format("DD MMM, YYYY") // Today's date if date settings enabled
                : originalFiscalEnd.format("DD MMM, YYYY"); // Otherwise use fiscal year end
                
              setFiscalYearDisplay(
                `${originalFiscalStart.format("DD MMM, YYYY")} - ${displayEndDate}`
              );
        
            }
        
            calculateFiscalYear();
          }, [dateSettingsEnabled, year]);
    
          

    useEffect(() => {
        if (!yearStart || !yearEnd) return;
        async function fetchStats() {
            const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(
                employeeId, 
                yearStart!.format("YYYY-MM-DD"), 
                yearEnd!.format("YYYY-MM-DD")
            );
            setYearlyStats(empAttendanceStatistics);
        };

        fetchStats();
    }, [ employeeId, yearStart, yearEnd]);

    // console.log("yearlyStats:: ",yearlyStats);
    // console.log("yearStart:: ",yearStart);
    // console.log("yearEnd:: ",yearEnd);
    // console.log("fiscalYearDisplay:: ",fiscalYearDisplay);

    // Don't render until configuration is loaded
    if (isConfigLoading) {
        return <div>Loading...</div>;
    }

    return (
        <>
            <CurrentYearOverview yearlyStats={yearlyStats} showLevesColumn={false} startDate={yearStart?.format("YYYY-MM-DD")} endDate={yearEnd?.format("YYYY-MM-DD")} fiscalYearDisplay={fiscalYearDisplay} fromAdmin={false}/>
            <StatisticsOverview yearlyStats={yearlyStats} startDates={yearStart?.format("YYYY-MM-DD")} endDates={yearEnd?.format("YYYY-MM-DD")}/>
            <AllTimeRecords />
        </>
    );
}

export default AttendanceGraphicalOverview;