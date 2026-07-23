/**
 * DailyShiftTimeModal
 * Glass-dialog wrapper around the existing DailyShiftTime form component.
 * Replaces the plain Bootstrap <Modal> in AttendanceConfig so the engine
 * matches the premium GlassDialog pattern used across the Leave engines.
 */
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader } from '@app/modules/common/components/ui/tw';
import DailyShiftTime from './DailyShiftTime';

interface DailyShiftTimeModalProps {
  open: boolean;
  onClose: () => void;
  /** Remount key so the form always reinitialises with fresh data on open */
  mountKey: number;
  /** Scope passed down to DailyShiftTime (companyId or branchId) */
  scope?: { companyId?: string; branchId?: string };
  scopeLabel?: string;
  canEdit?: boolean;
}

export function DailyShiftTimeModal({
  open,
  onClose,
  mountKey,
  scope = {},
  scopeLabel,
  canEdit = true,
}: DailyShiftTimeModalProps) {
  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
    >
      <GlassHeader
        title="Daily Shift Time"
        subtitle="Configure daily check-in / check-out windows, lunch break, and grace periods"
        icon={<KTIcon iconName="calendar-add" className="fs-1 text-white" />}
        onClose={onClose}
      />

      {/* Scope context banner */}
      {scopeLabel && (
        <div className="px-3 py-[5px] border-b border-[#E6E9EE] bg-[rgba(30,58,138,0.04)] flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500">Configuring for:</span>
          <span className="px-1.5 py-0.5 rounded-lg border border-[#dbeafe] bg-[#eff6ff] text-[13px] font-bold text-[#2563eb]">
            {scopeLabel}
          </span>
          {!canEdit && (
            <span className="text-xs text-[#e11d48] font-semibold">
              You don't have permission to edit (view only).
            </span>
          )}
        </div>
      )}

      <div className="overflow-y-auto flex-1">
        <DailyShiftTime key={`${mountKey}-${scope.branchId ?? scope.companyId ?? 'org'}`} scope={scope} />
      </div>
    </GlassDialog>
  );
}

export default DailyShiftTimeModal;
