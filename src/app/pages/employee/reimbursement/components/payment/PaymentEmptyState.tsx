import { Box } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { WtButton } from '@app/modules/common/components/ui/buttons';

/**
 * What the page says when there is nothing to do.
 *
 * An empty ten-row table is the worst answer to "is there anything waiting on me?" — it looks
 * like a loading failure and reads as an unanswered question. A caught-up queue is good news and
 * should say so; a filtered-empty view is a different situation and gets a way out instead.
 */
export default function PaymentEmptyState({
    icon = 'check-circle',
    tone = '#16a34a',
    title,
    body,
    actionLabel,
    onAction,
}: {
    icon?: string;
    tone?: string;
    title: string;
    body: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.75, flexWrap: 'wrap',
            px: 2.5, py: 2,
            borderRadius: '12px',
            border: '1px dashed', borderColor: 'divider',
            bgcolor: 'action.hover',
        }}>
            <Box aria-hidden sx={{
                width: 34, height: 34, borderRadius: '10px', display: 'grid', placeItems: 'center',
                flexShrink: 0, color: tone, bgcolor: 'background.paper',
                border: '1px solid', borderColor: 'divider',
            }}>
                <KTIcon iconName={icon} className="fs-4" />
            </Box>

            <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
                <Box sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'text.primary' }}>{title}</Box>
                <Box sx={{ fontSize: '0.82rem', color: 'text.secondary', lineHeight: 1.5 }}>{body}</Box>
            </Box>

            {actionLabel && onAction && (
                <WtButton ghost size="small" onClick={onAction}>{actionLabel}</WtButton>
            )}
        </Box>
    );
}
