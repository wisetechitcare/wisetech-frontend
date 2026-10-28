import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { GlassSurface } from './glass';
import { IconBox, type Trio } from './patterns';
import { toTitleCase, HEADING_CASE_SX } from './text';

/**
 * SettingsSection — the accent-topped configuration card.
 *
 * This is the block every settings/config engine in the app is built from: a
 * thin glass surface with a coloured top rule, an icon tile, a title + one-line
 * description, an optional control on the right (a switch or a button), and the
 * fields below.
 *
 * It was written inline five times in LeavePolicyModal, again in SandwhichLeave,
 * and again in the FAQ section manager — each with its own padding, border width
 * and header spacing, which is why those screens never quite matched. The shape
 * was always the same; only the tone changed.
 *
 * Composition, not configuration: children are whatever the section needs. This
 * owns the frame — surface, accent, header, spacing — and nothing else.
 *
 * @example
 * <SettingsSection tone={TRIO.purple} icon="security-user" title="Probation"
 *                  description="New joiners cannot apply until it ends."
 *                  action={<WtSwitch tone={TRIO.purple.c} checked={on} onChange={set} />}>
 *   …fields…
 * </SettingsSection>
 */
export interface SettingsSectionProps {
    /** Accent tone — drives the top rule and the icon tile. */
    tone: Trio;
    /** KTIcon (keenicons duotone) name. */
    icon: string;
    title: string;
    description?: string;
    /**
     * Optional count chip beside the title (rule lists, FAQ groups).
     * Prefer this over inventing a local Chip in the title row.
     */
    count?: number | string;
    /** Right-aligned control: a WtSwitch, a WtButton, a StatusBadge. */
    action?: React.ReactNode;
    /** Divider between header and body. Default true; false for a bare frame. */
    divided?: boolean;
    children?: React.ReactNode;
    /** Escape hatch for one-off layout. Prefer composing children instead. */
    sx?: React.ComponentProps<typeof GlassSurface>['sx'];
}

export function SettingsSection({
    tone, icon, title, description, count, action, divided = true, children, sx,
}: SettingsSectionProps) {
    return (
        <GlassSurface
            variant="thin"
            sx={[
                {
                    p: { xs: 1.75, sm: 2.25 },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.75,
                    // The accent rule is what makes a stack of these scannable —
                    // colour identifies the section before the label is read.
                    borderTop: `3.5px solid ${tone.c}`,
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
        >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <IconBox icon={icon} trio={tone} size={36} fs="fs-3" />

                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ rowGap: 0.5 }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', lineHeight: 1.25, ...HEADING_CASE_SX }}>
                            {toTitleCase(title)}
                        </Typography>
                        {count != null && (
                            <Chip
                                size="small"
                                label={count}
                                sx={{
                                    height: 20,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: tone.c,
                                    bgcolor: tone.bg,
                                    border: `1px solid ${tone.bd}`,
                                    '& .MuiChip-label': { px: 1 },
                                }}
                            />
                        )}
                    </Stack>
                    {description && (
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.5, mt: 0.25 }}>
                            {description}
                        </Typography>
                    )}
                </Box>

                {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
            </Stack>

            {children != null && (
                <Box sx={divided ? { pt: 1, borderTop: '1px solid', borderColor: 'divider' } : undefined}>
                    {children}
                </Box>
            )}
        </GlassSurface>
    );
}

export default SettingsSection;
