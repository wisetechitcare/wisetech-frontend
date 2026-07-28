import { useEffect, useState } from 'react';
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, FormControlLabel,
} from '@mui/material';
import { useRestoreUnit } from '../hooks/useOrganization';
import { errorMessage } from '../utils/format';

export interface RestoreUnitTarget {
  id: string;
  name: string;
  childCount: number;
}

interface RestoreUnitDialogProps {
  open: boolean;
  onClose: () => void;
  unit: RestoreUnitTarget | null;
}

/** Restore an archived unit, optionally cascading to its archived descendants. */
export const RestoreUnitDialog = ({ open, onClose, unit }: RestoreUnitDialogProps) => {
  const [cascade, setCascade] = useState(false);
  const restore = useRestoreUnit();
  const hasChildren = (unit?.childCount ?? 0) > 0;

  useEffect(() => {
    if (open) {
      setCascade(false);
      restore.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit]);

  const submit = async () => {
    if (!unit || restore.isPending) return;
    try {
      await restore.mutateAsync({ id: unit.id, cascade });
      onClose();
    } catch {
      // surfaced inline below
    }
  };

  return (
    <Dialog open={open} onClose={restore.isPending ? undefined : onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Restore {unit ? `“${unit.name}”` : 'unit'}?</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: hasChildren ? 1 : 0 }}>
          Restoring makes this unit active again.
        </DialogContentText>

        {hasChildren && (
          <FormControlLabel
            control={<Checkbox checked={cascade} onChange={(e) => setCascade(e.target.checked)} />}
            label="Restore the entire subtree (this unit and its archived descendants)"
          />
        )}

        {restore.isError && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{errorMessage(restore.error)}</Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={restore.isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={submit} variant="contained" color="success" disabled={restore.isPending}
          sx={{ textTransform: 'none', borderRadius: 2 }}>
          {restore.isPending ? 'Restoring…' : 'Restore'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RestoreUnitDialog;
