import { Box, Stack, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { KTIcon } from '@metronic/helpers';
import { ToneChip, WtButton, tonePair } from '@app/modules/common/components/ui';
import type { SemanticTone } from '@app/theme/tokens';
import { formatDate, formatTime } from '@utils/dateFormats';
import EmployeeIdentityCell from '@app/modules/common/components/EmployeeIdentityCell';
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

/**
 * One person, and what they owe.
 *
 * A batch is routinely waiting on two people at once — the employee on a queried line, the next
 * approver on one that has already cleared a level. A single "Next: …" line has to pick one of
 * them and silently drop the other, which is how a card came to name the approver while a
 * question sat unanswered with the employee.
 */
export interface WaitOwner {
    /** What is being waited for, in the same words the request rows use. */
    reason: string;
    who: string;
    tone: SemanticTone;
}

export interface ItemSummary {
    title: string;
    facts: string[];
    note?: string | null;
    chips?: Array<{ label: string; tone: SemanticTone }>;
    value?: string | null;
    statusFlow?: string | null;
    /** Every outstanding wait, one row each. Falls back to `step.waitingOn` when absent. */
    waits?: WaitOwner[];
    /**
     * The same facts, labelled, for the detail dialog. `facts` is a one-line summary for a card;
     * in a modal the reader has room to be told WHICH date and WHICH time each value is, instead
     * of decoding a dot-separated run of numbers.
     */
    rows?: Array<{ label: string; value: string }>;
}

const money = (v: unknown) =>
    `₹${Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Worked span between two punches, `7h 14m`. Null unless both exist and run forwards. */
const workedSpan = (from?: string | null, to?: string | null): string | null => {
    if (!from || !to) return null;
    const mins = dayjs(to).diff(dayjs(from), 'minute');
    if (!Number.isFinite(mins) || mins <= 0) return null;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const range = (from?: string | null, to?: string | null): string | null => {
    if (!from) return null;
    if (!to || dayjs(from).isSame(dayjs(to), 'day')) return formatDate(from);
    return `${formatDate(from)} - ${formatDate(to)}`;
};

/**
 * `variant` is the TAB the card is sitting in. A part-decided batch appears in both: the lines
 * still in front of you under "Needs my action", the ones you have already approved under
 * "Waiting on others". Each card describes only its own slice, so the two never claim the same
 * expense twice.
 */
export const summarise = (step: ApprovalStep, variant: 'mine' | 'awaiting' | 'done' = 'mine'): ItemSummary => {
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
        // `checkIn`/`checkOut` are full ISO instants. Printed as-is they read
        // "2026-08-18T06:31:00.000Z -> 2026-08-18T13:45:00.000Z" — the date twice over, in the
        // wrong format, plus a zone suffix, for what is a punch pair on one day.
        const day = d.dateFrom ?? d.checkIn ?? d.checkOut;
        const inAt = d.checkIn ? formatTime(d.checkIn) : null;
        const outAt = d.checkOut ? formatTime(d.checkOut) : null;
        const worked = workedSpan(d.checkIn, d.checkOut);

        const facts = [
            day ? formatDate(day) : null,
            inAt && outAt ? `${inAt} → ${outAt}` : inAt ? `In ${inAt}` : outAt ? `Out ${outAt}` : null,
            worked,
        ].filter(Boolean) as string[];

        const rows = [
            day ? { label: 'Date', value: formatDate(day) } : null,
            { label: 'Check-in', value: inAt ?? 'Not requested' },
            { label: 'Check-out', value: outAt ?? 'Not requested' },
            worked ? { label: 'Hours', value: worked } : null,
        ].filter(Boolean) as ItemSummary['rows'];

        return { title: d.subType || 'Attendance correction', facts, rows, note: d.reason || d.description };
    }

    if (type === 'reimbursement') {
        const chips: ItemSummary['chips'] = [];
        const hasResubmitted = d.resubmittedCount && d.resubmittedCount > 0;
        // Only the lines still at an open level in front of THIS approver are "ready" — the ones
        // that cleared a level are with the next approver, and a queried or decided line is not
        // waiting on anyone here. A batch of five used to read "5 ready" until the last decision.
        const inProgressCount = d.inProgressCount ?? 0;
        const readyCount = d.readyCount ?? Math.max(0, (d.pendingCount ?? 0) - inProgressCount);
        const hasPending = readyCount > 0;
        const hasQueried = d.queriedCount && d.queriedCount > 0;
        const hasApproved = d.approvedCount && d.approvedCount > 0;
        const hasRejected = d.rejectedCount && d.rejectedCount > 0;

        // The "Waiting on others" face of the batch: what you have handed on — approved to the next
        // level, or queried back to the employee. What is still in front of you is the other tab's
        // card, and neither card counts the other's expenses.
        // Refused expenses are shown wherever the batch is shown, in red, and counted in nothing:
        // they are out of the workflow, not part of what anyone is still waiting to be paid.
        const rejectedChip = hasRejected
            ? { label: `${d.rejectedCount} rejected · ${money(d.rejectedAmount ?? 0)}`, tone: 'danger' as SemanticTone }
            : null;

        // Your own submission, read out rather than demanded of you. The counts below are written
        // for an approver — "3 items ready for approval" on a claim you filed yourself asks you to
        // do something you cannot do, and names none of what you actually want to know.
        if (step.submittedByMe) {
            const awaitingApproval = (d.pendingCount ?? 0);
            const ownChips: ItemSummary['chips'] = [];
            if (awaitingApproval > 0) {
                ownChips.push({ label: `${awaitingApproval} awaiting approval`, tone: 'warning' });
            }
            if (d.queriedCount > 0) {
                ownChips.push({ label: `${d.queriedCount} question open`, tone: 'cyan' });
            }
            if (d.approvedCount > 0) ownChips.push({ label: `${d.approvedCount} approved`, tone: 'success' });
            if (rejectedChip) ownChips.push(rejectedChip);
            return {
                title: d.submissionId ? `Submission ${d.submissionId}` : 'Expense claim',
                facts: [`${d.totalRequests ?? 0} expense${(d.totalRequests ?? 0) === 1 ? '' : 's'}`],
                chips: ownChips,
                value: d.totalAmount != null ? money(d.totalAmount) : null,
            };
        }

        const withOthersCount = inProgressCount + (d.queriedCount ?? 0);
        if (variant === 'awaiting' && withOthersCount > 0) {
            const withOthersChips: ItemSummary['chips'] = [];
            if (inProgressCount > 0) withOthersChips.push({ label: `${inProgressCount} with next approver`, tone: 'neutral' });
            if (d.queriedCount > 0) withOthersChips.push({ label: `${d.queriedCount} awaiting employee response`, tone: 'cyan' });
            if (rejectedChip) withOthersChips.push(rejectedChip);

            // Both halves get named. `waitingOn` carries the next approver whenever ANY line is
            // still in the chain, so the employee's name has to come off the instance — otherwise
            // the query row would repeat the approver and the question would have no owner.
            const employeeName = [step.instance.employee?.users?.firstName, step.instance.employee?.users?.lastName]
                .filter(Boolean).join(' ').trim();
            const waits: WaitOwner[] = [];
            if (d.queriedCount > 0) {
                waits.push({ reason: 'Query', who: employeeName || 'the employee', tone: 'cyan' });
            }
            if (inProgressCount > 0) {
                const next = step.waitingOn?.role === 'APPROVER' ? step.waitingOn.name : null;
                waits.push({ reason: 'Approval', who: next || 'the next approver', tone: 'neutral' });
            }
            return {
                waits,
                title: d.submissionId ? `Submission ${d.submissionId}` : 'Expense claim',
                facts: [
                    `${withOthersCount} of ${d.totalRequests ?? withOthersCount} expense${(d.totalRequests ?? withOthersCount) === 1 ? '' : 's'}`,
                    money((d.inProgressAmount ?? 0) + (d.queriedAmount ?? 0)),
                ],
                chips: withOthersChips,
                statusFlow: inProgressCount > 0
                    ? `✓ Approved by you • now with the next approver`
                    : `❓ Waiting for the employee to answer`,
                value: money((d.inProgressAmount ?? 0) + (d.queriedAmount ?? 0)),
            };
        }

        // Determine primary status chips to show (most important first)
        if (hasResubmitted) {
            chips.push({ label: `${d.resubmittedCount} item${d.resubmittedCount === 1 ? '' : 's'} awaiting re-review`, tone: 'indigo' });
        }

        if (hasPending && !hasResubmitted) {
            chips.push({ label: `${readyCount} item${readyCount === 1 ? '' : 's'} ready for approval`, tone: 'warning' });
        } else if (hasPending && hasResubmitted) {
            chips.push({ label: `${readyCount} item${readyCount === 1 ? '' : 's'} also pending`, tone: 'warning' });
        }

        // Queried, approved and rejected lines are somebody else's business — the query is with the
        // employee, the decisions are done. On "Needs my action" they are noise; the Resolved tab
        // (variant 'done') is where the whole batch is described.
        if (variant === 'done') {
            if (hasQueried) {
                chips.push({ label: `${d.queriedCount} item${d.queriedCount === 1 ? '' : 's'} awaiting employee response`, tone: 'cyan' });
            }
            if (hasApproved) chips.push({ label: `${d.approvedCount} approved`, tone: 'success' });
        }
        // Rejections belong to the tabs that describe a batch, not the one that asks for work:
        // on "Needs my action" a refused line read as part of what was still waiting on you.
        if (variant !== 'mine' && rejectedChip) chips.push(rejectedChip);

        // The card counts what opening it will show. A card reading "5 expenses · ₹5.00" that opens
        // onto the two rows still awaiting you, worth ₹2.00, is not describing the same thing twice.
        const shownRequests = variant === 'done' ? (d.totalRequests ?? 0) : readyCount;
        const shownAmount = variant === 'done'
            ? Number(d.totalAmount ?? 0)
            : Number(d.readyAmount ?? d.totalAmount ?? 0);

        const facts: string[] = [];
        if (shownRequests) facts.push(`${shownRequests} expense${shownRequests === 1 ? '' : 's'}`);
        if (d.totalAmount != null) {
            facts.push(`₹${money(shownAmount).replace('₹', '')}`);
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
        } else if (inProgressCount > 0) {
            // Nothing here is yours any more, but the batch is not finished either — "Completed"
            // would have been a lie and "pending" a demand for action that does not exist.
            statusFlow = `→ ${inProgressCount} ${inProgressCount === 1 ? 'expense is' : 'expenses are'} with the next approver`;
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
            value: d.totalAmount != null ? money(shownAmount) : null,
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
    compact?: boolean;
    /** Which queue tab this card is in — decides which slice of a part-decided batch it describes. */
    variant?: 'mine' | 'awaiting' | 'done';
}

export default function InboxItemCard({
    step, canDecide, busy = false, onOpen, onApprove, onReject, onAsk, compact = false, variant = 'mine',
}: InboxItemCardProps) {
    const theme = useTheme();
    const type = (step.instance.workflowType || '').toLowerCase();
    const domain = getApprovalDomain(type);
    const tone = domain?.tone ?? 'brand';
    const pair = tonePair(tone);
    const summary = summarise(step, variant);
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
                borderRadius: compact ? '12px' : '16px', overflow: 'hidden',
                border: `1px solid ${hasResubmitted ? highlightPair.fg + '60' : theme.palette.divider}`,
                bgcolor: hasResubmitted ? highlightPair.soft : 'background.paper',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)',
                '&:hover': {
                    borderColor: highlightPair.fg,
                    boxShadow: `0 8px 24px -8px ${highlightPair.fg}25, 0 4px 12px rgba(0,0,0,0.03)`,
                    transform: 'translateY(-2px)',
                },
                '&:focus-visible': { outline: `2px solid ${highlightPair.fg}`, outlineOffset: 2 },
            }}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
        >
            <Box sx={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: compact ? 3 : (hasResubmitted ? 5 : (age.days >= 2 ? 5 : 3)),
                bgcolor: hasResubmitted ? highlightPair.fg : (age.days >= 4 ? tonePair('danger').fg : age.days >= 2 ? tonePair('warning').fg : pair.fg),
            }} />

            <Box sx={{ p: compact ? 2 : { pl: { xs: 2.5, sm: 3 }, pr: { xs: 2, sm: 2.5 }, py: { xs: 2, sm: 2.5 } }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {compact ? (
                    <>
                        {/* Header: Status badge + icon */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Box sx={{
                                width: 22, height: 22, borderRadius: '6px', flexShrink: 0,
                                display: 'grid', placeItems: 'center', bgcolor: highlightPair.soft, color: highlightPair.fg,
                            }}>
                                <KTIcon iconName={domain?.icon ?? 'information'} className="fs-7" />
                            </Box>
                            <Typography sx={{
                                fontSize: '10px', fontWeight: 800, letterSpacing: '.08em',
                                textTransform: 'uppercase', color: highlightPair.fg, lineHeight: 1,
                            }}>
                                {hasResubmitted ? '⟳ Resubmitted' : (domain?.label ?? type)}
                            </Typography>
                            {/* How long it has waited. The left edge was already tinted by age,
                                which tells you nothing unless you know the code. */}
                            <Box sx={{ flex: 1 }} />
                            <Typography sx={{
                                fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
                                fontVariantNumeric: 'tabular-nums',
                                color: age.tone === 'neutral' ? 'text.disabled' : tonePair(age.tone).fg,
                            }}>
                                {age.label}
                            </Typography>
                        </Box>

                        {/* Who sent it. The compact card showed only the submission id, so a queue of
                            three cards was three unattributable numbers. */}
                        <Box sx={{ mb: 1 }}>
                            <EmployeeIdentityCell name={requester} dense fluid />
                        </Box>

                        {/* Title - main content */}
                        <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'text.primary', lineHeight: 1.4, mb: 0.75 }}>
                            {summary.title}
                        </Typography>

                        {/* Meta info: facts + value */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1, gap: 1 }}>
                            <Box sx={{ minWidth: 0 }}>
                                {/* All of them. This took `facts.slice(0, 1)`, so an attendance
                                    card showed the date and dropped the punch times and hours —
                                    everything the approver is actually deciding on. */}
                                {summary.facts.length > 0 && (
                                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', lineHeight: 1.35 }}>
                                        {summary.facts.join(' · ')}
                                    </Typography>
                                )}
                            </Box>
                            {summary.value && (
                                <Typography sx={{
                                    fontSize: '14px', fontWeight: 800, color: highlightPair.fg,
                                    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flex: '0 0 auto',
                                }}>
                                    {summary.value}
                                </Typography>
                            )}
                        </Box>

                        {/* Status chips. Was chips[0] only, which dropped the rejected count off a
                            mixed batch — the one line an approver most needs to see is gone. */}
                        {summary.chips && summary.chips.length > 0 && (
                            <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                                {summary.chips.slice(0, 3).map((c) => (
                                    <ToneChip key={c.label} dense tone={c.tone} label={c.label} />
                                ))}
                            </Stack>
                        )}

                        {/* Whose move it is. A queue row that says how long it has waited but not
                            who it is waiting ON leaves you opening the card to find out — and a
                            batch stuck behind two different people needs both of them named. */}
                        {summary.waits?.length ? (
                            <Stack gap={0.4} sx={{ mb: 1, minWidth: 0 }}>
                                {summary.waits.map((w) => (
                                    <Box key={w.reason} sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
                                        <Box sx={{
                                            px: 0.6, borderRadius: '4px', flex: 'none',
                                            fontSize: '9px', fontWeight: 800, lineHeight: 1.6,
                                            textTransform: 'uppercase', letterSpacing: '0.05em',
                                            bgcolor: tonePair(w.tone).soft, color: tonePair(w.tone).fg,
                                        }}>
                                            {w.reason}
                                        </Box>
                                        <Typography sx={{
                                            fontSize: '11px', fontWeight: 700, color: 'text.primary', lineHeight: 1.25,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {w.who}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        ) : step.waitingOn?.name && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, minWidth: 0 }}>
                                <span style={{ color: theme.palette.text.disabled, display: 'inline-flex' }}>
                                    <KTIcon
                                        iconName={step.waitingOn.role === 'EMPLOYEE' ? 'time' : 'profile-circle'}
                                        className="fs-8"
                                    />
                                </span>
                                <Typography sx={{
                                    fontSize: '11px', color: 'text.secondary', lineHeight: 1.25,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {step.waitingOn.role === 'EMPLOYEE' ? 'Waiting on ' : 'Next: '}
                                    <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                        {step.waitingOn.name}
                                    </Box>
                                </Typography>
                            </Box>
                        )}

                        {/* Action buttons - subtle with hover color */}
                        {canDecide && (
                            <Box sx={{ mt: 'auto', pt: 1.25, display: 'flex', gap: 0.75, width: '100%' }} onClick={(e) => e.stopPropagation()}>
                                {onApprove && (
                                    <WtButton size="small" disabled={busy} sx={{
                                        flex: 1,
                                        fontSize: '11px',
                                        fontWeight: 650,
                                        py: 0.5,
                                        px: 1,
                                        borderRadius: '8px',
                                        border: `1px solid ${tonePair('success').fg}`,
                                        color: tonePair('success').fg,
                                        background: 'transparent !important',
                                        boxShadow: 'none',
                                        transition: 'all 160ms cubic-bezier(.22,.61,.36,1)',
                                        '&:hover': {
                                            background: `${tonePair('success').fg}15 !important`,
                                            borderColor: tonePair('success').fg,
                                            color: tonePair('success').fg,
                                            boxShadow: `0 2px 8px ${tonePair('success').fg}24`,
                                        },
                                    }} onClick={onApprove}>
                                        {busy ? '...' : 'Approve'}
                                    </WtButton>
                                )}
                                {onReject && (
                                    <WtButton size="small" disabled={busy} sx={{
                                        flex: 1,
                                        fontSize: '11px',
                                        fontWeight: 650,
                                        py: 0.5,
                                        px: 1,
                                        borderRadius: '8px',
                                        border: `1px solid ${tonePair('danger').fg}40`,
                                        color: tonePair('danger').fg,
                                        background: 'transparent !important',
                                        boxShadow: 'none',
                                        transition: 'all 160ms cubic-bezier(.22,.61,.36,1)',
                                        '&:hover': {
                                            background: `${tonePair('danger').fg}15 !important`,
                                            borderColor: tonePair('danger').fg,
                                            color: tonePair('danger').fg,
                                            boxShadow: `0 2px 8px ${tonePair('danger').fg}24`,
                                        },
                                    }} onClick={onReject}>
                                        Reject
                                    </WtButton>
                                )}
                            </Box>
                        )}
                    </>
                ) : (
                    <>
                        <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap" sx={{ mb: 1.5 }}>
                            <Box sx={{
                                width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
                                display: 'grid', placeItems: 'center', bgcolor: highlightPair.soft, color: highlightPair.fg,
                            }}>
                                <KTIcon iconName={domain?.icon ?? 'information'} className="fs-6" />
                            </Box>
                            <Typography sx={{
                                fontSize: 11, fontWeight: 800, letterSpacing: '.08em',
                                textTransform: 'uppercase', color: highlightPair.fg,
                            }}>
                                {hasResubmitted ? '⟳ Resubmitted' : (domain?.label ?? type)}
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>.</Typography>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>
                                {requester}
                            </Typography>
                            {step.delegatedFrom && <ToneChip dense tone="cyan" label={`via ${step.delegatedFrom}`} />}
                            <Box sx={{ flex: 1 }} />
                            <Typography sx={{
                                fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                                color: age.tone === 'neutral' ? theme.palette.text.disabled : tonePair(age.tone).fg,
                            }}>
                                {age.label}
                            </Typography>
                        </Stack>

                        <Stack direction="row" alignItems="flex-start" gap={2} sx={{ minWidth: 0 }}>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary', lineHeight: 1.35 }}>
                                    {summary.title}
                                </Typography>
                                {summary.facts.length > 0 && (
                                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
                                        {summary.facts.join(' · ')}
                                    </Typography>
                                )}
                                {summary.statusFlow && (
                                    <Typography sx={{
                                        fontSize: 13, color: 'text.secondary', mt: 0.75, fontWeight: 600, fontStyle: 'italic',
                                    }}>
                                        {summary.statusFlow}
                                    </Typography>
                                )}
                                {summary.note && (
                                    <Box sx={{
                                        p: 1.25,
                                        borderRadius: '8px',
                                        bgcolor: 'rgba(0, 0, 0, 0.02)',
                                        borderLeft: `3px solid ${theme.palette.divider}`,
                                        mt: 1
                                    }}>
                                        <Typography sx={{
                                            fontSize: '12px',
                                            color: 'text.secondary',
                                            lineHeight: 1.5,
                                            fontStyle: 'italic',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}>
                                            "{summary.note}"
                                        </Typography>
                                    </Box>
                                )}
                                {!!summary.chips?.length && (
                                    <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1.25 }}>
                                        {summary.chips.map((c) => <ToneChip key={c.label} dense tone={c.tone} label={c.label} />)}
                                    </Stack>
                                )}
                            </Box>
                            {summary.value && (
                                <Typography sx={{
                                    fontSize: 18, fontWeight: 800, color: 'text.primary',
                                    whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {summary.value}
                                </Typography>
                            )}
                        </Stack>

                        {canDecide && (
                            <Stack
                                direction="row" gap={1} flexWrap="wrap"
                                sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {onAsk && (
                                    <WtButton size="small" ghost disabled={busy} onClick={onAsk}>Ask</WtButton>
                                )}
                                <Box sx={{ flex: 1 }} />
                                {onReject && (
                                    <WtButton size="small" disabled={busy} onClick={onReject} sx={{
                                        fontSize: '11px',
                                        fontWeight: 650,
                                        py: 0.5,
                                        px: 1.5,
                                        borderRadius: '8px',
                                        border: `1px solid ${tonePair('danger').fg}40`,
                                        color: tonePair('danger').fg,
                                        background: 'transparent !important',
                                        boxShadow: 'none',
                                        transition: 'all 160ms cubic-bezier(.22,.61,.36,1)',
                                        '&:hover': {
                                            background: `${tonePair('danger').fg}15 !important`,
                                            borderColor: tonePair('danger').fg,
                                            color: tonePair('danger').fg,
                                            boxShadow: `0 2px 8px ${tonePair('danger').fg}24`,
                                        },
                                    }}>Reject</WtButton>
                                )}
                                {onApprove && (
                                    <WtButton size="small" disabled={busy} onClick={onApprove} sx={{
                                        fontSize: '11px',
                                        fontWeight: 650,
                                        py: 0.5,
                                        px: 1.5,
                                        borderRadius: '8px',
                                        border: `1px solid ${tonePair('success').fg}`,
                                        color: tonePair('success').fg,
                                        background: 'transparent !important',
                                        boxShadow: 'none',
                                        transition: 'all 160ms cubic-bezier(.22,.61,.36,1)',
                                        '&:hover': {
                                            background: `${tonePair('success').fg}15 !important`,
                                            borderColor: tonePair('success').fg,
                                            color: tonePair('success').fg,
                                            boxShadow: `0 2px 8px ${tonePair('success').fg}24`,
                                        },
                                    }}>
                                        {busy ? 'Working...' : 'Approve'}
                                    </WtButton>
                                )}
                            </Stack>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
}
