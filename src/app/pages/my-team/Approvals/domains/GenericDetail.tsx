import { Box, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader, ToneChip, WtButton, tonePair } from '@app/modules/common/components/ui';
import { formatDate } from '@utils/dateFormats';
import { summarise } from '../InboxItem';
import { getApprovalDomain } from './registry';
import type { ApprovalDetailProps } from './types';

/**
 * The detail view for a domain that has no canonical one of its own.
 *
 * The registry lets a domain omit `Detail`, and used to say such a domain "degrades gracefully to
 * the row's expandable panel". That panel belonged to the old list layout. Once the queue became a
 * card grid there was nothing left to degrade to, so clicking an attendance, task, project,
 * requisition or offer card set the detail state and rendered nothing at all — a dead click with
 * no dialog and no error.
 *
 * This renders what the queue already knows — the row summary, who it is from, where it is in its
 * chain — and carries the same Approve/Reject the card offers, so a decision is still one click
 * from the thing being decided. It is deliberately generic: registering a real `Detail` for a
 * domain still wins, and nothing else changes.
 */
export default function GenericDetail({
    step, onClose, canDecide, onApprove, onReject,
}: ApprovalDetailProps) {
    const domain = getApprovalDomain(step.instance.workflowType);
    const summary = summarise(step);
    const pair = tonePair(domain?.tone ?? 'brand');

    const requester = step.instance.employee?.users
        ? `${step.instance.employee.users.firstName} ${step.instance.employee.users.lastName}`.trim()
        : 'Employee';
    const submitted = (step.requestDetails as any)?.submittedAt ?? step.instance.createdAt;

    return (
        <GlassDialog
            open
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            header={
                <GlassHeader
                    title={summary.title}
                    subtitle={`${requester}${submitted ? ` · submitted ${formatDate(submitted)}` : ''}`}
                    icon={<KTIcon iconName={domain?.icon ?? 'information'} className="fs-1" />}
                    onClose={onClose}
                />
            }
        >
            <Stack gap={1.75} sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
                <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center">
                    <ToneChip tone={domain?.tone ?? 'brand'} label={domain?.label ?? 'Request'} size="small" solid />
                    {step.instance.totalLevels > 1 && (
                        <ToneChip
                            tone="neutral" size="small"
                            label={`Level ${step.instance.currentLevel} of ${step.instance.totalLevels}`}
                        />
                    )}
                    {summary.chips?.map((c) => <ToneChip key={c.label} tone={c.tone} label={c.label} size="small" />)}
                </Stack>

                {summary.facts.length > 0 && (
                    <Typography sx={{ fontSize: 13.5, color: 'text.primary', fontWeight: 600 }}>
                        {summary.facts.join(' · ')}
                    </Typography>
                )}

                {summary.value && (
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: pair.fg, fontVariantNumeric: 'tabular-nums' }}>
                        {summary.value}
                    </Typography>
                )}

                {/* The requester's own words. For most of these domains — an attendance
                    correction, a leave-shaped request — this IS the thing being judged. */}
                {summary.note && (
                    <Box sx={{ p: 1.25, borderRadius: '10px', bgcolor: 'action.hover', minWidth: 0 }}>
                        <Typography sx={{
                            fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em',
                            textTransform: 'uppercase', color: 'text.secondary', mb: 0.5,
                        }}>
                            Reason
                        </Typography>
                        <Typography sx={{ fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                            {summary.note}
                        </Typography>
                    </Box>
                )}

                {step.waitingOn?.name && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {step.waitingOn.role === 'EMPLOYEE' ? 'Waiting on ' : 'Next: '}
                        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {step.waitingOn.name}
                        </Box>
                    </Typography>
                )}

                {canDecide && (onApprove || onReject) && (
                    <Stack direction="row" gap={1} sx={{ pt: 0.5 }}>
                        {onApprove && (
                            <WtButton size="small" onClick={onApprove} sx={{ flex: 1 }}>Approve</WtButton>
                        )}
                        {onReject && (
                            <WtButton size="small" ghost onClick={onReject} sx={{ flex: 1 }}>Reject</WtButton>
                        )}
                    </Stack>
                )}
            </Stack>
        </GlassDialog>
    );
}
