import AttendanceGraphicalToggle, { ToggleItemsCallBackFunctions } from '@pages/employee/attendance/personal/views/my-attendance/AttendanceGraphicalToggle';
import dayjs, { Dayjs } from 'dayjs';
import { fetchEmpDailyStatistics, fetchEmpMonthlyStatistics, fetchEmpWeeklyStatistics, fetchEmpYearlyStatistics } from '@utils/statistics';
import { resourseAndView } from '@models/company';
import { fetchConfiguration } from '@services/company';
import { DATE_SETTINGS_KEY, DISABLE_LAUNCH_DEDUCTION_TIME_KEY, LEAVE_MANAGEMENT } from '@constants/configurations-key';
import { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { setFeatureConfiguration } from '@redux/slices/featureConfiguration';
import { useDispatch } from 'react-redux';

const MyAttendanceView = ({ fromAdmin = false, resourseAndView, checkOwnWithOthers }: { fromAdmin?: boolean, resourseAndView: resourseAndView[], checkOwnWithOthers?: boolean }) => {
    const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
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
            } finally {
                setIsLoading(false);
            }
        }

        fetchDateSettings();
    }, []);

     // Fetch configuration
      const loadConfiguration = async () => {
        try {
          setIsLoading(true);
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
          setIsLoading(false);
        }
      };

      useEffect(() => {
        loadConfiguration();
      }, []);

    const toggleItemsActions: ToggleItemsCallBackFunctions = {
        daily: function (day: Dayjs): void {
            fetchEmpDailyStatistics(day, fromAdmin);
        },
        weekly: function (startWeek: Dayjs, endWeek: Dayjs): void {
            fetchEmpWeeklyStatistics(startWeek, endWeek, fromAdmin);
        },
        monthly: function (month: Dayjs, endDate: Dayjs): void {
            // Let the graphical toggle component handle the date range logic
            fetchEmpMonthlyStatistics(month, fromAdmin, { 
                startDate: month.startOf('month'), 
                endDate 
            });
        },
        yearly: function (year: Dayjs, endDate: Dayjs): void {
            // Let the graphical toggle component handle the date range logic
            fetchEmpYearlyStatistics(year, fromAdmin, { 
                startDate: year.startOf('year'), 
                endDate 
            });
        },
        custom: function (startDate: Dayjs, endDate: Dayjs): void {
            // Let the graphical toggle component handle the date range logic
            fetchEmpYearlyStatistics(startDate, fromAdmin, { 
                startDate: startDate.startOf('year'), 
                endDate 
            });
        }
    };

    if (isLoading) {
        return <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </Container>
    }

    return (
        <>
            <h3 className="fw-bold fs-1 mb-6 font-barlow">My Attendance</h3>
            <AttendanceGraphicalToggle 
                toggleItemsActions={toggleItemsActions} 
                fromAdmin={fromAdmin} 
                resourseAndView={resourseAndView}
                dateSettingsEnabled={dateSettingsEnabled}
                checkOwnWithOthers={checkOwnWithOthers}
            />
        </>
    );
};

export default MyAttendanceView;