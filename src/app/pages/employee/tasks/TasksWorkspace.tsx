/**
 * The Tasks workspace — two-pane, project-first, one screenful.
 *
 *     ┌── Projects ─────────┐ ┌── <project name>            [Active] ──────────────────┐
 *     │ All tasks           │ │ [Kanban|Table] [backdrop] [gear]        [+ New Task]   │
 *     │ Internal / General  │ ├───────────────────────────────────────────────────────┤
 *     │ ─────────────────── │ │  ▓▓ board backdrop — preset · colour · wallpaper ▓▓   │
 *     │ Raj Bhavan …        │ │  ┌ TODO (5) + ┐ ┌ ONGOING (3) + ┐ ┌ ON HOLD (1) + ┐    │
 *     │ Madarsa at Africa   │ │  │ card       │ │ card          │ │ card          │    │
 *     └─────────────────────┘ └───────────────────────────────────────────────────────┘
 *
 * ### Four things this layout is careful about
 *
 * **The project rail is `available-projects`, not "all projects".** It is the same resolver the
 * create form and the API use, so a project cannot appear here whose board would come back
 * empty-by-refusal.
 *
 * **GENERAL tasks keep a home.** A project-first layout would otherwise strand them, since they
 * have no project by definition — hence the explicit "Internal / General" row.
 *
 * **Both panes end where the window ends.** A board that stops half-way down and then makes the
 * whole page scroll gives up the one thing a board is for — seeing every lane at once. So the
 * workspace MEASURES where it starts (`useFillViewport`) and claims the rest of the viewport,
 * instead of guessing the chrome above it with a `calc(100vh - 300px)` that is wrong on the next
 * screen size. Everything inside then scrolls within itself: the rail's list, each board lane, the
 * table. Widths are viewport-relative for the same reason — an ultrawide gets wider lanes, not a
 * wider empty gutter.
 *
 * **The backdrop belongs to the user.** The area behind the columns carries no information, so it
 * is the one part of the screen worth letting a team own (`boardBackground.ts`). Cards stay opaque
 * `background.paper` on top of it, which is what keeps any choice — including a photograph —
 * from making somebody's own work unreadable. The shell around it stays entirely theme-driven.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Button, Chip, CircularProgress, IconButton, Stack, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { RequirePermission } from '@app/modules/common/components/RequirePermission';
import { useFillViewport } from '@app/hooks/useFillViewport';
import { TaskFilterState, filtersToQuery, apiErrorMessage } from './taskDomain';
import {
    useTaskBoard, useTaskList, useTaskStatuses, useTaskPriorities,
    useAvailableProjects, useBoardProjects, useMoveTaskStage,
} from './useTaskQueries';
import {
    boardBackgroundCss, boardInk, describeBackground, hasWallpaper, useBoardBackground,
} from './boardBackground';
import TaskBoard, { BoardColumn } from './components/TaskBoard';
import TaskTable from './components/TaskTable';
import TaskFilters from './components/TaskFilters';
import TaskFormDialog from './components/TaskFormDialog';
import BoardBackgroundDialog from './components/BoardBackgroundDialog';
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

/**
 * A card for anything the board draws OUTSIDE a task card — errors, "no stages yet".
 *
 * Those states are theme-coloured text, and the surface under them is not: a light theme can be
 * showing a midnight backdrop, which would put near-black text on near-black pixels. Giving them
 * their own paper panel makes them legible on every backdrop without a second palette, and reads
 * as intentional rather than as text stranded on wallpaper.
 */
