import { Box, Divider, Drawer, Typography, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { KTIcon } from '@metronic/helpers';
import { WtButton } from '@app/modules/common/components/ui/buttons';
import { StatusBadge } from '@app/modules/common/components/ui/patterns';
import { fmtDate, formatINR, PAYMENT_TONE, STATUS_LABEL, StatusNum } from '../../utils/reimbursementFormat';
import { PaymentBatchRow, PAYMENT_STATE_LABEL } from './paymentData';

/**
 * One batch, opened beside the queue rather than on top of it.
 *
 * Clicking a row used to throw the full approval modal over the page — the approver's surface,
 * borrowed by an accountant who wanted to know what a payout consists of. A drawer keeps the
 * queue visible behind it, which is what you want when you are working down a list.
 *
 * It shows what a payment decision needs and stops: who, how much is left, what the money was
 * for. The approval history stays in the batch modal, one click further in.
 */

const trioFor = (color: string) => ({ c: color, bg: color + '1A', bd: color + '44' });

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography sx={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
                textTransform: 'uppercase', color: 'text.secondary',
            }}>
                {label}
            </Typography>
            <Typography sx={{
                fontSize: 17, fontWeight: 800, lineHeight: 1.3,
                fontVariantNumeric: 'tabular-nums',
                color: tone ?? 'text.primary',
            }}>
                {value}
            </Typography>
        </Box>
    );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.75 }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{label}</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.primary', textAlign: 'right', minWidth: 0 }}>
                {value}
            </Typography>
        </Box>
    );
}

export default function PaymentDetailDrawer({
    row,
    onClose,
    onPay,
    onOpenBatch,
    canPay,
}: {
    row: PaymentBatchRow | null;
    onClose: () => void;
    onPay: (row: PaymentBatchRow) => void;
    onOpenBatch: (row: PaymentBatchRow) => void;
    canPay: boolean;
}) {
    const stateColor = row ? (PAYMENT_TONE[row.state]?.color ?? '#475569') : '#475569';
    const payable = !!row && row.remainingAmount > 0;

    return (
        <Drawer
            anchor="right"
            open={!!row}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, maxWidth: '100%' } }}
        >
            {row && (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Header */}
                    <Box sx={{
                        px: 2.5, py: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5,
                        borderBottom: '1px solid', borderColor: 'divider',
                    }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary' }}>
                                Payment details
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                {row.employeeName} · {row.employeeCode}
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={onClose}
                            size="small"
                            aria-label="Close payment details"
                            sx={{ ml: 'auto' }}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Scrolling body */}
                    <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            <Box component="span" sx={{
                                fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700,
                                px: 1, py: '3px', borderRadius: '6px',
                                bgcolor: 'action.hover', color: 'text.primary',
                            }}>
                                {row.submissionId}
                            </Box>
                            <StatusBadge trio={trioFor(stateColor)} label={PAYMENT_STATE_LABEL[row.state]} />
                        </Box>

                        {/* Financial summary — the three numbers a payout decision needs */}
                        <Box sx={{
                            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 1.5,
                            p: 1.75, mb: 2, borderRadius: '12px',
                            border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover',
                        }}>
                            <Figure label="Approved" value={formatINR(row.approvedAmount)} />
                            <Figure label="Paid" value={formatINR(row.paidAmount)} tone="#16a34a" />
                            <Figure label="Remaining" value={formatINR(row.remainingAmount)} tone={row.remainingAmount > 0 ? '#1E3A8A' : '#16a34a'} />
                        </Box>

                        <Field label="Requests" value={`${row.totalRequests} approved`} />
                        <Field label="Submitted" value={fmtDate(row.submittedAt)} />
                        <Field label="Approved on" value={fmtDate(row.approvedAt)} />
                        {row.periodStart && (
                            <Field
                                label="Expense period"
                                value={`${fmtDate(row.periodStart)} – ${fmtDate(row.periodEnd)}`}
                            />
                        )}

                        {/* Payments already recorded against this batch */}
                        {row.payments.length > 0 && (
                            <>
                                <Divider sx={{ my: 2 }} />
                                <Typography sx={{
                                    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
                                    textTransform: 'uppercase', color: 'text.secondary', mb: 1,
                                }}>
                                    Payments recorded
                                </Typography>
                                {row.payments.map((p) => (
                                    <Box key={p.id} sx={{
                                        display: 'flex', justifyContent: 'space-between', gap: 1.5,
                                        py: 1, borderBottom: '1px solid', borderColor: 'divider',
                                    }}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                                                {fmtDate(p.paymentDate)}
                                            </Typography>
                                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                                                {(p.paymentMethod || '—').replace(/_/g, ' ')}
                                                {p.transactionId ? ` · ${p.transactionId}` : ''}
                                                {p.processedBy !== 'N/A' ? ` · by ${p.processedBy}` : ''}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{
                                            fontSize: 13, fontWeight: 700, color: '#16a34a',
                                            fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                                        }}>
                                            {formatINR(p.amountPaid)}
                                        </Typography>
                                    </Box>
                                ))}
                            </>
                        )}

                        {/* The expenses this payout covers */}
                        <Divider sx={{ my: 2 }} />
                        <Typography sx={{
                            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
                            textTransform: 'uppercase', color: 'text.secondary', mb: 1,
                        }}>
                            Reimbursement items
                        </Typography>
                        {row.lines.map((line) => (
                            <Box key={line.id} sx={{
                                display: 'flex', justifyContent: 'space-between', gap: 1.5,
                                py: 1, borderBottom: '1px solid', borderColor: 'divider',
                                opacity: line.status === 1 ? 1 : 0.55,
                            }}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600 }}>
                                        {line.category}
                                    </Typography>
                                    <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary' }}>
                                        {fmtDate(line.expenseDate)} · {line.project}
                                        {/* A rejected line sits in the batch but is never payable — saying so
                                            is what stops "the total doesn't match the lines". */}
                                        {line.status !== 1 ? ` · ${STATUS_LABEL[line.status as StatusNum] ?? 'Not approved'}` : ''}
                                    </Typography>
                                </Box>
                                <Typography sx={{
                                    fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                                    fontVariantNumeric: 'tabular-nums',
                                    color: line.status === 1 ? 'text.primary' : 'text.secondary',
                                    textDecoration: line.status === 2 ? 'line-through' : 'none',
                                }}>
                                    {formatINR(line.amount)}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* Actions — only what this state and this user actually allow */}
                    <Box sx={{
                        px: 2.5, py: 2, display: 'flex', gap: 1, flexWrap: 'wrap',
                        borderTop: '1px solid', borderColor: 'divider',
                    }}>
                        {canPay && payable && (
                            <WtButton size="small" onClick={() => onPay(row)}>
                                Record payment
                            </WtButton>
                        )}
                        <WtButton ghost size="small" onClick={() => onOpenBatch(row)}>
                            View reimbursement
                        </WtButton>
                    </Box>
                </Box>
            )}
        </Drawer>
    );
}
