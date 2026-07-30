import React from "react";
import { Box, Grid, Typography } from "@mui/material";
import EmployeeIdentityCell from "./EmployeeIdentityCell";

/**
 * EmployeeStatGrid — the shared responsive card grid used in the body of a
 * {@link StatDetailModal}: one compact card per employee, identity on top and an
 * optional caller-supplied meta line (dates, badges, check-in/out chips).
 *
 * Density is the whole point. The identity is ONE two-line block — the code chip
 * rides inline beside the name and the designation is the subtitle — and the meta
 * block is skipped entirely when a card has none, so absent/on-leave cards don't
 * render an empty div that still eats a flex gap.
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
}

export const EmployeeStatGrid: React.FC<EmployeeStatGridProps> = ({ items }) => (
    // 1 / 2 / 3 / 4 columns. The 4th at lg fills an xl dialog's width instead of
    // leaving half of every card empty.
    <Grid container spacing={1.5}>
        {items.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.key}>
                <Box
                    sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.75,
                        px: 1.25,
                        py: 1.125,
                        borderRadius: 2,
                        border: '1px solid #E6E9EE',
                        background: 'linear-gradient(180deg,#FFFFFF 0%,#FCFDFF 100%)',
                        boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
                        transition: 'box-shadow .2s ease, transform .2s ease, border-color .2s ease',
                        '&:hover': {
                            boxShadow: '0 8px 24px rgba(16,24,40,0.10)',
                            transform: 'translateY(-2px)',
                            borderColor: 'rgba(30,58,138,0.28)',
                        },
                    }}
                >
                    <EmployeeIdentityCell
                        name={item.name}
                        code={item.code}
                        avatarUrl={item.avatarUrl}
                        subtitle={item.designation || 'No designation'}
                        fluid
                    />
                    {item.meta ? <div>{item.meta}</div> : null}
                </Box>
            </Grid>
        ))}
    </Grid>
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
        <Box sx={{ py: 6, px: 2, textAlign: 'center', color: '#5A6573' }}>
            <Box
                sx={{
                    width: 52,
                    height: 52,
                    mx: 'auto',
                    mb: 1.5,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    bgcolor: '#F2F4F7',
                    color: '#98A2B3',
                    fontSize: 22,
                }}
            >
                <i className={q ? 'bi bi-search' : 'bi bi-people'} />
            </Box>
            <Typography sx={{ fontWeight: 650, fontSize: '0.95rem', color: '#1B2230' }}>
                {q ? 'No matches found' : 'Nothing to show here'}
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', mt: 0.5 }}>
                {q
                    ? `No employee matches "${q}".`
                    : emptyMessage || 'No employees fall into this category for the selected period.'}
            </Typography>
        </Box>
    );
};

export default EmployeeStatGrid;
