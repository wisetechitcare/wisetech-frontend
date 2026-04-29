import { convertToTimeZone, formatTime, convertTo12HourFormat } from '@utils/date';
import { allStreaksIndicator, donutaDataLabel, getWorkingDaysInYear, handleDatesChange, todayProgressPercent, totalProgressPercent,currentDayWorkingHours, fetchEmpYearlyStatistics, getWorkingDaysInRange, formatDisplay } from '@utils/statistics';
import { Card, Row, Col } from 'react-bootstrap';
import React, { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import dayjs from 'dayjs';
import { StreakIndicator } from '@app/modules/common/components/Graphs';
import { Attendance } from '@models/employee';
import { toAbsoluteUrl } from '@metronic/helpers';
import { fetchEmpAttendanceStatistics } from '@services/employee';
import { RootState, store } from '@redux/store';
import { useSelector } from 'react-redux';
import { ABSENT, EXTRA_DAYS, HOLIDAYS, ON_LEAVE, PRESENT, WEEKEND } from '@constants/statistics';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { fetchConfiguration } from '@services/company';
import { DATE_SETTINGS_KEY, DISABLE_LAUNCH_DEDUCTION_TIME_KEY, LEAVE_MANAGEMENT } from '@constants/configurations-key';
import { calculateTotalDuration } from '@utils/calculateTotalDuration';
import { countTotalWeekends } from '@utils/countTotalWeekend';
import { setFeatureConfiguration } from '@redux/slices/featureConfiguration';

interface StatisticsOverviewProps {
    yearlyStats: Attendance[];
    startDates?: string;
    endDates?: string;
    workingTime?: string;
}

const StatisticsOverview: React.FC<StatisticsOverviewProps> = ({ yearlyStats, startDates, endDates, workingTime }) => {
    const year = dayjs();
    const holidays = useSelector((state: RootState) => state.attendanceStats.filteredPublicHolidays); 
    const weekends = store.getState().employee.currentEmployee.branches?.workingAndOffDays; 
    const allWeekends = JSON.parse(weekends || "{}");  
        
    const totalWorkingDay = getWorkingDaysInRange(dayjs(startDates), dayjs(endDates), true, allWeekends, holidays );

    return (
        <>
            <div>
                <Row className='mt-4'>
                    <OverviewProgessBar  />
                    <OverviewAttendance yearlyStats={yearlyStats} startDates={startDates} endDates={endDates} />
                    <StreakIndicator currentStreak={allStreaksIndicator(yearlyStats)[0].toString()} lastStreak={allStreaksIndicator(yearlyStats)[1].toString()} totalDays={totalWorkingDay} />
                </Row>
            </div>
        </>
    )
}

export default StatisticsOverview;

const OverviewProgessBar: React.FC = React.memo(() => {
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const checkInCheckOut = useSelector((state: RootState) => state.attendance.openModal);

    const [day, setDay] = useState(dayjs());
    const [workingTime, setWorkingTime] = useState("");

    const mumbaiTz = 'Asia/Kolkata';
    const [dailyStats, setDailyStats] = useState<any[]>([]);

    const progessBarSeries: number[] = [todayProgressPercent(dailyStats)];

    const checkInRaw = dailyStats && dailyStats.length > 0 ? formatTime(convertToTimeZone(dailyStats[0]?.checkIn, mumbaiTz)) : 'N/A';
    const checkOutRaw = dailyStats && dailyStats.length > 0 && dailyStats[0]?.checkOut != null ? formatTime(convertToTimeZone(dailyStats[0]?.checkOut, mumbaiTz)) : 'N/A';

     // Always show in 12-hour IST format
    const checkIn = checkInRaw && checkInRaw !== 'N/A' ? convertTo12HourFormat(checkInRaw) : 'N/A';
    const checkOut = checkOutRaw && checkOutRaw !== 'N/A' ? convertTo12HourFormat(checkOutRaw) : 'N/A';


     // Fetch configuration
    const loadConfiguration = async () => {
        try {
            const lunchTime = await fetchConfiguration(LEAVE_MANAGEMENT);
                
            const lunchTimeStr = lunchTime?.data?.configuration?.configuration;
                
                      
            const parsedLunchTime = JSON.parse(lunchTimeStr);
                      
            setWorkingTime(parsedLunchTime?.['Working time']); 
            
        } catch (error) {
            console.error("Error fetching configuration", error);
        }
    };
            
    useEffect(() => {
        loadConfiguration();
    }, []);

    
    
    const totalWorkingTime = calculateTotalDuration([dailyStats[0]]);
    const totalAllowedTime = formatDisplay(workingTime); 

    const progessBarOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'radialBar',
        },
        plotOptions: {
            radialBar: {
                hollow: {
                    size: '70%',
                },
                dataLabels: {
                    name: {
                        show: true,
                        fontSize: '14px',
                    },
                    value: {
                        show: true,
                        fontSize: '14px',
                        formatter: function (val: any) {
                            return `${val}%`;
                        },
                    },
                },
            },
        },
        labels: ['Progress'],
    };

    useEffect(() => {
        async function fetchStats() {
            const startEnddate = day.format('YYYY-MM-DD');
            const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, startEnddate, startEnddate);
            setDailyStats(empAttendanceStatistics);
        };

        fetchStats();
    }, [day, checkInCheckOut, employeeId]);

    return (
        <>
            <Col md={4} className="mb-4">
                <Card className="shadow-sm" style={{ height: '300px' }}>
                    <Card.Body className="d-flex flex-column justify-content-between align-items-center">
                        <h5 className="mb-3">Working Time</h5>
                        <div>
                            <button className="btn btn-sm" onClick={(e) => {
                                handleDatesChange('decrement', 'day', setDay);
                            }}>
                                <img src={toAbsoluteUrl('media/svg/misc/back.svg')} />
                            </button>
                            <span className="mx-2 my-5">{day.format('DD MMM, YYYY')}</span>
                            <button className="btn btn-sm" onClick={(e) => {
                                handleDatesChange('increment', 'day', setDay);
                            }}>
                                <img src={toAbsoluteUrl('media/svg/misc/next.svg')} />
                            </button>
                        </div>
                        <div className="d-flex flex-column justify-content-center align-items-center flex-grow-1">
                            <ReactApexChart
                                options={progessBarOptions}
                                series={progessBarSeries}
                                type="radialBar"
                                height={150}
                            />
                        </div>
                        <div>Check In: {checkIn}</div>
                        <div>Check Out: {checkOut}</div>
                        <div className="mt-2 text-center fw-bold">
                        {totalWorkingTime} out of {totalAllowedTime}
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </>
    );
});

