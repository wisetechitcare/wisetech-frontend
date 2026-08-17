/**
 * The Tasks workspace — one board, one screenful, full bleed.
 *
 *     ┌── <project name>                      [backdrop] [gear]      [+ New task] ──┐
 *     │  ▓▓ board backdrop — preset · colour · wallpaper ▓▓                         │
 *     │  ┌ TODO (5) + ┐ ┌ ONGOING (3) + ┐ ┌ ON HOLD (1) + ┐ ┌ + Add another list ┐  │
 *     │  │ card       │ │ card          │ │ card          │                        │
 *     └────────────────────────────────────────────────────────────────────────────┘
 *                        ╭ Board │ Table · ▣ Raj Bhavan at Vile Parle ╮
 *
 * ### Five things this layout is careful about
 *
 * **The board is the whole screen.** The project rail that used to sit on the left cost a fifth of
 * the width to answer a question people ask a few times a day and change even less often — and on
 * a board, width IS the feature: every pixel it took was a lane you could not see. It is now a
 * button in the bottom bar that opens the same list as a picker. Nothing was removed; it stopped
 * being permanently on screen.
 *
 * **The project list stays `board-projects`, not "all projects".** The picker is the same resolver
 * the rail used, so a project cannot appear there whose board would come back empty-by-refusal.
 *
 * **GENERAL tasks keep a home.** A project-first layout would otherwise strand them, since they
 * have no project by definition — hence the explicit general-task rows in the picker.
 *
 * **The board ends where the window ends.** A board that stops half-way down and then makes the
 * whole page scroll gives up the one thing a board is for — seeing every lane at once. So the
 * workspace MEASURES where it starts (`useFillViewport`) and claims the rest of the viewport,
 * instead of guessing the chrome above it with a `calc(100vh - 300px)` that is wrong on the next
 * screen size. Everything inside then scrolls within itself: each lane, the table.
 *
 * **The backdrop belongs to the user.** The area behind the columns carries no information, so it
 * is the one part of the screen worth letting a team own (`boardBackground.ts`). Cards stay opaque
 * `background.paper` on top of it, which is what keeps any choice — including a photograph —
 * from making somebody's own work unreadable. The shell around it stays entirely theme-driven.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Badge, Box, Button, Chip, CircularProgress, IconButton, Stack, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { RequirePermission } from '@app/modules/common/components/RequirePermission';
import { useFillViewport } from '@app/hooks/useFillViewport';
import { TaskFilterState, filtersToQuery, apiErrorMessage, activeFilterCount } from './taskDomain';
import {
    useTaskBoard, useTaskList, useTaskStatuses, useTaskPriorities,
    useAvailableProjects, useBoardProjects, useMoveTaskStage, useCreateBoardList, useDeleteBoardList,
    useReorderBoardTasks,
} from './useTaskQueries';
import {
    boardBackgroundCss, boardInk, describeBackground, hasWallpaper, useBoardBackground,
} from './boardBackground';
import TaskBoard, { BoardColumn } from './components/TaskBoard';
import TaskTable from './components/TaskTable';
import TaskFilterDrawer from './components/TaskFilterDrawer';
import TaskFormDialog from './components/TaskFormDialog';
import BoardBackgroundDialog from './components/BoardBackgroundDialog';
import BoardBottomNav, { WorkspacePanel } from './components/BoardBottomNav';
import ProjectRail, { RailProject, RailGeneralTask, GENERAL_PREFIX } from './components/ProjectRail';
import { TaskStateBlock } from './components/primitives';

type ViewMode = 'kanban' | 'table';
const VIEW_KEY = 'wt.tasks.view';
/** Which panes are open. Remembered, because it is a way of working, not a one-off choice. */
const PANELS_KEY = 'wt.tasks.panels';

const readPanels = (): Record<WorkspacePanel, boolean> => {
    try {
        const raw = localStorage.getItem(PANELS_KEY);
        if (!raw) return { projects: false, board: true };
        const open = new Set(raw.split(','));
        // The board is the default, and the fallback: a remembered state with nothing open would
        // render an empty workspace.
        return open.size ? { projects: open.has('projects'), board: open.has('board') } : { projects: false, board: true };
    } catch {
        return { projects: false, board: true };
    }
};

