import React from "react";
import { Box, Typography } from '@mui/material';
import { SummaryRow } from "../../types/formEngine.types";

interface SummarySidebarProps {
  title: string;
  rows: SummaryRow[];
  isSubmitting?: boolean;
  isEditMode?: boolean;
  onCancel: () => void;
  exportPdf?: () => void;
  exportDocx?: () => void;
  submitDisabled?: boolean;
  submitText?: string;
  warningMessage?: string;
  /** When true, hides the submit/cancel action buttons (used inside wizard footer instead) */
  hideSubmitButton?: boolean;
}

export const SummarySidebar: React.FC<SummarySidebarProps> = ({
  title,
  rows,
  isEditMode = false,
  exportPdf,
  exportDocx,
  warningMessage,
  hideSubmitButton = false,
}) => {
  return (
    <Box>
      <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1 }}>{title}</Typography>
      {rows.length ? rows.map((row, index) => (
        <Box key={row.label + index} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">{row.label}</Typography>
          <Box sx={{ fontSize: 13, fontWeight: row.isStrong ? 700 : 400, overflowWrap: 'anywhere' }}>
            {row.value ?? '—'}
          </Box>
        </Box>
      )) : <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Fill in the form to see a summary</Typography>}
      {warningMessage && <Box role="status" sx={{ mt: 1.5, p: 1, bgcolor: 'action.hover', color: 'warning.main', borderRadius: 1, fontSize: 13 }}>{warningMessage}</Box>}
    </Box>
  );
};

export default SummarySidebar;
