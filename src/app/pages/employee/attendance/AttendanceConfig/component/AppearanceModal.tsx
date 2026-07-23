/**
 * AppearanceModal
 * Glass-dialog wrapper around the existing Appearance color-config component.
 * Replaces the plain Bootstrap <Modal> in AttendanceConfig.
 */
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader } from '@app/modules/common/components/ui/tw';
import Appearance from './Appearance';

interface AppearanceModalProps {
  open: boolean;
  onClose: () => void;
}

export function AppearanceModal({ open, onClose }: AppearanceModalProps) {
  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <GlassHeader
        title="Appearance Settings"
        subtitle="Customize status colors for attendance, leave types, charts, and working patterns"
        icon={<KTIcon iconName="colors-square" className="fs-1 text-white" />}
        onClose={onClose}
      />

      <div className="overflow-y-auto flex-1">
        <Appearance showAppearanceModal={(v) => { if (!v) onClose(); }} />
      </div>
    </GlassDialog>
  );
}

export default AppearanceModal;
