/**
 * The Tasks workspace — two-pane, project-first.
 *
 *     ┌── Projects ─────────┐ ┌── <project name>            [Active] ──────────────────┐
 *     │ All tasks           │ │ [Kanban|Table]  search   filter   [+ New Task]         │
 *     │ Internal / General  │ ├───────────────────────────────────────────────────────┤
 *     │ ─────────────────── │ │  ▓▓ recessed board surface ▓▓                         │
 *     │ Raj Bhavan …        │ │  ┌ TODO (5) + ┐ ┌ ONGOING (3) + ┐ ┌ ON HOLD (1) + ┐    │
 *     │ Madarsa at Africa   │ │  │ card       │ │ card          │ │ card          │    │
 *     └─────────────────────┘ └───────────────────────────────────────────────────────┘
 *
 * ### Two things this layout is careful about
 *
 * **The project rail is `available-projects`, not "all projects".** It is the same resolver the
 * create form and the API use, so a project cannot appear here whose board would come back
 * empty-by-refusal.
 *
 * **GENERAL tasks keep a home.** A project-first layout would otherwise strand them, since they
 * have no project by definition — hence the explicit "Internal / General" row.
 *
 * Colours are entirely theme-driven: the board surface is a recess derived from `text.primary`
 * at low alpha, so it reads as "inset" in light mode and in dark mode without a second palette.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Button, Chip, CircularProgress, Stack, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { TaskFilterState, filtersToQuery, apiErrorMessage } from './taskDomain';
import {
    useTaskBoard, useTaskList, useTaskStatuses, useTaskPriorities,
    useAvailableProjects, useBoardProjects, useMoveTaskStage,
} from './useTaskQueries';
import TaskBoard, { BoardColumn } from './components/TaskBoard';
import TaskTable from './components/TaskTable';
import TaskFilters from './components/TaskFilters';
import TaskFormDialog from './components/TaskFormDialog';
import ProjectRail, { RailProject, RailGeneralTask, GENERAL_PREFIX } from './components/ProjectRail';
import { TaskStateBlock } from './components/primitives';

type ViewMode = 'kanban' | 'table';
const VIEW_KEY = 'wt.tasks.view';

/** Icon-only view switch — the two layouts are shapes, and a shape reads faster than a word. */
const ViewToggle = ({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) => {
    const theme = useTheme();
    const options: Array<{ v: ViewMode; icon: string; label: string }> = [
        { v: 'kanban', icon: 'element-11', label: 'Kanban board' },
        { v: 'table', icon: 'burger-menu-1', label: 'Table' },
    ];
    return (
        <Stack
            direction="row" role="tablist" aria-label="Task view" spacing={0.25}
            sx={{
                p: '3px', borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
                bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.04),
            }}
        >
            {options.map((o) => {
                const active = value === o.v;
                return (
                    <Tooltip key={o.v} title={o.label}>
                        <Box
                            component="button" type="button" role="tab" aria-selected={active}
                            aria-label={o.label}
                            onClick={() => onChange(o.v)}
                            sx={{
                                border: 0, cursor: 'pointer', borderRadius: 1,
                                px: 1.15, py: 0.6, lineHeight: 0,
                                bgcolor: active ? 'background.paper' : 'transparent',
                                color: active ? 'primary.main' : 'text.secondary',
                                boxShadow: active
                                    ? `0 1px 3px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.5 : 0.12)}`
                                    : 'none',
                                transition: 'background-color .15s, color .15s',
                                '&:hover': { color: active ? 'primary.main' : 'text.primary' },
                                '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 },
                            }}
                        >
                            <KTIcon iconName={o.icon} className="fs-4" />
                        </Box>
                    </Tooltip>
                );
            })}
        </Stack>
    );
};

