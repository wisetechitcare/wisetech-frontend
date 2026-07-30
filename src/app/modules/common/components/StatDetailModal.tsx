import React, { useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    InputAdornment,
    Menu,
    MenuItem,
    TextField,
    Typography,
} from "@mui/material";

/**
 * StatDetailModal — the shared "drill into a stat card" dialog: title, Sort By
 * menu, live search and close, over a scrollable body.
 *
 * Pair it with {@link EmployeeStatGrid} for the body. Both the admin Attendance
 * Overview and the Dashboard daily overview use this one component; before it
 * existed each page carried its own copy (one MUI, one react-bootstrap) and they
 * had already drifted apart visually.
 *
 * Presentational only — search/sort state stays with the caller.
 */

export type StatSortOption = 'name-asc' | 'name-desc' | 'checkin-asc' | 'checkin-desc' | 'none';

export interface StatDetailModalProps {
    show: boolean;
    onHide: () => void;
    title: string;
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
    children,
    size = 'lg',
    searchQuery = '',
    onSearchChange,
    sortOption = 'none',
    onSortChange,
}) => {
    const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
    const sortMenuOpen = Boolean(sortAnchor);

    const handleSort = (option: StatSortOption) => {
        onSortChange?.(option);
        setSortAnchor(null);
    };

    return (
        <Dialog
            open={show}
            onClose={onHide}
            maxWidth={maxWidthMap[size]}
            fullWidth
            scroll="paper"
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle sx={{ pb: 1.25, pt: 1.75 }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: { xs: 'stretch', md: 'center' },
                        justifyContent: 'space-between',
                        gap: { xs: 1.25, md: 2 },
                    }}
                >
                    {/* Title row. On mobile the close button belongs here, beside the
                        title — not stranded at the end of the controls row below. */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
                        <Typography
                            component="span"
                            sx={{
                                fontWeight: 700,
                                fontSize: { xs: '1.1rem', sm: '1.35rem' },
                                lineHeight: 1.25,
                                flexShrink: 1,
                                minWidth: 0,
                            }}
                        >
                            {title}
                        </Typography>
                        <IconButton
                            onClick={onHide}
                            aria-label="close"
                            sx={{ display: { xs: 'inline-flex', md: 'none' }, flexShrink: 0, color: (t) => t.palette.grey[600] }}
                        >
                            <i className="bi bi-x-lg" />
                        </IconButton>
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            width: { xs: '100%', md: 'auto' },
                            minWidth: { md: 250 },
                            maxWidth: { md: 500 },
                            flexGrow: { xs: 1, md: 0 },
                        }}
                    >
                        {onSortChange && (
                            <>
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={(e) => setSortAnchor(e.currentTarget)}
                                    startIcon={<i className="bi bi-filter" />}
                                    sx={{
                                        bgcolor: '#1E3A8A',
                                        '&:hover': { bgcolor: '#152a63' },
                                        color: 'white',
                                        textTransform: 'none',
                                        whiteSpace: 'nowrap',
                                        height: 35,
                                        flexShrink: 0,
                                    }}
                                >
                                    {SORT_LABELS[sortOption]}
                                </Button>
                                <Menu anchorEl={sortAnchor} open={sortMenuOpen} onClose={() => setSortAnchor(null)}>
                                    <MenuItem onClick={() => handleSort('name-asc')}>
                                        <i className="bi bi-sort-alpha-down me-2" />
                                        Name (A-Z)
                                    </MenuItem>
                                    <MenuItem onClick={() => handleSort('name-desc')}>
                                        <i className="bi bi-sort-alpha-up me-2" />
                                        Name (Z-A)
                                    </MenuItem>
                                    <Divider />
                                    <MenuItem onClick={() => handleSort('checkin-asc')}>
                                        <i className="bi bi-clock me-2" />
                                        Check-in (Earliest)
                                    </MenuItem>
                                    <MenuItem onClick={() => handleSort('checkin-desc')}>
                                        <i className="bi bi-clock-fill me-2" />
                                        Check-in (Latest)
                                    </MenuItem>
                                    {sortOption !== 'none' && [
                                        <Divider key="clear-divider" />,
                                        <MenuItem key="clear" onClick={() => handleSort('none')}>
                                            <i className="bi bi-x-circle me-2" />
                                            Clear Sort
                                        </MenuItem>,
                                    ]}
                                </Menu>
                            </>
                        )}

                        {onSearchChange && (
                            <TextField
                                size="small"
                                fullWidth
                                type="text"
                                placeholder="Search by name..."
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                InputProps={{
                                    endAdornment: searchQuery ? (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => onSearchChange('')}
                                                title="Clear search"
                                                sx={{ color: '#1E3A8A' }}
                                            >
                                                <i className="bi bi-x-lg" style={{ fontSize: 14 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : undefined,
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: '#1E3A8A' },
                                        '&:hover fieldset': { borderColor: '#1E3A8A' },
                                        '&.Mui-focused fieldset': { borderColor: '#1E3A8A' },
                                    },
                                }}
                            />
                        )}

                        <IconButton
                            onClick={onHide}
                            aria-label="close"
                            sx={{ display: { xs: 'none', md: 'inline-flex' }, flexShrink: 0, color: (t) => t.palette.grey[600] }}
                        >
                            <i className="bi bi-x-lg" />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent dividers>{children}</DialogContent>
        </Dialog>
    );
};

export default StatDetailModal;
