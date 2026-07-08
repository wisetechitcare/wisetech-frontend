import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';

/**
 * Accessible color legend for the leave calendar (F4). Reads the company's configurable
 * palette from the customColors slice so it always matches what's rendered on the grid.
 */

interface LegendItem {
    label: string;
    color: string;
}

const Swatch = ({ label, color }: LegendItem) => (
    <span className="d-inline-flex align-items-center me-3 mb-1" style={{ fontSize: '11px' }}>
        <span
            aria-hidden="true"
            style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: color,
                marginRight: 5,
                border: '1px solid rgba(0,0,0,0.1)',
            }}
        />
        <span className="text-muted">{label}</span>
    </span>
);

const LeaveColorLegend = () => {
    const leaveTypes = useSelector((state: RootState) => (state as any).customColors?.leaveTypes) || {};
    const calendar = useSelector((state: RootState) => (state as any).customColors?.attendanceCalendar) || {};
    const overview = useSelector((state: RootState) => (state as any).customColors?.attendanceOverview) || {};

    const items: LegendItem[] = [
        { label: 'Casual', color: leaveTypes.casualLeaveColor || '#3498DB' },
        { label: 'Sick', color: leaveTypes.sickLeaveColor || '#E74C3C' },
        { label: 'Annual', color: leaveTypes.annualLeaveColor || '#2ECC71' },
        { label: 'Floater', color: leaveTypes.floaterLeaveColor || '#F39C12' },
        { label: 'Maternal', color: leaveTypes.maternalLeaveColor || '#9B59B6' },
        { label: 'Unpaid', color: leaveTypes.unpaidLeaveColor || '#95A5A6' },
        { label: 'Half-day', color: leaveTypes.halfDayColor || '#1D4ED8' },
        { label: 'Sandwich', color: leaveTypes.sandwichColor || '#92400E' },
        { label: 'Holiday', color: overview.holidayColor || '#9B59B6' },
        { label: 'Weekend', color: calendar.weekendColor || '#9B59B6' },
    ];

    return (
        <div className="d-flex flex-wrap align-items-center pt-2" aria-label="Calendar color legend">
            {items.map((it) => (
                <Swatch key={it.label} label={it.label} color={it.color} />
            ))}
        </div>
    );
};

export default LeaveColorLegend;
