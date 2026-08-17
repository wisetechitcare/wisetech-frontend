/**
 * Filter — a drawer off the right edge, Trello-style.
 *
 * It replaces a row of controls that sat above the board and cost it two lines of height on every
 * screen, whether or not anyone was filtering. Filtering is a burst activity: you narrow, you
 * look, you clear. A panel that opens over the board and closes again fits that shape, and gives
 * the lanes their height back the rest of the time.
 *
 * ### Every control here is one the API implements
 *
 * Trello's own panel offers "due in the next week", labels and members. Ours offers what the task
 * API can actually answer — scope, stage, priority, project, billing, overdue, assigned-to-me and
 * a keyword. A checkbox that quietly filtered nothing would be worse than a shorter list: the
 * board would look filtered and be lying.
 *
 * The filter STATE is unchanged (`TaskFilterState`), so the table view, the board and the URL-less
 * back button all keep behaving as they did — this is a different way to reach the same values,
 * not a second filtering system.
 */
import { useEffect, useState } from 'react';
import {
    Box, Chip, Drawer, InputAdornment, MenuItem, Stack, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { WtButton } from '@app/modules/common/components/ui';
import { TaskFilterState, activeFilterCount } from '../taskDomain';

export interface TaskFilterDrawerProps {
    open: boolean;
    onClose: () => void;
    filters: TaskFilterState;
    onChange: (next: TaskFilterState) => void;
    statuses: Array<{ id: string; name: string; color?: string | null }>;
    priorities: Array<{ id: string; name: string; color?: string | null }>;
    projects: Array<{ id: string; title?: string | null; projectNumber?: string | null }>;
    /** Hidden on the board, which already groups BY stage. */
    showStatusFilter?: boolean;
}

/** A titled block, so the panel reads as a list of questions rather than a wall of inputs. */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Stack spacing={1}>
        <Typography
            variant="caption"
            sx={{ fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'text.secondary' }}
        >
            {title}
        </Typography>
        {children}
    </Stack>
);

/** A toggle that looks like what it is: on, or not on. */
const ToggleRow = ({
    icon, label, checked, onToggle, tone,
}: {
    icon: string; label: string; checked: boolean; onToggle: () => void; tone: string;
}) => {
    const theme = useTheme();
    return (
        <Box
            component="button"
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onToggle}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left"
            sx={{
                border: '1px solid',
                borderColor: checked ? alpha(tone, 0.5) : 'divider',
                bgcolor: checked ? alpha(tone, theme.palette.mode === 'dark' ? 0.18 : 0.08) : 'transparent',
                color: checked ? tone : 'text.primary',
                cursor: 'pointer',
                transition: 'background-color .15s, border-color .15s',
                '&:hover': { bgcolor: checked ? undefined : 'action.hover' },
                '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
            }}
        >
            <Box sx={{ lineHeight: 0, color: 'inherit' }}>
                <KTIcon iconName={icon} className="fs-5" />
            </Box>
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: 'inherit' }}>
                {label}
            </Typography>
            <Box
                sx={{
                    width: 18, height: 18, borderRadius: 0.75, display: 'grid', placeItems: 'center',
                    border: '1px solid', borderColor: checked ? tone : 'divider',
                    bgcolor: checked ? tone : 'transparent',
                    color: theme.palette.getContrastText(checked ? tone : theme.palette.background.paper),
                }}
            >
                {checked && <KTIcon iconName="check" className="fs-9" />}
            </Box>
        </Box>
    );
};

