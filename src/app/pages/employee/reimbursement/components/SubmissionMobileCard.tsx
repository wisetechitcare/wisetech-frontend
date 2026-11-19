import dayjs from 'dayjs';
import { cn } from '@/ds/lib/utils';
import { toneStyle } from '@/ds/lib/tone';
import { Badge } from '@/ds/ui/badge';
import { SensitiveValue, useSensitive } from '@/ds/patterns/sensitive';
import { formatMoney, PAYMENT_LABEL, STATUS, STATUS_LABEL, STATUS_TONE, type StatusNum } from '../utils/reimbursementFormat';

/**
 * One submission, as it reads on a phone.
 *
 * The submissions list is eight columns wide. On a 360px screen that is a horizontal scroller:
 * the reader sees Batch ID and half of Submitted On, and has to swipe sideways to find out
 * whether they have been paid — which is the only reason they opened the page.
 *
 * So the card is ordered by what is actually being asked, not by the column order: how much,
 * what happened to it, and only then the bookkeeping. The two statuses stay separate — approved
 * and paid are different questions, and merging them into one badge is the conflation the whole
 * module has spent several phases undoing.
 */

const PAYMENT: Record<string, { label: string; className: string }> = {
    PAID: { label: PAYMENT_LABEL.PAID, className: 'text-success-foreground' },
    PARTIAL: { label: PAYMENT_LABEL.PARTIAL, className: 'text-warning-foreground' },
    UNPAID: { label: PAYMENT_LABEL.UNPAID, className: 'text-muted-foreground' },
};

export interface SubmissionMobileCardProps {
    row: any;
    onOpen?: (id: string) => void;
}

function SubmissionMobileCard({ row, onOpen }: SubmissionMobileCardProps) {
    const status = Number(row?._status ?? 0) as StatusNum;
    // The same tone as the wide table's row and badge (STATUS_TONE), so the two views agree at a glance.
    const tone = STATUS_TONE[status] ?? STATUS_TONE[STATUS.PENDING];
    // No payment status means nothing in the batch is payable yet (pending) or ever (rejected) — the wide table says
    // "N/A". Defaulting it to UNPAID printed "Awaiting payment" on a REJECTED batch.
    const payment = row?._paymentStatus
        ? PAYMENT[String(row._paymentStatus).toUpperCase()] ?? PAYMENT.UNPAID
        : null;
    const submittedAt = row?._submittedAt ? dayjs(row._submittedAt) : null;
    const expenses = Number(row?._totalRequests ?? 0);

    // "Hide amounts" applies on the phone too — the card used to print the figure in clear while the wide
    // table beside it blurred the same number.
    const sensitive = useSensitive();
    const open = () => onOpen?.(row?.id ?? row?._id);

    return (
        <div data-wt-control="row"
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            onClick={onOpen ? open : undefined}
            onKeyDown={onOpen ? (e) => {
                // Enter and Space, because a div with role="button" gets neither for free.
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
            } : undefined}
            // The amount is left out of the spoken name while amounts are hidden — a blurred figure must not be read aloud.
            aria-label={onOpen ? [`Submission ${row?._submissionId ?? ''}`, sensitive.visible ? formatMoney(row?._totalAmount) : null, STATUS_LABEL[status]].filter(Boolean).join(', ') : undefined}
            style={toneStyle(tone)}
            className={cn(
                // OKLab, not OKLCH: mixing a hue into a neutral surface in OKLCH interpolates HUE (the card's is 0), so
                // green at 6% came out pink. OKLab has no hue axis, so a tint stays the tone's colour.
                'rounded-2xl border bg-[color-mix(in_oklab,var(--tone)_6%,var(--card))] px-4 py-3.5 shadow-[inset_3px_0_0_var(--tone)] outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                onOpen && 'cursor-pointer',
            )}
        >
            {/* The amount leads. It is the number the page exists to report. */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="tabular text-xl leading-tight font-extrabold text-foreground"><SensitiveValue>{formatMoney(row?._totalAmount)}</SensitiveValue></div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        {expenses} expense{expenses === 1 ? '' : 's'}
                    </div>
                </div>
                <Badge variant={tone}>{STATUS_LABEL[status] ?? 'Pending'}</Badge>
            </div>

            <div className="my-3 h-px bg-border" />

            <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                    {submittedAt?.isValid() ? `Sent ${submittedAt.format('D MMM YYYY')}` : 'Not sent yet'}
                </span>
                {/* Approved and paid are different questions — never one badge. */}
                {payment && <span className={cn('font-bold', payment.className)}>{payment.label}</span>}
            </div>

            {row?._submissionId && (
                <div className="mt-2 font-mono text-[11px] text-muted-foreground">{row._submissionId}</div>
            )}
        </div>
    );
}

export default SubmissionMobileCard;
