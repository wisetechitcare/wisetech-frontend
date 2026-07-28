import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
} from '@mui/material';
import { useUpdateUnit } from '../hooks/useOrganization';
import { errorMessage } from '../utils/format';

export interface RenameUnitTarget {
  id: string;
  name: string;
  code: string | null;
}

interface RenameUnitDialogProps {
  open: boolean;
  onClose: () => void;
  unit: RenameUnitTarget | null;
}

/** Rename a unit and/or edit its code. */
export const RenameUnitDialog = ({ open, onClose, unit }: RenameUnitDialogProps) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const update = useUpdateUnit();

  useEffect(() => {
    if (open && unit) {
      setName(unit.name);
      setCode(unit.code ?? '');
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit]);

  const canSubmit = !!unit && name.trim().length > 0 && !update.isPending;

  const submit = async () => {
    if (!canSubmit || !unit) return;
    try {
      await update.mutateAsync({
        id: unit.id,
        payload: { name: name.trim(), code: code.trim() || undefined },
      });
      onClose();
    } catch {
      // surfaced inline below
    }
  };

  return (
    <Dialog open={open} onClose={update.isPending ? undefined : onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Rename unit</DialogTitle>
      <DialogContent>
        {update.isError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{errorMessage(update.error)}</Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
          <TextField
            autoFocus label="Name" required fullWidth value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) submit(); }}
            inputProps={{ 'aria-label': 'Unit name', maxLength: 160 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            label="Code" fullWidth value={code}
            onChange={(e) => setCode(e.target.value)}
            helperText="Optional short identifier (e.g. HR-01)."
            inputProps={{ 'aria-label': 'Unit code', maxLength: 60 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={update.isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={!canSubmit}
          sx={{ textTransform: 'none', borderRadius: 2 }}>
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RenameUnitDialog;
