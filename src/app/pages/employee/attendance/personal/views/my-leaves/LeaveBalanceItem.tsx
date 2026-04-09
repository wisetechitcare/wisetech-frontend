import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { CASUAL_LEAVES } from "@constants/statistics";
import { getLeaveTypeDisplayName } from "@utils/balanceProgressUtils";

interface LeaveBalanceItemProps {
    label: string;
    used?: number;
    total: number;
    color: string;
    discretionaryLeaveBalance?: number;
    allowedPerMonth?: number;
    showAllowedPerMonth?: boolean;
}

const LeaveBalanceItem = ({
    label,
    used = 0,
    total = 0,
    color,
    discretionaryLeaveBalance,
    allowedPerMonth = 1,
    showAllowedPerMonth = false,
}: LeaveBalanceItemProps) => {
    const percentage = total > 0 ? (used / total) * 100 : 0;
    const remaining = total - used;

    // Get tooltip content based on leave type
    const getTooltipContent = () => {
        const baseInfo = `Allocated: ${total} ${total === 1 ? 'leave' : 'leaves'} per year`;
        const usageInfo = `Used: ${used} | Remaining: ${remaining}`;
        const monthlyInfo = showAllowedPerMonth ? `\nMonthly Limit: ${allowedPerMonth} ${allowedPerMonth === 1 ? 'leave' : 'leaves'}` : '';

        return (
            <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
                <div style={{ fontWeight: '600', marginBottom: '6px' }}>{label}</div>
                <div style={{ fontSize: '12px' }}>📊 {baseInfo}</div>
                <div style={{ fontSize: '12px' }}>✓ {usageInfo}</div>
                {monthlyInfo && <div style={{ fontSize: '12px', marginTop: '4px' }}>📅 {monthlyInfo}</div>}
            </div>
        );
    };

    // Always render with tooltip to show allocation information
    const labelElement = (
        <OverlayTrigger
            placement="top"
            overlay={
                <Tooltip id={`leave-info-${label}`}>
                    {getTooltipContent()}
                </Tooltip>
            }
        >
            <p style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                color: '#000',
                fontWeight: '500',
                width: '140px',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'help',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                {getLeaveTypeDisplayName(label)}
                <i className="bi bi-info-circle" style={{ fontSize: '12px', color: '#6b7280' }}></i>
            </p>
        </OverlayTrigger>
    );

    return (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {labelElement}

            <div style={{ flex: 1, position: 'relative', height: '12px', backgroundColor: '#e4eaf3', borderRadius: '43px', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: color,
                    borderRadius: '21px',
                    transition: 'width 0.3s ease'
                }} />
            </div>

            {discretionaryLeaveBalance !== undefined && label?.toLowerCase().includes(CASUAL_LEAVES.toLowerCase()) && discretionaryLeaveBalance > 0 && (
                <OverlayTrigger
                    placement="top"
                    overlay={
                        <Tooltip id="discretionary-balance-tooltip">
                            {`Extra ${discretionaryLeaveBalance} discretionary leaves added to Casual Leaves`}
                        </Tooltip>
                    }
                >
                    <span style={{ cursor: "pointer", fontSize: '14px' }}></span>
                </OverlayTrigger>
            )}

            <p style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '500',
                fontSize: '14px',
                color: '#000',
                width: '44px',
                textAlign: 'right',
                margin: 0
            }}>{used}/{total}</p>
        </div>
    );
};

export default LeaveBalanceItem;
