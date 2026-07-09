import { safeJsonParse } from '@utils/safeJson';
﻿import { KTIcon, toAbsoluteUrl } from '@metronic/helpers';
import AttendanceStatusBadge from './AttendanceStatusBadge';
import AttendanceCheckCell, {
    AttendanceCoordinates,
    formatAttendanceCheckExport,
    hasValidMapCoordinates,
} from './AttendanceCheckCell';
import AttendanceDurationCell from './AttendanceDurationCell';
import {
    resolveCheckInColor,
    resolveCheckOutColor,
    shouldApplyCheckInColoring,
} from '@utils/attendanceColorUtils';
import { RootState, store } from '@redux/store';
import { parseWorkingDays } from '@utils/workingDays';
import ReactApexChart from 'react-apexcharts';
import { Image, Card, Col, Modal, OverlayTrigger } from 'react-bootstrap';
import Identifiers from '../utils/Identifiers';
import { ATTENDANCE_STATUS, LEAVE_STATUS, LeaveStatus, WORKING_METHOD_TYPE } from '@constants/attendance';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { CustomLeaves, IAttendance, IAttendanceRequests } from '@models/employee';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from './MaterialTable';
import { convertMinutesIntoHrMinFormat, convertToIST, convertToTime, isValidTime, markWeekendOrHoliday, markWeekendOrHolidayForReportsTable } from '@utils/statistics';
import { useDispatch, useSelector } from 'react-redux';
import { onSiteAndHolidayWeekendSettingsOnOffName, permissionConstToUseWithHasPermission, REQUEST_RAISE_DISABLE_MESSAGE, resourceNameMapWithCamelCase, Status, weekDays } from '@constants/statistics';
import * as Yup from 'yup';
import { Form, Formik, FormikValues } from 'formik';
import TextInput from '../inputs/TextInput';
import { fetchWorkingMethods } from '@services/options';
import DropDownInput from '../inputs/DropdownInput';
import dayjs, { Dayjs } from 'dayjs';
import { deleteConfirmation, errorConfirmation, successConfirmation } from '@utils/modal';
import { createUpdateAttendanceRequest, deleteAttendanceRequestById, fetchApprovalInstanceByRequest } from '@services/employee';
import ApprovalStatusTracker from '@app/pages/approvals/ApprovalStatusTracker';
import { saveToggleChange } from '@redux/slices/attendanceStats';
import { fetchCompanyOverview, fetchConfiguration } from '@services/company';
import { getAttendanceRequest } from '@services/employee';
import { checkIfAnyValueIsUndefined, fetchColorAndStoreInSlice } from '@utils/file';
import { hasPermission } from '@utils/authAbac';
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions';
import Tooltip from "react-bootstrap/Tooltip";
import TimePickerInput from '../inputs/TimeInput';
import { fetchAddressDetails } from '@services/location';
import { getGraceBasedThresholds } from '@utils/getGraceBasedThresholds';
import { fetchAttendanceClassification } from '@services/employee';
import { convertTo12HourFormat } from '@utils/date';
import { UAParser } from 'ua-parser-js';
import { Form as BootstrapForm } from "react-bootstrap";
import { LEAVE_MANAGEMENT } from '@constants/configurations-key';
import { fetchAppSettings } from '@redux/slices/appSettings';
import { validatePreviousDaysAttendance } from '@utils/attendanceValidation';

// Attendance records carry `formattedDate` as "DD/MM/YYYY" (IST). Convert to ISO "YYYY-MM-DD"
// so it can be matched against the backend's authoritative late-check-in dates.
const ddmmyyyyToISO = (s: any): string | null => {
    if (typeof s !== 'string') return null;
    const m = s.split('/');
    if (m.length !== 3) return null;
    const [dd, mm, yyyy] = m;
    if (!/^\d{1,2}$/.test(dd) || !/^\d{1,2}$/.test(mm) || !/^\d{4}$/.test(yyyy)) return null;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
};


export const ProgessBar = ({ progessBarSeries, checkIn, checkOut, totalWorkingHours = "0h : 0m", totalAllowedHours = "0h : 0m" }: { progessBarSeries: any, checkIn?: string, checkOut?: string, totalWorkingHours?: string, totalAllowedHours?: string }) => {
    const pct = progessBarSeries[0] || 0;
    const r = 58, circ = 2 * Math.PI * r, filled = (pct / 100) * circ;
    const checkInFmt = checkIn && checkIn !== 'N/A' ? convertTo12HourFormat(checkIn) : 'N/A';
    const checkOutFmt = checkOut && checkOut !== 'N/A' ? convertTo12HourFormat(checkOut) : 'N/A';

    return (
        <Col md={4} className="mb-4" style={{ display: 'flex' }}>
            <Card style={{ border: '1px solid #f0f0f0', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', letterSpacing: '-0.01em' }}>Working Time</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', background: '#eef2ff', padding: '3px 10px', borderRadius: 20 }}>Today</span>
                </div>
                {/* SVG Gauge */}
                <div style={{ display: 'flex', justifyContent: 'center', flexGrow: 1, alignItems: 'center', padding: '10px 0 4px' }}>
                    <div style={{ position: 'relative', width: 148, height: 148 }}>
                        <svg width="148" height="148" viewBox="0 0 148 148">
                            <defs>
                                <linearGradient id="pbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                                <filter id="pbGlow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                            </defs>
                            <circle cx="74" cy="74" r="70" fill="none" stroke="#f1f5f9" strokeWidth="1.5" />
                            <circle cx="74" cy="74" r={r} fill="none" stroke="#e0e7ff" strokeWidth="12" />
                            <circle cx="74" cy="74" r={r} fill="none" stroke="url(#pbGrad)" strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={`${filled} ${circ}`}
                                transform="rotate(-90 74 74)"
                                filter="url(#pbGlow)"
                                style={{ transition: 'stroke-dasharray 0.7s ease' }}
                            />
                            <circle cx="74" cy="74" r="43" fill="none" stroke="#f1f5f9" strokeWidth="1" />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            <span style={{ fontSize: 28, fontWeight: 900, color: '#312e81', lineHeight: 1, letterSpacing: '-0.04em' }}>{pct}<span style={{ fontSize: 15, fontWeight: 700, color: '#6366f1' }}>%</span></span>
                            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>of workday</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginTop: 1 }}>{totalWorkingHours}</span>
                        </div>
                    </div>
                </div>
                {/* Target */}
                <div style={{ textAlign: 'center', marginBottom: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Target <strong style={{ color: '#374151' }}>{totalAllowedHours}</strong></span>
                </div>
                {/* Check-in / Check-out footer */}
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: checkInFmt === 'N/A' ? '#e5e7eb' : '#22c55e', flexShrink: 0, display: 'inline-block' }} />
                        <div>
                            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check In</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{checkInFmt}</div>
                        </div>
                    </div>
                    <div style={{ width: 1, background: '#f3f4f6' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: checkOutFmt === 'N/A' ? '#e5e7eb' : '#ef4444', flexShrink: 0, display: 'inline-block' }} />
                        <div>
                            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check Out</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{checkOutFmt}</div>
                        </div>
                    </div>
                </div>
            </Card>
        </Col>
    );
};

