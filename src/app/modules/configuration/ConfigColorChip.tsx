/**
 * ConfigColorChip — the compact "one configured value" row used across every
 * Configure screen: a colour rail, a dot, the name, and hover-revealed actions.
 *
 * This shape was invented three times (Leads, Contacts, Organization configure),
 * each copy hardcoding `#f7f8fa` / `#ffffff` / `#eaecf0` in inline styles — which
 * is why those screens stay light-on-white in dark mode. This is the same visual
 * built on theme tokens, so it is correct in both modes. New Configure sections
 * consume this; the three legacy copies can be deleted as they're touched.
 *
 * The right-hand action is deliberately open: most screens delete a row, Billing
 * restores a customised label to its default. Same affordance, different verb.
 */
import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { WtIconButton, toneAlpha } from '@app/modules/common/components/ui';

export interface ConfigChipAction {
    /** Bootstrap icon class, e.g. "bi-trash". */
    icon: string;
    /** Tooltip + aria-label. */
    title: string;
    onClick: () => void;
    /** Render in the danger tone (destructive actions). */
    danger?: boolean;
}

export interface ConfigColorChipProps {
    name: string;
    /** Identity colour as hex. Falls back to the theme divider when empty. */
    color?: string;
    /** Pencil action. Omit for a read-only chip. */
    onEdit?: () => void;
    /** Optional second action — delete, restore, archive. */
    action?: ConfigChipAction;
    /** Muted, non-interactive caption under the name (e.g. the status code). */
    caption?: string;
    /** Hover title for the whole chip. Defaults to `name`. */
    title?: string;
    /** Short pill after the name — "Default", "Internal". Omit for none. */
    badge?: string;
    disabled?: boolean;
}

/**
 * Bare glyph, not a tinted button. `WtIconButton` ships with a filled chip and a
 * border, which reads as two boxes inside a box at this size — the chip is
 * already the surface. The tint arrives only on hover, from the row below.
 */
const actionSx = (tint: string) => ({
    width: 28, height: 24, borderRadius: 1, color: tint,
    bgcolor: 'transparent', border: '1px solid transparent',
    '& i': { fontSize: 11 },
    '&:hover': {
        bgcolor: toneAlpha(tint, 0.16), borderColor: 'transparent',
        transform: 'none', boxShadow: 'none',
    },
});

// The Leads Configure chip's own resting/raised pair, kept as literals because a
// shadow is depth, not a palette colour — MUI's elevation scale is far heavier.
const REST_SHADOW = '0 1px 3px rgba(24,28,50,0.04)';
const HOVER_SHADOW = '0 4px 14px rgba(24,28,50,0.09)';

