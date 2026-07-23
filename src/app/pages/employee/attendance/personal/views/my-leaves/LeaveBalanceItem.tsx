import { KTIcon } from "@metronic/helpers";
import { getLeaveTypeDisplayName } from "@utils/balanceProgressUtils";

interface LeaveBalanceItemProps {
    label: string;
    used?: number;
    total: number;
    color: string;
}

const LeaveBalanceItem = ({
    label,
    used = 0,
    total = 0,
    color,
}: LeaveBalanceItemProps) => {
    const percentage = total > 0 ? (used / total) * 100 : 0;
    const remaining = total - used;
    const tip = `${label}\nAllocated: ${total} ${total === 1 ? "leave" : "leaves"} per year\nUsed: ${used} | Remaining: ${remaining}`;

    return (
        <div className="flex items-center gap-4">
            <p title={tip} className="w-[140px] m-0 flex items-center gap-1.5 text-[14px] font-semibold text-slate-900 truncate cursor-help">
                {getLeaveTypeDisplayName(label)}
                <KTIcon iconName="information" className="fs-7 text-muted" />
            </p>

            <div className="flex-1 relative h-3 bg-[#e4eaf3] rounded-full overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                />
            </div>

            <p className="w-11 text-right m-0 text-[14px] font-semibold text-slate-900">{used}/{total}</p>
        </div>
    );
};

export default LeaveBalanceItem;
