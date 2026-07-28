import { Alert, AlertTitle, Box } from '@mui/material';
import type { ValidationIssue } from '../types';

interface ValidationMessageProps {
  issues: ValidationIssue[];
  /** Non-validation failure (network / permission denied / role locked). */
  error?: unknown;
}

const errorMessage = (error: unknown): string => {
  const status = (error as { response?: { status?: number } })?.response?.status
    ?? (error as { statusCode?: number })?.statusCode;
  if (status === 403) return "You don't have permission to change this role's access.";
  if (status === 404) return 'This role no longer exists. Refresh the page and try again.';
  if (status === 409) return 'This role changed while you were editing. Refresh to load the latest access.';
  const message = (error as { message?: string })?.message;
  return message || 'Something went wrong while saving. Please try again.';
};

/** Human-readable validation / save errors. Never shows a permission key. */
export const ValidationMessage = ({ issues, error }: ValidationMessageProps) => {
  if (issues.length === 0 && !error) return null;

  if (issues.length > 0) {
    return (
      <Alert severity="error" role="alert" sx={{ borderRadius: 2, mb: 2 }}>
        <AlertTitle>Some changes could not be saved</AlertTitle>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {issues.map((issue, i) => (
            <li key={`${issue.module ?? 'general'}-${issue.capability ?? i}`}>{issue.message}</li>
          ))}
        </Box>
      </Alert>
    );
  }

  return (
    <Alert severity="error" role="alert" sx={{ borderRadius: 2, mb: 2 }}>
      {errorMessage(error)}
    </Alert>
  );
};

export default ValidationMessage;
