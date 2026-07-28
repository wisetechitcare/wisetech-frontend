import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, TextField, Typography,
} from '@mui/material';
import { useCreateUnit } from '../hooks/useOrganization';
import { errorMessage } from '../utils/format';
import { UNIT_TYPE_OPTIONS } from '../utils/unitTypeOptions';

export interface CreateUnitParent {
  id: string;
  name: string;
  type: string;
}

interface CreateUnitDialogProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  /** The parent unit the new node is created under. Null = create at the tenant root. */
  parent: CreateUnitParent | null;
  onCreated?: (id: string) => void;
}

/** Add a child unit: parent shown for context, type select, name, optional code. */
export const CreateUnitDialog = ({ open, onClose, tenantId, parent, onCreated }: CreateUnitDialogProps) => {
  const [type, setType] = useState(UNIT_TYPE_OPTIONS[0].value);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const create = useCreateUnit();

  useEffect(() => {
    if (open) {
      setType(UNIT_TYPE_OPTIONS[0].value);
      setName('');
      setCode('');
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit = name.trim().length > 0 && !create.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      const unit = await create.mutateAsync({
        tenantId,
        parentId: parent?.id ?? null,
        type,
        name: name.trim(),
        code: code.trim() || undefined,
      });
      onCreated?.(unit.id);
      onClose();
    } catch {
      // surfaced inline below
    }
  };

  return (
    <Dialog open={open} onClose={create.isPending ? undefined : onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Add unit</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">Parent</Typography>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              size="small"
              label={parent ? parent.name : 'Tenant root (top level)'}
              sx={{ borderRadius: 1.5, fontWeight: 600, bgcolor: 'action.hover' }}
            />
          </Box>
        </Box>

        {create.isError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{errorMessage(create.error)}</Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            select label="Type" fullWidth value={type}
            onChange={(e) => setType(e.target.value)}
            inputProps={{ 'aria-label': 'Unit type' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            {UNIT_TYPE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
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
        <Button onClick={onClose} disabled={create.isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={!canSubmit}
          sx={{ textTransform: 'none', borderRadius: 2 }}>
          {create.isPending ? 'Adding…' : 'Add unit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateUnitDialog;