/** Icon-only view switch — the two layouts are shapes, and a shape reads faster than a word. */
const ViewToggle = ({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) => {
    const theme = useTheme();
    const options: Array<{ v: ViewMode; icon: string; label: string }> = [
        { v: 'kanban', icon: 'element-11', label: 'Board' },
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
    const [filtersOpen, setFiltersOpen] = useState(false);
    /**
     * Which panes are on screen. Not exclusive: Projects and the Task Board compose, and either
     * can be the only thing showing. The board is what you get on a fresh browser.
     */
    const [panels, setPanels] = useState<Record<WorkspacePanel, boolean>>(readPanels);

    /**
     * The workspace takes whatever is left of the window below it — measured, not assumed. The
     * property it publishes is consumed as `h-[var(--wt-fill-h)]` on the same element, and is set
     * to `auto` on narrow screens where the panes stack and the page should scroll normally.
     */
    // `bottomGap` reserves the floating bottom bar's own height, so the pill sits in clear space
    // instead of over the last row of cards. 1024px is Tailwind's `lg` — the same breakpoint the
    // layout stacks at below, and the two must agree or a viewport-tall shell would wrap content
    // that has gone vertical.
    const fillRef = useFillViewport<HTMLDivElement>({ bottomGap: 76, minViewportWidth: 1024 });

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
    const createList = useCreateBoardList();
    const deleteList = useDeleteBoardList();
    const reorderTasks = useReorderBoardTasks();

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

    const togglePanel = (panel: WorkspacePanel) => {
        setPanels((current) => {
            const next = { ...current, [panel]: !current[panel] };
            // Never close the last one — an empty workspace is not a state to be in.
            if (!next.projects && !next.board) return current;
            localStorage.setItem(
                PANELS_KEY,
                (Object.keys(next) as WorkspacePanel[]).filter((k) => next[k]).join(','),
            );
            return next;
        });
    };

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
            {/* No `gap` on this row: the projects pane collapses to zero width, and a gap would
                leave a visible seam where a closed pane used to be. The open pane carries its own
                margin instead. */}
            <Box className="flex min-h-0 flex-1 flex-col lg:flex-row">
                {/* ── projects pane ───────────────────────────────────────────────────
                    Slides rather than pops: the rail is part of the layout, so opening it
                    animates its width (its height, when the layout has gone vertical) and the
                    board gives way beside it. A dialog was the wrong shape — it hides the board
                    you are switching away from, and it has to be re-opened for the second switch.
                    With the board closed this pane simply takes the whole workspace. */}
                <Box
                    aria-hidden={!panels.projects}
                    className="shrink-0 overflow-hidden"
                    sx={{
                        // `visibility` is what takes a collapsed pane out of the tab order — width
                        // zero still leaves its buttons focusable, so a keyboard user would tab
                        // into a rail they cannot see. Its change is delayed until the slide
                        // finishes on the way out, and immediate on the way in.
                        transition: panels.projects
                            ? 'width .28s ease, max-height .28s ease, opacity .2s ease, margin .28s ease'
                            : 'width .28s ease, max-height .28s ease, opacity .2s ease, margin .28s ease, visibility 0s linear .28s',
                        visibility: panels.projects ? 'visible' : 'hidden',
                        opacity: panels.projects ? 1 : 0,
                        width: {
                            xs: '100%',
                            lg: panels.projects ? (panels.board ? 'clamp(17rem, 20vw, 24rem)' : '100%') : 0,
                        },
                        maxHeight: { xs: panels.projects ? '45vh' : 0, lg: 'none' },
                        mb: { xs: panels.projects ? 1.5 : 0, lg: 0 },
                        mr: { lg: panels.projects && panels.board ? 2 : 0 },
                    }}
                >
                    <ProjectRail
                        projects={projects}
                        generalTasks={generalTasks}
                        selected={scopeSel}
                        onSelect={selectScope}
                        isLoading={railQuery.isLoading}
                        className="h-full w-full"
                    />
                </Box>

                {/* ── board pane ── */}
                {panels.board && (
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
                            {/* Board vs Table stays on top, where it has always been: it chooses
                                how THIS pane draws its data, which is a different question from
                                the bottom bar's "which panes am I looking at". */}
                            <ViewToggle value={view} onChange={changeView} />

                            {/* Filtering is a burst activity — narrow, look, clear — so it lives
                                in a panel that opens over the board and closes again, instead of
                                a control row that charged the board two lines of height whether
                                or not anyone was filtering. The badge is what makes a filtered
                                board impossible to mistake for an empty one. */}
                            <Tooltip title="Filter tasks">
                                <Badge
                                    badgeContent={activeFilterCount(filters)}
                                    color="primary"
                                    overlap="circular"
                                    sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}
                                >
                                    <IconButton
                                        size="small"
                                        aria-label="Filter tasks"
                                        onClick={() => setFiltersOpen(true)}
                                        sx={{
                                            border: `1px solid ${theme.palette.divider}`,
                                            borderRadius: 1.5,
                                            width: 34, height: 34,
                                            color: 'text.secondary',
                                            '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                        }}
                                    >
                                        <KTIcon iconName="filter" className="fs-4" />
                                    </IconButton>
                                </Badge>
                            </Tooltip>

                            {/* The swatch IS the current backdrop, so the button shows the
                                setting instead of describing it. */}
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


                    {/* ── the work surface ────────────────────────────────────────────
                        The board's own canvas: it takes all remaining height, clips its
                        contents, and wears the user's backdrop. Three stacked layers —
                        backdrop, readability scrim, content — so a wallpaper can be dimmed
                        and blurred without any of that touching the cards on top of it. */}
                    <Box
                        // Below `lg` the shell stops being viewport-tall, so the surface states its
                        // own height: without a definite one the lanes have nothing to be 100% of
                        // and the board collapses.
                        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl max-lg:h-[70vh] max-lg:flex-none"
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
                                ) : columns.length === 0 && !activeProject ? (
                                    // With a project in view a bare board is not a dead end — the
                                    // "Add another list" lane is the way out of it, so the board
                                    // renders and offers it rather than sending someone to
                                    // Configure for a stage only this project needs.
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
                                        onReorder={(statusId, taskIds) => reorderTasks.mutateAsync({ statusId, taskIds })}
                                        onAddInStage={(statusId) => { setCreateInStage(statusId); setCreateOpen(true); }}
                                        // Only with a project in view: a lane created here belongs
                                        // to THAT project's board and appears on no other. With a
                                        // general task selected there is no board to add it to.
                                        onCreateList={activeProject
                                            ? (name) => createList.mutateAsync({ name, projectId: scopeSel })
                                            : undefined}
                                        onDeleteList={activeProject
                                            ? (statusId) => deleteList.mutateAsync(statusId)
                                            : undefined}
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
                )}
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

            <TaskFilterDrawer
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                filters={filters}
                onChange={updateFilters}
                statuses={statusesQuery.data?.taskStatuses ?? []}
                priorities={prioritiesQuery.data?.taskPriorities ?? []}
                projects={projectsQuery.data?.projects ?? projects}
                showStatusFilter={view === 'table'}
            />

            <BoardBottomNav active={panels} onToggle={togglePanel} />
        </Box>
    );
};

export default TasksWorkspace;
