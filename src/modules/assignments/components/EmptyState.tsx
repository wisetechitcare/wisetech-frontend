import { ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';

interface EmptyStateProps {
  variant?: 'no-results' | 'no-data';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

/** Calm, helpful empty state — tells the user what happened and what to do next. */
export const EmptyState = ({
  variant = 'no-results',
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) => {
  const isNoResults = variant === 'no-results';
  const FallbackIcon = isNoResults ? SearchOffOutlinedIcon : AssignmentIndOutlinedIcon;

  return (
    <Box
      role="status"
      sx={{
        textAlign: 'center', py: { xs: 6, md: 9 }, px: 3,
        border: '1px dashed', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'action.hover', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2, color: 'text.secondary' }}>
        {icon ?? <FallbackIcon sx={{ fontSize: 32 }} aria-hidden="true" />}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
        {title ?? (isNoResults ? 'No matches' : 'No assignments yet')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto' }}>
        {description ?? (isNoResults
          ? 'Try a different search term, or reset the filters to see everything.'
          : 'Assign a role to someone to get started.')}
      </Typography>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outlined" sx={{ mt: 2.5, textTransform: 'none', borderRadius: 2 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
