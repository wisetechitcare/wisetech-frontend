import { RotateCw } from 'lucide-react';
import { EmptyState } from '@/ds/patterns/empty-state';
import { Button } from '@/ds/ui/button';

/**
 * Shown when a fetch failed.
 *
 * The module used to `catch { setRows([]) }` in seven places, which renders exactly like "you
 * have no expenses". A user cannot tell a failed request from an empty month, so a network blip
 * looked like data loss — the same confusion that produced the original ticket, arriving by a
 * different route.
 *
 * So this states plainly that loading failed, and offers the only useful action: try again.
 * It does not apologise, and it does not show a stack trace. The kit's error state (role="alert").
 */

interface LoadErrorStateProps {
    /** What could not be loaded, in the user's words: "your expenses", "payment history". */
    what: string;
    onRetry?: () => void;
}

export default function LoadErrorState({ what, onRetry }: LoadErrorStateProps) {
    return (
        <EmptyState
            variant="error"
            title={`Could not load ${what}`}
            description="This is a loading problem, not missing data — nothing has been deleted."
            action={onRetry ? (
                <Button variant="outline" onClick={onRetry}>
                    <RotateCw data-icon="inline-start" aria-hidden /> Try Again
                </Button>
            ) : undefined}
        />
    );
}
