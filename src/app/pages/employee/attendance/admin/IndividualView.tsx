import AllEmployeesSearchDropdown from '@app/modules/common/components/AllEmployeesSearchDropdown';
import MyAttendanceView from '../personal/MyAttendanceView';
import BalanceProgress from '../personal/views/my-leaves/BalanceProgress';
import CurrentYearOverview from '../personal/views/overview/CurrentYearOverview';
import { useEffect, useState } from 'react';
import { Attendance } from '@models/employee';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import dayjs, { Dayjs } from 'dayjs';
import { fetchEmpAttendanceStatistics } from '@services/employee';
import { Card, Image } from 'react-bootstrap';
import { getAvatar } from '@utils/avatar';
import Leaves from '../personal/views/my-leaves/Leaves';
import { resourceNameMapWithCamelCase } from '@constants/statistics';
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions';
import { useDispatch } from 'react-redux';
import { DateNavigation } from '../personal/MyLeaveView';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { fetchConfiguration } from '@services/company';
import { DATE_SETTINGS_KEY } from '@constants/configurations-key';

const IndividualView = () => {
    const dispatch = useDispatch();

    const [year, setYear] = useState(dayjs());
    const [startDateNew, setStartDateNew] = useState('')
    const [endDateNew, setEndDateNew] = useState('')
    const [fiscalYear, setFiscalYear] = useState('');
    const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
    const [yearStart, setYearStart] = useState<Dayjs | null>(null);
    const [yearEnd, setYearEnd] = useState<Dayjs | null>(null);
    const [fiscalYearDisplay, setFiscalYearDisplay] = useState("");
    const dateOfJoining = useSelector((state: RootState) => state?.employee?.selectedEmployee?.dateOfJoining);

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
            setFiscalYear(`${startDate} to ${endDate}`)
            setStartDateNew(startDate)
            setEndDateNew(endDate)
            // Original fiscal year dates for display purposes
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

            // Set the actual dates used for data fetching
            setYearStart(fiscalStart);
            setYearEnd(originalFiscalEnd);

            // Format the display text based on original fiscal dates (not affected by joining date)
            const displayEndDate = isCurrentFiscalYear(originalFiscalStart, dayjs(endDate)) && dateSettingsEnabled
                ? dayjs().format("DD MMM, YYYY") // Today's date if date settings enabled
                : originalFiscalEnd.format("DD MMM, YYYY"); // Otherwise use fiscal year end

            setFiscalYearDisplay(
                `${originalFiscalStart.format("DD MMM, YYYY")} - ${displayEndDate}`
            );

        }

        calculateFiscalYear();
    }, [dateSettingsEnabled, year]);


    const resourseAndView = [
        {
            resource: resourceNameMapWithCamelCase.attendanceRequest,
            viewOwn: false,
            viewOthers: true
        },
        {
            resource: resourceNameMapWithCamelCase.attendanceReport,
            viewOwn: false,
            viewOthers: true
        }
    ]
    const fromAdmin = true;
    const selectedEmployeeId = useSelector((state: RootState) => state.employee.selectedEmployee?.id);
    const selectedEmployee = useSelector((state: RootState) => state.employee.selectedEmployee);

    const [yearlyStats, setYearlyStats] = useState<Attendance[]>([]);

    useEffect(() => {
        async function fetchStats() {
            if (!yearStart || !yearEnd) return;
            const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(selectedEmployeeId, yearStart?.format("YYYY-MM-DD"), yearEnd?.format("YYYY-MM-DD"));
            setYearlyStats(empAttendanceStatistics);
        }

        fetchStats();
    }, [selectedEmployeeId, yearStart, yearEnd]);

    useEffect(() => {
        dispatch(fetchRolesAndPermissions() as any);
    }, [])

    return (
        <>
            <AllEmployeesSearchDropdown />
            <div className='mt-8'></div>
            <div className="sticky-responsive">
                <style jsx>{`
                    .sticky-responsive {
                        background-color: white;
                        padding: 10px;
                        }

                        @media (min-width: 992px) {
                        .sticky-responsive {
                            position: sticky;
                            top: 125px;
                            z-index: 10;
                            overflow: visible;
                        }
                        }
                         @media (max-width: 992px) {
                        .sticky-responsive {
                            position: sticky;
                            top: 50px;
                            z-index: 10;
                            overflow: visible;
                        }
                        }
                `}</style>
                <ProfileCard employee={selectedEmployee} />
            </div>
            <CurrentYearOverview yearlyStats={yearlyStats} showLevesColumn={false} fromAdmin={true} startDate={yearStart?.format("YYYY-MM-DD")} endDate={yearEnd?.format("YYYY-MM-DD")} />
            <div className='mt-8'> </div>
 
            <MyAttendanceView fromAdmin={fromAdmin} resourseAndView={resourseAndView} checkOwnWithOthers={true} />
            {/* <div className='mt-8'></div> */}

            <div className='d-flex flex-row justify-content-between align-items-center mt-5'>
                <h3 className='fw-bold font-barlow mb-0'>Leaves </h3>
                <DateNavigation fiscalYear={fiscalYear} setYear={setYear} />
            </div>

            <Leaves fromAdmin={fromAdmin} resource={resourceNameMapWithCamelCase.leave} viewOwn={true} viewOthers={true} startDateNew={startDateNew} endDateNew={endDateNew} />
            {/* <div className='mt-8'></div> */}
            <BalanceProgress fromAdmin={true} resource={resourceNameMapWithCamelCase.leave} viewOwn={true} viewOthers={true} startDateNew={startDateNew} endDateNew={endDateNew} />
        </>
    );
}

export default IndividualView;

const ProfileCard = ({ employee }: { employee: any }) => {
    const user = {
        name: employee.users.firstName + " " + employee.users.lastName,
        id: employee.employeeCode,
        role: employee.designations?.role,
        imageUrl: getAvatar(employee.avatar, employee.gender),
        gender: employee.gender,
        isActive: employee.isActive,
    };

    return (
        <Card className="d-flex flex-row align-items-center justify-content-between p-3 w-100" style={{ border: 'none', boxShadow: '0px 1px 5px rgba(0, 0, 0, 0.1)', minHeight: '80px'}}>
            <div className="d-flex flex-row align-items-center">
                <Image
                    src={user.imageUrl}
                    roundedCircle
                    width="60"
                    height="60"
                    alt="Profile"
                    className="me-3"
                />
                <div>
                    <h5 className="mb-0">{user.name}</h5>
                    {user?.role ? (<small className="text-muted">{user.id} | {user.role}</small>) : (<small className="text-muted">{user.id}</small>)}
                </div>
            </div>
            <div>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        backgroundColor: 'white',
                        color: user.isActive ? '#3ECD45' : '#8A8A8A',
                        border: user.isActive ? '2px solid #3ECD45' : '2px solid #8A8A8A',
                    }}
                >
                    <span
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: user.isActive ? '#3ECD45' : '#8A8A8A',
                            marginRight: '8px',
                        }}
                    />
                    {user.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
        </Card>
    );
}