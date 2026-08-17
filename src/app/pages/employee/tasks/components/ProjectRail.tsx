/**
 * The rail — the left pane of the Tasks workspace.
 *
 * Lists the things a person actually works on:
 *
 *   - **Projects**, by name, with their internal team's faces and a visible-task count.
 *   - **General tasks**, by name, flagged GENERAL — because a task with no project has nowhere
 *     else to live, and a single catch-all bucket hid what was inside it.
 *
 * Fed by `GET /task/board-projects`, which answers *"which projects do the tasks I can SEE
 * belong to"*. That is deliberately a different question from `available-projects` (*"where may
 * I CREATE a task"*): somebody assigned work on ten projects sees ten here even if they manage
 * none. Nothing is revealed that the caller could not already reach — the list is derived from
 * their own visible task set.
 *
 * There is no project STATUS chip: every project that reaches this rail is Received, so the chip
 * carried no information. The row shows the team instead.
 */
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
    Avatar, AvatarGroup, Box, Chip, CircularProgress, InputAdornment, Stack, TextField,
    Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { employeeName, initialsOf } from '../taskDomain';
import { TaskStateBlock } from './primitives';

export interface RailMember {
    id: string;
    avatar?: string | null;
    users?: { firstName?: string | null; lastName?: string | null } | null;
}

export interface RailProject {
    id: string;
    title?: string | null;
    projectNumber?: string | null;
    taskCount?: number;
    members?: RailMember[];
    memberCount?: number;
}

export interface RailGeneralTask {
    id: string;
    taskName: string;
    status?: { id: string; name: string; color?: string | null; isFinal?: boolean } | null;
    assignedTo?: RailMember | null;
}

/** A general task selected in the rail is prefixed, so the workspace can tell the two apart. */
export const GENERAL_PREFIX = 'general:';

export interface ProjectRailProps {
    projects: RailProject[];
    generalTasks: RailGeneralTask[];
    selected: string;
    onSelect: (id: string) => void;
    isLoading?: boolean;
    /** Layout classes from the workspace — the rail owns its inside, the page owns its box. */
    className?: string;
}

/** Stacked faces of a project's internal team — the people who can actually be assigned. */
const TeamAvatars = ({ members, total }: { members: RailMember[]; total: number }) => {
    const theme = useTheme();
    if (!members.length) return null;
    return (
        <AvatarGroup
            max={3}
            total={total}
            sx={{
                '& .MuiAvatar-root': {
                    width: 20, height: 20, fontSize: 8.5, fontWeight: 700,
                    borderColor: theme.palette.background.paper,
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.16),
                    color: theme.palette.primary.main,
                },
            }}
        >
            {members.map((m) => {
                const name = employeeName(m);
                return (
                    <Tooltip key={m.id} title={name}>
                        <Avatar src={m.avatar || undefined} alt={name}>{initialsOf(name)}</Avatar>
                    </Tooltip>
                );
            })}
        </AvatarGroup>
    );
};

