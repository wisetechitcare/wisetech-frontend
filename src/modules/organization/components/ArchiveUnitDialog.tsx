import { useEffect, useState } from 'react';
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, FormControlLabel,
} from '@mui/material';
import { useArchiveUnit } from '../hooks/useOrganization';
import { errorMessage } from '../utils/format';

export interface ArchiveUnitTarget {
  id: string;
  name: string;
  childCount: number;
}

interface ArchiveUnitDialogProps {
  open: boolean;
  onClose: () => void;
  unit: ArchiveUnitTarget | null;
}

/**
 * Confirm archiving a unit. When it has children, an "archive entire subtree"
 * cascade checkbox is offered. The backend may reject the archive (e.g. "still
 * has N active role assignments") — that message is surfaced verbatim.
 */
export const ArchiveUnitDialog = ({ open, onClose, unit }: ArchiveUnitDialogProps) => {
  const [cascade, setCascade] = useState(false);
  const archive = useArchiveUnit();
  const hasChildren = (unit?.childCount ?? 0) > 0;

  useEffect(() => {
    if (open) {
      setCascade(false);
      archive.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit]);

  const submit = async () => {
    if (!unit || archive.isPending) return;
    try {
      await archive.mutateAsync({ id: unit.id, cascade });
      onClose();
    } catch {
      // surfaced inline below (e.g. active role assignments)
    }
  };

  return (
    <Dialog open={open} onClose={archive.isPending ? undefined : onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Archive {unit ? `“${unit.name}”` : 'unit'}?</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: hasChildren ? 1 : 0 }}>
          Archiving hides this unit from active use. You can restore it later.
        </DialogContentText>

        {hasChildren && (
          <FormControlLabel
            control={<Checkbox checked={cascade} onChange={(e) => setCascade(e.target.checked)} />}
            label="Archive the entire subtree (this unit and everything under it)"
          />
        )}

        {archive.isError && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{errorMessage(archive.error)}</Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={archive.isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={submit} variant="contained" color="error" disabled={archive.isPending}
          sx={{ textTransform: 'none', borderRadius: 2 }}>
          {archive.isPending ? 'Archiving…' : 'Archive'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ArchiveUnitDialog;