export const Donut = ({ donutLabels, donutSeries, totalDays, customHeading, customStylesForCard, customStylesForCol, customColorsForDonut }: { donutLabels: string[], donutSeries: number[], totalDays?: number, customHeading?: string, customStylesForCard?: React.CSSProperties, customStylesForCol?: React.CSSProperties, customColorsForDonut?: string[] }) => {
    let customColors = useSelector((state: any) => state?.customColors?.attendanceOverview);
    const checkoutMissingColor = useSelector((state: any) => state?.customColors?.workingPattern?.missingCheckoutColor);
    const weekendColor = useSelector((state: any) => state?.customColors?.attendanceCalendar?.weekendColor);

    let colorsFinal = [
        customColors?.presentColor  || '#22c55e',
        customColors?.absentColor   || '#ef4444',
        customColors?.onLeaveColor  || '#f59e0b',
        customColors?.extraDayColor || '#6366f1',
        customColors?.holidayColor  || '#0ea5e9',
        checkoutMissingColor        || '#9ca3af',
        weekendColor                || '#d1d5db',
    ];
    if (customColorsForDonut && customColorsForDonut.length > 0) colorsFinal = customColorsForDonut;

    const total = donutSeries.reduce((a, b) => a + b, 0) || 1;
    const presentCount = donutSeries[0] || 0;
    const presentPct = Math.round((presentCount / total) * 100);

    const donutOptions: ApexCharts.ApexOptions = {
        chart: { type: 'donut', toolbar: { show: false }, animations: { enabled: true, speed: 600 } },
        plotOptions: {
            pie: {
                donut: {
                    size: '74%',
                    labels: { show: false }, // custom overlay handles center label
                },
                expandOnClick: false,
            },
        },
        colors: colorsFinal,
        labels: donutLabels,
        legend: { show: false },
        dataLabels: { enabled: false },
        stroke: { width: 3, colors: ['#fff'] },
        tooltip: { y: { formatter: (val: number) => `${val} day${val !== 1 ? 's' : ''}` } },
        states: { hover: { filter: { type: 'lighten' } } },
    };

    const nonZeroItems = donutLabels
        .map((label, i) => ({ label, value: donutSeries[i] ?? 0, color: colorsFinal[i], idx: i }))
        .filter(item => item.value > 0);

    const zeroItems = donutLabels
        .map((label, i) => ({ label, value: donutSeries[i] ?? 0, color: colorsFinal[i], idx: i }))
        .filter(item => item.value === 0);

    const rateColor = presentPct >= 80 ? '#16a34a' : presentPct >= 60 ? '#0891b2' : '#f59e0b';
    const rateGradient = presentPct >= 80 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : presentPct >= 60 ? 'linear-gradient(90deg,#0ea5e9,#0891b2)' : 'linear-gradient(90deg,#f59e0b,#d97706)';

    return (
        <Col md={4} className="mb-4" style={{ ...customStylesForCol }}>
            <Card style={{ borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%', ...customStylesForCard }}>
                <div style={{ padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <span style={{ width: 4, height: 18, background: 'linear-gradient(180deg,#22c55e,#16a34a)', borderRadius: 99, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{customHeading || 'Overview'}</span>
                        {totalDays && (
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280', fontWeight: 600, background: '#f3f4f6', borderRadius: 20, padding: '2px 9px' }}>
                                {totalDays} days
                            </span>
                        )}
                    </div>

                    {/* Chart row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>

                        {/* Donut + custom center overlay */}
                        <div style={{ position: 'relative', flexShrink: 0, width: 160, height: 160 }}>
                            <ReactApexChart options={donutOptions} series={donutSeries} type="donut" width={160} height={160} />
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none',
                            }}>
                                <span style={{ fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{presentCount}</span>
                                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginTop: 3 }}>Present</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: rateColor, marginTop: 1 }}>{presentPct}%</span>
                            </div>
                        </div>

                        {/* Legend — non-zero only */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {nonZeroItems.map(({ label, value, color }) => {
                                const pct = Math.round((value / total) * 100);
                                return (
                                    <div key={label}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                            <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, flex: 1 }}>{label}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{value}</span>
                                            <span style={{ fontSize: 10, color: '#9ca3af', minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                                        </div>
                                        <div style={{ height: 3, borderRadius: 99, background: '#f3f4f6' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, opacity: 0.7 }} />
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Zero items as small dimmed row */}
                            {zeroItems.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', marginTop: 2 }}>
                                    {zeroItems.map(({ label, color }) => (
                                        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#c4c9d2' }}>
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, opacity: 0.4, flexShrink: 0 }} />
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attendance rate footer */}
                    <div style={{ marginTop: 14, padding: '9px 12px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Attendance Rate</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: rateColor }}>{presentPct}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: '#e5e7eb' }}>
                            <div style={{ height: '100%', width: `${presentPct}%`, borderRadius: 99, background: rateGradient, transition: 'width 0.6s ease' }} />
                        </div>
                    </div>

                </div>
            </Card>
        </Col>
    );
};


export const MultipleRadialBar = ({ multipleRadialBarLabels, multipleRadialBarSeries, totalWorkingDays }: { multipleRadialBarLabels: string[], multipleRadialBarSeries: number[], totalWorkingDays: number }) => {
    const customColors = useSelector((state: any) => state?.customColors?.workingPattern);

    const workedDays = multipleRadialBarSeries[0] || 0;
    const workedPct = totalWorkingDays > 0 ? Math.min(100, Math.round((workedDays / totalWorkingDays) * 100)) : 0;

    const metrics = [
        { label: 'Early Check-In',    icon: 'bi-arrow-up-circle',     color: customColors?.earlyCheckinColor    || '#22c55e', value: multipleRadialBarSeries[1] || 0 },
        { label: 'Late Check-In',     icon: 'bi-clock-history',        color: customColors?.lateCheckinColor     || '#f59e0b', value: multipleRadialBarSeries[2] || 0 },
        { label: 'Early Check-Out',   icon: 'bi-arrow-down-circle',    color: customColors?.earlyCheckoutColor   || '#6366f1', value: multipleRadialBarSeries[3] || 0 },
        { label: 'Late Check-Out',    icon: 'bi-alarm',                color: customColors?.lateCheckoutColor    || '#ef4444', value: multipleRadialBarSeries[4] || 0 },
        { label: 'Missing Check-Out', icon: 'bi-exclamation-circle',   color: customColors?.missingCheckoutColor || '#9ca3af', value: multipleRadialBarSeries[5] || 0 },
    ];

    return (
        <Col md={4} className="mb-4">
            <Card style={{ borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
                <div style={{ padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <span style={{ width: 4, height: 18, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)', borderRadius: 99, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Working Pattern</span>
                    </div>

                    {/* Total Working Days hero tile */}
                    <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', borderRadius: 12, padding: '11px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="bi bi-calendar-check" style={{ fontSize: 17, color: '#fff' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Working Days</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 1 }}>
                                <span style={{ fontSize: 20, fontWeight: 800, color: '#0c4a6e', lineHeight: 1 }}>{workedDays}</span>
                                <span style={{ fontSize: 12, color: '#0369a1' }}>/ {totalWorkingDays}</span>
                                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#bae6fd', borderRadius: 20, padding: '1px 7px' }}>{workedPct}%</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 99, background: '#bae6fd', marginTop: 5 }}>
                                <div style={{ height: '100%', width: `${workedPct}%`, background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius: 99, transition: 'width 0.6s ease' }} />
                            </div>
                        </div>
                    </div>

                    {/* Metric rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                        {metrics.map(m => {
                            const barPct = totalWorkingDays > 0 ? Math.min(100, Math.round((m.value / totalWorkingDays) * 100)) : 0;
                            return (
                                <div key={m.label}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ width: 26, height: 26, borderRadius: 7, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className={`bi ${m.icon}`} style={{ fontSize: 12, color: m.color }} />
                                        </span>
                                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, flex: 1 }}>{m.label}</span>
                                        <span style={{
                                            fontSize: 12, fontWeight: 700,
                                            color: m.value > 0 ? m.color : '#d1d5db',
                                            background: m.value > 0 ? `${m.color}14` : 'transparent',
                                            borderRadius: 6, padding: '1px 6px',
                                        }}>{m.value}</span>
                                    </div>
                                    <div style={{ height: 4, borderRadius: 99, background: '#f3f4f6', marginLeft: 34 }}>
                                        <div style={{
                                            height: '100%', width: `${barPct}%`,
                                            background: m.value > 0 ? m.color : 'transparent',
                                            borderRadius: 99, transition: 'width 0.6s ease',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>
        </Col>
    );
};

export const Polar = ({ polarLabels, polarSeries, totalDays }: { polarLabels: string[], polarSeries: number[], totalDays: number }) => {
    let customColors = useSelector((state: any) => state?.customColors?.workingLocation);

    const resolveStyle = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('remote') || l.includes('wfh') || l.includes('home')) return { icon: 'bi-house-door', color: customColors?.remoteColor || '#6366f1' };
        if (l.includes('site') || l.includes('field') || l.includes('visit'))  return { icon: 'bi-map',        color: customColors?.onSiteColor  || '#22c55e' };
        return { icon: 'bi-building', color: customColors?.officeColor || '#0ea5e9' };
    };

    const total = polarSeries.reduce((a: number, b: number) => a + b, 0) || 1;
    const rows = polarLabels
        .map((label, i) => ({ label, value: polarSeries[i] || 0, ...resolveStyle(label) }))
        .filter(r => r.value > 0);

    const chartColors  = rows.map(r => r.color);
    const chartSeries  = rows.map(r => r.value);
    const chartLabels  = rows.map(r => `${r.label}`);

    const donutOptions: ApexCharts.ApexOptions = {
        chart: { type: 'donut', background: 'transparent', toolbar: { show: false }, animations: { enabled: true, speed: 600 } },
        labels: chartLabels,
        colors: chartColors,
        dataLabels: { enabled: false },
        legend: { show: false },
        stroke: { width: 2, colors: ['#fff'] },
        plotOptions: {
            pie: {
                donut: {
                    size: '68%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total',
                            fontSize: '11px',
                            color: '#9ca3af',
                            formatter: () => `${totalDays} ${totalDays === 1 ? 'day' : 'days'}`,
                        },
                        value: { show: false },
                        name: { show: true, fontSize: '13px', fontWeight: '700', color: '#111827', offsetY: -4 },
                    },
                },
            },
        },
        tooltip: {
            y: { formatter: (val: number) => `${val} day${val !== 1 ? 's' : ''} (${Math.round((val / total) * 100)}%)` },
        },
    };

    return (
        <Col md={4} xs={12} className="mb-4" style={{ display: 'flex' }}>
            <Card style={{ border: '1px solid #f0f0f0', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', letterSpacing: '-0.01em' }}>Working Locations</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: 20 }}>{totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
                </div>

                {rows.length === 0 ? (
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
                        <i className="bi bi-geo-alt" style={{ fontSize: 36, color: '#e5e7eb', display: 'block', marginBottom: 10 }} />
                        <span style={{ fontSize: 13, color: '#9ca3af' }}>No location data</span>
                    </div>
                ) : (
                    <>
                        {/* Donut chart — fills the visual space */}
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 0' }}>
                            <ReactApexChart
                                options={donutOptions}
                                series={chartSeries}
                                type="donut"
                                height={190}
                                width={220}
                            />
                        </div>

                        {/* Legend rows — name + count only (chart already shows proportion) */}
                        <div style={{ padding: '4px 20px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {rows.map(({ label, value, color, icon }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className={`bi ${icon}`} style={{ fontSize: 13, color }} />
                                        </div>
                                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>{label}</span>
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 800, color }}>{value} <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>days</span></span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Footer */}
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '10px 20px', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="bi bi-geo-alt" style={{ color: '#9ca3af', fontSize: 11 }} />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Location breakdown for the period</span>
                </div>
            </Card>
        </Col>
    );
};

export const StokedCircle = ({ stokedCircleSeries, totalWorkedDays, totalDays = 30 }: { stokedCircleSeries: any; totalWorkedDays: number; totalDays?: number; }) => {
    const pct = stokedCircleSeries[0] || 0;
    // viewBox 0 0 260 148 — arc at (130,132), r=100, tick ring r=112 stays within bounds
    const cx = 130, cy = 132, r = 100;
    const circ = 2 * Math.PI * r;
    const half = Math.PI * r;
    const filled = (pct / 100) * half;
    const absence = Math.max(0, totalDays - totalWorkedDays);

    const rateColor = pct >= 80 ? '#16a34a' : pct >= 60 ? '#0891b2' : pct >= 40 ? '#f59e0b' : '#ef4444';
    const rateLabel = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Great' : pct >= 40 ? 'Good' : 'Keep Going';
    const g1 = pct >= 80 ? '#22c55e' : '#6366f1';
    const g2 = pct >= 80 ? '#16a34a' : '#3b82f6';

    // Tick ring — r+12=112; left edge=18, right edge=242, top=20 — all within 260×148 viewBox
    const tickR = r + 12;
    const tickHalf = Math.PI * tickR;
    const tickFull = 2 * Math.PI * tickR;
    const numTicks = 26;
    const tickDash = 3;
    const tickGap = (tickHalf / numTicks) - tickDash;

    return (
        <Col md={4} className="mb-4" style={{ display: 'flex' }}>
            <Card style={{ border: '1px solid #f0f0f0', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ width: 4, height: 18, background: `linear-gradient(180deg,${g1},${g2})`, borderRadius: 99, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Attendance</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: rateColor, background: `${rateColor}18`, padding: '3px 10px', borderRadius: 20 }}>{rateLabel}</span>
                    </div>

                    {/* SVG gauge — constrained height so all three cards stay equal */}
                    <div style={{ height: 136, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 260 148" width="100%" height="136" style={{ display: 'block' }}>
                            <defs>
                                <linearGradient id="scGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={g1} />
                                    <stop offset="100%" stopColor={g2} />
                                </linearGradient>
                                <filter id="scGlow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                            </defs>

                            {/* Tick marks — top-half only, contained within viewBox */}
                            <circle cx={cx} cy={cy} r={tickR} fill="none" stroke="#d1d5db" strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeDasharray={`${tickDash} ${tickGap}`}
                                strokeDashoffset={-(tickFull - tickHalf) / 2}
                                transform={`rotate(180 ${cx} ${cy})`}
                            />

                            {/* Track arc */}
                            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="13"
                                strokeDasharray={`${half} ${circ}`}
                                transform={`rotate(180 ${cx} ${cy})`}
                                strokeLinecap="round"
                            />

                            {/* Progress arc */}
                            <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#scGrad)" strokeWidth="13"
                                strokeDasharray={`${filled} ${circ}`}
                                transform={`rotate(180 ${cx} ${cy})`}
                                strokeLinecap="round"
                                filter="url(#scGlow)"
                                style={{ transition: 'stroke-dasharray 0.8s ease' }}
                            />

                            {/* Percentage */}
                            <text x={cx} y="102" textAnchor="middle" fontFamily="Inter,-apple-system,sans-serif">
                                <tspan fontSize="34" fontWeight="900" fill="#111827" letterSpacing={-1}>{pct}</tspan>
                                <tspan fontSize="16" fontWeight="700" fill={g1} dy={-10}>%</tspan>
                            </text>

                            {/* Sub-label */}
                            <text x={cx} y="120" textAnchor="middle" fontSize="11" fontWeight="500" fill="#9ca3af"
                                fontFamily="Inter,-apple-system,sans-serif">
                                attendance rate
                            </text>
                        </svg>
                    </div>

                    {/* Stat tiles */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                        <div style={{ flex: 1, padding: '10px 10px', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius: 11, textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', lineHeight: 1 }}>{totalWorkedDays}</div>
                            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present</div>
                        </div>
                        <div style={{ flex: 1, padding: '10px 10px', background: 'linear-gradient(135deg,#fef2f2,#fee2e2)', borderRadius: 11, textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{absence}</div>
                            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Absent</div>
                        </div>
                        <div style={{ flex: 1, padding: '10px 10px', background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', borderRadius: 11, textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#0369a1', lineHeight: 1 }}>{totalDays}</div>
                            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
                        </div>
                    </div>

                </div>
            </Card>
        </Col>
    );
};

export const StreakIndicator = ({ currentStreak, lastStreak, totalDays }: { currentStreak: string, lastStreak: string, totalDays: number }) => {
    const current = parseInt(currentStreak) || 0;
    const last = parseInt(lastStreak) || 0;
    const pct = totalDays > 0 ? Math.min(100, Math.round((current / totalDays) * 100)) : 0;
    const daysLeft = Math.max(0, totalDays - current);

    const levels = [
        { label: 'Keep Going', min: 0,  max: 39,  color: '#9ca3af', bg: '#f9fafb', next: 'Good',      nextMin: 40  },
        { label: 'Good',       min: 40, max: 59,  color: '#f59e0b', bg: '#fffbeb', next: 'Great',     nextMin: 60  },
        { label: 'Great',      min: 60, max: 79,  color: '#0891b2', bg: '#f0f9ff', next: 'Excellent', nextMin: 80  },
        { label: 'Excellent',  min: 80, max: 100, color: '#16a34a', bg: '#f0fdf4', next: null,        nextMin: 100 },
    ];
    const rating = levels.find(l => pct >= l.min && pct <= l.max) || levels[0];
    const nextLevel = levels.find(l => l.label === rating.next);
    const daysToNext = nextLevel ? Math.max(0, Math.ceil((nextLevel.min / 100) * totalDays) - current) : 0;
    const progressToNext = nextLevel
        ? Math.min(100, Math.round(((pct - rating.min) / (nextLevel.min - rating.min)) * 100))
        : 100;

    return (
        <Col md={4} className="mb-4" style={{ display: 'flex' }}>
            <Card style={{ border: '1px solid #f0f0f0', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 18, background: 'linear-gradient(180deg,#fbbf24,#f59e0b)', borderRadius: 99, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Check-in Streak</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: rating.color, background: rating.bg, padding: '3px 10px', borderRadius: 20 }}>{rating.label}</span>
                </div>

                {/* Hero row */}
                <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 54, height: 54, borderRadius: 15, flexShrink: 0,
                        background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(251,191,36,0.35)',
                    }}>
                        <i className="bi bi-lightning-charge-fill" style={{ fontSize: 24, color: '#fff' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 1, letterSpacing: '-0.03em' }}>
                            {current}<span style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af', marginLeft: 6 }}>days</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: 500 }}>
                            out of <strong style={{ color: '#374151' }}>{totalDays}</strong> working days
                        </div>
                        {/* Inline progress bar */}
                        <div style={{ marginTop: 9 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance Progress</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: rating.color }}>{pct}%</span>
                            </div>
                            <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${rating.color}bb,${rating.color})`, borderRadius: 99, transition: 'width 0.5s ease' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stat tiles */}
                <div style={{ padding: '0 20px 14px', display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, padding: '10px 12px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{last}<span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500, marginLeft: 4 }}>days</span></div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, fontWeight: 500 }}>Last streak</div>
                    </div>
                    <div style={{ flex: 1, padding: '10px 12px', background: '#f9fafb', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{daysLeft}<span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500, marginLeft: 4 }}>days</span></div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, fontWeight: 500 }}>Remaining</div>
                    </div>
                </div>

                {/* Next goal / Top performance */}
                {nextLevel ? (
                    <div style={{ margin: '0 20px 18px', padding: '13px 14px', background: nextLevel.bg, borderRadius: 12, border: `1px solid ${nextLevel.color}22`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: nextLevel.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Next: {nextLevel.label}</span>
                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, background: '#fff', borderRadius: 20, padding: '1px 7px' }}>{daysToNext} days needed</span>
                        </div>
                        <div style={{ height: 5, background: `${nextLevel.color}22`, borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progressToNext}%`, background: nextLevel.color, borderRadius: 99, transition: 'width 0.5s ease' }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                            Reach <strong style={{ color: nextLevel.color }}>{nextLevel.min}%</strong> to unlock <strong style={{ color: nextLevel.color }}>{nextLevel.label}</strong>
                        </div>
                    </div>
                ) : (
                    <div style={{ margin: '0 20px 18px', padding: '14px', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius: 12, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(34,197,94,0.3)' }}>
                            <i className="bi bi-trophy-fill" style={{ fontSize: 18, color: '#fff' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>Top Performance!</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>You've reached the highest level</div>
                        </div>
                    </div>
                )}

            </Card>
        </Col>
    );
};

export const TotalWorkingTime = ({ totalWorkingTime, totalAllowedTime }: { totalWorkingTime: string, totalAllowedTime: string }) => {
    const parseMin = (s: string) => {
        const m = s?.match(/(\d+)h[^\d]*(\d+)m?/i);
        return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
    };
    const workedMin = parseMin(totalWorkingTime);
    const allowedMin = parseMin(totalAllowedTime);
    const remainingMin = Math.max(0, allowedMin - workedMin);
    const pct = allowedMin > 0 ? Math.min(100, Math.round((workedMin / allowedMin) * 100)) : 0;
    const fmtMin = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
    const done = remainingMin === 0 && workedMin > 0;

    return (
        <Col md={4} className="mb-4" style={{ display: 'flex' }}>
            <Card style={{ border: '1px solid #f0f0f0', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 18, background: done ? 'linear-gradient(180deg,#22c55e,#16a34a)' : 'linear-gradient(180deg,#6366f1,#3b82f6)', borderRadius: 99, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Total Working Time</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: done ? '#16a34a' : '#6366f1', background: done ? '#f0fdf4' : '#eef2ff', padding: '3px 10px', borderRadius: 20 }}>
                        {pct}% done
                    </span>
                </div>

                {/* Hero row */}
                <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.18)' }}>
                        <i className="bi bi-clock" style={{ fontSize: 22, color: '#6366f1' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 1, letterSpacing: '-0.03em' }}>{totalWorkingTime}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, fontWeight: 500 }}>
                            of <strong style={{ color: '#374151' }}>{totalAllowedTime}</strong> target
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ padding: '0 20px 14px' }}>
                    <div style={{ height: 8, background: '#e0e7ff', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: done ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#6366f1,#3b82f6)', borderRadius: 99, transition: 'width 0.7s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>0h</span>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>{totalAllowedTime}</span>
                    </div>
                </div>

                {/* Worked / Remaining */}
                <div style={{ margin: '0 20px', padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    <div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Worked</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#6366f1', letterSpacing: '-0.02em' }}>{totalWorkingTime}</div>
                    </div>
                    <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 16 }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Remaining</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: done ? '#16a34a' : '#374151', letterSpacing: '-0.02em' }}>{done ? 'Complete!' : fmtMin(remainingMin)}</div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 20px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="bi bi-info-circle" style={{ color: '#9ca3af', fontSize: 11 }} />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Based on today's attendance</span>
                </div>
            </Card>
        </Col>
    );
};

export const Dumbell = ({ dumbellSeriesData, height, cardHeight, totalWorkedDays, totalDays }: { dumbellSeriesData: any, height: number, cardHeight?: boolean, totalWorkedDays: number, totalDays: number }) => {

    const colorValues = useSelector((state: RootState) => state?.customColors?.workingPattern);

    const checkInColor = colorValues?.checkInColor || '#6366f1';
    const checkOutColor = colorValues?.checkoutColor || '#06b6d4';
    const missingColor = colorValues?.missingCheckoutColor || '#f43f5e';

    let checkInCount = 0, checkOutCount = 0, missingCount = 0;
    dumbellSeriesData.forEach((item: any) => {
        const [ci, co] = item.y;
        if (ci > 0) checkInCount++;
        if (co > 0) checkOutCount++;
        else if (ci > 0) missingCount++;
    });

    const attendancePct = totalDays > 0 ? Math.round((totalWorkedDays / totalDays) * 100) : 0;
    const pctColor = attendancePct >= 80 ? '#16a34a' : attendancePct >= 60 ? '#0891b2' : '#f59e0b';
    const pctBg = attendancePct >= 80 ? '#f0fdf4' : attendancePct >= 60 ? '#f0f9ff' : '#fffbeb';

    const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;

    const dumbellOptions: any = {
        chart: {
            type: 'rangeBar',
            toolbar: { show: false },
            background: 'transparent',
            animations: { enabled: true, speed: 400 },
            zoom: { enabled: false },
        },
        plotOptions: {
            bar: {
                isDumbbell: true,
                columnWidth: '3px',
                dumbbellColors: [[checkInColor, checkOutColor]],
            },
        },
        legend: { show: false },
        fill: { type: 'solid' },
        grid: {
            borderColor: '#f1f5f9',
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
        },
        xaxis: {
            tickPlacement: 'on',
            labels: { style: { fontSize: '11px', colors: '#9ca3af', fontWeight: '600' } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            min: 0,
            max: 1440,
            tickAmount: 6,
            labels: {
                style: { fontSize: '10px', colors: '#9ca3af' },
                formatter: (val: number) => `${String(Math.floor(val / 60)).padStart(2, '0')}:00`,
            },
        },
        tooltip: {
            shared: false,
            custom: ({ seriesIndex, dataPointIndex, w }: any) => {
                const data = w.config.series[seriesIndex].data[dataPointIndex];
                const [ci, co] = data.y;
                const hasCO = co > 0 && co !== ci;
                const dur = hasCO ? (() => { const d = co - ci; return `${Math.floor(d / 60)}h ${String(Math.round(d % 60)).padStart(2, '0')}m`; })() : 'N/A';
                return `<div style="padding:10px 14px;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.12);min-width:160px;font-family:inherit;border:1px solid #f0f0f0">
                    <div style="font-weight:700;color:#111827;font-size:13px;margin-bottom:8px">${data.x}</div>
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
                        <div style="width:8px;height:8px;border-radius:50%;background:${checkInColor};flex-shrink:0"></div>
                        <span style="font-size:11px;color:#6b7280;flex:1">Check-in</span>
                        <span style="font-size:12px;font-weight:700;color:#111827">${ci > 0 ? fmtMin(ci) : '—'}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                        <div style="width:8px;height:8px;border-radius:50%;background:${hasCO ? checkOutColor : missingColor};flex-shrink:0"></div>
                        <span style="font-size:11px;color:#6b7280;flex:1">Check-out</span>
                        <span style="font-size:12px;font-weight:700;color:${hasCO ? '#111827' : missingColor}">${hasCO ? fmtMin(co) : 'Missing'}</span>
                    </div>
                    <div style="border-top:1px solid #f5f5f5;padding-top:7px;display:flex;justify-content:space-between;align-items:center">
                        <span style="font-size:11px;color:#9ca3af">Duration</span>
                        <span style="font-size:12px;font-weight:800;color:${checkInColor}">${dur}</span>
                    </div>
                </div>`;
            },
        },
    };

    const dumbellSeries = [{
        name: 'Work Hours',
        data: dumbellSeriesData.map((item: any) => {
            const [ci, co] = item.y;
            const hasCO = co > 0;
            return {
                x: item.x,
                y: hasCO ? [ci, co] : [ci, ci + 2],
                fillColor: hasCO ? checkOutColor : missingColor,
                strokeColor: checkInColor,
            };
        }),
    }];

    return (
        <Card style={{ border: '1px solid #f0f0f0', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', width: '100%', marginBottom: 24 }}>
            {/* Header */}
            <div style={{ padding: '16px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 18, background: `linear-gradient(180deg,${checkInColor},${checkOutColor})`, borderRadius: 99, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Attendance Regularity</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: pctColor, background: pctBg, padding: '3px 10px', borderRadius: 20 }}>
                    {totalWorkedDays}/{totalDays} days
                </span>
            </div>

            {/* Stat chips */}
            <div style={{ padding: '0 20px 10px', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f8fafc', borderRadius: 8, padding: '5px 10px', border: `1px solid ${checkInColor}25` }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: checkInColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Check-in</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: checkInColor }}>{checkInCount}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f8fafc', borderRadius: 8, padding: '5px 10px', border: `1px solid ${checkOutColor}25` }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: checkOutColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Check-out</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: checkOutColor }}>{checkOutCount}</span>
                </div>
                {missingCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff1f2', borderRadius: 8, padding: '5px 10px', border: `1px solid ${missingColor}30` }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: missingColor, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Missing</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: missingColor }}>{missingCount}</span>
                    </div>
                )}
            </div>

            {/* Chart */}
            <div style={{ padding: '0 8px' }}>
                <ReactApexChart
                    options={dumbellOptions}
                    series={dumbellSeries}
                    type="rangeBar"
                    height={height}
                    width="100%"
                />
            </div>

        </Card>
    );
};

export const Bar = ({ barOption, barSeriesData, height, cardHeight, totalWorkingTime, totalAllowedTime }: { barOption: string[], barSeriesData: number[], height: number, cardHeight?: boolean, totalWorkingTime: string, totalAllowedTime: string }) => {

    const isMonthly = barOption.length === 12;

    const parseTimeStr = (s: string) => {
        const m = s?.match(/(\d+)h[^\d]*(\d+)m?/i);
        if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
        const h = s?.match(/^(\d+)$/);
        return h ? parseInt(h[1]) * 60 : 0;
    };

    const workedMin = parseTimeStr(totalWorkingTime);
    const allowedMin = parseTimeStr(totalAllowedTime);
    const overallPct = allowedMin > 0 ? Math.min(100, Math.round((workedMin / allowedMin) * 100)) : 0;
    const pctColor = overallPct >= 80 ? '#16a34a' : overallPct >= 50 ? '#6366f1' : '#f59e0b';
    const pctBg = overallPct >= 80 ? '#f0fdf4' : overallPct >= 50 ? '#eef2ff' : '#fffbeb';

    const activeDays = barSeriesData.filter((v: number) => v > 0).length;
    const dailyTarget = activeDays > 0 && allowedMin > 0 ? Math.round(allowedMin / activeDays) : 0;

    const barColors = barSeriesData.map((v: number) => {
        if (v === 0) return '#e5e7eb';
        if (dailyTarget === 0) return '#6366f1';
        const r = v / dailyTarget;
        if (r >= 1) return '#22c55e';
        if (r >= 0.75) return '#6366f1';
        if (r >= 0.5) return '#f59e0b';
        return '#f43f5e';
    });

    const fmtVal = (v: number) => isMonthly ? `${v}h` : convertMinutesIntoHrMinFormat(v);

    const barOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'bar',
            toolbar: { show: false },
            background: 'transparent',
            animations: { enabled: true, speed: 400 },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: barOption.length > 20 ? '70%' : '55%',
                borderRadius: 7,
                borderRadiusApplication: 'end' as any,
                distributed: true,
            },
        },
        colors: barColors,
        dataLabels: { enabled: false },
        legend: { show: false },
        grid: {
            borderColor: '#f1f5f9',
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
        },
        xaxis: {
            categories: barOption,
            tickPlacement: 'between',
            tickAmount: Math.min(10, Math.ceil(barOption.length / 2)),
            labels: {
                rotate: barOption.length > 15 ? -45 : 0,
                style: { fontSize: barOption.length > 20 ? '9px' : '11px', colors: '#9ca3af', fontWeight: '600' },
                formatter: (v: string) => v && v.length > 9 ? v.substring(0, 9) + '…' : v,
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            min: 0,
            max: isMonthly ? undefined : 1440,
            tickAmount: 4,
            labels: {
                style: { fontSize: '10px', colors: '#9ca3af' },
                formatter: (val: number) => isMonthly ? `${val}h` : `${String(Math.floor(val / 60)).padStart(2, '0')}:00`,
            },
        },
        tooltip: {
            custom: ({ series, seriesIndex, dataPointIndex }: any) => {
                const val = series[seriesIndex][dataPointIndex];
                const label = barOption[dataPointIndex];
                const color = barColors[dataPointIndex] || '#6366f1';
                const pctOfTarget = dailyTarget > 0 && val > 0 ? Math.min(100, Math.round((val / dailyTarget) * 100)) : 0;
                return `<div style="padding:10px 14px;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.12);min-width:155px;font-family:inherit;border:1px solid #f0f0f0">
                    <div style="font-weight:700;color:#111827;font-size:13px;margin-bottom:8px">${label}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
                        <span style="font-size:11px;color:#6b7280">Worked</span>
                        <span style="font-size:13px;font-weight:800;color:${color}">${val > 0 ? fmtVal(val) : '—'}</span>
                    </div>
                    ${dailyTarget > 0 ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <span style="font-size:11px;color:#6b7280">Target</span>
                        <span style="font-size:11px;font-weight:600;color:#9ca3af">${fmtVal(dailyTarget)}</span>
                    </div>
                    ${val > 0 ? `<div style="height:3px;background:#f1f5f9;border-radius:99px;overflow:hidden">
                        <div style="height:100%;width:${pctOfTarget}%;background:${color};border-radius:99px"></div>
                    </div>` : ''}` : ''}
                </div>`;
            },
        },
    };

    const barSeries = [{ name: 'Working Hours', data: barSeriesData }];

    return (
        <Card style={{ border: '1px solid #f0f0f0', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', width: '100%', marginBottom: 24 }}>
            {/* Header */}
            <div style={{ padding: '16px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 18, background: 'linear-gradient(180deg,#3b82f6,#6366f1)', borderRadius: 99, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Working Time</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: pctColor, background: pctBg, padding: '3px 10px', borderRadius: 20 }}>
                    {overallPct}% done
                </span>
            </div>

            {/* Time summary chips */}
            <div style={{ padding: '0 20px 10px', display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f8fafc', borderRadius: 8, padding: '5px 10px', border: '1px solid #e0e7ff' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Worked</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#6366f1' }}>{totalWorkingTime}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f8fafc', borderRadius: 8, padding: '5px 10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#9ca3af', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Target</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#6b7280' }}>{totalAllowedTime}</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {[{ c: '#22c55e', l: '≥100%' }, { c: '#6366f1', l: '≥75%' }, { c: '#f59e0b', l: '≥50%' }, { c: '#f43f5e', l: '<50%' }].map(({ c, l }) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>{l}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div style={{ padding: '0 8px' }}>
                <ReactApexChart
                    options={barOptions}
                    series={barSeries}
                    type="bar"
                    height={height}
                    width="100%"
                />
            </div>
        </Card>
    );
};
export const HeatMap = ({ heatMapSeries, height, totalDays }: { heatMapSeries: any, height: number, totalDays: number }) => {
    const colorValues = useSelector((state: RootState) => state?.customColors?.attendanceOverview);
    const checkoutMissingColor = useSelector((state: any) => state?.customColors?.workingPattern?.missingCheckoutColor);
    const weekendColor = useSelector((state: any) => state?.customColors?.attendanceCalendar?.weekendColor);

    const statusMap: Record<number, { label: string; color: string; icon: string }> = {
        0: { label: 'Present',           color: colorValues?.presentColor  || '#22c55e', icon: 'bi-check2'                  },
        1: { label: 'Absent',            color: colorValues?.absentColor   || '#ef4444', icon: 'bi-x-lg'                    },
        2: { label: 'On Leave',          color: colorValues?.onLeaveColor  || '#f59e0b', icon: 'bi-briefcase'               },
        3: { label: 'Extra Day',         color: colorValues?.extraDayColor || '#6366f1', icon: 'bi-plus-circle'             },
        4: { label: 'Holiday',           color: colorValues?.holidayColor  || '#8b5cf6', icon: 'bi-gift'                    },
        5: { label: 'N/A',               color: '#d1d5db',                               icon: 'bi-dash'                    },
        6: { label: 'Missing Check-Out', color: checkoutMissingColor       || '#f43f5e', icon: 'bi-exclamation-triangle'    },
        7: { label: 'Weekend',           color: weekendColor               || '#94a3b8', icon: 'bi-moon-stars'              },
    };

    const statusCounts: Record<string, number> = {};
    Object.values(statusMap).forEach(({ label }) => (statusCounts[label] = 0));
    heatMapSeries.forEach((s: any) => s.data.forEach((v: number) => {
        const info = statusMap[v]; if (info) statusCounts[info.label] = (statusCounts[info.label] || 0) + 1;
    }));

    if (!heatMapSeries?.length) return null;
    const isWeekly = heatMapSeries.length === 1 && (heatMapSeries[0]?.data?.length ?? 0) <= 7;
    const isMultiMonth = heatMapSeries.length > 1;
    const DAY_HDRS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = dayjs();

    const inferMonthStart = (name: string): Dayjs | null => {
        const abbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const full = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        let idx = abbr.findIndex(m => name.startsWith(m));
        if (idx === -1) idx = full.findIndex(m => name.startsWith(m));
        if (idx === -1) return null;
        return today.year(today.year()).month(idx).date(1);
    };

    const ROW_H = 34, GAP = 3;

    const buildCounts = (data: number[]) => {
        const counts: Record<string, number> = {};
        Object.values(statusMap).forEach(({ label }) => (counts[label] = 0));
        data.forEach(c => { const s = statusMap[c]; if (s) counts[s.label] = (counts[s.label] || 0) + 1; });
        return counts;
    };

    const StatCards = ({ counts }: { counts: Record<string, number> }) => (
        <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 108px)', gap: 7, paddingTop: 18, alignContent: 'start' }}>
            {Object.entries(statusMap).map(([key, { label, color }]) => (
                <div key={key} style={{ padding: '8px 10px', borderRadius: 10, background: `${color}14`, border: `1px solid ${color}28`, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{counts[label] || 0}</span>
                    <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                </div>
            ))}
        </div>
    );

    const renderMonthCalendar = (series: any) => {
        const data: number[] = series?.data || [];
        const monthStart = inferMonthStart(series?.name || '');
        const firstDow = monthStart ? monthStart.day() : 1;
        const firstMonFirst = firstDow === 0 ? 6 : firstDow - 1;
        const numWeeks = Math.max(1, Math.ceil((firstMonFirst + data.length) / 7));
        const counts = buildCounts(data);

        const cells: { dayNum: number | null; code: number | null }[] = [];
        for (let i = 0; i < firstMonFirst; i++) cells.push({ dayNum: null, code: null });
        data.forEach((code, i) => cells.push({ dayNum: i + 1, code }));
        const remainder = numWeeks * 7 - cells.length;
        for (let i = 0; i < remainder; i++) cells.push({ dayNum: null, code: null });

        const weekHeaders = Array.from({ length: numWeeks }, (_, w) => {
            const d = w * 7 - firstMonFirst + 1;
            return d >= 1 && d <= data.length ? d : null;
        });

        return (
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', width: '100%' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: GAP }}>
                    {/* Day-of-week labels */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, paddingTop: 18, flexShrink: 0 }}>
                        {DAY_HDRS.map(d => (
                            <div key={d} style={{ height: ROW_H, display: 'flex', alignItems: 'center', fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', width: 24 }}>{d}</div>
                        ))}
                    </div>
                    {/* Grid */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${numWeeks}, 1fr)`, gap: GAP, marginBottom: 4 }}>
                            {weekHeaders.map((d, w) => (
                                <div key={w} style={{ textAlign: 'center', fontSize: 9, color: '#9ca3af', fontWeight: 600 }}>{d ?? ''}</div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${numWeeks}, 1fr)`, gridTemplateRows: `repeat(7, ${ROW_H}px)`, gap: GAP, gridAutoFlow: 'column' }}>
                            {cells.map(({ dayNum, code }, idx) => {
                                const st = dayNum !== null && code !== null ? statusMap[code] : null;
                                const isToday = dayNum !== null && monthStart && monthStart.date(dayNum).isSame(today, 'day');
                                return (
                                    <div key={idx} title={dayNum !== null && st ? `${dayNum} ${series.name}: ${st.label}` : undefined} style={{
                                        borderRadius: 6, cursor: 'default',
                                        background: dayNum === null ? 'transparent' : code === 5 ? '#f1f5f9' : (st?.color || '#e5e7eb'),
                                        opacity: code === 5 ? 0.3 : 1,
                                        outline: isToday ? '2px solid #111827' : 'none',
                                        outlineOffset: 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {dayNum !== null && <span style={{ fontSize: 10, fontWeight: 700, color: code === 5 ? '#9ca3af' : 'rgba(255,255,255,0.9)', lineHeight: 1, userSelect: 'none' }}>{dayNum}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <StatCards counts={counts} />
            </div>
        );
    };

    const renderWeekRow = (series: any) => {
        const data: number[] = series?.data || [];
        const counts = buildCounts(data);
        return (
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', width: '100%' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: GAP, marginBottom: 4 }}>
                        {DAY_HDRS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>{d}</div>)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: GAP }}>
                        {data.map((code: number, i: number) => {
                            const st = statusMap[code];
                            return (
                                <div key={i} title={st?.label} style={{ height: ROW_H * 2, borderRadius: 8, background: code === 5 ? '#f1f5f9' : (st?.color || '#e5e7eb'), opacity: code === 5 ? 0.3 : 1, cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className={`bi ${st?.icon || 'bi-dash'}`} style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)' }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
                <StatCards counts={counts} />
            </div>
        );
    };

    const periodLabel = heatMapSeries.length === 1
        ? heatMapSeries[0].name
        : `${heatMapSeries[0]?.name} – ${heatMapSeries[heatMapSeries.length - 1]?.name}`;

    return (
        <Card style={{ border: '1px solid #f0f0f0', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', width: '100%', marginBottom: 24 }}>
            {/* Header */}
            <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 18, background: 'linear-gradient(180deg,#22c55e,#6366f1)', borderRadius: 99, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Attendance Calendar</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', background: '#f1f5f9', padding: '3px 10px', borderRadius: 20 }}>{periodLabel}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '3px 10px', borderRadius: 20 }}>{totalDays} working days</span>
                </div>
            </div>

            {/* Calendar */}
            <div style={{ padding: '0 20px 16px' }}>
                {isWeekly
                    ? heatMapSeries.map((s: any, i: number) => <div key={i}>{renderWeekRow(s)}</div>)
                    : isMultiMonth
                        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {heatMapSeries.map((s: any, i: number) => (
                                <div key={i}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s?.name}</div>
                                    {renderMonthCalendar(s)}
                                </div>
                            ))}
                          </div>
                        : heatMapSeries.map((s: any, i: number) => <div key={i}>{renderMonthCalendar(s)}</div>)
                }
            </div>

            {/* Color key strip */}
            <div style={{ padding: '10px 20px 14px', borderTop: '1px solid #f5f5f5', display: 'flex', flexWrap: 'wrap', gap: '5px 12px' }}>
                {Object.entries(statusMap).map(([key, { label, color }]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: color, opacity: key === '5' ? 0.35 : 1, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>{label}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const faqSchema = Yup.object({
    workingMethodId: Yup.string().required().label('Working Method'),
    checkIn: Yup.string().required().label('Check In'),
    remarks: Yup.string().required().label('Remarks'),
});

let initialState = {
    employeeId: "",
    checkIn: "",
    checkOut: "",
    workingMethodId: "",
    remarks: "",
};

function resolveAttendanceCoordinates(
    rowId: string | undefined,
    locationProp: any[] | undefined,
    lat?: number | null,
    lng?: number | null
): AttendanceCoordinates | null {
    const entry =
        Array.isArray(locationProp) && rowId
            ? locationProp.find((item) => item.id === rowId)
            : undefined;
    const resolvedLat = lat ?? entry?.latitude;
    const resolvedLng = lng ?? entry?.longitude;
    if (resolvedLat == null || resolvedLng == null) return null;
    const coords = { lat: Number(resolvedLat), lng: Number(resolvedLng) };
    return hasValidMapCoordinates(coords) ? coords : null;
}

export const StatisticsTable = ({
    approvedLeaves,
    attendance,
    attendanceRequests,
    fromAdmin = false,
    location,
    resource = "",
    viewOwn = false,
    viewOthers = false,
    checkOwnWithOthers = false,
    manualPagination = false,
    rowCount,
    onPaginationChange,
    paginationState,
    isLoading = false
}: {
    approvedLeaves: any[],
    attendance: IAttendance[],
    attendanceRequests: IAttendanceRequests[],
    fromAdmin?: boolean,
    location?: any,
    resource: string,
    viewOwn?: boolean,
    viewOthers?: boolean,
    checkOwnWithOthers?: boolean,
    manualPagination?: boolean,
    rowCount?: number,
    onPaginationChange?: (pagination: any) => void,
    paginationState?: { pageIndex: number; pageSize: number },
    isLoading?: boolean
}) => {

    const [disableRaiseRequest, setDisableRaiseRequest] = useState(false);

    const employeeDeatils = fromAdmin ? useSelector((state: RootState) => state.employee.selectedEmployee) : useSelector((state: RootState) => state.employee.currentEmployee);
    const reportsToId = employeeDeatils.reportsToId;

    // Weekend/holiday status must use the VIEWED employee's branch config (selected when admin,
    // else self) — NOT the logged-in admin's. Otherwise an employee on a Mon-working branch shows
    // Mondays as "Working on weekend" because the admin's branch has Monday off.
    const curWeekends = useSelector((state: RootState) => state?.employee?.currentEmployee?.branches?.workingAndOffDays);
    const allWeekends = employeeDeatils?.branches?.workingAndOffDays || curWeekends;
    const allHolidays = useSelector((state: RootState) => state?.attendanceStats?.publicHolidays);

    const colorValues = useSelector((state: RootState) => state?.customColors?.attendanceOverview);
    const colorValuesForAttendanceCalendar = useSelector((state: RootState) => state?.customColors?.attendanceCalendar);

    const worktypeColorValues = useSelector((state: RootState) => state?.customColors?.workingLocation);
    const missingColor = useSelector((state: RootState) => state?.customColors.workingPattern);
    const workingOnWeekendColor = useSelector((state: RootState) => state?.customColors.attendanceCalendar);
    const currentEmployeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const stableEmployeeId = useMemo(() => currentEmployeeId, [currentEmployeeId]);

    const attendanceWithRequest = attendance.map((dailyAttendance: IAttendance) => {
        const attendanceRequest = attendanceRequests.filter((request: IAttendanceRequests) =>
            request.formattedDate === dailyAttendance.formattedDate &&
            request.status == LeaveStatus.ApprovalPending)[0];
        return {
            ...dailyAttendance,
            attendanceRequests: attendanceRequest,
        };
    });

    // Merge approved leaves with attendance data
    const attendanceWithLeaves = attendanceWithRequest.map((dailyAttendance: IAttendance) => {
        // Check if there's an approved leave for this date
        let leaveType = "";
        const hasApprovedLeave = approvedLeaves?.some((leave: any) => {
            const leaveDate = dayjs(leave.date).format('DD/MM/YYYY');
            const tempLeaveType = leave?.leaveOptions?.leaveType || "";

            if (tempLeaveType?.toLocaleLowerCase().includes('annual')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.ANNUAL_LEAVE;
            }
            else if (tempLeaveType?.toLocaleLowerCase().includes('maternal')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.MATERNAL_LEAVE;
            }
            else if (tempLeaveType?.toLocaleLowerCase().includes('floater')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.FLOATER_LEAVE;
            }
            else if (tempLeaveType?.toLocaleLowerCase().includes('casual')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.CASUAL_LEAVE;
            }
            else if (tempLeaveType?.toLocaleLowerCase().includes('sick')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.SICK_LEAVE;
            }
            else if (tempLeaveType?.toLocaleLowerCase().includes('unpaid')) {
                leaveType = ATTENDANCE_STATUS.LEAVE_TYPE.UNPAID_LEAVE;
            }
            return leaveDate === dailyAttendance.formattedDate;
        });

        // If there's an approved leave and the current status is "Absent", mark as "Present"


        if (hasApprovedLeave && dailyAttendance.status === ATTENDANCE_STATUS.ABSENT) {

            return {
                ...dailyAttendance,
                status: leaveType,
                leaveType: leaveType,
            };
        }

        return dailyAttendance;
    });

    attendance = attendanceWithLeaves;

    const dispatch = useDispatch();
    const toggleChange = store.getState().attendanceStats.toggleChange;

    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const companyId = useSelector((state: RootState) => state.employee.currentEmployee.companyId);
    // Late-threshold scope = the VIEWED employee (selected when admin, else self), so the table's
    // red/green matches that employee's shift — same scope the backend graph uses.
    const curThresholdCompanyId = useSelector((state: RootState) => state.employee?.currentEmployee?.companyId);
    const curThresholdBranchId = useSelector((state: RootState) => state.employee?.currentEmployee?.branchId);
    const selThresholdCompanyId = useSelector((state: RootState) => state.employee?.selectedEmployee?.companyId);
    const selThresholdBranchId = useSelector((state: RootState) => state.employee?.selectedEmployee?.branchId);
    const selThresholdEmployeeId = useSelector((state: RootState) => state.employee?.selectedEmployee?.id);
    // Authoritative late check-in dates from the backend (it resolves the VIEWED employee's own
    // branch shift + grace — same engine as the graph/KPI/salary). The table colours from these so
    // it can never disagree with the rest of the system due to a stale/empty Redux scope.
    const [backendLateDates, setBackendLateDates] = useState<Set<string>>(new Set());
    const [backendDatesReady, setBackendDatesReady] = useState(false);
    const showDateIn12HourFormat = useSelector((state: RootState) => state.employee.currentEmployee.branches.showDateIn12HourFormat);
    const leaveTypesColor = useSelector((state: RootState) => state?.customColors?.leaveTypes);
    const [leaveConfiguration, setLeaveConfiguration] = useState<any>()
    const [workingMethodOptions, setWorkingMethodOptions] = useState([]);
    const [lateCheckInThreshold, setLateCheckInThreshold] = useState('');
    const [earlyCheckOutThreshold, setEarlyCheckOutThreshold] = useState('');
    const [allEmployeeThresholds, setAllEmployeeThresholds] = useState<any>([]);
    const [latitudeNew, setLatitudeNew] = useState<any>()
    const [longitudeNew, setLongitudeNew] = useState<any>()
    const [isIOSMobile, setIsIOSMobile] = useState<boolean>(false);

    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(false);
    const [date, setDate] = useState('');
    // ADD: Store current row data for handleSubmit
    const [currentRowData, setCurrentRowData] = useState<any>(null);
    // ADD: Request type selection state
    const [requestType, setRequestType] = useState<'checkin' | 'checkout' | null>(null);
    const [showRequestTypeSelection, setShowRequestTypeSelection] = useState(false);
    const [hasCheckInData, setHasCheckInData] = useState(false);

    // Validation state for previous days attendance check
    const [canSubmitRequest, setCanSubmitRequest] = useState(true);
    const [validationBlockingDate, setValidationBlockingDate] = useState('');
    const [isValidating, setIsValidating] = useState(false);

    // Get dateOfJoining and branchWorkingDays for validation
    const dateOfJoining = fromAdmin
        ? useSelector((state: RootState) => state.employee.selectedEmployee.dateOfJoining)
        : useSelector((state: RootState) => state.employee.currentEmployee.dateOfJoining);
    const branchWorkingDays = fromAdmin
        ? useSelector((state: RootState) => {
            const workingAndOffDays = state.employee.selectedEmployee?.branches?.workingAndOffDays;
            return parseWorkingDays(workingAndOffDays);
        })
        : useSelector((state: RootState) => {
            const workingAndOffDays = state.employee.currentEmployee?.branches?.workingAndOffDays;
            return parseWorkingDays(workingAndOffDays);
        });


    const handleClose = () => {
        setShow(false);
        setCurrentRowData(null); // Clear row data on close
        setRequestType(null); // Clear request type on close
        setShowRequestTypeSelection(false); // Reset request type selection
        // Reset validation state
        setCanSubmitRequest(true);
        setValidationBlockingDate('');
        setIsValidating(false);
    }

    // MODIFIED: Accept and store the entire attendance row data
    const raiseRequest = async (attendance: any) => {
        setDate(attendance.date);

        setCurrentRowData(attendance); // Store the row data

        // Check if check-in data exists for this date
        const hasCheckInData = (attendance?.attendanceRequests && attendance.attendanceRequests.checkIn) ||
            (attendance && attendance.checkIn && attendance.checkIn !== "-NA-");

        // Store check-in availability for modal logic
        setHasCheckInData(hasCheckInData);

        // Always show request type selection modal
        setShowRequestTypeSelection(true);
        setShow(true);

        // Validate previous days attendance (skip for admin raising for others)
        if (!fromAdmin) {
            setIsValidating(true);
            try {
                const validationResult = await validatePreviousDaysAttendance({
                    employeeId,
                    selectedDate: attendance.date,
                    dateOfJoining: String(dateOfJoining || ''),
                    workingAndOfDays: branchWorkingDays || {},
                    offDaysForTheBranch: []
                });
                setCanSubmitRequest(validationResult.canRaiseRequest);
                setValidationBlockingDate(validationResult.blockingDate);
            } catch (validationError) {
                console.error('Validation error:', validationError);
                setCanSubmitRequest(true); // Allow on error to not block user
            } finally {
                setIsValidating(false);
            }
        }

        if (attendance?.attendanceRequests) {
            initialState = {
                employeeId: attendance?.attendanceRequests.employeeId,
                checkIn: attendance?.attendanceRequests?.checkIn,
                checkOut: attendance?.attendanceRequests?.checkOut,
                workingMethodId: attendance?.attendanceRequests.workingMethodId,
                remarks: attendance?.attendanceRequests.remarks,
            };
        } else if (attendance?.id) {
            initialState = {
                employeeId: employeeId,
                checkIn: attendance?.checkIn,
                checkOut: attendance?.checkOut,
                workingMethodId: attendance?.workingMethodId,
                remarks: attendance?.remarks
            };
        } else {
            initialState = {
                employeeId: employeeId,
                checkIn: '',
                checkOut: '',
                workingMethodId: '',
                remarks: ''
            };
        }
    }

    // ADD: Handle request type selection
    const handleRequestTypeSelection = (type: 'checkin' | 'checkout') => {
        setRequestType(type);
        setShowRequestTypeSelection(false);
    }

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {

                    setLatitudeNew(position.coords.latitude);
                    setLongitudeNew(position.coords.longitude);
                },
                (error) => {
                    // Handle errors (e.g., user denied permission)
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0
                }
            );
        }
        async function fetchLeaveConfig() {

            const { data: configuration } = await fetchConfiguration(LEAVE_MANAGEMENT);
            const jsonObject = safeJsonParse(configuration.configuration.configuration);

            setLeaveConfiguration(jsonObject);
        }
        fetchLeaveConfig();
    }, [])

    // MODIFIED: Use currentRowData to get latitude/longitude
    const handleSubmit = async (values: any, actions: FormikValues) => {
        // Get location data from the stored row data
        const currentId = currentRowData?.id;
        const locationEntry = Array.isArray(location) && location.find(item => item.id === currentId);
        const latitude = locationEntry?.latitude;
        const longitude = locationEntry?.longitude;

        const updatedValues = {
            ...values,
            latitude: ((latitude == undefined || !latitude) ? latitudeNew : latitude) || 0,
            longitude: ((longitude == undefined || !longitude) ? longitudeNew : longitude) || 0,
            status: 0,
            companyId
        }

        const formattedDate = dayjs(date).format("YYYY-MM-DD");
        let checkInDateTime, checkOutDateTime;
        let checkInUTC, checkOutUTC;

        // Validate based on request type
        if (requestType === 'checkin') {
            if (!values.checkIn || values.checkIn === "") {
                errorConfirmation('Check In time is required for check-in request');
                return;
            }
            if (!isValidTime(values.checkIn)) {
                errorConfirmation('Enter Check In in HH:MM(24 hr format)');
                return;
            }
            checkInDateTime = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
            const checkInDateObject = new Date(checkInDateTime.toString());
            checkInUTC = checkInDateObject.toISOString();
            updatedValues.checkIn = checkInUTC;
            // Remove checkout for checkin requests
            delete updatedValues.checkOut;
        } else if (requestType === 'checkout') {
            if (!values.checkOut || values.checkOut === "") {
                errorConfirmation('Check Out time is required for check-out request');
                return;
            }
            if (!isValidTime(values.checkOut)) {
                errorConfirmation('Enter Check Out in HH:MM(24 hr format)');
                return;
            }
            checkOutDateTime = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");
            const checkOutDateObject = new Date(checkOutDateTime.toString());
            checkOutUTC = checkOutDateObject.toISOString();
            updatedValues.checkOut = checkOutUTC;
            // Remove checkin for checkout requests
            // updatedValues.checkIn = undefined;
            if (updatedValues?.checkIn) {
                let checkInDateTime = new Date(dayjs(`${formattedDate} ${updatedValues?.checkIn}`, "YYYY-MM-DD HH:mm")?.toString());
                updatedValues.checkIn = checkInDateTime?.toISOString();
            }
        }

        // Time conflict validation - check against existing attendance data
        const existingAttendanceData = currentRowData;
        let existingCheckInTime = null;
        let existingCheckOutTime = null;

        // Extract existing times for validation
        if (existingAttendanceData?.attendanceRequests) {
            // From attendance requests
            if (existingAttendanceData.attendanceRequests.checkIn) {
                existingCheckInTime = dayjs(existingAttendanceData.attendanceRequests.checkIn).format('HH:mm');
            }
            if (existingAttendanceData.attendanceRequests.checkOut) {
                existingCheckOutTime = dayjs(existingAttendanceData.attendanceRequests.checkOut).format('HH:mm');
            }
        } else if (existingAttendanceData) {
            // From attendance data
            if (existingAttendanceData.checkIn && existingAttendanceData.checkIn !== "-NA-") {
                // Handle time format from attendance data (might include seconds)
                const timePart = existingAttendanceData.checkIn.split(' ').pop() || existingAttendanceData.checkIn;
                if (timePart) {
                    const timeParts = timePart.split(':');
                    if (timeParts.length >= 2) {
                        existingCheckInTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
                    }
                }
            }
            if (existingAttendanceData.checkOut && existingAttendanceData.checkOut !== "-NA-") {
                const timePart = existingAttendanceData.checkOut.split(' ').pop() || existingAttendanceData.checkOut;
                if (timePart) {
                    const timeParts = timePart.split(':');
                    if (timeParts.length >= 2) {
                        existingCheckOutTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
                    }
                }
            }
        }

        // Validate time conflicts
        if (requestType === 'checkin') {
            // For check-in requests, check against existing check-out time
            if (existingCheckOutTime) {
                const newCheckInTime = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
                const existingCheckOutDateTime = dayjs(`${formattedDate} ${existingCheckOutTime}`, "YYYY-MM-DD HH:mm");

                if (newCheckInTime.isAfter(existingCheckOutDateTime)) {
                    errorConfirmation(`Check-in time (${values.checkIn}) cannot be after the existing check-out time (${existingCheckOutTime})`);
                    return;
                }
            }

            // Also check if form has both check-in and check-out values
            if (values.checkOut && values.checkOut.trim() !== "") {
                const checkInTime = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
                const checkOutTime = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");

                if (checkInTime.isAfter(checkOutTime)) {
                    errorConfirmation(`Check-in time (${values.checkIn}) cannot be after check-out time (${values.checkOut})`);
                    return;
                }
            }
        } else if (requestType === 'checkout') {
            // For check-out requests, check against existing check-in time
            if (existingCheckInTime) {
                const newCheckOutTime = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");
                const existingCheckInDateTime = dayjs(`${formattedDate} ${existingCheckInTime}`, "YYYY-MM-DD HH:mm");

                if (newCheckOutTime.isBefore(existingCheckInDateTime)) {
                    errorConfirmation(`Check-out time (${values.checkOut}) cannot be before the existing check-in time (${existingCheckInTime})`);
                    return;
                }
            }

            // Also check if form has both check-in and check-out values
            if (values.checkIn && values.checkIn.trim() !== "") {
                const checkInTime = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
                const checkOutTime = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");

                if (checkOutTime.isBefore(checkInTime)) {
                    errorConfirmation(`Check-out time (${values.checkOut}) cannot be before check-in time (${values.checkIn})`);
                    return;
                }
            }
        }

        // Additional validation: If both times are present in the form, validate their relationship
        if (values.checkIn && values.checkIn.trim() !== "" && values.checkOut && values.checkOut.trim() !== "") {
            const checkInTime = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
            const checkOutTime = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");

            if (checkInTime.isAfter(checkOutTime)) {
                errorConfirmation(`Check-in time (${values.checkIn}) must be before check-out time (${values.checkOut})`);
                return;
            }
        }

        try {
            setLoading(true);
            await createUpdateAttendanceRequest(updatedValues);
            setLoading(false);
            successConfirmation('Attendance Request created successfully');
            setShow(false);
            setCurrentRowData(null); // Clear row data after successful submission
            dispatch(saveToggleChange(!toggleChange));
            return;
        } catch (err) {
            setLoading(false);
            errorConfirmation('Attendance Request failed successfully. Try again later.');
            dispatch(saveToggleChange(!toggleChange));
        }
    }

    useEffect(() => {
        async function getWorkingMethods() {
            const { data: { workingMethods } } = await fetchWorkingMethods();
            const workingMethodOptions = workingMethods.map((workingMethod: any) => ({ value: workingMethod.id, label: workingMethod.type }));
            setWorkingMethodOptions(workingMethodOptions);
        }
        getWorkingMethods();
    }, []);

    // fetch grace based thresholds — scoped to the VIEWED employee so coloring matches their shift
    useEffect(() => {
        const thresholdScope = {
            companyId: fromAdmin ? (selThresholdCompanyId || curThresholdCompanyId) : curThresholdCompanyId,
            branchId: fromAdmin ? (selThresholdBranchId || curThresholdBranchId) : curThresholdBranchId,
        };
        const initThresholds = async () => {
            const thresholds = await getGraceBasedThresholds(attendance, thresholdScope);

            if (thresholds) {
                setAllEmployeeThresholds(thresholds.employeesWithThresholds);
                setLateCheckInThreshold(thresholds.defaultThresholds.lateCheckInThreshold);
                setEarlyCheckOutThreshold(thresholds.defaultThresholds.earlyCheckOutThreshold);
            }
        };

        initThresholds();
    }, [fromAdmin, selThresholdCompanyId, selThresholdBranchId, curThresholdCompanyId, curThresholdBranchId]);

    // Derive STABLE primitives for the late-dates fetch. `attendance` is rebuilt with a new array
    // reference every render, so depending on it directly would re-fetch on every render (an
    // infinite loop that thrashes the table — e.g. resets pagination). These strings only change
    // when the underlying data actually changes.
    const lateFetchEmpId =
        (attendance || []).map((r: any) => r?.employeeId).find((x: any) => x) ||
        (fromAdmin ? (selThresholdEmployeeId || employeeId) : employeeId);
    const lateFetchIsoDates = (attendance || [])
        .map((r: any) => ddmmyyyyToISO(r?.formattedDate))
        .filter((x: string | null): x is string => !!x)
        .sort();
    const lateFetchStart = lateFetchIsoDates[0] || '';
    const lateFetchEnd = lateFetchIsoDates[lateFetchIsoDates.length - 1] || '';

    // Pull the authoritative late check-in dates for the VIEWED employee from the backend.
    useEffect(() => {
        if (!lateFetchEmpId || !lateFetchStart || !lateFetchEnd) {
            setBackendLateDates(new Set());
            setBackendDatesReady(false);
            return;
        }
        let cancelled = false;
        fetchAttendanceClassification(lateFetchEmpId, lateFetchStart, lateFetchEnd)
            .then(({ data }) => {
                if (cancelled) return;
                setBackendLateDates(new Set(data.lateCheckinDates || []));
                setBackendDatesReady(true);
            })
            .catch(() => {
                if (cancelled) return;
                setBackendLateDates(new Set());
                setBackendDatesReady(false);
            });
        return () => { cancelled = true; };
    }, [lateFetchEmpId, lateFetchStart, lateFetchEnd]);

    // if employee working on weekend/holiday then no late marking and early check out marking

    const isWeekendOrHoliday = useMemo(() =>
        markWeekendOrHolidayForReportsTable(attendance, allWeekends, allHolidays),
        [attendance, allWeekends, allHolidays]
    );

    // Don't slice data here - let MaterialTable handle pagination internally
    // when manualPagination is false, or handle it externally when true
    const paginatedData = useMemo(() => {
        return isWeekendOrHoliday;
    }, [isWeekendOrHoliday]);
    // debugger;
    // console.log("paginatedData:: ",paginatedData);

    const columns = useMemo<MRT_ColumnDef<IAttendance>[]>(() => [
        {
            accessorKey: "date",
            header: "Date",
            size: 150,
            minSize: 130,
            maxSize: 180,
            Cell: ({ row }: any) => {
                const date = row.original.date;
                const day = row.original.day;
                return (
                    <div>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{date || 'N/A'}</div>
                        {day && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{day}</div>}
                    </div>
                );
            }
        },
        {
            accessorKey: "checkIn",
            header: "Check-In",
            size: 200,
            minSize: 160,
            maxSize: 280,
            accessorFn: (row) => formatAttendanceCheckExport(
                row.checkIn,
                row.workingMethod,
                row.checkInLocation
            ),
            Cell: ({ row }: { row: any }) => {
                const employee = row.original;
                const checkIn = employee.checkIn;
                const displayTime =
                    checkIn && checkIn !== '-NA-' ? convertTo12HourFormat(checkIn) : checkIn;

                const employeeThreshold = allEmployeeThresholds?.find(
                    (emp: any) => emp.id === employee.id
                );
                const skipColoring = !shouldApplyCheckInColoring(
                    employee.status,
                    employee.isWeekendOrHoliday
                );
                let checkInColor = resolveCheckInColor({
                    checkIn,
                    workingMethod: employee.workingMethod,
                    date: employee.date,
                    lateCheckInThreshold:
                        employeeThreshold?.lateCheckInThreshold ?? lateCheckInThreshold,
                    leaveConfig: leaveConfiguration,
                    skipColoring,
                });

                // Prefer the backend's authoritative late determination (resolves the viewed
                // employee's own shift + grace). Only override real check-in rows (not weekend/
                // missing) once the dates have loaded, so colouring matches the graph/KPI exactly.
                if (backendDatesReady && !skipColoring && checkIn && checkIn !== '-NA-') {
                    const istDate = ddmmyyyyToISO(employee.formattedDate);
                    if (istDate) {
                        const isLate = backendLateDates.has(istDate);
                        checkInColor = isLate
                            ? { tone: 'danger', color: '#DC3545', isLate: true, tooltip: 'Late check-in' }
                            : { tone: 'success', color: '#28A745', isLate: false, tooltip: 'On time' };
                    }
                }

                const coords = resolveAttendanceCoordinates(employee.id, location);

                return (
                    <AttendanceCheckCell
                        label="Check-In"
                        type="in"
                        time={displayTime}
                        method={employee.workingMethod}
                        location={employee.checkInLocation}
                        fullAddress={employee.checkInLocation}
                        coordinates={coords}
                        timeTone={checkInColor.tone}
                        timeTooltip={checkInColor.tooltip}
                    />
                );
            }
        },
        {
            accessorKey: "checkOut",
            header: "Check-Out",
            size: 200,
            minSize: 160,
            maxSize: 280,
            accessorFn: (row) => formatAttendanceCheckExport(
                row.checkOut,
                row.checkoutWorkingMethod ?? row.checkoutWokringMethod,
                row.checkOutLocation
            ),
            Cell: ({ row }: any) => {
                const employee = row.original;
                const checkOut = employee.checkOut;
                const checkoutMethod =
                    employee.checkoutWorkingMethod ?? employee.checkoutWokringMethod;

                let displayTime = checkOut;
                if (checkOut && checkOut !== '-NA-') {
                    displayTime = convertTo12HourFormat(checkOut);
                }

                const coords = resolveAttendanceCoordinates(
                    employee.id,
                    location,
                    employee.checkOutLatitude,
                    employee.checkOutLongitude
                );

                const checkOutColor = resolveCheckOutColor(checkOut);

                return (
                    <AttendanceCheckCell
                        label="Check-Out"
                        type="out"
                        time={displayTime}
                        method={checkoutMethod}
                        location={employee.checkOutLocation}
                        fullAddress={employee.checkOutLocation}
                        coordinates={coords}
                        timeTone={checkOutColor.tone}
                    />
                );
            }
        },

        // {
        //     accessorKey: "checkOutLocation",
        //     header: "Check Out Location",
        //     size: 120,
        //     minSize: 100,
        //     maxSize: 150,
        //     Cell: ({ row }: any) => {
        //         const currentId = row.original.id;
        //         const workingMethod = row.original.workingMethod;
        //         const checkOutLocation = row.original.checkOutLocation;

        //         // REMOVED: working method guard — show location for all types

        //         const latitude = row?.original?.checkOutLatitude;
        //         const longitude = row?.original?.checkOutLongitude;

        //         const [address, setAddress] = useState("Fetching location...");

        //         useEffect(() => {
        //             const fetchAddress = async () => {
        //                 // Check location string FIRST (handles biometric where lat/lng are 0)
        //                 if (checkOutLocation && checkOutLocation.length > 0) {
        //                     setAddress(checkOutLocation);
        //                     return;
        //                 }

        //                 if (!latitude || !longitude) {
        //                     setAddress("-NA-");
        //                     return;
        //                 }

        //                 try {
        //                     const res = await fetchAddressDetails(latitude, longitude);
        //                     setAddress(res.data.address || "No Address found");
        //                 } catch (error) {
        //                     console.error("error", error);
        //                     setAddress("Unable to fetch address");
        //                 }
        //             };
        //             fetchAddress();
        //         }, [latitude, longitude, checkOutLocation]);

        //         if (latitude && longitude) {
        //             const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        //             return (
        //                 <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        //                     <OverlayTrigger placement='top' overlay={<Tooltip id={`tooltip-${address}`}>{address}</Tooltip>}>
        //                         <span>
        //                             {address.length > 30 ? `${address.substring(0, 30)}...` : address}
        //                         </span>
        //                     </OverlayTrigger>
        //                 </a>
        //             );
        //         } else {
        //             return "-NA-";
        //         }
        //     }
        // },

        {
            accessorKey: "duration",
            header: "Duration",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row, renderedCellValue }: any) => (
                <AttendanceDurationCell
                    duration={renderedCellValue as string}
                    checkOut={row.original.checkOut}
                    skipIncompleteHighlight={row.original.isWeekendOrHoliday}
                />
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => {
                if (!renderedCellValue) return null;

                const { PRESENT, ABSENT, CHECK_IN_MISSING, CHECK_OUT_MISSING, LEAVE, WEEKEND, WORKING_WEEKEND, RAISE_REQUEST, ADMIN_RAISE_REQUEST, ON_LEAVE, HOLIDAY, LEAVE_TYPE } = ATTENDANCE_STATUS;
                const { ANNUAL_LEAVE, CASUAL_LEAVE, FLOATER_LEAVE, SICK_LEAVE, UNPAID_LEAVE, MATERNAL_LEAVE } = LEAVE_TYPE;
                // Define color mapping
                const statusColors: Record<string, string> = {
                    [PRESENT]: colorValuesForAttendanceCalendar?.presentColor || "#28a745", // Default Green
                    [ABSENT]: colorValuesForAttendanceCalendar?.absentColor || "#dc3545", // Default Red
                    [CHECK_IN_MISSING]: missingColor?.missingCheckoutColor || "#ffc107", // Default Yellow
                    [CHECK_OUT_MISSING]: missingColor?.missingCheckoutColor || "#ffc107", // Default Yellow
                    [WEEKEND]: colorValuesForAttendanceCalendar?.weekendColor || "", // Default Gray
                    [WORKING_WEEKEND]: colorValuesForAttendanceCalendar?.workingWeekendColor || "#6610f2", // Default Purple
                    [RAISE_REQUEST]: colorValuesForAttendanceCalendar?.markedPresentViaRequestRaisedColor || '#6610f2',
                    [ADMIN_RAISE_REQUEST]: colorValuesForAttendanceCalendar?.adminRaisedRequestColor || '#F97316', // Default Orange — admin raised on employee's behalf
                    [HOLIDAY]: colorValues?.holidayColor || "#17a2b8", // Default Cyan
                    [ANNUAL_LEAVE]: leaveTypesColor?.annualLeaveColor || "#2ECC71",
                    [CASUAL_LEAVE]: leaveTypesColor?.casualLeaveColor || "#3498DB",
                    [FLOATER_LEAVE]: leaveTypesColor?.floaterLeaveColor || "#F39C12",
                    [SICK_LEAVE]: leaveTypesColor?.sickLeaveColor || "#E74C3C",
                    [UNPAID_LEAVE]: leaveTypesColor?.unpaidLeaveColor || "#95A5A6",
                    [MATERNAL_LEAVE]: leaveTypesColor?.maternalLeaveColor || "#9B59B6",
                    [LEAVE]: colorValuesForAttendanceCalendar?.onLeaveColor || "#17a2b8", // Default Cyan
                };

                const color = statusColors[renderedCellValue] || "#6c757d";
                return <AttendanceStatusBadge status={renderedCellValue} color={color} />;
            }
        },

        // {
        //     accessorKey: "location",
        //     header: "Location",
        //     size: 120,
        //     minSize: 100,
        //     maxSize: 150,
        //     Cell: ({ row }: any) => {
        //         const currentId = row.original.id;
        //         const workingMethod = row.original.workingMethod;
        //         if (workingMethod !== WORKING_METHOD_TYPE.ON_SITE) return "-";

        //         const locationEntry = Array.isArray(location) && location.find(item => item.id === currentId);
        //         const checkInLocation = locationEntry?.checkInLocation;

        //         const latitude = locationEntry?.latitude;
        //         const longitude = locationEntry?.longitude;

        //         const [address, setAddress] = useState("Fetching location...");

        //         useEffect(() => {
        //             const fetchAddress = async () => {
        //                 if (!latitude || !longitude) return;

        //                 if(checkInLocation.length >= 0){
        //                     setAddress(checkInLocation);
        //                     return;
        //                 }

        //                 try {
        //                     const res = await fetchAddressDetails(latitude, longitude);
        //                     setAddress(res.data.address || "No Address found");
        //                 } catch (error) {
        //                     console.log("error", error);
        //                     setAddress("Unable to fetch address");
        //                 }
        //             };
        //             fetchAddress();
        //         }, [latitude, longitude, checkInLocation]);

        //         if (latitude && longitude) {
        //             const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        //             return (
        //                 <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        //                     <OverlayTrigger placement='top' overlay={<Tooltip id={`tooltip-${address}`}>{address}</Tooltip>}>
        //                         <span>
        //                             {address.length > 30 ? `${address.substring(0, 30)}...` : address}
        //                         </span>
        //                     </OverlayTrigger>
        //                 </a>
        //             );
        //         } else {
        //             return "-NA-";
        //         }
        //     }
        // },        

        ...(!fromAdmin ? [{
            accessorKey: "actions",
            header: "Actions",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: any) => {
                const res = hasPermission(resourceNameMapWithCamelCase.attendanceRequest, permissionConstToUseWithHasPermission.create);
                const hasAttendanceResquest = row?.original?.attendanceRequests?.id;
                const isPastDate = dayjs(row?.original?.date).isBefore(dayjs(), 'day');
                // if(hasAttendanceResquest) return 'Request Already Raised'
                return !(row?.original?.id == "-") && res && !isPastDate ?
                    < button className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm' onClick={() => raiseRequest(row?.original)} >
                        <KTIcon iconName='pencil' className='fs-3' />
                    </button > : 'Not Allowed'
            },
        }] : []),
    ], [location, lateCheckInThreshold, earlyCheckOutThreshold, allEmployeeThresholds, leaveConfiguration, backendLateDates, backendDatesReady]);


    // Detect if device is iOS mobile        
    useEffect(() => {
        const parser = new UAParser();
        const result = parser.getResult();
        setIsIOSMobile(
            result.device.type === 'mobile' &&
            result.os.name === 'iOS'
        );
    }, []);

    return (
        <>
            <MaterialTable
                columns={columns}
                data={paginatedData}
                employeeId={stableEmployeeId}
                tableName="Report"
                resource={resource}
                viewOwn={viewOwn}
                viewOthers={viewOthers}
                checkOwnWithOthers={checkOwnWithOthers}
                manualPagination={manualPagination}
                rowCount={rowCount || isWeekendOrHoliday.length}
                onPaginationChange={onPaginationChange}
                paginationState={paginationState}
                isLoading={isLoading}
                muiTableProps={{
                    muiTableBodyRowProps: ({ row }) => {
                        const status = row.original?.status ?? "";
                        const { ANNUAL_LEAVE, CASUAL_LEAVE, FLOATER_LEAVE, MATERNAL_LEAVE, SICK_LEAVE, UNPAID_LEAVE } = ATTENDANCE_STATUS.LEAVE_TYPE;
                        const statusColors: Record<string, string> = {
                            [ATTENDANCE_STATUS.PRESENT]: colorValuesForAttendanceCalendar?.presentColor || "#28a745",
                            [ATTENDANCE_STATUS.ABSENT]: colorValuesForAttendanceCalendar?.absentColor || "#dc3545",
                            [ATTENDANCE_STATUS.WEEKEND]: colorValuesForAttendanceCalendar?.weekendColor || "#6c757d",
                            [ATTENDANCE_STATUS.WORKING_WEEKEND]: colorValuesForAttendanceCalendar?.workingWeekendColor || "#6610f2",
                            [ATTENDANCE_STATUS.CHECK_OUT_MISSING]: missingColor?.missingCheckoutColor || '#ffff',
                            [ATTENDANCE_STATUS.RAISE_REQUEST]: colorValuesForAttendanceCalendar?.markedPresentViaRequestRaisedColor || '#6610f2',
                            [ATTENDANCE_STATUS.ADMIN_RAISE_REQUEST]: colorValuesForAttendanceCalendar?.adminRaisedRequestColor || '#F97316',
                            [ATTENDANCE_STATUS.LEAVE]: colorValuesForAttendanceCalendar?.onLeaveColor || '#6610f2',
                            [ATTENDANCE_STATUS.CHECK_IN_MISSING]: missingColor?.missingCheckoutColor || '#6610f2',
                            // Singular keys (ATTENDANCE_STATUS.LEAVE_TYPE constants)
                            [ANNUAL_LEAVE]: leaveTypesColor?.annualLeaveColor || "#2ECC71",
                            [CASUAL_LEAVE]: leaveTypesColor?.casualLeaveColor || "#3498DB",
                            [FLOATER_LEAVE]: leaveTypesColor?.floaterLeaveColor || "#F39C12",
                            [SICK_LEAVE]: leaveTypesColor?.sickLeaveColor || "#E74C3C",
                            [UNPAID_LEAVE]: leaveTypesColor?.unpaidLeaveColor || "#95A5A6",
                            [MATERNAL_LEAVE]: leaveTypesColor?.maternalLeaveColor || "#9B59B6",
                            // Plural keys — DB stores "Annual Leaves", "Sick Leaves" etc. (with trailing 's').
                            // Both singular and plural must be present so row background works regardless of source.
                            'Annual Leaves': leaveTypesColor?.annualLeaveColor || "#2ECC71",
                            'Casual Leaves': leaveTypesColor?.casualLeaveColor || "#3498DB",
                            'Floater Leaves': leaveTypesColor?.floaterLeaveColor || "#F39C12",
                            'Sick Leaves': leaveTypesColor?.sickLeaveColor || "#E74C3C",
                            'Unpaid Leaves': leaveTypesColor?.unpaidLeaveColor || "#95A5A6",
                            'Maternal Leaves': leaveTypesColor?.maternalLeaveColor || "#9B59B6",
                            [ATTENDANCE_STATUS.HOLIDAY]: colorValues?.holidayColor || "#28a745",
                            [ATTENDANCE_STATUS.ON_LEAVE]: colorValuesForAttendanceCalendar?.onLeaveColor || "#dc3545",
                        };

                        // Tint all rows uniformly — 15% opacity of the status colour.
                        // Previously CHECK_OUT_MISSING was forced to white, which broke
                        // the visual rhythm. Now every status gets the same tint treatment.
                        const bgColor = statusColors[status] || null;
                        const backgroundColor = bgColor ? `${bgColor}22` : 'transparent';
                        const borderColor = statusColors[status] ?? 'transparent';

                        return {
                            sx: {
                                backgroundColor,
                                borderLeft: `4px solid ${borderColor}`,
                                '&:hover td': { backgroundColor: bgColor ? `${bgColor}3a !important` : '#F8FAFC' },
                                transition: 'background-color 0.15s ease-in-out',
                                '& .MuiTableCell-root': {
                                    padding: '11px 16px',
                                    verticalAlign: 'middle',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    // Ensure text is readable on any tinted background
                                    color: '#1e293b',
                                },
                                // "—" dashes that use the muted helper class
                                '& .attendance-duration-cell__muted': {
                                    color: '#64748b',
                                    fontWeight: 500,
                                },
                            }
                        };
                    }
                }}
            />

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {showRequestTypeSelection ?
                            `Select Request Type for ${date}` :
                            `Raise ${requestType === 'checkin' ? 'Check-In' : 'Check-Out'} Request for ${date} (24 hr HH:MM)`
                        }
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {showRequestTypeSelection ? (<div className='d-flex flex-column align-items-center'>
                        <h5 className='mb-4'>What type of request would you like to raise?</h5>
                        <div className='d-flex gap-3'>
                            <button
                                type='button'
                                className='btn btn-outline-primary px-4 py-2'
                                style={{ border: "1px solid rgb(175, 16, 16)" }}
                                onClick={() => handleRequestTypeSelection('checkin')}
                            >
                                {/* <i className='bi bi-box-arrow-in-right me-2'></i> */}
                                Check-In Request
                            </button>
                            <button
                                type='button'
                                className={`btn px-4 py-2 ${hasCheckInData ? 'btn-outline-primary' : 'btn-outline-primary disabled'}`}
                                style={hasCheckInData ? { border: "1px solid rgb(175, 16, 16)" } : { border: "1px solid rgb(175, 16, 16)", backgroundColor: "rgb(246, 217, 217)" }}
                                onClick={() => hasCheckInData && handleRequestTypeSelection('checkout')}
                                disabled={!hasCheckInData}
                            >
                                {/* <i className='bi bi-box-arrow-right me-2'></i> */}
                                Check-Out Request
                            </button>
                        </div>
                        {!hasCheckInData && (
                            <div className='mt-3 text-center'>
                                <small className='text-muted'>
                                    <i className='bi bi-info-circle me-1'></i>
                                    Since check-in is not present, please create a check-in request first
                                </small>
                            </div>
                        )}
                    </div>) : (
                        <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={faqSchema}>
                            {(formikProps) => {
                                return (
                                    <Form className='d-flex flex-column' noValidate id='employee_onboarding_form'>

                                        {requestType === 'checkin' && <div className="col-lg">
                                            {isIOSMobile ? (
                                                <BootstrapForm.Group controlId="CheckIn" className="mb-3">
                                                    <BootstrapForm.Label>Check In *</BootstrapForm.Label>
                                                    <BootstrapForm.Control
                                                        type="time"
                                                        value={formikProps.values.checkIn}
                                                        onChange={(e) => {
                                                            formikProps.setFieldValue("checkIn", e.target.value);
                                                        }}
                                                        onBlur={() => formikProps.setFieldTouched("checkIn", true)}
                                                        isInvalid={Boolean(formikProps.errors.checkIn && formikProps.touched.checkIn)}
                                                        className="form-control"
                                                        required
                                                    />
                                                    <BootstrapForm.Control.Feedback type="invalid">
                                                        {formikProps.errors.checkIn}
                                                    </BootstrapForm.Control.Feedback>
                                                </BootstrapForm.Group>
                                            ) : (
                                                <TimePickerInput
                                                    isRequired={true}
                                                    label="Check In"
                                                    formikField="checkIn"
                                                    placeholder="HH MM"
                                                />
                                            )}
                                        </div>}

                                        {requestType === 'checkout' && <div className="col-lg">
                                            {isIOSMobile ? (
                                                <BootstrapForm.Group controlId="CheckOut" className="mb-3">
                                                    <BootstrapForm.Label>Check Out</BootstrapForm.Label>
                                                    <BootstrapForm.Control
                                                        type="time"
                                                        value={formikProps.values.checkOut}
                                                        onChange={(e) => {
                                                            formikProps.setFieldValue("checkOut", e.target.value);
                                                        }}
                                                        onBlur={() => formikProps.setFieldTouched("checkOut", true)}
                                                        isInvalid={Boolean(formikProps.errors.checkOut && formikProps.touched.checkOut)}
                                                        className="form-control"
                                                    />
                                                    <BootstrapForm.Control.Feedback type="invalid">
                                                        {formikProps.errors.checkOut}
                                                    </BootstrapForm.Control.Feedback>
                                                </BootstrapForm.Group>
                                            ) : (
                                                <TimePickerInput
                                                    isRequired={false}
                                                    label="Check Out"
                                                    formikField="checkOut"
                                                    placeholder="HH MM" />
                                            )}
                                        </div>}


                                        <div className="col-lg mt-3">
                                            <TextInput
                                                isRequired={true}
                                                label="Remarks"
                                                formikField="remarks" />
                                        </div>

                                        <div className="col-lg mt-3">
                                            <DropDownInput
                                                isRequired={true}
                                                formikField="workingMethodId"
                                                inputLabel="Working Method"
                                                options={workingMethodOptions} />
                                        </div>
                                        {disableRaiseRequest && <div className="alert mt-8" role="alert" style={{ backgroundColor: "#FCEDDF", color: '#DD700C', borderColor: '#DD700C' }}>
                                            {REQUEST_RAISE_DISABLE_MESSAGE}
                                        </div>}
                                        {!canSubmitRequest && validationBlockingDate && (
                                            <div className="alert mt-3" role="alert" style={{ backgroundColor: "#FCEDDF", color: '#DD700C', borderColor: '#DD700C' }}>
                                                No attendance or request found for {dayjs(validationBlockingDate).format("DD-MM-YYYY")}. Please mark attendance or raise a request for that day before proceeding.
                                            </div>
                                        )}
                                        <div className='d-flex flex-wrap justify-content-between mt-3'>
                                            <button
                                                type='button'
                                                className='btn btn-primary text-white my-2'
                                                style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }}
                                                onClick={() => {
                                                    setShowRequestTypeSelection(true);
                                                    setRequestType(null);
                                                }}
                                            >
                                                <i className='bi bi-arrow-left me-2 text-white'></i>
                                                Back
                                            </button>
                                            <button type='submit' className='btn btn-primary my-2' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={loading || !formikProps.isValid || disableRaiseRequest || !canSubmitRequest || isValidating}>
                                                {isValidating ? 'Validating...' : (!loading ? 'Save Changes' : '')}
                                                {loading && (
                                                    <span className='indicator-progress' style={{ display: 'block' }}>
                                                        Please wait...{' '}
                                                        <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    </Form>
                                )
                            }}
                        </Formik>)}

                </Modal.Body>
            </Modal >
        </>
    );
}

export const ReportsTable = ({
    attendanceRequests,
    fromAdmin = false,
    resource = "",
    viewOwn = false,
    viewOthers = false,
    checkOwnWithOthers = false,
    manualPagination = false,
    rowCount,
    onPaginationChange,
    paginationState,
    isLoading = false
}: {
    attendanceRequests: IAttendanceRequests[],
    fromAdmin?: boolean,
    resource?: string,
    viewOwn?: boolean,
    viewOthers?: boolean,
    checkOwnWithOthers?: boolean,
    manualPagination?: boolean,
    rowCount?: number,
    onPaginationChange?: (pagination: any) => void,
    paginationState?: { pageIndex: number; pageSize: number },
    isLoading?: boolean
}) => {

    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(false);
    const [lateCheckInThreshold, setLateCheckInThreshold] = useState('');
    const [earlyCheckOutThreshold, setEarlyCheckOutThreshold] = useState('');
    const [employeeThresholds, setEmployeeThresholds] = useState<any>([]);
    const [disableRaiseRequest, setDisableRaiseRequest] = useState(false);
    const [trackingRequestId, setTrackingRequestId] = useState<string | null>(null);
    const [trackInstanceId, setTrackInstanceId] = useState<string | null>(null);
    const [trackInstanceLoading, setTrackInstanceLoading] = useState(false);
    const [latitudeNew, setLatitudeNew] = useState<any>()
    const [longitudeNew, setLongitudeNew] = useState<any>()
    const toggleChange = store.getState().attendanceStats.toggleChange;
    const [leaveConfiguration, setLeaveConfiguration] = useState<any>()
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const { longitude, latitude } = useSelector((state: RootState) => state.attendance.position);
    // Weekend/holiday status must use the VIEWED employee's branch config (selected when admin,
    // else self) — NOT the logged-in admin's. Otherwise an employee on a Mon-working branch shows
    // Mondays as "Working on weekend" because the admin's branch has Monday off.
    const curWeekends = useSelector((state: RootState) => state?.employee?.currentEmployee?.branches?.workingAndOffDays);
    const selWeekends = useSelector((state: RootState) => state?.employee?.selectedEmployee?.branches?.workingAndOffDays);
    const allWeekends = fromAdmin ? (selWeekends || curWeekends) : curWeekends;
    const allHolidays = useSelector((state: RootState) => state?.attendanceStats?.publicHolidays);

    const [workingMethodOptions, setWorkingMethodOptions] = useState([]);
    const [currentRowData, setCurrentRowData] = useState<any>(null);
    const companyId = useSelector((state: RootState) => state.employee.currentEmployee.companyId);
    const showDateIn12HourFormat = useSelector((state: RootState) => state.employee.currentEmployee.branches.showDateIn12HourFormat);
    const attendanceRequestWithIsHolidayorWeekend = markWeekendOrHoliday(attendanceRequests, allWeekends, allHolidays);
    const allEmployees = useSelector((state: RootState) => state.allEmployees?.list);

    useEffect(() => {
        async function getWorkingMethods() {
            const { data: { workingMethods } } = await fetchWorkingMethods();
            const workingMethodOptions = workingMethods.map((workingMethod: any) => ({ value: workingMethod.id, label: workingMethod.type }));
            setWorkingMethodOptions(workingMethodOptions);
        }
        getWorkingMethods();
        async function fetchLeaveConfig() {
            const { data: configuration } = await fetchConfiguration(LEAVE_MANAGEMENT);
            const jsonObject = safeJsonParse(configuration.configuration.configuration);
            setLeaveConfiguration(jsonObject);
        }
        fetchLeaveConfig();
    }, []);
    const worktypeColorValues = useSelector((state: RootState) => state?.customColors?.workingLocation);
    const deleteRequest = async (values: any) => {

        try {
            const confirm = await deleteConfirmation('Attendance Request deleted successfully');
            if (!confirm) return;
            await deleteAttendanceRequestById(values.id);
            // successConfirmation('Attendance Request deleted successfully');
            dispatch(saveToggleChange(!toggleChange));
            return;
        } catch (e) {
            errorConfirmation('Error Occured');
            dispatch(saveToggleChange(!toggleChange));
        }
    }

    const openTracker = async (requestId: string) => {
        setTrackingRequestId(requestId);
        setTrackInstanceId(null);
        setTrackInstanceLoading(true);
        try {
            const res = await fetchApprovalInstanceByRequest('AttendanceRequests', requestId);
            const instance = res?.data ?? res;
            setTrackInstanceId(instance?.id ?? null);
        } catch {
            setTrackInstanceId(null);
        } finally {
            setTrackInstanceLoading(false);
        }
    };

    const [date, setDate] = useState('');
    const employeeDeatils = fromAdmin ? useSelector((state: RootState) => state.employee.selectedEmployee) : useSelector((state: RootState) => state.employee.currentEmployee);

    const reportsToId = employeeDeatils.reportsToId;
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {

                    setLatitudeNew(position.coords.latitude);
                    setLongitudeNew(position.coords.longitude);
                },
                (error) => {
                    // Handle errors (e.g., user denied permission)
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0
                }
            );
        }
    }, [])

    useEffect(() => {
        dispatch(fetchRolesAndPermissions() as any);
    }, [toggleChange]);


    // fetch grace based thresholds — scoped to the VIEWED employee (selected when admin, else self)
    useEffect(() => {
        const thresholdScope = {
            companyId: employeeDeatils?.companyId,
            branchId: employeeDeatils?.branchId,
        };
        const initThresholds = async () => {
            const thresholds = await getGraceBasedThresholds(attendanceRequests, thresholdScope);

            if (thresholds) {
                setEmployeeThresholds(thresholds.employeesWithThresholds);
                setLateCheckInThreshold(thresholds.defaultThresholds.lateCheckInThreshold);
                setEarlyCheckOutThreshold(thresholds.defaultThresholds.earlyCheckOutThreshold);
            }
        };

        initThresholds();
    }, [employeeDeatils?.companyId, employeeDeatils?.branchId]);


    const columns = [
        {
            accessorKey: "date",
            header: "Date",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "day",
            header: "Day",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "remarks",
            header: "Remarks ",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "status",
            header: "Status ",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => {
                let statusText = '';
                let backgroundColor = '';

                switch (renderedCellValue) {
                    case LeaveStatus.ApprovalPending:
                        statusText = LEAVE_STATUS[0];
                        backgroundColor = '#FFA500';
                        break;
                    case LeaveStatus.Approved:
                        statusText = LEAVE_STATUS[1];
                        backgroundColor = '#28a745';
                        break;
                    case LeaveStatus.Rejected:
                        statusText = LEAVE_STATUS[2];
                        backgroundColor = '#dc3545';
                        break;
                    case LeaveStatus.PendingHR:
                        statusText = '⏳ Pending HR';
                        backgroundColor = '#F39C12';
                        break;
                    default:
                        return renderedCellValue;
                }

                return (
                    <span
                        className="badge"
                        style={{
                            backgroundColor: backgroundColor,
                            color: 'white',
                            fontWeight: '500',
                            fontSize: '11px',
                            padding: '5px 8px',
                            borderRadius: '12px',
                            display: 'inline-block',
                            minWidth: '60px',
                            textAlign: 'center'
                        }}
                    >
                        {statusText}
                    </span>
                );
            }
        },
        {
            accessorKey: "checkIn",
            header: "Check-In",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: { row: any }) => {
                const employee = row.original;
                const checkIn = employee.checkIn;
                const displayTime =
                    checkIn && checkIn !== '-NA-' ? convertTo12HourFormat(checkIn) : checkIn || '—';

                const employeeData = employeeThresholds?.find(
                    (emp: any) => emp.id === employee.id
                );
                const checkInColor = resolveCheckInColor({
                    checkIn,
                    workingMethod: employee.workingMethod,
                    date: employee.date,
                    lateCheckInThreshold:
                        employeeData?.lateCheckInThreshold ?? lateCheckInThreshold,
                    leaveConfig: leaveConfiguration,
                    skipColoring: !shouldApplyCheckInColoring(
                        employee.status,
                        employee.isWeekendOrHoliday
                    ),
                });

                return (
                    <span
                        style={{ color: checkInColor.color }}
                        title={checkInColor.tooltip}
                    >
                        {displayTime}
                    </span>
                );
            }
        },
        {
            accessorKey: "checkOut",
            header: "Check-Out",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: { row: any }) => {
                const checkOut = row.original.checkOut;
                const displayTime =
                    checkOut && checkOut !== '-NA-'
                        ? convertTo12HourFormat(checkOut)
                        : checkOut || '—';
                const checkOutColor = resolveCheckOutColor(checkOut);
                return (
                    <span style={{ color: checkOutColor.color }}>
                        {displayTime}
                    </span>
                );
            }
        },
        {
            accessorKey: "workingMethod",
            header: "Work",
            size: 120,
            minSize: 100,
            maxSize: 150,
            meta: { defaultVisible: true },
            Cell: ({ row }: any) => {
                const renderedCellValue = row.original.workingMethod;
                const { OFFICE, ON_SITE, REMOTE } = WORKING_METHOD_TYPE;

                const colorMap: Record<string, string> = {
                    [OFFICE]: worktypeColorValues?.officeColor || "#3498db",
                    [ON_SITE]: worktypeColorValues?.onSiteColor || "#e74c3c",
                    [REMOTE]: worktypeColorValues?.remoteColor || "#2ecc71",
                };

                const getIdentifier = (text: string, color: string) => (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                            style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: colorMap[renderedCellValue] || "#000"
                            }}
                        ></span>
                        {renderedCellValue}
                    </div>
                );

                switch (renderedCellValue) {
                    case OFFICE:
                        return getIdentifier('OFFICE', 'working-method-office');
                    case ON_SITE:
                        return getIdentifier('ON-SITE', 'working-method-on-site')
                    case REMOTE:
                        return getIdentifier('REMOTE', 'working-method-remote');
                    default:
                        return renderedCellValue;
                }
            }
        },
        {
            accessorKey: "approvedById",
            header: "Approved / Rejected By",
            size: 180,
            minSize: 150,
            maxSize: 220,
            Cell: ({ row }: any) => {
                const { status, approvedById, rejectedById } = row.original;
                const isApproved = status === LeaveStatus.Approved;
                const isRejected = status === LeaveStatus.Rejected;
                const actorId = isApproved ? approvedById : isRejected ? rejectedById : null;
                const name = actorId ? allEmployees?.find((emp: any) => emp.employeeId === actorId)?.employeeName : null;
                const date = row.original.approvedOrRejectedDate
                    ? dayjs(row.original.approvedOrRejectedDate).format('DD MMM YYYY hh:mm A')
                    : null;

                if (!name) return <span className='text-muted fs-7'>-NA-</span>;

                return (
                    <div className='d-flex align-items-center gap-2'>
                        <div className='symbol symbol-30px'>
                            <span className={`symbol-label fw-bold fs-7 ${isApproved ? 'bg-light-success text-success' : 'bg-light-danger text-danger'}`}>
                                {name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className='d-flex flex-column'>
                            <span className='text-dark fw-semibold fs-7'>{name}</span>
                            {date && <span className='text-muted fs-8'>{date}</span>}
                        </div>
                    </div>
                );
            },
        },
        ...(!fromAdmin ? [{
            accessorKey: "actions",
            header: "Actions",
            size: 120,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: any) => {
                const deleteRes = hasPermission(resourceNameMapWithCamelCase.attendanceRequest, permissionConstToUseWithHasPermission.deleteOwn, row?.original);
                const isApproved = row.original.status === Status.Approved || row.original.statusNumber === Status.Approved;
                const isPending = row.original.status === LeaveStatus.ApprovalPending;
                const editRes = hasPermission(resourceNameMapWithCamelCase.attendanceRequest, permissionConstToUseWithHasPermission.editOwn, row?.original);
                return (
                    <>
                        {editRes && !isApproved && <button
                            className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                            onClick={() => raiseRequest(row?.original)}
                        >
                            <KTIcon iconName='pencil' className='fs-3' />
                        </button>}
                        {deleteRes && !isApproved && <button
                            className='ms-2 btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                            onClick={() => deleteRequest(row?.original)}
                        >
                            <KTIcon iconName='trash' className='fs-3' />
                        </button>}
                        {isPending && row.original.hasApprovalInstance && (
                            <button
                                className='ms-2 btn btn-icon btn-bg-light btn-active-color-info btn-sm'
                                title='Track Approval'
                                onClick={() => openTracker(row.original.id)}
                            >
                                <KTIcon iconName='map' className='fs-3' />
                            </button>
                        )}
                        {((!editRes && !deleteRes) || isApproved) && !isPending && "Not Allowed"}
                    </>
                );
            },
        }] : []),
    ];

    const handleClose = () => {
        setShow(false);
        setCurrentRowData(null);
    }

    const raiseRequest = async (attendance: any) => {
        setShow(true);
        setDate(attendance.date);
        setCurrentRowData(attendance);
        if (attendance?.attendanceRequests) {
            initialState = {
                employeeId: attendance?.attendanceRequests.employeeId,
                checkIn: attendance?.attendanceRequests?.checkIn,
                checkOut: attendance?.attendanceRequests?.checkOut,
                workingMethodId: attendance?.attendanceRequests.workingMethodId,
                remarks: attendance?.attendanceRequests.remarks,
            };
        } else if (attendance?.id) {
            initialState = {
                employeeId: employeeId,
                checkIn: attendance?.checkIn,
                checkOut: attendance?.checkOut,
                workingMethodId: attendance?.workingMethodId,
                remarks: attendance?.remarks
            };
        } else {
            initialState = {
                employeeId: employeeId,
                checkIn: '',
                checkOut: '',
                workingMethodId: '',
                remarks: ''
            };
        }
    }


    const handleSubmit = async (values: any, actions: FormikValues) => {
        const currentId = currentRowData?.id;
        const locationEntry = Array.isArray(location) && location.find(item => item.id === currentId);
        const latitude = locationEntry?.latitude;
        const longitude = locationEntry?.longitude;

        const updatedValues = {
            ...values,
            latitude: latitude || latitudeNew,
            longitude: longitude || longitudeNew,
            // status: 0,
            // companyId
        }

        const formattedDate = dayjs(date, "DD MMM YYYY").format("YYYY-MM-DD");

        if (values.checkIn !== "") {
            if (!isValidTime(values.checkIn)) {
                errorConfirmation('Enter Check In in HH:MM(24 hr format)');
                return;
            }
            const checkInDateTime = dayjs(`${formattedDate} ${updatedValues.checkIn}`, "YYYY-MM-DD HH:mm").toString();
            const checkInDateObject = new Date(checkInDateTime);
            const checkInUTC = checkInDateObject.toISOString();
            updatedValues.checkIn = checkInUTC;
        }

        if (values.checkOut !== '-NA-') {
            if (!isValidTime(values.checkOut)) {
                errorConfirmation('Enter Check Out in HH:MM(24 hr format)');
                return;
            }
            const checkOutDateTime = dayjs(`${formattedDate} ${updatedValues.checkOut}`, "YYYY-MM-DD HH:mm").toString();
            const checkOutDateObject = new Date(checkOutDateTime);
            const checkOutUTC = checkOutDateObject.toISOString();
            updatedValues.checkOut = checkOutUTC;
        } else {
            delete updatedValues.checkOut;
        }

        // Chronological validation: Check-Out must be after Check-In when both exist
        if (updatedValues.checkIn && updatedValues.checkOut) {
            const checkInMoment = dayjs(updatedValues.checkIn);
            const checkOutMoment = dayjs(updatedValues.checkOut);
            if (!checkOutMoment.isAfter(checkInMoment)) {
                errorConfirmation('Check Out time must be after Check In time');
                return;
            }
        }

        try {
            setLoading(true);

            await createUpdateAttendanceRequest(updatedValues);
            setLoading(false);
            successConfirmation('Attendance Request created successfully');
            setShow(false);
            setCurrentRowData(null);
            dispatch(saveToggleChange(!toggleChange));
            return;
        } catch (err) {
            setLoading(false);
            errorConfirmation('Attendance Request failed. Try again later.');
            dispatch(saveToggleChange(!toggleChange));
        }
    }

    return (
        <>
            <MaterialTable
                resource={resource}
                viewOwn={viewOwn}
                viewOthers={viewOthers}
                columns={columns}
                data={attendanceRequestWithIsHolidayorWeekend}
                tableName="Request"
                employeeId={employeeId}
                checkOwnWithOthers={checkOwnWithOthers}
                manualPagination={manualPagination}
                rowCount={rowCount}
                onPaginationChange={onPaginationChange}
                paginationState={paginationState}
                isLoading={isLoading}
            />

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Raise Request for {date} (24 hr HH:MM)</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={faqSchema}>
                        {(formikProps) => {
                            return (
                                <Form className='d-flex flex-column' noValidate id='employee_onboarding_form'>
                                    <div className="col-lg">
                                        <TimePickerInput
                                            isRequired={true}
                                            label="Check In"
                                            margin="mb-7"
                                            formikField="checkIn"
                                            placeholder="HH MM" />
                                    </div>

                                    <div className="col-lg">
                                        <TimePickerInput
                                            isRequired={false}
                                            label="Check Out"
                                            margin="mb-7"
                                            formikField="checkOut"
                                            placeholder="HH MM" />
                                    </div>

                                    <div className="col-lg">
                                        <TextInput
                                            isRequired={true}
                                            label="Remarks"
                                            margin="mb-7"
                                            formikField="remarks" />
                                    </div>

                                    <div className="col-lg">
                                        <DropDownInput
                                            isRequired={true}
                                            formikField="workingMethodId"
                                            inputLabel="Working Method"
                                            options={workingMethodOptions} />
                                    </div>
                                    {disableRaiseRequest && <div className="alert mt-8" role="alert" style={{ backgroundColor: "#FCEDDF", color: '#DD700C', borderColor: '#DD700C' }}>
                                        {REQUEST_RAISE_DISABLE_MESSAGE}
                                    </div>}
                                    <div className='d-flex justify-content-center mt-8'>
                                        <button type='submit' className='btn btn-primary' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={loading || !formikProps.isValid}>
                                            {!loading && 'Save Changes'}
                                            {loading && (
                                                <span className='indicator-progress' style={{ display: 'block' }}>
                                                    Please wait...{' '}
                                                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </Form>
                            )
                        }}
                    </Formik>
                </Modal.Body>
            </Modal >
            <Modal
                show={!!trackingRequestId}
                onHide={() => { setTrackingRequestId(null); setTrackInstanceId(null); }}
                centered
                size='lg'
            >
                <Modal.Header closeButton>
                    <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>Approval Status</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '20px 24px' }}>
                    {trackInstanceLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <span className='spinner-border spinner-border-sm text-primary me-2' />
                            <span style={{ fontSize: 13, color: '#a1a5b7' }}>Loading approval status...</span>
                        </div>
                    ) : trackInstanceId ? (
                        <ApprovalStatusTracker instanceId={trackInstanceId} showAuditLog />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <KTIcon iconName='information' className='fs-3x text-muted mb-3' />
                            <div style={{ fontSize: 13, color: '#a1a5b7' }}>No approval workflow found for this request.</div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
}