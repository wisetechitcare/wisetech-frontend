import React, { useState } from "react";
import { Box, Divider, IconButton, InputAdornment, Menu, MenuItem, TextField } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton } from "@app/modules/common/components/ui";

/**
 * StatDetailModal — the shared "drill into a stat card" dialog: title, Sort By
 * menu, live search and close, over a scrollable body.
 *
 * Pair it with {@link EmployeeStatGrid} for the body. Both the admin Attendance
 * Overview and the Dashboard daily overview use this one component; before it
 * existed each page carried its own copy (one MUI Dialog, one react-bootstrap
 * Modal) and the two had already drifted apart visually.
 *
 * Built on GlassDialog + GlassHeader, so it inherits the brand header band, the
 * blurred scrim, dark mode and phone full-screen for free. Presentational only —
 * search/sort state stays with the caller.
 */

export type StatSortOption = 'name-asc' | 'name-desc' | 'checkin-asc' | 'checkin-desc' | 'none';

export interface StatDetailModalProps {
    show: boolean;
    onHide: () => void;
    title: string;
    /** Optional context line under the title, e.g. a live count. */
    subtitle?: string;
    /** KTIcon (duotone) name for the header tile. */
    icon?: string;
    children: React.ReactNode;
    /** Legacy react-bootstrap size names, mapped to MUI Dialog breakpoints. */
    size?: 'sm' | 'lg' | 'xl';
    searchQuery?: string;
    /** Omit to hide the search field. */
    onSearchChange?: (value: string) => void;
    sortOption?: StatSortOption;
    /** Omit to hide the Sort By menu. */
    onSortChange?: (value: StatSortOption) => void;
}

const SORT_LABELS: Record<StatSortOption, string> = {
    'name-asc': 'Name (A-Z)',
    'name-desc': 'Name (Z-A)',
    'checkin-asc': 'Check-in (Earliest)',
    'checkin-desc': 'Check-in (Latest)',
    none: 'Sort By',
};

const maxWidthMap = { sm: 'sm', lg: 'md', xl: 'lg' } as const;

const StatDetailModal: React.FC<StatDetailModalProps> = ({
    show,
    onHide,
    title,
    subtitle,
    icon = 'people',
    children,
    size = 'lg',
    searchQuery = '',
    onSearchChange,
    sortOption = 'none',
    onSortChange,
}) => {
    const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);

    const handleSort = (option: StatSortOption) => {
        onSortChange?.(option);
        setSortAnchor(null);
    };

    return (
        <GlassDialog
            open={show}
            onClose={onHide}
            maxWidth={maxWidthMap[size]}
            scroll="paper"
            header={
                <GlassHeader
                    title={title}
                    subtitle={subtitle}
                    onClose={onHide}
                    icon={<KTIcon iconName={icon} className="fs-2 text-white" />}
                    closeIcon={<KTIcon iconName="cross" className="fs-3" />}
                />
            }
        >
            {/* Controls sit BELOW the header band rather than inside it: on a phone a
                sort button + search field crammed next to the title either overflows
                or squeezes the title to an ellipsis. */}
            {(onSortChange || onSearchChange) && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                        px: { xs: 2, sm: 2.75 },
                        py: 1.5,
                        borderBottom: 1,
                        borderColor: 'divider',
                        flexShrink: 0,
                    }}
                >
                    {onSortChange && (
                        <>
                            <WtButton
                                size="small"
                                onClick={(e) => setSortAnchor(e.currentTarget)}
                                startIcon={<KTIcon iconName="filter" className="fs-5" />}
                                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                                {SORT_LABELS[sortOption]}
                            </WtButton>
                            <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
                                <MenuItem onClick={() => handleSort('name-asc')}>Name (A-Z)</MenuItem>
                                <MenuItem onClick={() => handleSort('name-desc')}>Name (Z-A)</MenuItem>
                                <Divider />
                                <MenuItem onClick={() => handleSort('checkin-asc')}>Check-in (Earliest)</MenuItem>
                                <MenuItem onClick={() => handleSort('checkin-desc')}>Check-in (Latest)</MenuItem>
                                {sortOption !== 'none' && [
                                    <Divider key="clear-divider" />,
                                    <MenuItem key="clear" onClick={() => handleSort('none')}>Clear Sort</MenuItem>,
                                ]}
                            </Menu>
                        </>
                    )}

                    {onSearchChange && (
                        <TextField
                            size="small"
                            type="text"
                            placeholder="Search by name..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            // Grows to fill the row on desktop, drops to full width once the
                            // sort button has taken the first line on a narrow screen.
                            sx={{ flex: '1 1 220px', minWidth: 0 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <KTIcon iconName="magnifier" className="fs-5" />
                                    </InputAdornment>
                                ),
                                endAdornment: searchQuery ? (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => onSearchChange('')} aria-label="Clear search">
                                            <KTIcon iconName="cross" className="fs-5" />
                                        </IconButton>
                                    </InputAdornment>
                                ) : undefined,
                            }}
                        />
                    )}
                </Box>
            )}

            <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 2.75 }, py: 2 }}>{children}</Box>
        </GlassDialog>
    );
};

export default StatDetailModal;
