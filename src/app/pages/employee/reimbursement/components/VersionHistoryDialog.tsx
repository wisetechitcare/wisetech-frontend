import { useCallback, useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader, ToneChip, tonePair } from '@app/modules/common/components/ui';
import type { SemanticTone } from '@app/theme/tokens';
import { formatDateTime } from '@utils/dateFormats';
import {
    fetchVersionHistory, VERSION_REASON_LABEL,
    type FieldChange, type ReimbursementVersion,
} from '@services/reimbursementVersions';
import { queryCategoryLabel } from '@services/reimbursementQueries';

/**
 * The audit story of one expense claim, version by version.
 *
 * Editing a submitted claim used to overwrite it, and the "reset to level 1" it triggered rewound
 * the SAME approval instance — wiping every `actedAt` and approver comment. So there was no way to
 * answer "what did level 1 actually approve?", because the answer had been deleted by the edit.
 *
 * Each version now keeps its own approval trail and its own query threads, and this renders them
 * as they were: v1's approvals against v1's numbers, v2's against v2's.
 */

const STEP_TONE = (status: string, isCurrent: boolean): SemanticTone => {
    if (status === 'approved') return 'success';
    if (status === 'rejected') return 'danger';
    if (status === 'cancelled') return 'neutral';
    return isCurrent ? 'warning' : 'neutral';
};

