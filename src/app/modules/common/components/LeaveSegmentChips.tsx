import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { resolveLeaveTypeColor } from '@utils/leaveTypeColors';

/**
 * Leave-type colouring hook + the segment-chip visual. The colour LOGIC lives in the shared
 * `resolveLeaveTypeColor` (utils/leaveTypeColors — the canonical Apply-Leave mapping); this hook
 * just binds it to the live customColors slice so every screen resolves colours identically.
 */
export function useLeaveTypeColor() {
    const leaveTypeColors = useSelector((state: RootState) => state.customColors?.leaveTypes);
    return (leaveType: string): string => resolveLeaveTypeColor(leaveType, leaveTypeColors as any);
}

export interface LeaveChipSegment {
    leaveType: string | null;
    days?: number;
}

/** One colour-coded badge per segment; when `segments` is empty falls back to `singleType`. */
export default function LeaveSegmentChips({ segments, singleType }: {
    segments?: LeaveChipSegment[];
    singleType?: string | null;
}) {
    const colorOf = useLeaveTypeColor();
    const items: LeaveChipSegment[] = segments && segments.length > 0
        ? segments
        : singleType ? [{ leaveType: singleType }] : [];
    if (!items.length) return null;
    return (
        <div className="d-flex flex-wrap gap-1">
            {items.map((seg, i) => (
                <span key={`${seg.leaveType}-${i}`} className="badge" style={{
                    backgroundColor: colorOf(seg.leaveType ?? ''), color: 'white', fontWeight: 500,
                    fontSize: 10, padding: '4px 7px', borderRadius: 10, display: 'inline-block',
                }}>
                    {seg.leaveType ?? 'Leave'}{typeof seg.days === 'number' ? ` (${seg.days}d)` : ''}
                </span>
            ))}
        </div>
    );
}
