import React from 'react';
import { Stack, Typography } from '@mui/material';
import { WtButton } from './buttons';
import { IconBox, TRIO, type Trio } from './patterns';

/**
 * WtEmptyState — the one empty state for the whole app.
 *
 * AN EMPTY SCREEN IS A QUESTION, AND MOST OF OURS DO NOT ANSWER IT. "No candidates yet" tells
 * someone what they can already see. What they need is what to do next, and a way to do it
 * without hunting for the button. A new tenant meets nothing BUT empty screens, so these are
 * the first impression of the whole product.
 *
 * Three deliberate parts:
 *   - `title`   what is not here, in plain words
 *   - `hint`    why that is normal, or what fills it
 *   - `action`  the way out, right where the eye already is
 *
 * A SEARCH THAT FOUND NOTHING IS NOT AN EMPTY LIST. Pass `variant="no-match"` for that: the
 * remedy is to change the search, not to create a record, and offering "Add candidate" to
 * someone who mistyped a name is answering a question they did not ask.
 */

export type WtEmptyStateVariant = 'empty' | 'no-match' | 'error';

export interface WtEmptyStateProps {
    /** Plain-words statement of what is not here. */
    title: string;
    /** Why that is normal, or what would fill it. One sentence. */
    hint?: string;
    /** KTIcon name. A sensible default is chosen per variant. */
    icon?: string;
    /** The way out. Omit where there is genuinely nothing the user can do. */
    actionLabel?: string;
    onAction?: () => void;
    /** `no-match` drops the create action and softens the tone; `error` colours it. */
    variant?: WtEmptyStateVariant;
    /** Accent for the icon tile. Defaults per variant. */
    tone?: Trio;
    /** Tightens the vertical rhythm inside a card or a dialog. */
    dense?: boolean;
}

const DEFAULTS: Record<WtEmptyStateVariant, { icon: string; tone: Trio }> = {
    empty: { icon: 'folder-added', tone: TRIO.blue },
    'no-match': { icon: 'magnifier', tone: TRIO.amber },
    error: { icon: 'information-5', tone: TRIO.rose },
};

export const WtEmptyState: React.FC<WtEmptyStateProps> = ({
    title, hint, icon, actionLabel, onAction, variant = 'empty', tone, dense,
}) => {
    const fallback = DEFAULTS[variant];
    const accent = tone ?? fallback.tone;
    // A failed search must never offer "create" — the remedy is a different search, and
    // offering a record to someone who mistyped answers a question they did not ask.
    const showAction = Boolean(actionLabel && onAction) && variant !== 'no-match';

    return (
        <Stack
            alignItems="center"
            justifyContent="center"
            spacing={dense ? 0.75 : 1.25}
            sx={{ textAlign: 'center', py: dense ? 3 : 6, px: 2 }}
            // Announced politely: an empty result is information, not an interruption — except
            // an error, which the user needs to hear about now.
            role={variant === 'error' ? 'alert' : 'status'}
        >
            {/* The kit's own accent tile: it already resolves the tone for light AND dark via
                toneSurface, which a hand-rolled Box here would have had to restate. */}
            <IconBox icon={icon ?? fallback.icon} trio={accent} size={dense ? 40 : 52} fs={dense ? 'fs-2' : 'fs-1'} />

            <Typography sx={{ fontWeight: 700, fontSize: dense ? 14 : 15.5, color: 'text.primary' }}>
                {title}
            </Typography>

            {hint && (
                <Typography sx={{ fontSize: dense ? 12.5 : 13, color: 'text.secondary', maxWidth: 460, lineHeight: 1.5 }}>
                    {hint}
                </Typography>
            )}

            {showAction && (
                <WtButton tone="primary" size="small" onClick={onAction} sx={{ mt: 0.5 }}>
                    {actionLabel}
                </WtButton>
            )}
        </Stack>
    );
};

export default WtEmptyState;
