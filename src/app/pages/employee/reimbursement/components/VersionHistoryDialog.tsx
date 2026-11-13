import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/ds/ui/badge';
import { Separator } from '@/ds/ui/separator';
import { Spinner } from '@/ds/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ds/ui/table';
import { FormDialog } from '@/ds/patterns/form-dialog';
import { cn } from '@/ds/lib/utils';
import { formatDateTime } from '@utils/dateFormats';
import {
    fetchVersionHistory, VERSION_REASON_LABEL,
    type FieldChange, type ReimbursementVersion,
} from '@services/reimbursementVersions';
import { queryCategoryLabel } from '@services/reimbursementQueries';
import { getCurrencyLocale, currencyPrefix } from '@utils/currency';
import { Info, Clock } from 'lucide-react';

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

type StepTone = 'success' | 'danger' | 'warning' | 'neutral';

const STEP_TONE = (status: string, isCurrent: boolean): StepTone => {
    if (status === 'approved') return 'success';
    if (status === 'rejected') return 'danger';
    if (status === 'cancelled') return 'neutral';
    return isCurrent ? 'warning' : 'neutral';
};

/** The small uppercase label above each block of a card or dialog. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p
            data-slot="reimbursement-eyebrow"
            className={cn('m-0 mb-1 text-[11px] font-extrabold uppercase tracking-[0.05em] text-muted-foreground', className)}
        >
            {children}
        </p>
    );
}

/** The Field | Previous | New table the spec asks for, used here and in the resubmit confirmation. */
export function ChangeSummaryTable({ changes, dense = false }: { changes: FieldChange[]; dense?: boolean }) {
    if (!changes.length) return null;
    const head = cn('text-[11.5px] font-extrabold', dense ? 'h-7' : 'h-9');
    const cell = cn('whitespace-normal break-words text-[12.5px]', dense ? 'py-1' : 'py-2');
    return (
        <div className="min-w-0 overflow-hidden rounded-lg border border-border">
            <Table className="min-w-[380px]">
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className={head}>Field</TableHead>
                        <TableHead className={head}>Previous</TableHead>
                        <TableHead className={head}>New</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {changes.map((c) => (
                        <TableRow key={c.field}>
                            <TableCell className={cn(cell, 'font-semibold')}>{c.label}</TableCell>
                            <TableCell className={cn(cell, 'text-muted-foreground line-through')}>
                                {c.previous ?? '—'}
                            </TableCell>
                            <TableCell className={cn(cell, 'font-bold text-success-foreground')}>
                                {c.next ?? '—'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
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
        <div className={cn('flex min-w-0 items-start gap-2 rounded-lg bg-tone-indigo-soft', compact ? 'p-2' : 'p-2.5')}>
            <Info className="mt-0.5 size-[17px] shrink-0 text-tone-indigo-foreground" aria-hidden />
            <p data-slot="restart-notice" className="m-0 text-[12.5px] leading-normal text-foreground">
                Approval restarted from Level 1 because reimbursement details were modified
                {versionNumber ? ` (version ${versionNumber})` : ''}. Earlier approvals were given on the
                previous version and are kept in its history.
            </p>
        </div>
    );
}

function VersionCard({ version, previous }: { version: ReimbursementVersion; previous?: ReimbursementVersion }) {
    const changes = version.changeSummary ?? [];
    const restarted = version.versionNumber > 1 && changes.length > 0;

    return (
        <div className={cn(
            'flex min-w-0 flex-col gap-2.5 rounded-xl border border-l-4 border-border p-3',
            version.isCurrent ? 'border-l-primary' : 'border-l-border',
        )}>
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant={version.isCurrent ? 'default' : 'neutral'}>{`Version ${version.versionNumber}`}</Badge>
                {version.isCurrent && <Badge variant="success">Current</Badge>}
                <span className="text-xs text-muted-foreground">
                    {VERSION_REASON_LABEL[version.reason ?? ''] ?? 'Edited'} · {formatDateTime(version.createdAt)}
                </span>
                <span className="flex-1" />
                <span className="text-[13px] font-extrabold">
                    {currencyPrefix()}{Number(version.amount).toLocaleString(getCurrencyLocale(), { minimumFractionDigits: 2 })}
                </span>
            </div>

            {restarted && <RestartNotice compact />}

            {changes.length > 0 ? (
                <div>
                    <Eyebrow>What changed from version {version.versionNumber - 1}</Eyebrow>
                    <ChangeSummaryTable changes={changes} dense />
                </div>
            ) : (
                <p data-slot="version-note" className="m-0 text-[12.5px] text-muted-foreground">
                    {version.versionNumber === 1
                        ? 'The claim as originally submitted.'
                        : 'No field-level record of this change.'}
                </p>
            )}

            {/* This version's OWN approval trail — the thing the old in-place reset destroyed. */}
            {version.approval && (
                <div>
                    <Eyebrow>
                        Approval on this version
                        {version.approval.status === 'cancelled' && ' — superseded'}
                    </Eyebrow>
                    <div className="flex flex-col gap-1">
                        {version.approval.steps.map((step) => (
                            <div key={step.level} className="flex flex-wrap items-baseline gap-2">
                                <Badge
                                    variant={STEP_TONE(step.status, step.level === version.approval!.currentLevel)}
                                    className="h-4 px-1.5 text-[10px]"
                                >
                                    {`L${step.level} ${step.status}`}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {step.approverName ?? 'Approver'}
                                    {step.actedAt ? ` · ${formatDateTime(step.actedAt)}` : ''}
                                </span>
                                {step.comments && (
                                    <span className="basis-full text-xs text-foreground">
                                        “{step.comments}”
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* And its own questions — a query about v1 stays attached to v1. */}
            {version.queries.length > 0 && (
                <div>
                    <Eyebrow>Questions on this version</Eyebrow>
                    <div className="flex flex-col gap-1.5">
                        {version.queries.map((q) => (
                            <div key={q.id} className="rounded-lg bg-tone-cyan-soft p-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11.5px] font-bold">
                                        {queryCategoryLabel(q.category)}
                                    </span>
                                    <Badge variant="outline" className="h-[18px] text-[10px]">{q.status.toLowerCase()}</Badge>
                                    {q.level != null && (
                                        <span className="text-[11px] text-muted-foreground">level {q.level}</span>
                                    )}
                                </div>
                                {q.messages.map((m) => (
                                    <p key={m.id} data-slot="version-message" className="m-0 mt-1 text-xs leading-[1.45]">
                                        <b>{m.authorRole === 'APPROVER' ? 'Approver' : 'Employee'}:</b> {m.body}
                                    </p>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {previous && (
                <span className="text-[11px] text-muted-foreground/70">
                    Superseded {version.supersededAt ? formatDateTime(version.supersededAt) : ''}
                </span>
            )}
        </div>
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
        <FormDialog
            open={!!reimbursementId}
            onOpenChange={(next) => { if (!next) onClose(); }}
            title="Version history"
            description={requestLabel ?? undefined}
            icon={<Clock />}
        >
            <div className="flex min-w-0 flex-col gap-3">
                {loading ? (
                    <div className="flex justify-center py-12"><Spinner className="size-[26px] text-primary" /></div>
                ) : versions.length === 0 ? (
                    <p data-slot="version-empty" className="m-0 py-10 text-center text-[13px] text-muted-foreground">
                        No version history for this expense.
                    </p>
                ) : (
                    <>
                        <p data-slot="version-count" className="m-0 text-[12.5px] text-muted-foreground">
                            {versions.length === 1
                                ? 'This expense has not been edited since it was submitted.'
                                : `${versions.length} versions. Newest first.`}
                        </p>
                        <Separator />
                        {versions.map((v, i) => (
                            <VersionCard key={v.id} version={v} previous={versions[i + 1]} />
                        ))}
                    </>
                )}
            </div>
        </FormDialog>
    );
}
