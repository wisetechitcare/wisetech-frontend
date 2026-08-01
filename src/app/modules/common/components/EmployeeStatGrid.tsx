import React, { useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import { KTIcon } from "@metronic/helpers";
import { AutoGrid, GlassCard, ToneChip, toneAlpha } from "@app/modules/common/components/ui";
import { tonePair, type SemanticTone } from "@app/theme/tokens";
import { pressableProps } from "@app/modules/common/components/ui/a11y";
import { formatDate, formatDateLong } from "@utils/dateFormats";
import EmployeeIdentityCell from "./EmployeeIdentityCell";
import {
    groupEmployeeStatItems,
    sortEmployeeStatGroups,
    totalOfGroups,
    formatStatTotal,
    pluralizeUnit,
    type EmployeeStatGroup,
    type EmployeeStatItem,
    type StatSortOption,
} from "./employeeStatGrouping";

/**
 * EmployeeStatGrid — the shared card grid used in the body of a
 * {@link StatDetailModal}: one compact card per employee, identity on top and an
 * optional caller-supplied meta line (dates, badges, check-in/out chips).
 *
 * Density is the whole point (CLAUDE.md → "fill the width, no dead whitespace").
 * `AutoGrid` auto-fits as many tiles as the dialog can hold instead of capping at
 * a fixed column count, the identity is ONE two-line block (code chip inline
 * beside the name, designation as the subtitle), and the meta block is skipped
 * entirely when a card has none — so absent/on-leave cards don't render an empty
 * element that still eats a flex gap.
 *
 * Use this for a SINGLE-DAY list, where one card already means one employee. For
 * a week/month, use {@link EmployeeStatGroupView} — a flat list there repeats the
 * same employee once per offending day. See `employeeStatGrouping.ts`.
 *
 * Presentational only. Anything page-specific (late/early colouring, working
 * method, map links) belongs in `meta`, computed by the caller.
 */

// The item/group model and all grouping maths live in the pure module so they can be
// tested and reused without React. Re-exported here so callers keep one import.
export type { EmployeeStatItem, EmployeeStatGroup, StatSortOption };

export interface EmployeeStatGridProps {
    items: EmployeeStatItem[];
    /** Minimum tile width before AutoGrid drops a column. */
    minTileWidth?: number;
}

export const EmployeeStatGrid: React.FC<EmployeeStatGridProps> = ({ items, minTileWidth = 248 }) => (
    <AutoGrid min={minTileWidth} gap={12}>
        {items.map((item) => (
            <GlassCard
                key={item.key}
                preset="row"
                interactive
                sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}
            >
                <EmployeeIdentityCell
                    name={item.name}
                    code={item.code}
                    avatarUrl={item.avatarUrl}
                    subtitle={item.designation || 'No designation'}
                    fluid
                />
                {item.meta ? <Box sx={{ minWidth: 0 }}>{item.meta}</Box> : null}
            </GlassCard>
        ))}
    </AutoGrid>
);

// ─── Grouped (weekly / monthly) view ────────────────────────────────────────────

/** Fallback when a group carries no dates at all — keeps the layout from collapsing. */
const NO_DATES = '—';

/**
 * Which date vocabulary the grouped surfaces use. Both are supported so a consumer picks
 * per surface — 'long' reads as a heading, 'compact' is the company standard for dense
 * scanning and fits a narrower tile.
 *   'long'    (default) `1 July 2026`
 *   'compact'           `2026.07.01`
 */
export type StatDateStyle = 'compact' | 'long';

const dateFormatter = (style: StatDateStyle) => (style === 'long' ? formatDateLong : formatDate);

/** One day → "1 July 2026"; a span → "1 July 2026 → 10 July 2026". */
function spanLabel(group: EmployeeStatGroup, style: StatDateStyle): string {
    if (!group.firstDate) return NO_DATES;
    const fmt = dateFormatter(style);
    const from = fmt(group.firstDate);
    if (!group.lastDate || group.lastDate === group.firstDate) return from;
    return `${from} → ${fmt(group.lastDate)}`;
}

/**
 * The count block on a grouped card — the single most important number in the view,
 * so it gets its own tinted tile rather than a chip lost among the meta pills.
 */