export const TaskFilterDrawer = ({
    open, onClose, filters, onChange, statuses, priorities, projects, showStatusFilter = true,
}: TaskFilterDrawerProps) => {
    const theme = useTheme();
    const [searchDraft, setSearchDraft] = useState(filters.search ?? '');

    // Debounced, exactly as the old inline field was: a five-character query is one request.
    useEffect(() => {
        const t = setTimeout(() => {
            if ((filters.search ?? '') !== searchDraft) onChange({ ...filters, search: searchDraft });
        }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchDraft]);

    useEffect(() => {
        if ((filters.search ?? '') !== searchDraft) setSearchDraft(filters.search ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.search]);

    const set = (patch: Partial<TaskFilterState>) => onChange({ ...filters, ...patch });
    const activeCount = activeFilterCount(filters);

    const selectSx = { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } } as const;

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { xs: '100%', sm: 380 },
                    bgcolor: 'background.paper',
                    backgroundImage: 'none',
                },
            }}
        >
            <Stack className="h-full min-h-0">
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    className="shrink-0"
                    sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1, color: 'text.primary' }}>
                        Filter
                    </Typography>
                    {activeCount > 0 && (
                        <Chip
                            size="small"
                            label={`${activeCount} active`}
                            sx={{
                                height: 20, fontSize: 10, fontWeight: 700,
                                bgcolor: alpha(theme.palette.primary.main, 0.14),
                                color: 'primary.main',
                            }}
                        />
                    )}
                    <Box
                        component="button"
                        type="button"
                        aria-label="Close filters"
                        onClick={onClose}
                        sx={{
                            border: 0, bgcolor: 'transparent', cursor: 'pointer', lineHeight: 0,
                            p: 0.5, borderRadius: 1, color: 'text.secondary',
                            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                        }}
                    >
                        <KTIcon iconName="cross" className="fs-3" />
                    </Box>
                </Stack>

                <Stack spacing={2.5} className="min-h-0 flex-1 overflow-y-auto" sx={{ p: 2 }}>
                    <Section title="Keyword">
                        <TextField
                            size="small"
                            fullWidth
                            value={searchDraft}
                            onChange={(e) => setSearchDraft(e.target.value)}
                            placeholder="Enter a keyword…"
                            sx={selectSx}
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
                                            aria-label="Clear keyword"
                                            onClick={() => setSearchDraft('')}
                                            sx={{ border: 0, bgcolor: 'transparent', cursor: 'pointer', color: 'text.disabled', lineHeight: 0 }}
                                        >
                                            <KTIcon iconName="cross" className="fs-6" />
                                        </Box>
                                    </InputAdornment>
                                ) : undefined,
                            }}
                        />
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            Searches task names, project names and task IDs.
                        </Typography>
                    </Section>

                    <Section title="Assignment">
                        <ToggleRow
                            icon="user"
                            label="Tasks assigned to me"
                            checked={!!filters.mine}
                            onToggle={() => set({ mine: !filters.mine })}
                            tone={theme.palette.primary.main}
                        />
                    </Section>

                    <Section title="Due date">
                        <ToggleRow
                            icon="information-5"
                            label="Overdue"
                            checked={!!filters.overdue}
                            onToggle={() => set({ overdue: !filters.overdue })}
                            tone={theme.palette.error.main}
                        />
                    </Section>

                    <Section title="Scope">
                        <TextField
                            select size="small" fullWidth sx={selectSx}
                            value={filters.taskScope ?? ''}
                            onChange={(e) => set({ taskScope: e.target.value as TaskFilterState['taskScope'] })}
                        >
                            <MenuItem value="">All scopes</MenuItem>
                            <MenuItem value="PROJECT">Project</MenuItem>
                            <MenuItem value="GENERAL">General</MenuItem>
                        </TextField>
                    </Section>

                    {showStatusFilter && (
                        <Section title="Stage">
                            <TextField
                                select size="small" fullWidth sx={selectSx}
                                value={filters.statusId ?? ''}
                                onChange={(e) => set({ statusId: e.target.value })}
                            >
                                <MenuItem value="">All stages</MenuItem>
                                {statuses.map((s) => (
                                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                ))}
                            </TextField>
                        </Section>
                    )}

                    <Section title="Priority">
                        <TextField
                            select size="small" fullWidth sx={selectSx}
                            value={filters.priorityId ?? ''}
                            onChange={(e) => set({ priorityId: e.target.value })}
                        >
                            <MenuItem value="">All priorities</MenuItem>
                            {priorities.map((p) => (
                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                            ))}
                        </TextField>
                    </Section>

                    {/* Only the projects the caller is authorized for — the same list the create
                        form offers, so a filter cannot hint that other projects exist. */}
                    <Section title="Project">
                        <TextField
                            select size="small" fullWidth sx={selectSx}
                            value={filters.projectId ?? ''}
                            onChange={(e) => set({ projectId: e.target.value })}
                            disabled={filters.taskScope === 'GENERAL'}
                        >
                            <MenuItem value="">All projects</MenuItem>
                            {projects.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.projectNumber ? `${p.projectNumber} — ` : ''}{p.title}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Section>

                    <Section title="Billing">
                        <TextField
                            select size="small" fullWidth sx={selectSx}
                            value={filters.billingType ?? ''}
                            onChange={(e) => set({ billingType: e.target.value as TaskFilterState['billingType'] })}
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="BILLABLE">Billable</MenuItem>
                            <MenuItem value="NON_BILLABLE">Non-billable</MenuItem>
                        </TextField>
                    </Section>
                </Stack>

                <Box className="shrink-0" sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <WtButton
                        ghost
                        fullWidth
                        disabled={activeCount === 0}
                        onClick={() => onChange({
                            search: filters.search,
                            sortBy: filters.sortBy,
                            sortDir: filters.sortDir,
                        })}
                        startIcon={<KTIcon iconName="arrows-circle" className="fs-6" />}
                    >
                        clear filters
                    </WtButton>
                </Box>
            </Stack>
        </Drawer>
    );
};

export default TaskFilterDrawer;
