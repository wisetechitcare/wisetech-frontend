import { Box, Button, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/**
 * Enterprise error state: says what happened in plain language and offers a
 * retry — never a raw stack trace or status code.
 */
export const ErrorState = ({
  title = "We couldn't load this",
  description = 'Something went wrong while fetching the data. Please check your connection and try again.',
  onRetry,
  isRetrying = false,
}: ErrorStateProps) => (
  <Box
    role="alert"
    sx={{
      textAlign: 'center', py: { xs: 6, md: 8 }, px: 3,
      border: '1px solid', borderColor: 'error.light', borderRadius: 3,
      backgroundColor: (t) => t.palette.mode === 'dark' ? 'transparent' : '#fff5f5',
    }}
  >
    <ErrorOutlineIcon sx={{ fontSize: 40, color: 'error.main', mb: 1.5 }} aria-hidden="true" />
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto' }}>{description}</Typography>
    {onRetry && (
      <Button
        onClick={onRetry}
        disabled={isRetrying}
        variant="contained"
        color="error"
        startIcon={<RefreshIcon />}
        sx={{ mt: 2.5, textTransform: 'none', borderRadius: 2 }}
      >
        {isRetrying ? 'Retrying…' : 'Try again'}
      </Button>
    )}
  </Box>
);

export default ErrorState;