const CountBadge: React.FC<{ total: number; unit: string; tone: SemanticTone; compact?: boolean }> = ({
    total, unit, tone, compact = false,
}) => {
    const fg = tonePair(tone).fg;
    return (
        <Box
            sx={{
                flexShrink: 0,
                minWidth: compact ? 44 : 52,
                px: 0.75,
                py: compact ? 0.25 : 0.5,
                borderRadius: 2,
                textAlign: 'center',
                lineHeight: 1.1,
                // Alpha tint over the surface, not a light-mode pastel — correct in both themes.
                bgcolor: toneAlpha(fg, 0.12),
                color: fg,
                border: `1px solid ${toneAlpha(fg, 0.28)}`,
            }}
        >
            <Typography component="div" sx={{ fontSize: compact ? '0.95rem' : '1.1rem', fontWeight: 800, lineHeight: 1.15 }}>
                {formatStatTotal(total)}
            </Typography>
            <Typography
                component="div"
                sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.85 }}
            >
                {pluralizeUnit(total, unit)}
            </Typography>
        </Box>
    );
};

export interface EmployeeStatGroupViewProps {
    /** Per-occurrence rows. Grouping, ordering and the drill-in are handled here. */
    items: EmployeeStatItem[];
    /** Drives group ordering. `count-desc` puts repeat offenders first — the useful default. */
    sort?: StatSortOption;
    /** Colour of the count badge — match the stat card (danger for Absent, warning for Check-out Missing). */
    tone?: SemanticTone;
    /** Noun for the total. "day" → "4 days". */
    unit?: string;
    /** Key of the group to drill into; null shows the group grid. Controlled by the caller. */
    openKey?: string | null;
    /**
     * Fires on click (with the group) and when a drilled-in group disappears after a
     * background refresh (with null), so the caller can drop its header state.
     */
    onOpenChange?: (group: EmployeeStatGroup | null) => void;
    /** Date vocabulary for the card span and the drill-in day headings. */
    dateStyle?: StatDateStyle;
    minTileWidth?: number;
}

/**
 * EmployeeStatGroupView — one card per EMPLOYEE with a total, and a drill-in listing
 * that employee's individual days.
 *
 * Owns grouping + ordering so the caller only holds an `openKey` string. That matters
 * with live data: the caller can't cache a group object, because a realtime attendance
 * refresh would leave it stale. Here the group is re-resolved from the current items on
 * every render, and if the drilled-in employee drops out of the list entirely (their row
 * was corrected) the view falls back to the grid and tells the caller via `onOpenChange`
 * — from an effect, never during render.
 */
export const EmployeeStatGroupView: React.FC<EmployeeStatGroupViewProps> = ({
    items,
    sort = 'count-desc',
    tone = 'brand',
    unit = 'day',
    openKey = null,
    onOpenChange,
    dateStyle = 'long',
    minTileWidth = 264,
}) => {
    // Memoised on the rows + ordering. Callers that rebuild `items` inline every render
    // (the attendance Overview does) still recompute — but the rollup is a single O(n)
    // pass, and it is what removes the O(days) duplicate cards from the DOM, which is
    // the expensive part. The memo's other job is keeping `groups` referentially stable
    // so `openGroup` and the effect below don't churn on unrelated dialog state.
    const groups = useMemo(
        () => sortEmployeeStatGroups(groupEmployeeStatItems(items), sort),
        [items, sort],
    );

    const openGroup = useMemo(
        () => (openKey ? groups.find((g) => g.key === openKey) ?? null : null),
        [groups, openKey],
    );

    // The drilled-in employee vanished (data refreshed underneath us) — release the
    // caller's header state instead of silently showing a different view than it labels.
    useEffect(() => {
        if (openKey && !openGroup) onOpenChange?.(null);
    }, [openKey, openGroup, onOpenChange]);

    if (openGroup) return <EmployeeStatOccurrenceList group={openGroup} tone={tone} unit={unit} dateStyle={dateStyle} />;

    const totalDays = totalOfGroups(groups);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0 }}>
            <SummaryBar
                left={`${groups.length} ${groups.length === 1 ? 'employee' : 'employees'} · ${formatStatTotal(totalDays)} ${pluralizeUnit(totalDays, unit)}`}
                right="Select an employee to see each day"
            />

            <AutoGrid min={minTileWidth} gap={12}>
                {groups.map((group) => {
                    const label = `${group.name}, ${formatStatTotal(group.total)} ${pluralizeUnit(group.total, unit)}. View each day`;
                    return (
                        <GlassCard
                            key={group.key}
                            preset="row"
                            interactive
                            onClick={() => onOpenChange?.(group)}
                            aria-label={label}
                            {...pressableProps(() => onOpenChange?.(group))}
                            // Function form: `outlineColor` is not one of sx's palette-mapped
                            // keys, so 'primary.main' would be emitted as literal CSS.
                            sx={(theme) => ({
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.75,
                                minWidth: 0,
                                cursor: 'pointer',
                                '&:focus-visible': {
                                    outline: `2px solid ${theme.palette.primary.main}`,
                                    outlineOffset: '2px',
                                },
                            })}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <EmployeeIdentityCell
                                        name={group.name}
                                        code={group.code}
                                        avatarUrl={group.avatarUrl}
                                        subtitle={group.designation || 'No designation'}
                                        fluid
                                    />
                                </Box>
                                <CountBadge total={group.total} unit={unit} tone={tone} />
                            </Box>

                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                    minWidth: 0,
                                    pt: 0.25,
                                    borderTop: 1,
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography
                                    component="span"
                                    sx={{
                                        fontSize: '0.75rem',
                                        color: 'text.secondary',
                                        minWidth: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {spanLabel(group, dateStyle)}
                                </Typography>
                                <Box
                                    component="span"
                                    sx={{
                                        flexShrink: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.25,
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: 'primary.main',
                                    }}
                                >
                                    Details
                                    <KTIcon iconName="right" className="fs-7" />
                                </Box>
                            </Box>
                        </GlassCard>
                    );
                })}
            </AutoGrid>
        </Box>
    );
};