export const ConfigColorChip: React.FC<ConfigColorChipProps> = ({
    name, color, onEdit, action, caption, title, badge, disabled = false,
}) => {
    const theme = useTheme();
    // No colour configured → the divider tone, which is legible in both modes.
    const rail = color || theme.palette.divider;
    const editTint = theme.palette.primary.main;
    const actionTint = action?.danger ? theme.palette.error.main : theme.palette.text.secondary;

    return (
        <Box
            sx={{
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                pl: '16px',
                pr: '12px',
                py: '9px',
                minWidth: 0,
                borderRadius: 2,
                // Recessed at rest, lifting to the paper on hover — the chip reads
                // as a tile in a tray rather than a card floating on a card.
                bgcolor: 'action.hover',
                boxShadow: REST_SHADOW,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'background-color .15s ease, border-color .15s ease, box-shadow .15s ease',
                // Actions sit at low opacity until the row is hovered or a child
                // has keyboard focus — focus-within is what keeps them reachable
                // without a mouse.
                '& .cfg-chip-actions': { opacity: 0.35, transition: 'opacity .15s ease' },
                '&:hover, &:focus-within': {
                    bgcolor: 'background.paper',
                    borderColor: 'text.disabled',
                    boxShadow: HOVER_SHADOW,
                    '& .cfg-chip-actions': { opacity: 1 },
                    // Each glyph picks up its own tint once the row is live, so the
                    // destructive one reads as destructive before it is pressed.
                    '& .cfg-chip-edit': { bgcolor: toneAlpha(editTint, 0.1) },
                    '& .cfg-chip-action': { bgcolor: toneAlpha(actionTint, 0.1) },
                },
            }}
        >
            {/* Colour rail — the identity marker, read at a glance down a column. */}
            <Box
                sx={{
                    position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0,
                    width: 3, bgcolor: rail, opacity: 0.8,
                    borderRadius: '3px 0 0 3px',
                }}
            />

            <Box
                sx={{
                    width: 10, height: 10, flexShrink: 0, borderRadius: '50%',
                    bgcolor: rail,
                    boxShadow: `0 0 0 2px ${color ? toneAlpha(color, 0.19) : 'transparent'}`,
                }}
            />

            <Stack sx={{ flex: 1, minWidth: 0 }}>
                {/* Wraps rather than truncates. A configured name IS the thing being
                    configured — an ellipsis hides exactly the detail that tells two
                    similar statuses apart ("Ready for Pr…" / "Proforma Ge…"). The
                    grid stretches the row, so a two-line chip lines up with its
                    neighbours instead of overflowing. */}
                <Typography
                    sx={{
                        fontSize: 13, fontWeight: 500, color: 'text.primary',
                        lineHeight: 1.35, overflowWrap: 'anywhere',
                    }}
                    title={title ?? name}
                >
                    {name}
                    {badge && (
                        // Inline with the name, not a separate column: the pill has to
                        // survive the name wrapping to two lines without leaving a gap.
                        <Box
                            component="span"
                            sx={{
                                ml: 0.75, px: 0.75, py: '1px', borderRadius: '999px',
                                fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
                                textTransform: 'uppercase', whiteSpace: 'nowrap',
                                color: 'success.dark',
                                bgcolor: toneAlpha(theme.palette.success.main, 0.12),
                                border: '1px solid',
                                borderColor: toneAlpha(theme.palette.success.main, 0.25),
                            }}
                        >
                            {badge}
                        </Box>
                    )}
                </Typography>
                {caption && (
                    <Typography
                        noWrap
                        sx={{ fontSize: 10, color: 'text.disabled', fontFamily: 'monospace' }}
                        title={caption}
                    >
                        {caption}
                    </Typography>
                )}
            </Stack>

            <Stack direction="row" spacing={0.5} className="cfg-chip-actions" sx={{ flexShrink: 0 }}>
                {onEdit && (
                    <WtIconButton
                        className="cfg-chip-edit"
                        title={`Edit ${name}`}
                        color={editTint}
                        disabled={disabled}
                        onClick={onEdit}
                        sx={actionSx(editTint)}
                    >
                        <AppIcon name="bi-pencil" />
                    </WtIconButton>
                )}
                {action && (
                    <WtIconButton
                        className="cfg-chip-action"
                        title={action.title}
                        color={actionTint}
                        disabled={disabled}
                        onClick={action.onClick}
                        sx={actionSx(actionTint)}
                    >
                        <AppIcon name={action.icon} />
                    </WtIconButton>
                )}
            </Stack>
        </Box>
    );
};

/**
 * Auto-filling grid of chips. Collapses to one column on a phone.
 *
 * 240px, not 200: the dot, the two actions and the padding eat ~130px of a tile,
 * so a narrower track left most names wrapping. `alignItems: stretch` (the grid
 * default, kept explicit because it is load-bearing) makes every chip in a row as
 * tall as the tallest, so one wrapped name doesn't leave a ragged row.
 */
export const ConfigChipGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Box
        sx={{
            display: 'grid',
            gap: 1,
            mt: 1.5,
            alignItems: 'stretch',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
        }}
    >
        {children}
    </Box>
);

export default ConfigColorChip;