export const TasksWorkspace = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const dark = theme.palette.mode === 'dark';

    const [view, setView] = useState<ViewMode>(
        () => (localStorage.getItem(VIEW_KEY) as ViewMode) || 'kanban',
    );
    /** Empty until the rail loads, then defaulted to the first entry (see the effect below). */
    const [scopeSel, setScopeSel] = useState<string>('');
    const [filters, setFilters] = useState<TaskFilterState>({ sortBy: 'createdAt', sortDir: 'desc' });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [createOpen, setCreateOpen] = useState(false);
    /** Set when "+" on a column is used, so the new task lands in that stage. */
    const [createInStage, setCreateInStage] = useState<string | undefined>();

    /** One clock for the whole screen, so a card and a row cannot disagree about "today". */
    const now = useMemo(() => new Date(), []);

    // The RAIL lists projects whose tasks the caller can SEE (browse). The FORM keeps using
    // available-projects, which is where they may CREATE. Two questions, two lists, on purpose.
    const railQuery = useBoardProjects();
    const projects: RailProject[] = railQuery.data?.projects ?? [];
    const generalTasks: RailGeneralTask[] = railQuery.data?.generalTasks ?? [];
    // Still needed for the filter dropdown, which mirrors the create-authorised set.
    const projectsQuery = useAvailableProjects();

    const generalId = scopeSel.startsWith(GENERAL_PREFIX) ? scopeSel.slice(GENERAL_PREFIX.length) : null;
    const activeProject = projects.find((p) => p.id === scopeSel);
    const activeGeneral = generalTasks.find((t) => t.id === generalId);

    /**
     * Land on something real. The rail no longer has an "All tasks" row, so with nothing selected
     * the board would be empty on arrival — which reads as "you have no work" rather than
     * "nothing is selected". First project, else first general task.
     */
    useEffect(() => {
        if (scopeSel) return;
        if (projects.length) setScopeSel(projects[0].id);
        else if (generalTasks.length) setScopeSel(GENERAL_PREFIX + generalTasks[0].id);
    }, [scopeSel, projects, generalTasks]);

    /**
     * The rail selection is a SCOPE, applied as a normal filter — so it composes with everything
     * else instead of being a second, parallel notion of "what am I looking at".
     *
     * A general task scopes to ITSELF (exact-id search), so the board still answers "which stage
     * is this in" rather than switching to a different kind of view.
     */
    const query = useMemo(() => {
        const base: TaskFilterState = { ...filters };
        if (generalId) base.search = generalId;
        else if (scopeSel) base.projectId = scopeSel;
        return filtersToQuery(base);
    }, [filters, scopeSel, generalId]);

    const boardQuery = useTaskBoard(query, view === 'kanban');
    const listQuery = useTaskList(
        { ...query, page: String(page + 1), limit: String(rowsPerPage) },
        view === 'table',
    );
    const statusesQuery = useTaskStatuses();
    const prioritiesQuery = useTaskPriorities();
    const moveStage = useMoveTaskStage();

    const columns: BoardColumn[] = boardQuery.data?.columns ?? [];
    const boardTotal = boardQuery.data?.total ?? 0;
    const tasks = listQuery.data?.data?.tasks ?? [];
    const pagination = listQuery.data?.data?.pagination;
    const canViewCost = Boolean(listQuery.data?.data?.costVisible);

    const changeView = (next: ViewMode) => {
        setView(next);
        localStorage.setItem(VIEW_KEY, next);
    };
    const updateFilters = (next: TaskFilterState) => { setFilters(next); setPage(0); };
    const selectScope = (id: string) => { setScopeSel(id); setPage(0); };

    const activeQuery = view === 'kanban' ? boardQuery : listQuery;

    const headerTitle = activeGeneral?.taskName || activeProject?.title || 'Tasks';

    const headerSubtitle = activeGeneral
        ? 'General task — internal work with no project, never billable to a client'
        : activeProject?.projectNumber || 'Select a project to see its tasks';

    return (
        <Box sx={{ maxWidth: 1800, mx: 'auto', p: { xs: 1.5, md: 2.5 } }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
                <ProjectRail
                    projects={projects}
                    generalTasks={generalTasks}
                    selected={scopeSel}
                    onSelect={selectScope}
                    isLoading={railQuery.isLoading}
                />

                {/* ── right pane ── */}
                <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                    {/* project header */}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                {/* `color` is stated explicitly: Metronic's global heading rules
                                    outrank MUI's default inheritance, so an h5 left to inherit
                                    stays dark-on-dark once the theme flips. */}
                                <Typography variant="h5" component="div" noWrap sx={{ fontWeight: 700, minWidth: 0, color: 'text.primary' }}>
                                    {headerTitle}
                                </Typography>
                                {activeGeneral && (
                                    <Chip size="small" label="GENERAL" sx={{ height: 20, fontSize: 10, fontWeight: 700, borderRadius: 0.75, bgcolor: alpha(theme.palette.secondary.main, 0.16), color: theme.palette.secondary.main }} />
                                )}
                            </Stack>
                            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                                {headerSubtitle}
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} alignItems="center">
                            <ViewToggle value={view} onChange={changeView} />
                            <Button
                                variant="contained"
                                onClick={() => { setCreateInStage(undefined); setCreateOpen(true); }}
                                startIcon={<KTIcon iconName="plus" className="fs-6" />}
                                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, whiteSpace: 'nowrap' }}
                            >
                                New task
                            </Button>
                        </Stack>
                    </Stack>

                    <TaskFilters
                        filters={filters}
                        onChange={updateFilters}
                        statuses={statusesQuery.data?.taskStatuses ?? []}
                        priorities={prioritiesQuery.data?.taskPriorities ?? []}
                        projects={projectsQuery.data?.projects ?? projects}
                        showStatusFilter={view === 'table'}
                    />

                    {/* ── the work surface ────────────────────────────────────────────
                        A deliberately RECESSED panel: the board and table sit in an inset
                        that reads as a distinct working area rather than more page. Derived
                        from the theme's own text colour at low alpha, so it inverts correctly
                        in dark mode instead of needing a second hardcoded palette. */}
                    <Box
                        sx={{
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            // Brand blue, not a neutral grey: the work surface should read as WiseTech's own.
                            bgcolor: alpha(theme.palette.primary.main, dark ? 0.1 : 0.06),
                            boxShadow: `inset 0 2px 8px ${alpha(theme.palette.primary.main, dark ? 0.25 : 0.1)}`,
                            p: { xs: 1, sm: 1.5 },
                            minHeight: 300,
                            position: 'relative',
                        }}
                    >
                        {boardQuery.isFetching && view === 'kanban' && (
                            <Box sx={{
                                position: 'absolute', top: 0, left: 12, right: 12, height: 2, borderRadius: 1,
                                bgcolor: alpha(theme.palette.primary.main, 0.4),
                            }} />
                        )}

                        {activeQuery.isError ? (
                            <TaskStateBlock
                                tone="error" icon="information-5" title="Could not load tasks"
                                description={apiErrorMessage(activeQuery.error, 'The request failed. Try again in a moment.')}
                                action={
                                    <Button onClick={() => activeQuery.refetch()} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                        Retry
                                    </Button>
                                }
                            />
                        ) : view === 'kanban' ? (
                            boardQuery.isLoading && columns.length === 0 ? (
                                <Stack alignItems="center" sx={{ py: 10 }}><CircularProgress /></Stack>
                            ) : (
                                <Box sx={{ maxHeight: { xs: 'none', md: 'calc(100vh - 300px)' }, display: 'flex' }}>
                                    <TaskBoard
                                        columns={columns}
                                        now={now}
                                        isLoading={boardQuery.isLoading}
                                        onOpenTask={(id) => navigate(`/tasks/${id}`)}
                                        onMoveTask={(taskId, statusId) => moveStage.mutateAsync({ taskId, statusId })}
                                        onAddInStage={(statusId) => { setCreateInStage(statusId); setCreateOpen(true); }}
                                    />
                                </Box>
                            )
                        ) : (
                            <TaskTable
                                tasks={tasks}
                                total={pagination?.totalRecords ?? tasks.length}
                                page={page}
                                rowsPerPage={rowsPerPage}
                                sortBy={filters.sortBy ?? 'createdAt'}
                                sortDir={filters.sortDir ?? 'desc'}
                                now={now}
                                isLoading={listQuery.isLoading}
                                isError={listQuery.isError}
                                errorMessage={apiErrorMessage(listQuery.error)}
                                canViewCost={canViewCost}
                                onOpenTask={(id) => navigate(`/tasks/${id}`)}
                                onPageChange={setPage}
                                onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setPage(0); }}
                                onSortChange={(sortBy, sortDir) => updateFilters({ ...filters, sortBy, sortDir })}
                            />
                        )}
                    </Box>

                    {view === 'kanban' && !boardQuery.isLoading && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', px: 0.5 }}>
                            Showing {boardTotal} task{boardTotal === 1 ? '' : 's'}
                        </Typography>
                    )}
                </Stack>
            </Stack>

            <TaskFormDialog
                open={createOpen}
                onClose={() => { setCreateOpen(false); setCreateInStage(undefined); }}
                defaultStatusId={createInStage}
                defaultProjectId={activeProject ? scopeSel : undefined}
                defaultScope={activeGeneral ? 'GENERAL' : undefined}
            />
        </Box>
    );
};

export default TasksWorkspace;
