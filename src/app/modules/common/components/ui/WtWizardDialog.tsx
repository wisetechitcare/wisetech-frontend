import { Box } from '@mui/material';
import { Close } from '@mui/icons-material';
import type { ReactNode, Ref } from 'react';
import { GlassDialog, GlassHeader } from './glass';
import { WtIconButton } from './buttons';

export interface WtWizardDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  closeLabel?: string;
  /** Entity glyph rendered in the branded workflow header. */
  icon?: ReactNode | string;
  showHeader?: boolean;
  /** Keep the WiseTech entity treatment by default; opt down only for quiet editors. */
  headerVariant?: 'gradient' | 'frost' | 'plain';
  children: ReactNode;
  bodyRef?: Ref<HTMLDivElement>;
  className?: string;
  /** Compatibility for controls whose popup still renders outside the dialog. */
  disableEnforceFocus?: boolean;
  /** Host ownership supports pending uploads and custom exit rules without a second prompt. */
  closeGuard?: 'dialog' | 'host';
}

function WizardClose({ onClose, label }: { onClose: () => void; label: string }) {
  return <WtIconButton title={label} onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 3, bgcolor: 'background.paper' }}><Close /></WtIconButton>;
}

/** Full-window form shell; callers supply the shared wizard as its content. */
export function WtWizardDialog({
  open,
  onClose,
  title,
  subtitle,
  closeLabel = 'Close',
  icon,
  showHeader = true,
  headerVariant = 'gradient',
  children,
  bodyRef,
  className,
  disableEnforceFocus = false,
  closeGuard = 'dialog',
}: WtWizardDialogProps) {
  return (
    <GlassDialog open={open} onClose={onClose} fullScreen fullWidth maxWidth={false} preset="workspace" plain
      disableEnforceFocus={disableEnforceFocus} disableUnsavedChangesGuard={closeGuard === 'host'} className={className} PaperProps={{ 'aria-label': title }}
      header={showHeader
        ? <GlassHeader title={title} subtitle={subtitle} icon={icon} variant={headerVariant} size="workspace" rule="divider" onClose={onClose} closeLabel={closeLabel} />
        : <WizardClose onClose={onClose} label={closeLabel} />}>
      <Box ref={bodyRef} sx={{ height: '100%', minHeight: 0, overflow: 'hidden', p: 0, '& > form': { height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' } }}>
        {children}
      </Box>
    </GlassDialog>
  );
}
