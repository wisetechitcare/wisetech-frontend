import React from 'react';
import { Box, Stack } from '@mui/material';
import { GlassSurface } from './glass';
import { IconBox, type Trio } from './patterns';
import { Typography } from '@mui/material';

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
    /** Right-aligned control: a WtSwitch, a WtButton, a count, a StatusBadge. */
    action?: React.ReactNode;
    /** Divider between header and body. Default true; false for a bare frame. */
    divided?: boolean;
    children?: React.ReactNode;
    /** Escape hatch for one-off layout. Prefer composing children instead. */
    sx?: React.ComponentProps<typeof GlassSurface>['sx'];
}

export function SettingsSection({
    tone, icon, title, description, action, divided = true, children, sx,
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
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', lineHeight: 1.25 }}>
                        {title}
                    </Typography>
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
