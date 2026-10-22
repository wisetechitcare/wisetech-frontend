import { Box } from '@mui/material';
import { GlassDialog, GlassHeader } from '@app/modules/common/components/ui';
import type { ReactNode, Ref } from 'react';
import './Workspace.css';
import '../onboarding/OnboardingModal.css';

export interface FullscreenWizardModalProps {
  show: boolean;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
  bodyRef?: Ref<HTMLDivElement>;
  className?: string;
  showHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
}

export function FullscreenWizardModal({
  show,
  onClose,
  closeLabel,
  children,
  bodyRef,
  className,
  showHeader = true,
  headerTitle = 'Employee onboarding',
  headerSubtitle,
}: FullscreenWizardModalProps) {
  return (
    <GlassDialog
      open={show}
      onClose={onClose}
      fullScreen
      fullWidth
      maxWidth={false}
      preset="workspace"
      plain
      disableEnforceFocus
      className={['responsive-modal', 'wt-wizard-modal', className].filter(Boolean).join(' ')}
      header={showHeader ? <GlassHeader title={headerTitle} subtitle={headerSubtitle} variant="plain" onClose={onClose} /> : undefined}
      aria-labelledby="employee-onboarding-title"
    >
      <Box ref={bodyRef} sx={{ height: '100%', minHeight: 0, overflow: 'hidden', p: 0 }}>
        {children}
      </Box>
    </GlassDialog>
  );
}

export default FullscreenWizardModal;