const OverviewAttendance: React.FC<StatisticsOverviewProps> = ({ yearlyStats, startDates, endDates }) => {
    // All data should be via fiscal year
    const attendance = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.yearlyTable;
    });
    const dateOfJoining = useSelector((state: RootState) => state.employee.currentEmployee?.dateOfJoining);

    const [year, setYear] = useState(dayjs().format('YYYY'));
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [displayStartDate, setDisplayStartDate] = useState('');
    const [displayEndDate, setDisplayEndDate] = useState('');
    const [dateSettings, setDateSettings] = useState(false);
    const [loading, setLoading] = useState(false);
    const weekends = store.getState().employee.currentEmployee.branches?.workingAndOffDays;
    const allWeekends = JSON.parse(weekends || "{}");

    const handleYearChange = (action: string) => {
        switch (action) {
            case 'increment':
                setYear(prevYear => dayjs(prevYear).add(1, 'year').format('YYYY'));
                break;
            case 'decrement':
                setYear(prevYear => dayjs(prevYear).subtract(1, 'year').format('YYYY'));
                break;
            default:
                break;
        }
    };

    // Fetch date settings once on component mount
    useEffect(() => {
        const fetchDateSettings = async () => {
            try {
                const { data: { configuration } } = await fetchConfiguration(DATE_SETTINGS_KEY);
                const parsed = typeof configuration.configuration === "string"
                    ? JSON.parse(configuration.configuration)
                    : configuration.configuration;
                setDateSettings(parsed?.useDateSettings);
            } catch (error) {
                console.warn("Error fetching date settings", error);
            }
        };
        fetchDateSettings();
    }, []);

    // Fetch fiscal year data whenever year changes
    useEffect(() => {
        const fetchFiscalYear = async () => {
            try {
                setLoading(true);
                const generateFiscalYear = await generateFiscalYearFromGivenYear(dayjs(year));

                // Format dates for display
                const formattedStartDate = dayjs(generateFiscalYear.startDate).format('DD MMM, YYYY');
                const formattedEndDate = dateSettings ? dayjs().format('DD MMM, YYYY') : dayjs(generateFiscalYear.endDate).format('DD MMM, YYYY');
                setDisplayStartDate(formattedStartDate);
                setDisplayEndDate(formattedEndDate);

                // Set the actual date values
                const fiscalEndDate = dateSettings ? dayjs().format('YYYY-MM-DD') : generateFiscalYear.endDate;
                setStartDate(generateFiscalYear.startDate);
                setEndDate(fiscalEndDate);

                // Fetch statistics for the selected year
                await fetchEmpYearlyStatistics(dayjs(year), false, {
                    startDate: dayjs(generateFiscalYear.startDate),
                    endDate: dayjs(fiscalEndDate)
                });
            } catch (error) {
                console.warn("Error fetching fiscal year data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFiscalYear();
    }, [year, dateSettings]);

    const filteredAttendance = useMemo(() => {
        if (!attendance?.length) return [];
    
        return attendance.filter((day) => {
            const attendanceDate = dayjs(day.date);
            return attendanceDate.isSameOrAfter(startDate || startDates, 'day') && 
                   attendanceDate.isSameOrBefore(endDate || endDates, 'day') && 
                   attendanceDate.isSameOrAfter(dateOfJoining, 'day');
        });
    }, [attendance, startDate, endDate, startDates, endDates, dateOfJoining]);

     const filteredLeaves = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.filteredLeaves.filter((leave: any) => 
            dayjs(leave.date).isSameOrAfter(startDate || startDates, 'day') && 
            dayjs(leave.date).isSameOrBefore(endDate || endDates, 'day')
        );
    });
    
    const filteredPublicHolidays = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.filteredPublicHolidays.filter((holiday: any) => 
            dayjs(holiday.date).isSameOrAfter(startDate || startDates, 'day') && 
            dayjs(holiday.date).isSameOrBefore(endDate || endDates, 'day')
        );
    });

     // Memoize totalWeekend count (computed value)
            const totalWeekendCount = useMemo(() => {
                const effectiveStartDate = startDate || startDates;
                const effectiveEndDate = endDate || endDates;
                if (!effectiveStartDate || !effectiveEndDate) return 0;
                return countTotalWeekends(
                    effectiveStartDate,
                    effectiveEndDate,
                    filteredPublicHolidays,
                    allWeekends
                );
            }, [startDate, endDate, startDates, endDates, filteredPublicHolidays, allWeekends]);
            
            
    const donutData = useMemo(() => donutaDataLabel(filteredAttendance, filteredLeaves, filteredPublicHolidays, false, totalWeekendCount), 
        [filteredAttendance, filteredLeaves, filteredPublicHolidays, totalWeekendCount]);
    
    const totalWorkingDay = getWorkingDaysInYear(year) - donutData.get(HOLIDAYS)!;
    const attendancePercentage: any = [totalProgressPercent(filteredAttendance, totalWorkingDay)];

    return (
        <>
            <Col md={4} className="mb-4">
                <Card className="shadow-sm" style={{ height: '300px' }}>
                    <Card.Body className="d-flex flex-column justify-content-between align-items-center">
                        <h6 className="text-center">Yearly Stats</h6>

                        <div>
                            <button className="btn btn-sm" onClick={() => handleYearChange('decrement')}>
                                <img src={toAbsoluteUrl('media/svg/misc/back.svg')} />
                            </button>
                            <span className="mx-2 my-5">{year}</span>
                            <button className="btn btn-sm" onClick={() => handleYearChange('increment')}>
                                <img src={toAbsoluteUrl('media/svg/misc/next.svg')} />
                            </button>
                        </div>
                        
                        <div className="text-center mt-2 mb-2">
                            <small className="text-muted">
                                {displayStartDate} - {displayEndDate}
                            </small>
                        </div>

                        <div className="text-center mt-3 mb-2">
                            {loading ? (
                                <div className="spinner-border spinner-border-sm text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            ) : (
                                <h4 className="mb-0">{attendancePercentage}%</h4>
                            )}
                        </div>

                        <progress 
                            value={loading ? 0 : attendancePercentage}
                            max="100"
                            style={{
                                width: '100%',
                                height: '8px',
                                borderRadius: '6px',
                                appearance: 'none',
                                color: '#28a745',
                                overflow: 'hidden',
                                opacity: loading ? 0.5 : 1
                            }}
                        />

                        <div className="mt-3 w-100">
                            <div className="d-flex justify-content-between">
                                <span>{PRESENT}</span>
                                <span>{donutData.get(PRESENT)}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>{ABSENT}</span>
                                <span>{donutData.get(ABSENT)}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>{ON_LEAVE}</span>
                                <span>{donutData.get(ON_LEAVE)}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>{EXTRA_DAYS}</span>
                                <span>{donutData.get(EXTRA_DAYS)}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>{HOLIDAYS}</span>
                                <span>{donutData.get(HOLIDAYS)}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>{WEEKEND}</span>
                                <span>{donutData.get(WEEKEND)}</span>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </>
    );
};