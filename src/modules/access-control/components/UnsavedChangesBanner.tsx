import { Alert, Box, Button } from '@mui/material';

interface UnsavedChangesBannerProps {
  count: number;
  onSave: () => void;
  onDiscard: () => void;
  disabled?: boolean;
}

/** Persistent reminder that the working copy differs from what is live. */
export const UnsavedChangesBanner = ({ count, onSave, onDiscard, disabled }: UnsavedChangesBannerProps) => (
  <Alert
    severity="warning"
    role="status"
    sx={{ borderRadius: 2, mb: 2, alignItems: 'center' }}
    action={
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" onClick={onDiscard} disabled={disabled} sx={{ textTransform: 'none' }}>
          Discard
        </Button>
        <Button size="small" variant="contained" onClick={onSave} disabled={disabled} sx={{ textTransform: 'none' }}>
          Save
        </Button>
      </Box>
    }
  >
    You have unsaved changes in {count} {count === 1 ? 'module' : 'modules'}. They will not apply to anyone until you save.
  </Alert>
);

export default UnsavedChangesBanner;