export const ProjectRail = ({
    projects, generalTasks, selected, onSelect, isLoading, className,
}: ProjectRailProps) => {
    const theme = useTheme();
    const [search, setSearch] = useState('');

    const q = search.trim().toLowerCase();
    const filteredProjects = useMemo(
        () => (!q ? projects : projects.filter(
            (p) => (p.title || '').toLowerCase().includes(q) || (p.projectNumber || '').toLowerCase().includes(q),
        )),
        [projects, q],
    );
    const filteredGeneral = useMemo(
        () => (!q ? generalTasks : generalTasks.filter((t) => t.taskName.toLowerCase().includes(q))),
        [generalTasks, q],
    );

    const rowSx = (active: boolean) => ({
        width: '100%', textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 1.25,
        px: 1.25, py: 1, border: 0, borderRadius: 1.5, cursor: 'pointer',
        borderLeft: '3px solid',
        borderLeftColor: active ? 'primary.main' : 'transparent',
        bgcolor: active
            ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08)
            : 'transparent',
        color: active ? 'primary.main' : 'text.primary',
        transition: 'background-color .15s, border-color .15s',
        '&:hover': { bgcolor: active ? undefined : 'action.hover' },
        '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
    });

    const IconTile = ({ icon, active }: { icon: string; active: boolean }) => (
        <Box
            sx={{
                width: 30, height: 30, borderRadius: 1.25, flexShrink: 0,
                display: 'grid', placeItems: 'center',
                // Brand blue, the same family as the employee ID card's avatar ring.
                bgcolor: alpha(theme.palette.primary.main, active
                    ? (theme.palette.mode === 'dark' ? 0.28 : 0.16)
                    : (theme.palette.mode === 'dark' ? 0.14 : 0.08)),
                color: 'primary.main',
            }}
        >
            <KTIcon iconName={icon} className="fs-5" />
        </Box>
    );

    const empty = !isLoading && projects.length === 0 && generalTasks.length === 0;
    const noMatches = !isLoading && !empty && filteredProjects.length === 0 && filteredGeneral.length === 0;

    return (
        // Height and width come from the workspace: the rail is one column of a viewport-tall
        // split, so it stretches to whatever that column is and scrolls its list inside itself.
        // A `maxHeight: calc(100vh - 150px)` here used to guess the chrome above it and was wrong
        // on every screen that wrapped its header.
        <Stack
            className={clsx('h-full min-h-0 shrink-0 overflow-hidden', className)}
            sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            <Box className="shrink-0" sx={{ p: 1.5, pb: 1 }}>
                <Typography variant="subtitle1" component="div" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Projects
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Select a project to view and manage its tasks
                </Typography>
            </Box>

            <Box className="shrink-0" sx={{ px: 1.5, pb: 1 }}>
                <TextField
                    fullWidth size="small" value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search projects…"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Box sx={{ color: 'text.disabled', lineHeight: 0 }}>
                                    <KTIcon iconName="magnifier" className="fs-6" />
                                </Box>
                            </InputAdornment>
                        ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
            </Box>

            {/* `minHeight: 0` is what actually makes this scroll: a flex child's default
                `min-height: auto` refuses to shrink below its content, so the list would push
                the rail past its column instead of scrolling inside it. */}
            <Stack spacing={0.25} className="min-h-0 flex-1" sx={{ px: 1, pb: 1, overflowY: 'auto' }}>
                {isLoading && <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={20} /></Stack>}

                {empty && (
                    <TaskStateBlock
                        compact icon="briefcase" title="Nothing to show yet"
                        description="Projects appear here once you can see at least one of their tasks. General tasks appear by name."
                    />
                )}

                {noMatches && (
                    <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center', py: 2 }}>
                        Nothing matches “{search}”
                    </Typography>
                )}

                {/* ── projects ── */}
                {filteredProjects.map((p) => {
                    const active = selected === p.id;
                    return (
                        <Box
                            key={p.id} component="button" type="button" aria-current={active}
                            onClick={() => onSelect(p.id)} sx={rowSx(active)}
                        >
                            <IconTile icon="office-bag" active={active} />

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'inherit' }}>
                                    {p.title || 'Untitled project'}
                                </Typography>
                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                                    <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                                        {p.projectNumber || '—'}
                                    </Typography>
                                    {typeof p.taskCount === 'number' && p.taskCount > 0 && (
                                        <>
                                            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
                                            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                                                {p.taskCount} task{p.taskCount === 1 ? '' : 's'}
                                            </Typography>
                                        </>
                                    )}
                                </Stack>
                            </Box>

                            {/* The team's faces, in place of a status chip — every project that
                                reaches this rail is Received, so the chip said nothing. */}
                            <Box sx={{ flexShrink: 0 }}>
                                <TeamAvatars members={p.members ?? []} total={p.memberCount ?? (p.members?.length ?? 0)} />
                            </Box>
                        </Box>
                    );
                })}

                {/* ── general tasks ── */}
                {filteredGeneral.length > 0 && filteredProjects.length > 0 && (
                    <Box sx={{ height: 1, bgcolor: 'divider', mx: 1.25, my: 0.75 }} />
                )}

                {filteredGeneral.map((t) => {
                    const id = GENERAL_PREFIX + t.id;
                    const active = selected === id;
                    return (
                        <Box
                            key={id} component="button" type="button" aria-current={active}
                            onClick={() => onSelect(id)} sx={rowSx(active)}
                        >
                            <IconTile icon="home-2" active={active} />

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'inherit' }}>
                                    {t.taskName}
                                </Typography>
                                <Chip
                                    size="small"
                                    label="GENERAL TASK"
                                    sx={{
                                        height: 15, fontSize: 8.5, fontWeight: 700, letterSpacing: '.06em',
                                        borderRadius: 0.5, mt: 0.25,
                                        bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
                                        color: theme.palette.secondary.main,
                                        '& .MuiChip-label': { px: 0.6 },
                                    }}
                                />
                            </Box>

                            {t.assignedTo && (
                                <Tooltip title={employeeName(t.assignedTo)}>
                                    <Avatar
                                        src={t.assignedTo.avatar || undefined}
                                        sx={{
                                            width: 22, height: 22, fontSize: 9, fontWeight: 700,
                                            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.16),
                                            color: theme.palette.primary.main,
                                        }}
                                    >
                                        {initialsOf(employeeName(t.assignedTo))}
                                    </Avatar>
                                </Tooltip>
                            )}
                        </Box>
                    );
                })}
            </Stack>

            {!isLoading && !empty && (
                <Box className="shrink-0" sx={{ px: 1.75, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {filteredProjects.length} project{filteredProjects.length === 1 ? '' : 's'}
                        {generalTasks.length > 0 && ` · ${filteredGeneral.length} general task${filteredGeneral.length === 1 ? '' : 's'}`}
                    </Typography>
                </Box>
            )}
        </Stack>
    );
};

export default ProjectRail;
