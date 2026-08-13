/**
 * Task search + filters (Phase 4 §15, §16, §17).
 *
 * Every control here maps to a parameter the server actually implements — there are no fake
 * filter states. The resulting query is ANDed with the caller's visibility predicate server-side,
 * so no combination of these can widen what the user may see; the worst a filter can do is show
 * fewer of their own tasks.
 *
 * Search is debounced so a five-character query is one request, not five.
 */
import { useEffect, useState } from 'react';
import {
    Badge, Box, Button, Chip, Collapse, InputAdornment, MenuItem, Stack, TextField, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { TaskFilterState, activeFilterCount } from '../taskDomain';

export interface TaskFiltersProps {
    filters: TaskFilterState;
    onChange: (next: TaskFilterState) => void;
    statuses: Array<{ id: string; name: string; color?: string | null }>;
    priorities: Array<{ id: string; name: string; color?: string | null }>;
    projects: Array<{ id: string; title?: string | null; projectNumber?: string | null }>;
    /** Hidden when the board is showing — a board already groups BY stage. */
    showStatusFilter?: boolean;
}

export const TaskFilters = ({
    filters, onChange, statuses, priorities, projects, showStatusFilter = true,
}: TaskFiltersProps) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const [searchDraft, setSearchDraft] = useState(filters.search ?? '');

    // Debounce: typing should not fire a request per keystroke. 300ms is short enough to feel
    // live and long enough that a normal typing burst collapses to one call.
    useEffect(() => {
        const t = setTimeout(() => {
            if ((filters.search ?? '') !== searchDraft) onChange({ ...filters, search: searchDraft });
        }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchDraft]);

    // Keep the box in step when the parent clears filters from elsewhere.
    useEffect(() => {
        if ((filters.search ?? '') !== searchDraft) setSearchDraft(filters.search ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.search]);

    const set = (patch: Partial<TaskFilterState>) => onChange({ ...filters, ...patch });
    const activeCount = activeFilterCount(filters);

    const selectSx = {
        minWidth: 150,
        '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'background.paper' },
    } as const;

    return (
        <Stack spacing={1.25}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <TextField
                    size="small"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder="Search tasks, project or task ID…"
                    sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'background.paper' } }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Box sx={{ color: 'text.disabled', lineHeight: 0 }}>
                                    <KTIcon iconName="magnifier" className="fs-6" />
                                </Box>
                            </InputAdornment>
                        ),
                        endAdornment: searchDraft ? (
                            <InputAdornment position="end">
                                <Box
                                    component="button"
                                    type="button"
                                    aria-label="Clear search"
                                    onClick={() => setSearchDraft('')}
                                    sx={{ border: 0, bgcolor: 'transparent', cursor: 'pointer', color: 'text.disabled', lineHeight: 0 }}
                                >
                                    <KTIcon iconName="cross" className="fs-6" />
                                </Box>
                            </InputAdornment>
                        ) : undefined,
                    }}
                />

                {/* §17 — My Tasks. Resolved from the session server-side; the client sends only a flag. */}
                <Chip
                    label="My tasks"
                    clickable
                    onClick={() => set({ mine: !filters.mine })}
                    icon={<KTIcon iconName="user" className="fs-8" />}
                    sx={{
                        height: 34, borderRadius: 1.5, fontWeight: 600,
                        border: '1px solid',
                        borderColor: filters.mine ? 'primary.main' : 'divider',
                        bgcolor: filters.mine ? alpha(theme.palette.primary.main, 0.12) : 'background.paper',
                        color: filters.mine ? 'primary.main' : 'text.secondary',
                        '& .MuiChip-icon': { color: 'inherit' },
                    }}
                />

                <Chip
                    label="Overdue"
                    clickable
                    onClick={() => set({ overdue: !filters.overdue })}
                    icon={<KTIcon iconName="information-5" className="fs-8" />}
                    sx={{
                        height: 34, borderRadius: 1.5, fontWeight: 600,
                        border: '1px solid',
                        borderColor: filters.overdue ? 'error.main' : 'divider',
                        bgcolor: filters.overdue ? alpha(theme.palette.error.main, 0.12) : 'background.paper',
                        color: filters.overdue ? 'error.main' : 'text.secondary',
                        '& .MuiChip-icon': { color: 'inherit' },
                    }}
                />

                <Badge badgeContent={activeCount} color="primary" overlap="rectangular">
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setExpanded((v) => !v)}
                        startIcon={<KTIcon iconName="filter" className="fs-7" />}
                        sx={{ height: 34, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, borderColor: 'divider', color: 'text.secondary' }}
                    >
                        Filters
                    </Button>
                </Badge>
            </Stack>

            <Collapse in={expanded} unmountOnExit>
                <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    flexWrap="wrap"
                    sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.03 : 0.02) }}
                >
                    <TextField
                        select size="small" label="Scope" sx={selectSx}
                        value={filters.taskScope ?? ''}
                        onChange={(e) => set({ taskScope: e.target.value as TaskFilterState['taskScope'] })}
                    >
                        <MenuItem value="">All scopes</MenuItem>
                        <MenuItem value="PROJECT">Project</MenuItem>
                        <MenuItem value="GENERAL">General</MenuItem>
                    </TextField>

                    {showStatusFilter && (
                        <TextField
                            select size="small" label="Stage" sx={selectSx}
                            value={filters.statusId ?? ''}
                            onChange={(e) => set({ statusId: e.target.value })}
                        >
                            <MenuItem value="">All stages</MenuItem>
                            {statuses.map((s) => (
                                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                            ))}
                        </TextField>
                    )}

                    <TextField
                        select size="small" label="Priority" sx={selectSx}
                        value={filters.priorityId ?? ''}
                        onChange={(e) => set({ priorityId: e.target.value })}
                    >
                        <MenuItem value="">All priorities</MenuItem>
                        {priorities.map((p) => (
                            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                        ))}
                    </TextField>

                    {/* Only the projects the caller is authorized for — the same list the create
                        form offers, so a filter cannot hint that other projects exist. */}
                    <TextField
                        select size="small" label="Project" sx={{ ...selectSx, minWidth: 200 }}
                        value={filters.projectId ?? ''}
                        onChange={(e) => set({ projectId: e.target.value })}
                        disabled={filters.taskScope === 'GENERAL'}
                    >
                        <MenuItem value="">All projects</MenuItem>
                        {projects.map((p) => (
                            <MenuItem key={p.id} value={p.id}>{p.projectNumber ? `${p.projectNumber} — ` : ''}{p.title}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select size="small" label="Billing" sx={selectSx}
                        value={filters.billingType ?? ''}
                        onChange={(e) => set({ billingType: e.target.value as TaskFilterState['billingType'] })}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="BILLABLE">Billable</MenuItem>
                        <MenuItem value="NON_BILLABLE">Non-billable</MenuItem>
                    </TextField>

                    <Button
                        size="small"
                        onClick={() => onChange({ search: filters.search, sortBy: filters.sortBy, sortDir: filters.sortDir })}
                        disabled={activeCount === 0}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Clear filters
                    </Button>
                </Stack>
            </Collapse>
        </Stack>
    );
};

export default TaskFilters;
