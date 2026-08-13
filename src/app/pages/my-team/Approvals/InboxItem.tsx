import { Box, Stack, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { KTIcon } from '@metronic/helpers';
import { ToneChip, WtButton, tonePair } from '@app/modules/common/components/ui';
import type { SemanticTone } from '@app/theme/tokens';
import { formatDate } from '@utils/dateFormats';
import { getApprovalDomain } from './domains/registry';
import type { ApprovalStep } from './domains/types';

export interface Ageing {
    days: number;
    label: string;
    tone: SemanticTone;
}

export const ageOf = (since?: string | null): Ageing => {
    const days = since ? Math.max(0, dayjs().diff(dayjs(since), 'day')) : 0;
    if (days >= 4) return { days, label: `${days}d waiting`, tone: 'danger' };
    if (days >= 2) return { days, label: `${days}d waiting`, tone: 'warning' };
    if (days >= 1) return { days, label: '1d waiting', tone: 'neutral' };
    return { days, label: 'Today', tone: 'neutral' };
};

export interface ItemSummary {
    title: string;
    facts: string[];
    note?: string | null;
    chips?: Array<{ label: string; tone: SemanticTone }>;
    value?: string | null;
    statusFlow?: string | null;
}

const money = (v: unknown) =>
    `₹${Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const range = (from?: string | null, to?: string | null): string | null => {
    if (!from) return null;
    if (!to || dayjs(from).isSame(dayjs(to), 'day')) return formatDate(from);
    return `${formatDate(from)} - ${formatDate(to)}`;
};

export const summarise = (step: ApprovalStep): ItemSummary => {
    const d = (step.requestDetails ?? {}) as any;
    const type = (step.instance.workflowType || '').toLowerCase();

    if (type === 'leave') {
        const facts = [range(d.dateFrom, d.dateTo), d.totalDays ? `${d.totalDays} day${d.totalDays === 1 ? '' : 's'}` : null]
            .filter(Boolean) as string[];
        const chips: ItemSummary['chips'] = [];
        if (d.isHalfDay) chips.push({ label: `Half day${d.halfDaySession ? ` . ${d.halfDaySession}` : ''}`, tone: 'cyan' });
        if (d.unpaidDays) chips.push({ label: `${d.unpaidDays} unpaid`, tone: 'warning' });
        if (d.segments?.length > 1) chips.push({ label: `${d.segments.length} segments`, tone: 'indigo' });
        return { title: d.subType || 'Leave', facts, note: d.reason || d.description, chips };
    }

    if (type === 'attendance') {
        const punches = [d.checkIn, d.checkOut].filter(Boolean).join(' -> ');
        const facts = [range(d.dateFrom, d.dateTo), punches || null].filter(Boolean) as string[];
        return { title: d.subType || 'Attendance correction', facts, note: d.reason || d.description };
    }

    if (type === 'reimbursement') {
        const chips: ItemSummary['chips'] = [];
        const hasResubmitted = d.resubmittedCount && d.resubmittedCount > 0;
        const hasPending = d.pendingCount && d.pendingCount > 0;
        const hasQueried = d.queriedCount && d.queriedCount > 0;
        const hasApproved = d.approvedCount && d.approvedCount > 0;
        const hasRejected = d.rejectedCount && d.rejectedCount > 0;

        // Determine primary status chips to show (most important first)
        if (hasResubmitted) {
            chips.push({ label: `${d.resubmittedCount} item${d.resubmittedCount === 1 ? '' : 's'} awaiting re-review`, tone: 'indigo' });
        }

        if (hasPending && !hasResubmitted) {
            chips.push({ label: `${d.pendingCount} item${d.pendingCount === 1 ? '' : 's'} ready for approval`, tone: 'warning' });
        } else if (hasPending && hasResubmitted) {
            chips.push({ label: `${d.pendingCount} item${d.pendingCount === 1 ? '' : 's'} also pending`, tone: 'warning' });
        }

        if (hasQueried) {
            chips.push({ label: `${d.queriedCount} item${d.queriedCount === 1 ? '' : 's'} awaiting employee response`, tone: 'cyan' });
        }

        if (hasApproved) chips.push({ label: `${d.approvedCount} approved`, tone: 'success' });
        if (hasRejected) chips.push({ label: `${d.rejectedCount} rejected`, tone: 'danger' });

        const facts: string[] = [];
        if (d.totalRequests) facts.push(`${d.totalRequests} expense${d.totalRequests === 1 ? '' : 's'}`);
        if (d.totalAmount != null) {
            facts.push(`₹${money(d.totalAmount).replace('₹', '')}`);
        }

        let statusFlow: string | null = null;
        // Status flow tells the story of where this approval is right now
        if (hasResubmitted && hasPending) {
            statusFlow = `✓ Employee responded • ${d.resubmittedCount} ${d.resubmittedCount === 1 ? 'expense needs' : 'expenses need'} your review`;
        } else if (hasResubmitted) {
            statusFlow = `✓ Employee responded • Awaiting your decision`;
        } else if (hasQueried && !hasPending && !hasApproved && !hasRejected) {
            statusFlow = `❓ Waiting for employee to answer your ${d.queriedCount === 1 ? 'question' : 'questions'}`;
        } else if (hasPending && !hasQueried) {
            statusFlow = `→ Awaiting your decision`;
        } else if (hasApproved || hasRejected) {
            const parts = [];
            if (hasApproved) parts.push(`${d.approvedCount} approved`);
            if (hasRejected) parts.push(`${d.rejectedCount} rejected`);
            statusFlow = `✓ Completed • ${parts.join(', ')}`;
        }

        return {
            title: d.submissionId ? `Submission ${d.submissionId}` : 'Expense claim',
            facts: facts.filter(Boolean),
            chips,
            statusFlow,
            value: d.totalAmount != null ? money(d.totalAmount) : null,
        };
    }

    if (type === 'requisition') {
        return {
            title: d.title || 'Requisition',
            facts: [d.headcount ? `${d.headcount} position${d.headcount === 1 ? '' : 's'}` : null].filter(Boolean) as string[],
            note: d.jobDescription,
        };
    }

    if (type === 'offer') {
        return {
            title: d.candidateName ? `Offer - ${d.candidateName}` : 'Offer',
            facts: [d.proposedJoiningDate ? `Joins ${formatDate(d.proposedJoiningDate)}` : null].filter(Boolean) as string[],
            value: d.offeredCtcInLpa ? `${d.offeredCtcInLpa} LPA` : null,
        };
    }

    return {
        title: d.subType || getApprovalDomain(type)?.label || 'Request',
        facts: [range(d.dateFrom, d.dateTo)].filter(Boolean) as string[],
        note: d.reason || d.description,
    };
};

export interface InboxItemCardProps {
    step: ApprovalStep;
    canDecide: boolean;
    busy?: boolean;
    onOpen: () => void;
    onApprove?: () => void;
    onReject?: () => void;
    onAsk?: () => void;
}

export default function InboxItemCard({
    step, canDecide, busy = false, onOpen, onApprove, onReject, onAsk,
}: InboxItemCardProps) {
    const theme = useTheme();
    const type = (step.instance.workflowType || '').toLowerCase();
    const domain = getApprovalDomain(type);
    const tone = domain?.tone ?? 'brand';
    const pair = tonePair(tone);
    const summary = summarise(step);
    const since = (step.requestDetails as any)?.submittedAt ?? step.instance.createdAt;
    const age = ageOf(since);
    const requester = step.instance.employee?.users
        ? `${step.instance.employee.users.firstName} ${step.instance.employee.users.lastName}`.trim()
        : 'Employee';

    // For resubmitted items: highlight them to indicate they need immediate re-review
    const hasResubmitted = type === 'reimbursement' && (step.requestDetails as any)?.resubmittedCount > 0;
    const highlightTone = hasResubmitted ? 'indigo' : tone;

    const highlightPair = tonePair(highlightTone);

    return (
        <Box
            onClick={onOpen}
            sx={{
                position: 'relative', cursor: 'pointer', minWidth: 0,
                borderRadius: '14px', overflow: 'hidden',
                border: `1px solid ${hasResubmitted ? highlightPair.fg + '40' : theme.palette.divider}`,
                bgcolor: hasResubmitted ? highlightPair.soft : 'background.paper',
                transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
                '&:hover': {
                    borderColor: highlightPair.fg,
                    boxShadow: `0 6px 20px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,.35)' : 'rgba(15,23,42,.08)'}`,
                    transform: 'translateY(-1px)',
                },
                '&:focus-visible': { outline: `2px solid ${highlightPair.fg}`, outlineOffset: 2 },
            }}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
        >
            <Box sx={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: hasResubmitted ? 5 : (age.days >= 2 ? 5 : 3),
                bgcolor: hasResubmitted ? highlightPair.fg : (age.days >= 4 ? tonePair('danger').fg : age.days >= 2 ? tonePair('warning').fg : pair.fg),
            }} />

            <Box sx={{ pl: { xs: 2, sm: 2.5 }, pr: { xs: 1.75, sm: 2 }, py: { xs: 1.75, sm: 2 } }}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
                    <Box sx={{
                        width: 24, height: 24, borderRadius: '7px', flexShrink: 0,
                        display: 'grid', placeItems: 'center', bgcolor: highlightPair.soft, color: highlightPair.fg,
                    }}>
                        <KTIcon iconName={domain?.icon ?? 'information'} className="fs-7" />
                    </Box>
                    <Typography sx={{
                        fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em',
                        textTransform: 'uppercase', color: highlightPair.fg,
                    }}>
                        {hasResubmitted ? '⟳ Resubmitted' : (domain?.label ?? type)}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>.</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                        {requester}
                    </Typography>
                    {step.delegatedFrom && <ToneChip dense tone="cyan" label={`via ${step.delegatedFrom}`} />}
                    <Box sx={{ flex: 1 }} />
                    <Typography sx={{
                        fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: age.tone === 'neutral' ? theme.palette.text.disabled : tonePair(age.tone).fg,
                    }}>
                        {age.label}
                    </Typography>
                </Stack>

                <Stack direction="row" alignItems="flex-start" gap={1.5} sx={{ minWidth: 0 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                            {summary.title}
                        </Typography>
                        {summary.facts.length > 0 && (
                            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.35 }}>
                                {summary.facts.join(' . ')}
                            </Typography>
                        )}
                        {summary.statusFlow && (
                            <Typography sx={{
                                fontSize: 12.5, color: 'text.secondary', mt: 0.5, fontWeight: 600, fontStyle: 'italic',
                            }}>
                                {summary.statusFlow}
                            </Typography>
                        )}
                        {summary.note && (
                            <Typography sx={{
                                fontSize: 12.5, color: 'text.secondary', mt: 0.6, lineHeight: 1.5,
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>
                                "{summary.note}"
                            </Typography>
                        )}
                        {!!summary.chips?.length && (
                            <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.9 }}>
                                {summary.chips.map((c) => <ToneChip key={c.label} dense tone={c.tone} label={c.label} />)}
                            </Stack>
                        )}
                    </Box>
                    {summary.value && (
                        <Typography sx={{
                            fontSize: 16, fontWeight: 800, color: 'text.primary',
                            whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                        }}>
                            {summary.value}
                        </Typography>
                    )}
                </Stack>

                {canDecide && (
                    <Stack
                        direction="row" gap={0.75} flexWrap="wrap"
                        sx={{ mt: 1.5, pt: 1.25, borderTop: `1px solid ${theme.palette.divider}` }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {onAsk && (
                            <WtButton size="small" ghost disabled={busy} onClick={onAsk}>Ask</WtButton>
                        )}
                        <Box sx={{ flex: 1 }} />
                        {onReject && (
                            <WtButton size="small" ghost disabled={busy} onClick={onReject}>Reject</WtButton>
                        )}
                        {onApprove && (
                            <WtButton size="small" disabled={busy} onClick={onApprove}>
                                {busy ? 'Working...' : 'Approve'}
                            </WtButton>
                        )}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}
