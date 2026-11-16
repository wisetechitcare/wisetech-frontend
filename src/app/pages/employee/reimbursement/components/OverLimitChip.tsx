import { TriangleAlert } from 'lucide-react';
import { Badge } from '@/ds/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip';
import { formatMoney } from '../utils/reimbursementFormat';

/**
 * Marks an expense that exceeded a spend limit.
 *
 * This was communicated by turning the amount red and nothing else — no label, no icon, no
 * tooltip. Colour alone is not information: it is invisible to a screen reader, invisible to
 * roughly one man in twelve, and it does not say what the limit was even to someone who sees it
 * perfectly. An approver looking at a red number could not tell whether it was over a category
 * cap, over the employee's per-request limit, or simply large.
 *
 * The chip carries the word as well as the colour, and names the cap when it is known — a kit
 * Badge with the kit Tooltip (focusable, so keyboard users get the tooltip too).
 */

interface OverLimitChipProps {
    /** The cap that was breached, when the caller knows it. Renders a bare chip when it does not. */
    limit?: number | string | null;
    /** What the cap belongs to, e.g. "Travel" — used in the tooltip. */
    limitLabel?: string | null;
}

export default function OverLimitChip({ limit, limitLabel }: OverLimitChipProps) {
    const cap = Number(limit ?? NaN);
    const hasCap = Number.isFinite(cap) && cap > 0;
    const tooltip = hasCap
        ? `Over the ${limitLabel ? `${limitLabel} ` : ''}limit of ${formatMoney(cap)}`
        : 'This expense exceeded a spend limit';

    return (
        <Tooltip>
            <TooltipTrigger render={<Badge variant="warning" tabIndex={0} className="cursor-help" />}>
                <TriangleAlert aria-hidden />
                Over Limit
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
}