export interface EmployeeStatOccurrenceListProps {
    group: EmployeeStatGroup;
    tone?: SemanticTone;
    unit?: string;
    dateStyle?: StatDateStyle;
}

/**
 * The drill-in: one tile per day for a single employee. Dates come from the structured
 * `item.date` rather than the caller's `meta`, so a grouped card and its detail view can
 * never disagree about which days they represent.
 */
export const EmployeeStatOccurrenceList: React.FC<EmployeeStatOccurrenceListProps> = ({
    group,
    tone = 'brand',
    unit = 'day',
    dateStyle = 'long',
}) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0 }}>
        <GlassCard
            preset="row"
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <EmployeeIdentityCell
                    name={group.name}
                    code={group.code}
                    avatarUrl={group.avatarUrl}
                    subtitle={group.designation || 'No designation'}
                    fluid
                />
            </Box>
            <CountBadge total={group.total} unit={unit} tone={tone} />
        </GlassCard>

        <AutoGrid min={232} gap={10}>
            {group.items.map((item) => {
                const day = item.date ? dayjs(item.date) : null;
                return (
                    <GlassCard
                        key={item.key}
                        preset="row"
                        sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, minWidth: 0 }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
                            <Typography component="span" sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'text.primary' }}>
                                {item.date ? dateFormatter(dateStyle)(item.date) : NO_DATES}
                            </Typography>
                            {day?.isValid() && <ToneChip tone="brand" dense label={day.format('dddd')} />}
                        </Box>
                        {item.meta ? <Box sx={{ minWidth: 0 }}>{item.meta}</Box> : null}
                    </GlassCard>
                );
            })}
        </AutoGrid>
    </Box>
);

/** Small context strip above a list — count on the left, a hint on the right (hidden on phones). */
const SummaryBar: React.FC<{ left: string; right?: string }> = ({ left, right }) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            minWidth: 0,
            px: 0.25,
        }}
    >
        <Typography component="span" sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.primary' }}>
            {left}
        </Typography>
        {right && (
            <Typography
                component="span"
                sx={{ fontSize: '0.72rem', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
            >
                {right}
            </Typography>
        )}
    </Box>
);

export interface StatEmptyStateProps {
    /** When set, the copy switches from "category is empty" to "no search matches". */
    searchQuery?: string;
    /** Overrides the default "no employees" wording. */
    emptyMessage?: string;
}

/** Shared empty state for a stat modal body. */
export const StatEmptyState: React.FC<StatEmptyStateProps> = ({ searchQuery, emptyMessage }) => {
    const q = (searchQuery ?? '').trim();
    return (
        <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
            <Box
                sx={{
                    width: 52,
                    height: 52,
                    mx: 'auto',
                    mb: 1.5,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    bgcolor: 'action.hover',
                    color: 'text.disabled',
                }}
            >
                <KTIcon iconName={q ? 'magnifier' : 'people'} className="fs-2x" />
            </Box>
            <Typography sx={{ fontWeight: 650, fontSize: '0.95rem', color: 'text.primary' }}>
                {q ? 'No matches found' : 'Nothing to show here'}
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', mt: 0.5, color: 'text.secondary' }}>
                {q
                    ? `No employee matches "${q}".`
                    : emptyMessage || 'No employees fall into this category for the selected period.'}
            </Typography>
        </Box>
    );
};

export default EmployeeStatGrid;
