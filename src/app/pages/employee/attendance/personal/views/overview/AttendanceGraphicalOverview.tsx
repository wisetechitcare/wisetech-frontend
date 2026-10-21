import { safeJsonParse } from '@utils/safeJson';
import React, { useEffect, useMemo, useState } from "react";
import CurrentYearOverview from "./CurrentYearOverview";
import StatisticsOverview from "./StatisticsOverview";
import AllTimeRecords from "./AllTimeRecords";
import dayjs, { Dayjs } from "dayjs";
import { fetchEmpYearlyStatistics } from "@utils/statistics";
import { RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import { Attendance } from "@models/employee";
import { resourceNameMapWithCamelCase } from "@constants/statistics";
import { fetchConfiguration } from "@services/company";
import { DATE_SETTINGS_KEY, DISABLE_LAUNCH_DEDUCTION_TIME_KEY, LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { setFeatureConfiguration } from "@redux/slices/featureConfiguration";
import { ErrorState, Spinner } from "@app/modules/common/components/ui/tw";

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
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState(false);
    const [statsRetryKey, setStatsRetryKey] = useState(0);
    const dispatch = useDispatch();

    
        useEffect(() => {
            async function fetchDateSettings() {
                try {
                    const { data: { configuration } } = await fetchConfiguration(DATE_SETTINGS_KEY);
                    const parsed = typeof configuration?.configuration === "string"
                        ? safeJsonParse(configuration.configuration)
                        : configuration?.configuration;
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
              const fiscalStart = originalFiscalStart;
              const joiningDate = dayjs(dateOfJoining);
              
              // If joining date is after fiscal start and before today, use joining date as start for data fetching
              // if (joiningDate.isAfter(fiscalStart) && joiningDate.isBefore(dayjs())) {
              //   fiscalStart = joiningDate;
              // }
              
              setYearStart(fiscalStart);
              setYearEnd(originalFiscalEnd);
              
              const displayEndDate = isCurrentFiscalYear(originalFiscalStart, dayjs(endDate)) && dateSettingsEnabled
                ? dayjs().format("YYYY") // Today's date if date settings enabled
                : originalFiscalEnd.format("YYYY"); // Otherwise use fiscal year end
                
              const startYear = originalFiscalStart.format("YYYY");
              setFiscalYearDisplay(startYear === displayEndDate ? startYear : `${startYear} - ${displayEndDate}`);
        
            }
        
            calculateFiscalYear();
          }, [dateSettingsEnabled, year]);
    
          

    useEffect(() => {
        if (!employeeId || !yearStart || !yearEnd) return;

        const start = yearStart;
        const end = yearEnd;
        let cancelled = false;
        async function fetchStats() {
            setIsStatsLoading(true);
            setStatsError(false);
            try {
                const result = await fetchEmpYearlyStatistics(year, false, {
                    startDate: start,
                    endDate: end,
                });
                if (!result) {
                    throw new Error('Yearly attendance data could not be resolved for the current employee.');
                }
                if (!cancelled) setYearlyStats(result.yearlyStats ?? []);
            } catch (error) {
                console.error("Error fetching fiscal-year attendance", error);
                if (!cancelled) setStatsError(true);
            } finally {
                if (!cancelled) setIsStatsLoading(false);
            }
        }

        fetchStats();
        return () => {
            cancelled = true;
        };
    }, [employeeId, yearStart, yearEnd, statsRetryKey]);

    // console.log("yearlyStats:: ",yearlyStats);
    // console.log("yearStart:: ",yearStart);
    // console.log("yearEnd:: ",yearEnd);
    // console.log("fiscalYearDisplay:: ",fiscalYearDisplay);

    if (isConfigLoading || !yearStart || !yearEnd || isStatsLoading) {
        return (
            <div className="d-flex justify-content-center py-10" role="status" aria-label="Loading attendance summary">
                <Spinner size={32} />
            </div>
        );
    }

    if (statsError) {
        return (
            <ErrorState
                title="Couldn’t load your attendance summary"
                onRetry={() => setStatsRetryKey((key) => key + 1)}
            />
        );
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