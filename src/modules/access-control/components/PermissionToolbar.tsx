import { Box, Button, CircularProgress, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';

interface PermissionToolbarProps {
  dirtyCount: number;
  isDirty: boolean;
  isSaving: boolean;
  disabled?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

/** Sticky action bar: change count + Save / Discard. */
export const PermissionToolbar = ({
  dirtyCount, isDirty, isSaving, disabled, onSave, onDiscard,
}: PermissionToolbarProps) => (
  <Box
    sx={{
      position: 'sticky',
      bottom: 0,
      zIndex: 5,
      mt: 3,
      px: 2.5,
      py: 1.75,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
      flexWrap: 'wrap',
      borderRadius: 3,
      border: '1px solid',
      borderColor: isDirty ? 'warning.main' : 'divider',
      bgcolor: 'background.paper',
      boxShadow: 3,
    }}
  >
    <Typography variant="body2" color="text.secondary" aria-live="polite">
      {isDirty
        ? `${dirtyCount} ${dirtyCount === 1 ? 'module has' : 'modules have'} unsaved changes`
        : 'All changes saved'}
    </Typography>

    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        onClick={onDiscard}
        disabled={!isDirty || isSaving || disabled}
        startIcon={<UndoIcon />}
        sx={{ textTransform: 'none' }}
      >
        Discard
      </Button>
      <Button
        onClick={onSave}
        disabled={!isDirty || isSaving || disabled}
        variant="contained"
        startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
        sx={{ textTransform: 'none', borderRadius: 2, minWidth: 150 }}
      >
        {isSaving ? 'Saving…' : 'Save changes'}
      </Button>
    </Box>
  </Box>
);

export default PermissionToolbar;
