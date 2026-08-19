import React, { useState } from "react";
import { Box, Divider, IconButton, InputAdornment, Menu, MenuItem, TextField } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton } from "@app/modules/common/components/ui";
import type { StatSortOption } from "./employeeStatGrouping";

/**
 * StatDetailModal — the shared "drill into a stat card" dialog: title, Sort By
 * menu, live search and close, over a scrollable body.
 *
 * Pair it with {@link EmployeeStatGrid} (single day) or {@link EmployeeStatGroupView}
 * (week/month) for the body. Both the admin Attendance Overview and the Dashboard
 * daily overview use this one component; before it existed each page carried its own
 * copy (one MUI Dialog, one react-bootstrap Modal) and the two had already drifted
 * apart visually.
 *
 * Built on GlassDialog + GlassHeader, so it inherits the brand header band, the
 * blurred scrim, dark mode and phone full-screen for free. Presentational only —
 * search/sort/drill-in state stays with the caller.
 */

// The sort vocabulary is shared with the grouping module (which implements the
// comparators), so there is one list, not one per layer. Re-exported for callers
// that already import it from here.
export type { StatSortOption };

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
    /** Placeholder for the search field — say what is actually matched. */
    searchPlaceholder?: string;
    sortOption?: StatSortOption;
    /** Omit to hide the Sort By menu. */
    onSortChange?: (value: StatSortOption) => void;
    /**
     * Which sort options to offer, in menu order. Defaults to the name + check-in set.
     * Pass an explicit list when an option would be meaningless for the current body —
     * e.g. a grouped week/month list spans many days, so a single check-in time says
     * nothing, while "most days first" is the whole point.
     */
    sortOptions?: StatSortOption[];
    /**
     * Drill-in navigation. When set, the header shows a back control instead of the
     * icon tile, and the search/sort row is hidden — those filter the list being
     * drilled into, not the single record on screen.
     */
    onBack?: () => void;
    backLabel?: string;
}

const SORT_LABELS: Record<StatSortOption, string> = {
    'name-asc': 'Name (A-Z)',
    'name-desc': 'Name (Z-A)',
    'checkin-asc': 'Check-in (Earliest)',
    'checkin-desc': 'Check-in (Latest)',
    'count-desc': 'Most days first',
    'count-asc': 'Fewest days first',
    none: 'Sort By',
};

const DEFAULT_SORT_OPTIONS: StatSortOption[] = ['name-asc', 'name-desc', 'checkin-asc', 'checkin-desc'];

/** Sort options fall into groups; a divider is drawn wherever the group changes. */
const SORT_GROUP: Record<StatSortOption, number> = {
    'count-desc': 0,
    'count-asc': 0,
    'name-asc': 1,
    'name-desc': 1,
    'checkin-asc': 2,
    'checkin-desc': 2,
    none: 3,
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
    searchPlaceholder = 'Search by name or code...',
    sortOption = 'none',
    onSortChange,
    sortOptions = DEFAULT_SORT_OPTIONS,
    onBack,
    backLabel = 'Back to list',
}) => {
    const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);

    const handleSort = (option: StatSortOption) => {
        onSortChange?.(option);
        setSortAnchor(null);
    };

    // Search and sort act on the list; inside a drill-in there is no list to act on.
    const showControls = !onBack && (Boolean(onSortChange) || Boolean(onSearchChange));

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
                    onBack={onBack}
                    backLabel={backLabel}
                    icon={<KTIcon iconName={icon} className="fs-2 text-white" />}
                    closeIcon={<KTIcon iconName="cross" className="fs-3" />}
                />
            }
        >
            {/* Controls sit BELOW the header band rather than inside it: on a phone a
                sort button + search field crammed next to the title either overflows
                or squeezes the title to an ellipsis. */}
            {showControls && (
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
                    {onSortChange && sortOptions.length > 0 && (
                        <>
                            <WtButton
                                size="small"
                                onClick={(e) => setSortAnchor(e.currentTarget)}
                                startIcon={<KTIcon iconName="filter" className="fs-5" />}
                                sx={{ whiteSpace: 'nowrap', flexShrink: 0, maxWidth: '100%' }}
                            >
                                {SORT_LABELS[sortOption]}
                            </WtButton>
                            <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
                                {sortOptions.flatMap((option, i) => {
                                    const item = (
                                        <MenuItem key={option} selected={option === sortOption} onClick={() => handleSort(option)}>
                                            {SORT_LABELS[option]}
                                        </MenuItem>
                                    );
                                    // Divider between groups only — never a leading one.
                                    return i > 0 && SORT_GROUP[option] !== SORT_GROUP[sortOptions[i - 1]]
                                        ? [<Divider key={`d-${option}`} />, item]
                                        : [item];
                                })}
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
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            inputProps={{ 'aria-label': searchPlaceholder }}
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