const SurfacePanel = ({ children }: { children: React.ReactNode }) => (
    <Box className="flex min-h-0 flex-1 items-center justify-center p-2">
        <Box
            className="w-full max-w-[34rem] rounded-2xl"
            sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: (t) => `0 8px 28px ${alpha(t.palette.common.black, 0.22)}`,
            }}
        >
            {children}
        </Box>
    </Box>
);

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
    const [backdropOpen, setBackdropOpen] = useState(false);

    /**
     * The workspace takes whatever is left of the window below it — measured, not assumed. The
     * property it publishes is consumed as `h-[var(--wt-fill-h)]` on the same element, and is set
     * to `auto` on narrow screens where the panes stack and the page should scroll normally.
     */
    const fillRef = useFillViewport<HTMLDivElement>({ bottomGap: 8 });

    const { background, setBackground, resetBackground } = useBoardBackground();
    const ink = boardInk(background);
    const wallpaper = hasWallpaper(background);

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
        // The page IS the viewport: full width (a board earns every pixel it is given) and exactly
        // as tall as what is left below the app chrome. `overflow-hidden` is the promise that
        // nothing here escapes into a page-level scrollbar — each pane scrolls on its own.
        <Box
            ref={fillRef}
            className="flex h-[var(--wt-fill-h)] w-full flex-col overflow-hidden"
            sx={{ p: { xs: 1.5, md: 2.5 } }}
        >
            <Box className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                {/* Fluid rail: a share of the screen between a readable floor and a sane ceiling,
                    so it neither squeezes on a laptop nor sprawls on an ultrawide. Capped on
                    phones, where it sits ABOVE the board and must not push it off-screen. */}
                <ProjectRail
                    projects={projects}
                    generalTasks={generalTasks}
                    selected={scopeSel}
                    onSelect={selectScope}
                    isLoading={railQuery.isLoading}
                    className="max-h-[45vh] w-full lg:max-h-none lg:w-[clamp(17rem,20vw,24rem)]"
                />

                {/* ── right pane ── */}
                <Box className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
                    {/* project header */}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} className="shrink-0">
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

                            {/* The backdrop control lives next to the view switch because it is
                                the same kind of choice: how this board is presented to me, not
                                what it contains. The swatch IS the current backdrop, so the
                                button shows the setting instead of describing it. */}
                            <Tooltip title={`Board background — ${describeBackground(background)}`}>
                                <IconButton
                                    size="small"
                                    aria-label="Change board background"
                                    onClick={() => setBackdropOpen(true)}
                                    sx={{
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 1.5,
                                        width: 34, height: 34,
                                        overflow: 'hidden',
                                        background: boardBackgroundCss(background),
                                        color: ink === 'light' ? theme.palette.common.white : theme.palette.common.black,
                                        '&:hover': { borderColor: theme.palette.primary.main },
                                    }}
                                >
                                    <KTIcon iconName="picture" className="fs-5" />
                                </IconButton>
                            </Tooltip>

                            {/* Configure is a destination, not a tab — the board and the
                                stage/priority/preset definitions are different jobs. Hidden
                                rather than disabled for anyone who cannot open it, so nobody
                                clicks a control that bounces them back here. */}
                            <RequirePermission perm="tasks.manage.all" hideOnly>
                                <Tooltip title="Configure statuses, priorities and preset tasks">
                                    <IconButton
                                        size="small"
                                        aria-label="Configure tasks"
                                        onClick={() => navigate('/tasks/configure')}
                                        sx={{
                                            border: `1px solid ${theme.palette.divider}`,
                                            borderRadius: 1.5,
                                            width: 34, height: 34,
                                            color: 'text.secondary',
                                            '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                        }}
                                    >
                                        <KTIcon iconName="setting-2" className="fs-4" />
                                    </IconButton>
                                </Tooltip>
                            </RequirePermission>
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

                    <Box className="shrink-0">
                        <TaskFilters
                            filters={filters}
                            onChange={updateFilters}
                            statuses={statusesQuery.data?.taskStatuses ?? []}
                            priorities={prioritiesQuery.data?.taskPriorities ?? []}
                            projects={projectsQuery.data?.projects ?? projects}
                            showStatusFilter={view === 'table'}
                        />
                    </Box>

                    {/* ── the work surface ────────────────────────────────────────────
                        The board's own canvas: it takes all remaining height, clips its
                        contents, and wears the user's backdrop. Three stacked layers —
                        backdrop, readability scrim, content — so a wallpaper can be dimmed
                        and blurred without any of that touching the cards on top of it. */}
                    <Box
                        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl"
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: `inset 0 2px 10px ${alpha(theme.palette.common.black, dark ? 0.5 : 0.28)}`,
                        }}
                    >
                        <Box
                            aria-hidden
                            className="pointer-events-none absolute inset-0"
                            sx={{ background: boardBackgroundCss(background) }}
                        />
                        {/* Only a photograph needs the scrim; a preset or a colour was chosen
                            for its contrast already. */}
                        {wallpaper && (
                            <Box
                                aria-hidden
                                className="pointer-events-none absolute inset-0"
                                sx={{
                                    bgcolor: `rgba(2, 6, 23, ${background.dim / 100})`,
                                    backdropFilter: background.blur ? `blur(${background.blur}px)` : undefined,
                                }}
                            />
                        )}

                        {boardQuery.isFetching && view === 'kanban' && (
                            <Box
                                aria-hidden
                                className="absolute left-3 right-3 top-0 z-10 h-0.5 rounded-full"
                                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.7) }}
                            />
                        )}

                        <Box className="relative flex min-h-0 flex-1 flex-col" sx={{ p: { xs: 1, sm: 1.5 } }}>
                            {activeQuery.isError ? (
                                // On a user-chosen backdrop, theme-coloured body text is not
                                // guaranteed to be readable — so anything drawn outside a card
                                // gets a card of its own.
                                <SurfacePanel>
                                    <TaskStateBlock
                                        tone="error" icon="information-5" title="Could not load tasks"
                                        description={apiErrorMessage(activeQuery.error, 'The request failed. Try again in a moment.')}
                                        action={
                                            <Button onClick={() => activeQuery.refetch()} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                                Retry
                                            </Button>
                                        }
                                    />
                                </SurfacePanel>
                            ) : view === 'kanban' ? (
                                boardQuery.isLoading && columns.length === 0 ? (
                                    <Stack className="min-h-0 flex-1" alignItems="center" justifyContent="center">
                                        <CircularProgress />
                                    </Stack>
                                ) : columns.length === 0 ? (
                                    <SurfacePanel>
                                        <TaskStateBlock
                                            icon="element-11"
                                            title="No stages configured"
                                            description="Add a task stage in Configure and it will appear here as a board column."
                                        />
                                    </SurfacePanel>
                                ) : (
                                    <TaskBoard
                                        columns={columns}
                                        now={now}
                                        ink={ink}
                                        isLoading={boardQuery.isLoading}
                                        onOpenTask={(id) => navigate(`/tasks/${id}`)}
                                        onMoveTask={(taskId, statusId) => moveStage.mutateAsync({ taskId, statusId })}
                                        onAddInStage={(statusId) => { setCreateInStage(statusId); setCreateOpen(true); }}
                                    />
                                )
                            ) : (
                                // The table scrolls inside the surface for the same reason the
                                // lanes do: the page itself never gains a scrollbar.
                                <Box className="min-h-0 flex-1 overflow-auto">
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
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {view === 'kanban' && !boardQuery.isLoading && (
                        <Typography variant="caption" className="shrink-0" sx={{ color: 'text.disabled', px: 0.5 }}>
                            Showing {boardTotal} task{boardTotal === 1 ? '' : 's'}
                        </Typography>
                    )}
                </Box>
            </Box>

            <TaskFormDialog
                open={createOpen}
                onClose={() => { setCreateOpen(false); setCreateInStage(undefined); }}
                defaultStatusId={createInStage}
                defaultProjectId={activeProject ? scopeSel : undefined}
                defaultScope={activeGeneral ? 'GENERAL' : undefined}
            />

            <BoardBackgroundDialog
                open={backdropOpen}
                onClose={() => setBackdropOpen(false)}
                value={background}
                onChange={setBackground}
                onReset={resetBackground}
            />
        </Box>
    );
};

export default TasksWorkspace;
