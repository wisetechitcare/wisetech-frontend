import type { ReactNode } from 'react';
import { CircleCheck } from 'lucide-react';
import { EmptyState } from '@/ds/patterns/empty-state';
import { Button } from '@/ds/ui/button';

/**
 * What the page says when there is nothing to do.
 *
 * An empty ten-row table is the worst answer to "is there anything waiting on me?" — it looks
 * like a loading failure and reads as an unanswered question. A caught-up queue is good news and
 * should say so; a filtered-empty view is a different situation and gets a way out instead.
 * Rendered with the design system's `EmptyState` (src/ds).
 */
export default function PaymentEmptyState({
    icon = <CircleCheck aria-hidden />,
    title,
    body,
    actionLabel,
    onAction,
}: {
    icon?: ReactNode;
    title: string;
    body: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <EmptyState
            icon={icon}
            title={title}
            description={body}
            action={actionLabel && onAction
                ? <Button variant="outline" size="sm" onClick={onAction}>{actionLabel}</Button>
                : undefined}
        />
    );
}
