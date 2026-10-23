import { WtWizardDialog, type WtWizardDialogProps } from '@app/modules/common/components/ui';

/** @deprecated Use WtWizardDialog from the UI barrel. */
export interface FullscreenWizardModalProps extends Omit<WtWizardDialogProps, 'open' | 'title' | 'subtitle'> {
  show: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
}

/** Compatibility adapter for external callers; active forms use the kit directly. */
export function FullscreenWizardModal({ show, headerTitle = 'Wizard', headerSubtitle, ...props }: FullscreenWizardModalProps) {
  return <WtWizardDialog {...props} open={show} title={headerTitle} subtitle={headerSubtitle} />;
}

export default FullscreenWizardModal;