/** The Field | Previous | New table the spec asks for, used here and in the resubmit confirmation. */
export function ChangeSummaryTable({ changes, dense = false }: { changes: FieldChange[]; dense?: boolean }) {
    const theme = useTheme();
    if (!changes.length) return null;
    return (
        <Box sx={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${theme.palette.divider}` }}>
            <Table size="small" sx={{ minWidth: 380 }}>
                <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 800, fontSize: 11.5, py: dense ? 0.5 : 1 }}>Field</TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: 11.5, py: dense ? 0.5 : 1 }}>Previous</TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: 11.5, py: dense ? 0.5 : 1 }}>New</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {changes.map((c) => (
                        <TableRow key={c.field}>
                            <TableCell sx={{ fontSize: 12.5, fontWeight: 600, py: dense ? 0.5 : 1 }}>{c.label}</TableCell>
                            <TableCell sx={{
                                fontSize: 12.5, py: dense ? 0.5 : 1, color: 'text.secondary',
                                textDecoration: 'line-through',
                            }}>
                                {c.previous ?? '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12.5, py: dense ? 0.5 : 1, fontWeight: 700, color: tonePair('success').fg }}>
                                {c.next ?? '—'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}

/**
 * The sentence the spec requires whenever a version exists because the claim changed.
 *
 * Stated as cause and effect, because the employee needs to understand that the restart is a
 * consequence of what they edited — not an arbitrary penalty.
 */
export function RestartNotice({ versionNumber, compact = false }: { versionNumber?: number; compact?: boolean }) {
    return (
        <Stack direction="row" gap={1} alignItems="flex-start"
            sx={{ p: compact ? 1 : 1.25, borderRadius: '8px', bgcolor: tonePair('indigo').soft, minWidth: 0 }}>
            <KTIcon iconName="information" className="fs-5" />
            <Typography sx={{ fontSize: 12.5, lineHeight: 1.5, color: 'text.primary' }}>
                Approval restarted from Level 1 because reimbursement details were modified
                {versionNumber ? ` (version ${versionNumber})` : ''}. Earlier approvals were given on the
                previous version and are kept in its history.
            </Typography>
        </Stack>
    );
}

function VersionCard({ version, previous }: { version: ReimbursementVersion; previous?: ReimbursementVersion }) {
    const theme = useTheme();
    const changes = version.changeSummary ?? [];
    const restarted = version.versionNumber > 1 && changes.length > 0;

    return (
        <Box sx={{
            borderRadius: '12px', border: `1px solid ${theme.palette.divider}`,
            borderLeft: `4px solid ${version.isCurrent ? tonePair('brand').fg : theme.palette.divider}`,
            p: 1.5, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.25,
        }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                <ToneChip
                    tone={version.isCurrent ? 'brand' : 'neutral'}
                    label={`Version ${version.versionNumber}`}
                    solid={version.isCurrent}
                    size="small"
                />
                {version.isCurrent && <ToneChip tone="success" label="Current" size="small" />}
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {VERSION_REASON_LABEL[version.reason ?? ''] ?? 'Edited'} · {formatDateTime(version.createdAt)}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                    ₹{Number(version.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Typography>
            </Stack>

            {restarted && <RestartNotice compact />}

            {changes.length > 0 ? (
                <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 0.5 }}>
                        What changed from version {version.versionNumber - 1}
                    </Typography>
                    <ChangeSummaryTable changes={changes} dense />
                </Box>
            ) : (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                    {version.versionNumber === 1
                        ? 'The claim as originally submitted.'
                        : 'No field-level record of this change.'}
                </Typography>
            )}

            {/* This version's OWN approval trail — the thing the old in-place reset destroyed. */}
            {version.approval && (
                <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 0.5 }}>
                        Approval on this version
                        {version.approval.status === 'cancelled' && ' — superseded'}
                    </Typography>
                    <Stack gap={0.5}>
                        {version.approval.steps.map((step) => (
                            <Stack key={step.level} direction="row" gap={1} alignItems="baseline" flexWrap="wrap">
                                <ToneChip
                                    tone={STEP_TONE(step.status, step.level === version.approval!.currentLevel)}
                                    label={`L${step.level} ${step.status}`}
                                    size="small" dense
                                />
                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                    {step.approverName ?? 'Approver'}
                                    {step.actedAt ? ` · ${formatDateTime(step.actedAt)}` : ''}
                                </Typography>
                                {step.comments && (
                                    <Typography sx={{ fontSize: 12, color: 'text.primary', flexBasis: '100%' }}>
                                        “{step.comments}”
                                    </Typography>
                                )}
                            </Stack>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* And its own questions — a query about v1 stays attached to v1. */}
            {version.queries.length > 0 && (
                <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 0.5 }}>
                        Questions on this version
                    </Typography>
                    <Stack gap={0.75}>
                        {version.queries.map((q) => (
                            <Box key={q.id} sx={{ borderRadius: '8px', p: 1, bgcolor: tonePair('cyan').soft }}>
                                <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
                                    <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
                                        {queryCategoryLabel(q.category)}
                                    </Typography>
                                    <Chip size="small" variant="outlined" label={q.status.toLowerCase()} sx={{ height: 18, fontSize: 10 }} />
                                    {q.level != null && (
                                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>level {q.level}</Typography>
                                    )}
                                </Stack>
                                {q.messages.map((m) => (
                                    <Typography key={m.id} sx={{ fontSize: 12, mt: 0.4, lineHeight: 1.45 }}>
                                        <b>{m.authorRole === 'APPROVER' ? 'Approver' : 'Employee'}:</b> {m.body}
                                    </Typography>
                                ))}
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}

            {previous && (
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                    Superseded {version.supersededAt ? formatDateTime(version.supersededAt) : ''}
                </Typography>
            )}
        </Box>
    );
}

export interface VersionHistoryDialogProps {
    reimbursementId: string | null;
    requestLabel?: string | null;
    onClose: () => void;
}

export default function VersionHistoryDialog({ reimbursementId, requestLabel, onClose }: VersionHistoryDialogProps) {
    const [versions, setVersions] = useState<ReimbursementVersion[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!reimbursementId) return;
        setLoading(true);
        try {
            setVersions(await fetchVersionHistory(reimbursementId));
        } catch {
            setVersions([]);
        } finally {
            setLoading(false);
        }
    }, [reimbursementId]);

    useEffect(() => { load(); }, [load]);

    return (
        <GlassDialog
            open={!!reimbursementId}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            header={
                <GlassHeader
                    title="Version history"
                    subtitle={requestLabel ?? undefined}
                    icon={<KTIcon iconName="time" className="fs-1" />}
                    onClose={onClose}
                />
            }
        >
            <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
                {loading ? (
                    <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={26} /></Stack>
                ) : versions.length === 0 ? (
                    <Typography sx={{ py: 5, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>
                        No version history for this expense.
                    </Typography>
                ) : (
                    <>
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                            {versions.length === 1
                                ? 'This expense has not been edited since it was submitted.'
                                : `${versions.length} versions. Newest first.`}
                        </Typography>
                        <Divider />
                        {versions.map((v, i) => (
                            <VersionCard key={v.id} version={v} previous={versions[i + 1]} />
                        ))}
                    </>
                )}
            </Box>
        </GlassDialog>
    );
}
