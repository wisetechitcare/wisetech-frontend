import { Box, Button, Slide, Typography } from '@mui/material';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';

interface BulkActionBarProps {
  count: number;
  onExpire: () => void;
  onRemove: () => void;
  onClear: () => void;
  busy?: boolean;
}

/** Sticky action bar shown while rows are selected. */
export const BulkActionBar = ({ count, onExpire, onRemove, onClear, busy }: BulkActionBarProps) => (
  <Slide direction="up" in={count > 0} mountOnEnter unmountOnExit>
    <Box
      role="region"
      aria-label={`${count} selected`}
      sx={{
        position: 'sticky', bottom: 16, zIndex: 5, mt: 2,
        display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        px: 2, py: 1.25, borderRadius: 3, boxShadow: 6,
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700, mr: 1 }}>
        {count} selected
      </Typography>
      <Button
        size="small" color="warning" variant="outlined" startIcon={<BlockOutlinedIcon />}
        onClick={onExpire} disabled={busy} sx={{ textTransform: 'none', borderRadius: 2 }}
      >
        Expire
      </Button>
      <Button
        size="small" color="error" variant="outlined" startIcon={<DeleteOutlineIcon />}
        onClick={onRemove} disabled={busy} sx={{ textTransform: 'none', borderRadius: 2 }}
      >
        Remove
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <Button
        size="small" startIcon={<CloseIcon />} onClick={onClear} disabled={busy}
        sx={{ textTransform: 'none', borderRadius: 2 }}
      >
        Clear
      </Button>
    </Box>
  </Slide>
);

export default BulkActionBar;
