import { Box, Stack, Typography, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { ToneChip, tonePair } from '@app/modules/common/components/ui';
import type { SemanticTone } from '@app/theme/tokens';

/**
 * Contextual banner displayed at the top of an edit form.
 *
 * Shows why the user is editing: after rejection, after query, or regular edit.
 * This banner always remains visible and helps the user understand the context.
 */

export type EditContext = 'rejection' | 'query' | 'edit';

export interface EditBannerProps {
  context: EditContext;
  rejectionReason?: string;
  queryText?: string;
  level?: number;
}

const CONTEXT_CONFIG: Record<
  EditContext,
  {
    icon: string;
    title: string;
    tone: SemanticTone;
    label: string;
  }
> = {
  rejection: {
    icon: 'cross-circle',
    title: 'Editing After Rejection',
    tone: 'danger',
    label: 'Rejected',
  },
  query: {
    icon: 'question',
    title: 'Updating Based on Query',
    tone: 'warning',
    label: 'Query',
  },
  edit: {
    icon: 'pencil',
    title: 'Editing Reimbursement',
    tone: 'brand',
    label: 'Edit',
  },
};

export default function EditBanner({
  context,
  rejectionReason,
  queryText,
  level,
}: EditBannerProps) {
  const theme = useTheme();
  const config = CONTEXT_CONFIG[context];
  const pair = tonePair(config.tone);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: '12px',
        bgcolor: pair.soft,
        border: `1px solid ${pair.fg}40`,
        minWidth: 0,
      }}
    >
      <Stack gap={1}>
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={0.75}>
          <Box sx={{ color: pair.fg }}>
            <KTIcon iconName={config.icon} className="fs-4" />
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary' }}>
            {config.title}
          </Typography>
          <ToneChip tone={config.tone} label={config.label} size="small" sx={{ ml: 'auto' }} />
        </Stack>

        {/* Reason/Query text */}
        {(rejectionReason || queryText) && (
          <Box
            sx={{
              p: 1,
              borderRadius: '8px',
              bgcolor: theme.palette.background.paper,
              border: `1px solid ${pair.fg}20`,
              minWidth: 0,
            }}
          >
            {rejectionReason && (
              <Stack gap={0.5}>
                <Typography
                  sx={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: pair.fg,
                  }}
                >
                  Rejection Reason
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.4 }}>
                  "{rejectionReason}"
                </Typography>
              </Stack>
            )}
            {queryText && (
              <Stack gap={0.5}>
                <Typography
                  sx={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: pair.fg,
                  }}
                >
                  Approver Query
                  {level && ` (Level ${level})`}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.4 }}>
                  "{queryText}"
                </Typography>
              </Stack>
            )}
          </Box>
        )}

        {/* Helper text */}
        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic' }}>
          {context === 'rejection' &&
            'Make the necessary corrections and resubmit for approval.'}
          {context === 'query' &&
            'Update your reimbursement based on the approver feedback and resubmit.'}
          {context === 'edit' &&
            'Update your reimbursement and resubmit for approval.'}
        </Typography>
      </Stack>
    </Box>
  );
}
