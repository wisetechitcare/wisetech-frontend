/**
 * DailyShiftTimeModal
 * Glass-dialog wrapper around the existing DailyShiftTime form component.
 * Replaces the plain Bootstrap <Modal> in AttendanceConfig so the engine
 * matches the premium GlassDialog pattern used across the Leave engines.
 */
import { KTIcon } from '@metronic/helpers';
import { Box } from '@mui/material';
// Same MUI glass kit as the Sandwich Leave benchmark.
import { GlassDialog, GlassHeader, T } from '@app/modules/common/components/ui';
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
        <Box sx={{ px: 1.5, py: '5px', borderBottom: `1px solid ${T.color.line}`, bgcolor: 'rgba(30,58,138,0.04)', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
          <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>Configuring for:</Box>
          <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: '8px', border: '1px solid #dbeafe', bgcolor: '#eff6ff', fontSize: 13, fontWeight: 700, color: '#2563eb' }}>
            {scopeLabel}
          </Box>
          {!canEdit && (
            <Box component="span" sx={{ fontSize: 12, color: '#e11d48', fontWeight: 600 }}>
              You don't have permission to edit (view only).
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        <DailyShiftTime key={`${mountKey}-${scope.branchId ?? scope.companyId ?? 'org'}`} scope={scope} />
      </Box>
    </GlassDialog>
  );
}

export default DailyShiftTimeModal;
