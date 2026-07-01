import { convertToTimeZone, formatTime, convertTo12HourFormat } from '@utils/date';
import { parseWorkingDays } from '@utils/workingDays';
import { allStreaksIndicator, donutaDataLabel, getWorkingDaysInYear, handleDatesChange, todayProgressPercent, totalProgressPercent,currentDayWorkingHours, fetchEmpYearlyStatistics, getWorkingDaysInRange, formatDisplay } from '@utils/statistics';
import { Card, Row, Col } from 'react-bootstrap';
import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import DateSelector from '@components/DateSelector';
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
    const allWeekends = parseWorkingDays(weekends);

    const totalWorkingDay = getWorkingDaysInRange(dayjs(startDates), dayjs(endDates), true, allWeekends, holidays );

    return (
        <>
            <div>
                <Row className='mt-4' style={{ alignItems: 'stretch' }}>
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

    const gaugePct = progessBarSeries[0] || 0;
    const gaugeR = 58;
    const gaugeCirc = 2 * Math.PI * gaugeR;
    const gaugeFilled = (gaugePct / 100) * gaugeCirc;

    useEffect(() => {
        async function fetchStats() {
            const startEnddate = day.format('YYYY-MM-DD');
            const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, startEnddate, startEnddate);
            setDailyStats(empAttendanceStatistics);
        };

        fetchStats();
    }, [day, checkInCheckOut, employeeId]);

    return (
        <Col md={4} className="mb-4" style={{ display: 'flex' }}>
            <Card style={{ border: '1px solid #f0f0f0', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', letterSpacing: '-0.01em' }}>Working Time</span>
                    <DateSelector
                        onPrevious={() => handleDatesChange('decrement', 'day', setDay)}
                        onNext={() => handleDatesChange('increment', 'day', setDay)}
                        displayValue={day.format('DD MMM YYYY')}
                    />
                </div>
                {/* Custom SVG gauge */}
                <div style={{ display: 'flex', justifyContent: 'center', flexGrow: 1, alignItems: 'center', padding: '12px 0 4px' }}>
                    <div style={{ position: 'relative', width: 152, height: 152 }}>
                        <svg width="152" height="152" viewBox="0 0 152 152">
                            <defs>
                                <linearGradient id="wtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                                <filter id="wtGlow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                            </defs>
                            {/* Outer decorative ring */}
                            <circle cx="76" cy="76" r="72" fill="none" stroke="#f1f5f9" strokeWidth="1.5" />
                            {/* Track */}
                            <circle cx="76" cy="76" r={gaugeR} fill="none" stroke="#e0e7ff" strokeWidth="13" strokeLinecap="round" />
                            {/* Progress arc */}
                            <circle
                                cx="76" cy="76" r={gaugeR}
                                fill="none"
                                stroke="url(#wtGrad)"
                                strokeWidth="13"
                                strokeLinecap="round"
                                strokeDasharray={`${gaugeFilled} ${gaugeCirc}`}
                                transform="rotate(-90 76 76)"
                                filter="url(#wtGlow)"
                                style={{ transition: 'stroke-dasharray 0.7s ease' }}
                            />
                            {/* Inner ring accent */}
                            <circle cx="76" cy="76" r="44" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                        </svg>
                        {/* Center content */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            <span style={{ fontSize: 30, fontWeight: 900, color: '#312e81', lineHeight: 1, letterSpacing: '-0.04em' }}>{gaugePct}<span style={{ fontSize: 16, fontWeight: 700, color: '#6366f1' }}>%</span></span>
                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>of workday</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 2 }}>{totalWorkingTime}</span>
                        </div>
                    </div>
                </div>
                {/* Allowed time */}
                <div style={{ textAlign: 'center', marginBottom: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
                        Target <strong style={{ color: '#374151' }}>{totalAllowedTime}</strong>
                    </span>
                </div>
                {/* Check-in / Check-out rows */}
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0, display: 'inline-block' }} />
                        <div>
                            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check In</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{checkIn}</div>
                        </div>
                    </div>
                    <div style={{ width: 1, background: '#f3f4f6' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: checkOut === 'N/A' ? '#e5e7eb' : '#ef4444', flexShrink: 0, display: 'inline-block' }} />
                        <div>
                            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check Out</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{checkOut}</div>
                        </div>
                    </div>
                </div>
            </Card>
        </Col>
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
    const allWeekends = parseWorkingDays(weekends);

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

    const statRows = [
        { label: PRESENT,    value: donutData.get(PRESENT),    color: '#22c55e', bg: '#f0fdf4' },
        { label: ABSENT,     value: donutData.get(ABSENT),     color: '#ef4444', bg: '#fef2f2' },
        { label: ON_LEAVE,   value: donutData.get(ON_LEAVE),   color: '#f59e0b', bg: '#fffbeb' },
        { label: EXTRA_DAYS, value: donutData.get(EXTRA_DAYS), color: '#6366f1', bg: '#eef2ff' },
        { label: HOLIDAYS,   value: donutData.get(HOLIDAYS),   color: '#0ea5e9', bg: '#f0f9ff' },
        { label: WEEKEND,    value: donutData.get(WEEKEND),    color: '#8b5cf6', bg: '#f5f3ff' },
    ];

    return (
        <Col md={4} className="mb-4" style={{ display: 'flex' }}>
            <Card style={{ border: '1px solid #f0f0f0', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', width: '100%' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', letterSpacing: '-0.01em' }}>Yearly Stats</span>
                    <DateSelector
                        onPrevious={() => handleYearChange('decrement')}
                        onNext={() => handleYearChange('increment')}
                        displayValue={year}
                    />
                </div>
                {/* Date range + progress */}
                <div style={{ padding: '0 20px 14px' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10, textAlign: 'center' }}>
                        {displayStartDate} — {displayEndDate}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${loading ? 0 : attendancePercentage}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', minWidth: 38, textAlign: 'right' }}>
                            {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14, borderWidth: 2 }} /> : `${attendancePercentage}%`}
                        </span>
                    </div>
                </div>
                {/* Stat rows */}
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {statRows.map(({ label, value, color, bg }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 6px', borderRadius: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                                <span style={{ fontSize: 12.5, color: '#4b5563', fontWeight: 500 }}>{label}</span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color, background: bg, padding: '1px 10px', borderRadius: 20, minWidth: 32, textAlign: 'center' }}>
                                {value ?? 0}
                            </span>
                        </div>
                    ))}
                </div>
            </Card>
        </Col>
    );
};