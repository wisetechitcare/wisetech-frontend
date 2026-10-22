import { Dialog, DialogContent, Stack, Typography } from '@mui/material';
import { WtButton } from './buttons';

export interface ConfirmDiscardDialogProps {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function ConfirmDiscardDialog({
  open,
  onKeepEditing,
  onDiscard,
}: ConfirmDiscardDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onKeepEditing}
      maxWidth="xs"
      fullWidth
      aria-labelledby="discard-unsaved-changes-title"
      aria-describedby="discard-unsaved-changes-description"
    >
      <DialogContent sx={{ px: 3, py: 3 }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.75}>
            <Typography id="discard-unsaved-changes-title" variant="h6" fontWeight={700}>
              Discard unsaved changes?
            </Typography>
            <Typography id="discard-unsaved-changes-description" color="text.secondary">
              Your changes haven&apos;t been saved. Are you sure you want to leave?
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <WtButton ghost onClick={onKeepEditing}>Keep editing</WtButton>
            <WtButton tone="danger" onClick={onDiscard}>Discard</WtButton>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
