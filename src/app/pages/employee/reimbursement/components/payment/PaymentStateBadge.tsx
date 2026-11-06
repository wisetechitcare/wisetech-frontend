import { Badge } from '@/ds/ui/badge';
import { PAYMENT_STATE_LABEL, PaymentState } from './paymentData';

/** One meaning per colour, from the design system's status set — and always a label beside it. */
const VARIANT: Record<PaymentState, 'success' | 'warning' | 'danger'> = {
    PAID: 'success',
    PARTIAL: 'warning',
    UNPAID: 'danger',
};

/**
 * The payment state chip used by the queue, the history and the detail drawer. `label` overrides
 * the wording where the same state reads differently (a payment record is a "Full payment", not "Paid").
 */
export default function PaymentStateBadge({ state, label }: { state: string; label?: string }) {
    const known = state in VARIANT ? (state as PaymentState) : null;
    return (
        <Badge variant={known ? VARIANT[known] : 'neutral'} dot>
            {label ?? (known ? PAYMENT_STATE_LABEL[known] : state)}
        </Badge>
    );
}
