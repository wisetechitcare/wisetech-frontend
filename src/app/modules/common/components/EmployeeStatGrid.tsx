import React from "react";
import { Box, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { AutoGrid, GlassCard } from "@app/modules/common/components/ui";
import EmployeeIdentityCell from "./EmployeeIdentityCell";

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
 * Presentational only. Anything page-specific (late/early colouring, working
 * method, map links) belongs in `meta`, computed by the caller.
 */

export interface EmployeeStatItem {
    /** Stable React key — usually the attendance id, or employee id + date. */
    key: string;
    name: string;
    code?: string | null;
    avatarUrl?: string | null;
    designation?: string | null;
    /** Caller-rendered extra content. Omit and the card stays a tight identity row. */
    meta?: React.ReactNode;
}

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
