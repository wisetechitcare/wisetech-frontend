import type { ReactNode } from 'react';
import { Badge } from '@/ds/ui/badge';
import type { SemanticTone } from '@app/theme/tokens';

/**
 * The v2 design-system `Badge`, addressed by the kit's semantic tone names.
 *
 * `ToneChip` (MUI) takes `tone="success"` and friends; this takes the same names, so moving a
 * status chip to the design system is a one-word swap at the call site instead of every screen
 * re-deciding which Badge variant each tone means. One mapping, here.
 */
const VARIANT = {
    brand: 'brand',
    success: 'success',
    danger: 'danger',
    warning: 'warning',
    indigo: 'brand',
    cyan: 'info',
    neutral: 'neutral',
} as const satisfies Record<SemanticTone, string>;

export function ToneBadge({
    tone = 'neutral',
    children,
    className,
}: {
    tone?: SemanticTone;
    children: ReactNode;
    className?: string;
}) {
    return (
        <Badge variant={VARIANT[tone]} dot className={className}>
            {children}
        </Badge>
    );
}
