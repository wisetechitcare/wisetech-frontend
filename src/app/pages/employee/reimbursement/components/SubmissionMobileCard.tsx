import dayjs from 'dayjs';
import { formatINR, STATUS_LABEL, StatusNum } from '../utils/reimbursementFormat';

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

/** Mirrors the row colour-coding of the wide table, so the two views agree at a glance. */
const TONE: Record<number, { bg: string; border: string; fg: string }> = {
    0: { bg: 'rgba(245,158,11,0.06)', border: '#f59e0b', fg: '#b45309' },   // pending
    1: { bg: 'rgba(16,185,129,0.06)', border: '#10b981', fg: '#047857' },   // approved
    2: { bg: 'rgba(239,68,68,0.06)', border: '#ef4444', fg: '#b91c1c' },    // rejected
    3: { bg: 'rgba(59,130,246,0.06)', border: '#3b82f6', fg: '#1d4ed8' },   // mixed
};

const PAYMENT_TONE: Record<string, string> = {
    PAID: '#047857',
    PARTIAL: '#b45309',
    UNPAID: '#64748b',
};

export interface SubmissionMobileCardProps {
    row: any;
    onOpen?: (id: string) => void;
}

function SubmissionMobileCard({ row, onOpen }: SubmissionMobileCardProps) {
    const status = Number(row?._status ?? 0);
    const tone = TONE[status] ?? TONE[0];
    const paymentStatus = String(row?._paymentStatus ?? 'UNPAID').toUpperCase();
    const submittedAt = row?._submittedAt ? dayjs(row._submittedAt) : null;
    const expenses = Number(row?._totalRequests ?? 0);

    const open = () => onOpen?.(row?.id ?? row?._id);

    return (
        <div
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            onClick={onOpen ? open : undefined}
            onKeyDown={onOpen ? (e) => {
                // Enter and Space, because a div with role="button" gets neither for free.
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
            } : undefined}
            aria-label={onOpen ? `Submission ${row?._submissionId ?? ''}, ${formatINR(row?._totalAmount)}, ${STATUS_LABEL[status as StatusNum] ?? ''}` : undefined}
            style={{
                background: tone.bg,
                borderLeft: `3px solid ${tone.border}`,
                border: '1px solid rgba(15,23,42,0.08)',
                borderRadius: 12,
                padding: '14px 16px',
                cursor: onOpen ? 'pointer' : undefined,
            }}
        >
            {/* The amount leads. It is the number the page exists to report. */}
            <div className='d-flex align-items-start justify-content-between gap-3'>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                        {formatINR(row?._totalAmount)}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {expenses} expense{expenses === 1 ? '' : 's'}
                    </div>
                </div>
                <span style={{
                    fontSize: 11, fontWeight: 700, color: tone.fg,
                    background: '#fff', border: `1px solid ${tone.border}`,
                    borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap',
                }}>
                    {STATUS_LABEL[status as StatusNum] ?? 'Pending'}
                </span>
            </div>

            <div style={{ height: 1, background: 'rgba(15,23,42,0.07)', margin: '12px 0' }} />

            <div className='d-flex align-items-center justify-content-between gap-2' style={{ fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>
                    {submittedAt?.isValid() ? `Sent ${submittedAt.format('D MMM YYYY')}` : 'Not sent yet'}
                </span>
                {/* Approved and paid are different questions — never one badge. */}
                <span style={{ color: PAYMENT_TONE[paymentStatus] ?? '#64748b', fontWeight: 700 }}>
                    {paymentStatus === 'PAID' ? 'Paid'
                        : paymentStatus === 'PARTIAL' ? 'Part paid'
                        : 'Awaiting payment'}
                </span>
            </div>

            {row?._submissionId && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, fontFamily: "'Fira Code', monospace" }}>
                    {row._submissionId}
                </div>
            )}
        </div>
    );
}

export default SubmissionMobileCard;
