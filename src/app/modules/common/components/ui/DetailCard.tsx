import React, { useId } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { IconBox, SHADOW_REST, type Trio } from './patterns';
import { HEADING_CASE_SX } from './text';

/**
 * Read-only detail building blocks — the look of the employee details page,
 * rebuilt on the kit (theme tokens + TRIO + IconBox + KT icon names) so any
 * record view or form summary can use it without the legacy detail-page module
 * (bi-* icons, ICON_COLORS hex, inline CSS, JS hover).
 *
 *   <SectionDivider tone={TRIO.blue} icon="profile-circle" label="Personal & Contact" />
 *   <DetailGrid>
 *     <DetailCard tone={TRIO.blue} icon="profile-circle" title="Personal Details" subtitle="Who they are">
 *       <KeyValueList rows={[{ label: 'Full Name', value: name }, { label: 'Gender', value: gender }]} />
 *     </DetailCard>
 *   </DetailGrid>
 *
 * Deliberate differences from the page it borrows from: no hover lift (these sit
 * on forms, where a moving card reads as clickable), and the surface is opaque
 * `background.paper` in both appearances — a form canvas is never blurred.
 */

const mergeSx = (base: SxProps<Theme>, sx?: SxProps<Theme>): SxProps<Theme> =>
    [base, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])] as SxProps<Theme>;

/** Same radius as FormSection so detail and form cards line up on one canvas. */
const CARD_RADIUS = '12px';

// ── DetailCard ───────────────────────────────────────────────────────────────

export interface DetailCardProps {
    /** Accent tone — the 3px top rule, the header wash and the icon tile. */
    tone: Trio;
    /** KTIcon (keenicons) name. */
    icon: string;
    /** Card title. Rendered as written (Title Case, never uppercased). */
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    /** Top-right slot — an Edit button, a ToneChip. */
    action?: React.ReactNode;
    children?: React.ReactNode;
    sx?: SxProps<Theme>;
}

export function DetailCard({ tone, icon, title, subtitle, action, children, sx }: DetailCardProps) {
    const titleId = useId();
    return (
        <Box
            component="section"
            aria-labelledby={titleId}
            sx={mergeSx(
                {
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderTop: `3px solid ${tone.c}`,
                    borderRadius: CARD_RADIUS,
                    boxShadow: SHADOW_REST,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                },
                sx,
            )}
        >
            <Box
                sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: { xs: 1.75, sm: 2.5 },
                    py: 1.75,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    // Soft tone wash that fades out across the band; layered as an
                    // image so it never replaces the opaque paper underneath.
                    backgroundImage: `linear-gradient(135deg, ${alpha(
                        tone.c,
                        theme.palette.mode === 'dark' ? 0.16 : 0.07,
                    )} 0%, transparent 100%)`,
                })}
            >
                <IconBox icon={icon} trio={tone} size={38} fs="fs-3" />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        id={titleId}
                        component="h3"
                        sx={{
                            m: 0,
                            fontSize: 16,
                            fontWeight: 700,
                            lineHeight: 1.25,
                            color: 'text.primary',
                            overflowWrap: 'anywhere',
                        }}
                    >
                        {title}
                    </Typography>
                    {subtitle != null && subtitle !== '' && (
                        <Typography
                            component="div"
                            sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', lineHeight: 1.4, mt: 0.25 }}
                        >
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {action != null && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
            </Box>

            {children != null && (
                <Box sx={{ flex: 1, minHeight: 0, px: { xs: 1.75, sm: 2.5 }, pt: 0.5, pb: 1.5 }}>{children}</Box>
            )}
        </Box>
    );
}

// ── KeyValueRow / KeyValueList ───────────────────────────────────────────────

/** The one "no value" mark for read-only rows. */
const EM_DASH = String.fromCharCode(0x2014);

const isEmptyValue = (value: React.ReactNode): boolean =>
    value === null ||
    value === undefined ||
    value === false ||
    (typeof value === 'string' && value.trim() === '');

export interface KeyValueRowProps {
    label: React.ReactNode;
    value: React.ReactNode;
    /** Bold value — totals, the figure the row exists for. */
    emphasis?: boolean;
    /** Drops the hairline under the row (the last row of a card). */
    last?: boolean;
}

export function KeyValueRow({ label, value, emphasis = false, last = false }: KeyValueRowProps) {
    const empty = isEmptyValue(value);
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: { xs: 1.5, sm: 2.5 },
                py: 1.25,
                borderBottom: last ? 'none' : '1px solid',
                borderColor: 'divider',
                fontSize: 13,
                lineHeight: 1.45,
            }}
        >
            <Box component="span" sx={{ flexShrink: 0, maxWidth: '50%', fontWeight: 500, color: 'text.secondary' }}>
                {label}
            </Box>
            <Box
                sx={{
                    minWidth: 0,
                    textAlign: 'right',
                    overflowWrap: 'anywhere',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: emphasis ? 700 : 500,
                    color: empty ? 'text.disabled' : 'text.primary',
                }}
            >
                {empty ? EM_DASH : value}
            </Box>
        </Box>
    );
}

export interface KeyValueListRow {
    label: React.ReactNode;
    value: React.ReactNode;
    isStrong?: boolean;
}

export interface KeyValueListProps {
    /** Same shape as the form engine's SummaryRow, so a summary can be passed straight in. */
    rows: ReadonlyArray<KeyValueListRow>;
}

export function KeyValueList({ rows }: KeyValueListProps) {
    return (
        <Box>
            {rows.map((row, i) => (
                <KeyValueRow
                    key={typeof row.label === 'string' ? `${row.label}-${i}` : i}
                    label={row.label}
                    value={row.value}
                    emphasis={row.isStrong}
                    last={i === rows.length - 1}
                />
            ))}
        </Box>
    );
}

// ── SectionDivider ───────────────────────────────────────────────────────────

export interface SectionDividerProps {
    tone: Trio;
    /** KTIcon (keenicons) name. */
    icon: string;
    label: React.ReactNode;
    sx?: SxProps<Theme>;
}

/** Groups a run of cards: small tinted icon square + uppercase label + a hairline to the edge. */
export function SectionDivider({ tone, icon, label, sx }: SectionDividerProps) {
    return (
        <Box sx={mergeSx({ display: 'flex', alignItems: 'center', gap: 1.125, mx: 0.25, mt: 0.75, mb: 1.5 }, sx)}>
            <IconBox icon={icon} trio={tone} size={26} fs="fs-6" />
            <Typography
                component="h2"
                sx={{
                    m: 0,
                    fontSize: 12,
                    fontWeight: 800,
                    lineHeight: 1.3,
                    color: 'text.secondary',
                    minWidth: 0,
                    ...HEADING_CASE_SX,
                    letterSpacing: '0.06em',
                }}
            >
                {label}
            </Typography>
            <Box
                aria-hidden
                sx={(theme) => ({
                    flex: 1,
                    minWidth: 16,
                    height: '1px',
                    backgroundImage: `linear-gradient(90deg, ${theme.palette.divider}, transparent)`,
                })}
            />
        </Box>
    );
}

// ── DetailGrid ───────────────────────────────────────────────────────────────

export interface DetailGridProps {
    children?: React.ReactNode;
    /** 2 (default): one column on phones, two from `md`. 1: always one column. */
    columns?: 1 | 2;
}

export function DetailGrid({ children, columns = 2 }: DetailGridProps) {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns:
                    columns === 2
                        ? { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }
                        : 'minmax(0, 1fr)',
                gap: 2,
                alignItems: 'stretch',
            }}
        >
            {children}
        </Box>
    );
}

export default DetailCard;
