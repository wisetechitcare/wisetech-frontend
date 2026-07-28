import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: 'primary' | 'error' | 'warning' | 'success';
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Generic keyboard-operable confirmation for a lifecycle action (expire / remove / restore). */
export const ConfirmDialog = ({
  open, title, message, confirmLabel = 'Confirm', confirmColor = 'primary',
  isPending = false, error = null, onConfirm, onClose,
}: ConfirmDialogProps) => (
  <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="xs" fullWidth
    PaperProps={{ sx: { borderRadius: 3 } }} aria-labelledby="confirm-title">
    <DialogTitle id="confirm-title" sx={{ fontWeight: 700 }}>{title}</DialogTitle>
    <DialogContent>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      <DialogContentText sx={{ color: 'text.secondary' }}>{message}</DialogContentText>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onClick={onClose} disabled={isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
      <Button onClick={onConfirm} variant="contained" color={confirmColor} disabled={isPending}
        sx={{ textTransform: 'none', borderRadius: 2 }}>
        {isPending ? 'Working…' : confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
