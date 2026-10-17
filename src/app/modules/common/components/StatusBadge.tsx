/**
 * Legacy hex filled pill — **thin alias of kit `ToneChip solid`**.
 *
 * Prefer importing `ToneChip` / kit `StatusBadge` (trio+pulse) from
 * `@app/modules/common/components/ui` in new code.
 *
 * Kept so existing `label` + `color` call sites (e.g. TasksMainTable) do not
 * invent a second badge primitive. Do not expand this API.
 */
import { ToneChip } from '@app/modules/common/components/ui';

interface StatusBadgeProps {
  /** The text label to display inside the badge */
  label: string;
  /** Hex color for the badge background (e.g., "#28a745") */
  color: string;
  /** Optional className for additional styling */
  className?: string;
}

const StatusBadge = ({ label, color, className = '' }: StatusBadgeProps) => (
  <ToneChip dense solid color={color} label={label} className={className || undefined} />
);

export default StatusBadge;
