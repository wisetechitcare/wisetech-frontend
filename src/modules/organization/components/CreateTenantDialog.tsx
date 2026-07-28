import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography,
} from '@mui/material';
import { useCreateTenant } from '../hooks/useOrganization';
import { errorMessage } from '../utils/format';

interface CreateTenantDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

/** Slugify a name for the auto-suggested slug (lowercase, hyphenated, url-safe). */
const slugify = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Create Tenant — name (required) + optional slug. Backend generates a slug when omitted. */
export const CreateTenantDialog = ({ open, onClose, onCreated }: CreateTenantDialogProps) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const create = useCreateTenant();

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setName('');
      setSlug('');
      setSlugTouched(false);
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const canSubmit = name.trim().length > 0 && !create.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      const tenant = await create.mutateAsync({
        name: name.trim(),
        slug: effectiveSlug ? effectiveSlug : undefined,
      });
      onCreated?.(tenant.id);
      onClose();
    } catch {
      // error surfaced inline below via create.error
    }
  };

  return (
    <Dialog open={open} onClose={create.isPending ? undefined : onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Create tenant</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          A tenant is a top-level organization on the platform. You can build out its structure afterwards.
        </Typography>

        {create.isError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{errorMessage(create.error)}</Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            autoFocus
            label="Name"
            required
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) submit(); }}
            inputProps={{ 'aria-label': 'Tenant name', maxLength: 120 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            label="Slug"
            fullWidth
            value={effectiveSlug}
            onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
            helperText="Used in URLs. Leave as suggested, or customise. The server finalises it."
            inputProps={{ 'aria-label': 'Tenant slug', maxLength: 120 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={create.isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          onClick={submit}
          variant="contained"
          disabled={!canSubmit}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          {create.isPending ? 'Creating…' : 'Create tenant'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTenantDialog;
