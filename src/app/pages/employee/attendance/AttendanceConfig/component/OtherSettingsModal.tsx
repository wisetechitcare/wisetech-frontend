/**
 * OtherSettingsModal
 * Glass-dialog wrapper around the existing OtherSettings form component.
 * Replaces the plain Bootstrap <Modal> in AttendanceConfig.
 */
import { KTIcon } from '@metronic/helpers';
import { Box } from '@mui/material';
// Same MUI glass kit as the Sandwich Leave benchmark.
import { GlassDialog, GlassHeader } from '@app/modules/common/components/ui';
import OtherSettings from './OtherSettings';

interface OtherSettingsModalProps {
  open: boolean;
  onClose: () => void;
  mountKey: number;
  /** Inheritance scope (group → org → branch) the settings are read from and written to. */
  scope?: { companyId?: string; branchId?: string };
}

export function OtherSettingsModal({ open, onClose, mountKey, scope }: OtherSettingsModalProps) {
  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <GlassHeader
        title="Attendance Settings"
        subtitle="Control policies, distance limits, on-site rules, and attendance request windows"
        icon={<KTIcon iconName="setting-2" className="fs-1 text-white" />}
        onClose={onClose}
      />

      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        <OtherSettings key={mountKey} scope={scope} />
      </Box>
    </GlassDialog>
  );
}

export default OtherSettingsModal;
